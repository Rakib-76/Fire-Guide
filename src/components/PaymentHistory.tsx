import React, { useState, useEffect, useMemo } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { getCustomerInvoices, CustomerInvoiceItem } from "../api/authService";
import { getApiToken } from "../lib/auth";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function PaymentHistory() {
  const [invoices, setInvoices] = useState<CustomerInvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch invoices from API
  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const apiToken = getApiToken();
      if (!apiToken) {
        throw new Error("API token not found. Please log in.");
      }

      const response = await getCustomerInvoices(apiToken);
      
      if (response.success && response.data) {
        // Log the exact API response to verify
        console.log('API Response received:', response);
        console.log('Total invoices from API:', response.total_invoices);
        console.log('Invoice data from API:', response.data);
        console.log('First invoice structure:', response.data[0]);
        setInvoices(response.data);
      } else {
        throw new Error(response.message || "Failed to fetch invoices");
      }
    } catch (err: any) {
      console.error("Error fetching invoices:", err);
      setError(err?.message || "Failed to fetch invoices");
      toast.error(err?.message || "Failed to fetch invoices");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Format date from API response
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };

  // Dynamically extract ALL fields from API response
  // This function analyzes the first invoice and extracts ALL available fields
  const extractFieldsFromAPI = useMemo(() => {
    if (!invoices || invoices.length === 0) {
      return { fields: [], fieldKeys: [] };
    }

    const firstInvoice = invoices[0];
    const fields: Array<{ key: string; label: string; getValue: (invoice: CustomerInvoiceItem) => string }> = [];

    // Extract all top-level fields from the invoice
    Object.keys(firstInvoice).forEach((key) => {
      // Skip 'id' and 'booking_id' as they're internal IDs (unless you want them)
      // For now, we'll include all fields that have displayable values
      
      const value = (firstInvoice as any)[key];
      
      // Handle nested objects (like 'booking')
      if (value && typeof value === 'object' && !Array.isArray(value) && key === 'booking') {
        // Extract ALL fields from booking object
        Object.keys(value).forEach((bookingKey) => {
          const bookingValue = (value as any)[bookingKey];
          // Only include primitive values (strings, numbers)
          if (typeof bookingValue !== 'object') {
            const fieldKey = `booking.${bookingKey}`;
            let label = `${key}_${bookingKey}`.toUpperCase().replace(/_/g, ' ');
            if (bookingKey === 'first_name') label = 'CUSTOMER';
            
            fields.push({
              key: fieldKey,
              label: label,
              getValue: (invoice: CustomerInvoiceItem) => {
                return (invoice.booking as any)?.[bookingKey] || '';
              }
            });
          }
        });
      } else if (typeof value !== 'object' && value !== null) {
        // Handle primitive fields (strings, numbers)
        // Create human-readable labels
        let label = key.toUpperCase().replace(/_/g, ' ');
        if (key === 'invoice_number') label = 'REFERENCE';
        if (key === 'created_at') label = 'DATE';
        if (key === 'total_amount') label = 'AMOUNT';

        fields.push({
          key: key,
          label: label,
          getValue: (invoice: CustomerInvoiceItem) => {
            const val = (invoice as any)[key];
            if (key === 'created_at' && val) {
              return formatDate(val);
            }
            return val ? String(val) : '';
          }
        });
      }
    });

    // Sort fields in a logical order: REFERENCE, DATE, CUSTOMER, AMOUNT, then others
    const orderedFields = [];
    const preferredOrder = ['invoice_number', 'created_at', 'booking.first_name', 'total_amount'];
    
    // First, add fields in preferred order
    preferredOrder.forEach((orderedKey) => {
      const field = fields.find(f => f.key === orderedKey);
      if (field) {
        orderedFields.push(field);
      }
    });

    // Then, add any remaining fields that weren't in the preferred order
    fields.forEach((field) => {
      if (!orderedFields.find(f => f.key === field.key)) {
        orderedFields.push(field);
      }
    });

    console.log('=== DYNAMIC FIELD EXTRACTION ===');
    console.log('Total fields extracted from API:', orderedFields.length);
    console.log('Extracted fields:', orderedFields.map(f => ({ key: f.key, label: f.label })));
    console.log('First invoice structure:', firstInvoice);
    console.log('================================');

    return { fields: orderedFields, fieldKeys: orderedFields.map(f => f.key) };
  }, [invoices]);

  // Calculate total amount from API data only (if total_amount field exists)
  const totalAmount = useMemo(() => {
    if (!invoices || invoices.length === 0) return 0;
    return invoices.reduce((sum, invoice) => {
      return sum + (parseFloat(invoice.total_amount) || 0);
    }, 0);
  }, [invoices]);

  // Download All Invoice as PDF
  const handleDownloadAllInvoice = async () => {
    try {
      setIsDownloading(true);
      
      if (!invoices || invoices.length === 0) {
        toast.error("No invoices found to download");
        return;
      }

      const { fields } = extractFieldsFromAPI;
      
      if (fields.length === 0) {
        toast.error("No fields found in API response");
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Colors matching the design
      const primaryBlue = [0, 51, 102] as [number, number, number];
      const headerBg = [0, 51, 102] as [number, number, number];
      const lightGray = [245, 245, 245] as [number, number, number];
      const redColor = [220, 38, 38] as [number, number, number];
      
      // Statement date and number
      const statementDate = new Date().toLocaleDateString('en-GB');
      const statementNumber = `STM-${new Date().getFullYear()}-${String(invoices.length).padStart(4, '0')}`;
      
      // Header Section
      // Logo (red square with FG)
      doc.setFillColor(...redColor);
      doc.rect(14, 10, 12, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('FG', 16.5, 17.5);
      
      // Company Name
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Fire Guide', 30, 18);
      
      // STATEMENT Title (right side)
      doc.setTextColor(...primaryBlue);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('STATEMENT', pageWidth - 14, 18, { align: 'right' });
      
      // Statement Info (right side below STATEMENT)
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text('Statement Date', pageWidth - 60, 30);
      doc.text('Statement #', pageWidth - 60, 37);
      doc.text('Total Entries', pageWidth - 60, 44);
      
      doc.setTextColor(0, 0, 0);
      doc.text(statementDate, pageWidth - 14, 30, { align: 'right' });
      doc.text(statementNumber, pageWidth - 14, 37, { align: 'right' });
      doc.text(String(invoices.length), pageWidth - 14, 44, { align: 'right' });
      
      // Professional Statement Section (left side)
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Professional Statement', 14, 35);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Fire Guide Professional', 14, 42);
      doc.text('Payment History Report', 14, 48);
      doc.text('United Kingdom', 14, 54);
      
      // Account Summary Box (right side) - Only if total_amount field exists
      const summaryY = 65;
      const hasTotalAmount = fields.some(f => f.key === 'total_amount');
      
      if (hasTotalAmount) {
        doc.setFillColor(...lightGray);
        doc.rect(pageWidth - 80, summaryY, 66, 20, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(pageWidth - 80, summaryY, 66, 20, 'S');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryBlue);
        doc.text('Account Summary', pageWidth - 77, summaryY + 7);
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text('Total Amount', pageWidth - 77, summaryY + 14);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(`£${totalAmount.toFixed(2)}`, pageWidth - 17, summaryY + 14, { align: 'right' });
      }
      
      // Payment History Section
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Payment History', 14, hasTotalAmount ? 105 : 85);
      
      // Dynamically generate table data from API fields only
      const tableHeaders = fields.map(f => f.label);
      const tableData = invoices.map((invoice) => {
        return fields.map(field => {
          const value = field.getValue(invoice);
          // Format amount with £ symbol if it's the amount field
          if (field.key === 'total_amount' && value) {
            return `£${value}`;
          }
          return value;
        });
      });
      
      // Log to verify we're only using API data
      console.log('PDF Table Headers (from API only):', tableHeaders);
      console.log('PDF Table Data (from API only):', tableData);
      console.log('Number of fields from API:', fields.length);
      
      // Calculate column widths dynamically
      const numColumns = fields.length;
      const availableWidth = pageWidth - 28; // Margin on both sides
      const baseWidth = availableWidth / numColumns;
      
      const columnStyles: any = {};
      fields.forEach((field, index) => {
        columnStyles[index] = {
          cellWidth: baseWidth,
          halign: field.key === 'total_amount' ? 'right' : 'left'
        };
      });
      
      // Add the table - Dynamically generated columns from API
      autoTable(doc, {
        startY: hasTotalAmount ? 110 : 90,
        head: [tableHeaders],
        body: tableData,
        theme: 'plain',
        headStyles: {
          fillColor: headerBg,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          cellPadding: 3,
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 3,
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        columnStyles: columnStyles,
        margin: { left: 14, right: 14 },
      });
      
      // Get the final Y position after the table
      const finalY = (doc as any).lastAutoTable?.finalY || 150;
      
      // Total Amount Box - Only if total_amount field exists
      if (hasTotalAmount) {
        const balanceBoxY = finalY + 15;
        doc.setFillColor(...lightGray);
        doc.rect(pageWidth - 80, balanceBoxY, 66, 12, 'F');
        doc.setDrawColor(...primaryBlue);
        doc.setLineWidth(0.5);
        doc.rect(pageWidth - 80, balanceBoxY, 66, 12, 'S');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryBlue);
        doc.text('Total Amount:', pageWidth - 77, balanceBoxY + 8);
        doc.setTextColor(0, 0, 0);
        doc.text(`£${totalAmount.toFixed(2)}`, pageWidth - 17, balanceBoxY + 8, { align: 'right' });
        
        // Footer Section
        const footerY = balanceBoxY + 35;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('If you have any questions about this statement, please contact', pageWidth / 2, footerY, { align: 'center' });
        doc.text('Fire Guide Support | support@fireguide.co.uk', pageWidth / 2, footerY + 6, { align: 'center' });
        
        // Thank you message
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bolditalic');
        doc.setTextColor(...primaryBlue);
        doc.text('Thank You For Your Business!', pageWidth / 2, footerY + 20, { align: 'center' });
      } else {
        // Footer Section (if no total amount box)
        const footerY = finalY + 20;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('If you have any questions about this statement, please contact', pageWidth / 2, footerY, { align: 'center' });
        doc.text('Fire Guide Support | support@fireguide.co.uk', pageWidth / 2, footerY + 6, { align: 'center' });
        
        // Thank you message
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bolditalic');
        doc.setTextColor(...primaryBlue);
        doc.text('Thank You For Your Business!', pageWidth / 2, footerY + 20, { align: 'center' });
      }
      
      // Download the PDF
      doc.save(`Fire_Guide_Statement_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success(`Statement downloaded with ${invoices.length} invoice(s) and ${fields.length} field(s)`);
    } catch (err: any) {
      console.error("Error downloading statement:", err);
      toast.error(err?.message || "Failed to download statement");
    } finally {
      setIsDownloading(false);
    }
  };

  const { fields } = extractFieldsFromAPI;

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8">
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            {/* Logo */}
            <div className="w-12 h-12 bg-red-600 flex items-center justify-center rounded">
              <span className="text-white font-bold text-sm">FG</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Fire Guide</h1>
            </div>
          </div>
          
          {/* Statement Header */}
          <div className="text-right">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">STATEMENT</h2>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-end gap-4">
                <span>Statement Date</span>
                <span className="text-gray-900 font-medium">{new Date().toLocaleDateString('en-GB')}</span>
              </div>
              <div className="flex justify-end gap-4">
                <span>Statement #</span>
                <span className="text-gray-900 font-medium">STM-{new Date().getFullYear()}-{String(invoices.length).padStart(4, '0')}</span>
              </div>
              <div className="flex justify-end gap-4">
                <span>Total Entries</span>
                <span className="text-gray-900 font-medium">{invoices.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Statement Section */}
        <div className="flex flex-col md:flex-row md:justify-between mb-8">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Professional Statement</h3>
            <div className="space-y-1 text-sm text-gray-700">
              <p>Fire Guide Professional</p>
              <p>Payment History Report</p>
              <p>United Kingdom</p>
            </div>
          </div>

          {/* Account Summary Box - Only if total_amount field exists */}
          {fields.some(f => f.key === 'total_amount') && (
            <div className="mt-6 md:mt-0 bg-gray-50 border border-gray-200 rounded-lg p-4 w-full md:w-64">
              <h4 className="text-sm font-bold text-[#003366] mb-3">Account Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-semibold">Total Amount</span>
                  <span className="text-gray-900 font-bold">£{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Download Button */}
        <div className="mb-6">
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleDownloadAllInvoice}
            disabled={isDownloading || isLoading || invoices.length === 0}
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download All Invoice
              </>
            )}
          </Button>
        </div>

        {/* Payment History Table - Dynamically generated from API fields */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Payment History</h3>
          
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Loading payment history...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-2">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchInvoices}>
                Retry
              </Button>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No payment records found</p>
            </div>
          ) : fields.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No fields found in API response</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#003366] text-white">
                    {fields.map((field) => (
                      <th 
                        key={field.key}
                        className={`p-3 text-xs font-bold uppercase ${
                          field.key === 'total_amount' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {field.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice, index) => (
                    <tr 
                      key={invoice.id} 
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      {fields.map((field) => {
                        const value = field.getValue(invoice);
                        return (
                          <td 
                            key={field.key}
                            className={`p-3 text-sm text-gray-900 ${
                              field.key === 'total_amount' ? 'text-right font-medium' : ''
                            }`}
                          >
                            {field.key === 'total_amount' && value ? `£${value}` : value}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Total Amount Box - Only if total_amount field exists */}
        {fields.some(f => f.key === 'total_amount') && (
          <div className="mb-8">
            <div className="bg-gray-50 border border-[#003366] rounded-lg p-4 w-full md:w-64 ml-auto">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-[#003366]">Total Amount:</span>
                <span className="text-gray-900 font-bold">£{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center space-y-2 pt-8 border-t">
          <p className="text-sm text-gray-600">
            If you have any questions about this statement, please contact
          </p>
          <p className="text-sm text-gray-600">
            Fire Guide Support | support@fireguide.co.uk
          </p>
          <p className="text-lg font-bold italic text-[#003366] mt-4">
            Thank You For Your Business!
          </p>
        </div>
      </div>
    </div>
  );
}
