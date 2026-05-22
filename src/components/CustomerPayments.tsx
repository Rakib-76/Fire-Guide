import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { 
  CreditCard, 
  Download, 
  Calendar,
  CheckCircle,
  Receipt,
  Filter,
  Loader2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import { Payment } from "../App";
import { getCustomerPayments, CustomerPaymentItem, getPaymentsSummary } from "../api/authService";
import { getApiToken } from "../lib/auth";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fireGuideReportMark from "../assets/FireguideLogo.png";

interface CustomerPaymentsProps {
  payments: Payment[];
}

function loadImageForPdf(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Logo image failed to load"));
    img.src = src;
  });
}

/** Brand mark for jsPDF headers (replaces red FG placeholder). */
async function drawFireGuidePdfHeader(
  doc: jsPDF,
  opts?: { margin?: number; y?: number; logoMaxH?: number; logoMaxW?: number }
): Promise<void> {
  const margin = opts?.margin ?? 14;
  const y = opts?.y ?? 7;
  const logoMaxH = opts?.logoMaxH ?? 18;
  const logoMaxW = opts?.logoMaxW ?? 68;
  try {
    const logoImg = await loadImageForPdf(fireGuideReportMark);
    const nw = logoImg.naturalWidth || logoImg.width;
    const nh = logoImg.naturalHeight || logoImg.height;
    const ratio = nw > 0 && nh > 0 ? nw / nh : 1;
    let logoW = logoMaxW;
    let logoH = logoW / ratio;
    if (logoH > logoMaxH) {
      logoH = logoMaxH;
      logoW = logoH * ratio;
    }
    doc.addImage(logoImg, "PNG", margin, y, logoW, logoH);
  } catch {
    doc.setFillColor(220, 38, 38);
    doc.rect(margin, 9, 18, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("FG", margin + 5, 17.5);
  }
}

function paymentStatusLabel(status: Payment["status"]): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "unpaid":
      return "Unpaid";
    case "refunded":
      return "Refunded";
    default:
      return "Pending";
  }
}

// Transform API payment to local Payment format
const transformApiPayment = (apiPayment: CustomerPaymentItem): Payment => {
  const p = apiPayment.payment;
  const svc = apiPayment.service;
  const serviceLabel =
    (svc?.service_name && String(svc.service_name).trim()) ||
    (svc?.name && String(svc.name).trim()) ||
    "Fire Safety Service";
  const priceRaw =
    p != null && p.price != null && String(p.price).trim() !== ""
      ? p.price
      : svc?.price ?? "0";
  const amountNum = parseFloat(String(priceRaw).replace(/[^0-9.-]/g, "")) || 0;

  let status: Payment["status"];
  if (p == null) {
    status = "unpaid";
  } else {
    const s = String(p.status || "").toLowerCase();
    if (s === "paid") status = "paid";
    else if (s === "refunded") status = "refunded";
    else status = "pending";
  }

  return {
    id: apiPayment.booking_id.toString(),
    date: apiPayment.selected_date,
    service: serviceLabel,
    amount: `£${amountNum.toFixed(2)}`,
    status,
    invoiceNumber: `INV-${apiPayment.booking_id}`,
    bookingRef: `FG-${apiPayment.booking_id}`,
    paymentMethod: "Visa ending 4242",
    professional: apiPayment.professional?.name || "Professional",
  };
};

export const CustomerPayments = React.memo(function CustomerPayments({ payments: propPayments }: CustomerPaymentsProps) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  
  // API data state
  const [apiPayments, setApiPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentsSummary, setPaymentsSummary] = useState<{ paid_count: number; paid_total: number } | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  // Fetch payments summary from API (for cards)
  useEffect(() => {
    const fetchPaymentsSummary = async () => {
      const token = getApiToken();
      if (!token) {
        console.log('No API token available for payments summary');
        setIsLoadingSummary(false);
        return;
      }

      setIsLoadingSummary(true);
      try {
        const response = await getPaymentsSummary(token);
        if (response.status === 'success' && response.data) {
          console.log('Payments summary from API:', response.data);
          setPaymentsSummary({
            paid_count: response.data.paid_count || 0,
            paid_total: response.data.paid_total || 0
          });
        } else {
          console.error('Failed to fetch payments summary:', response.message || response.error);
          setPaymentsSummary(null);
        }
      } catch (error: any) {
        console.error('Error fetching payments summary:', error);
        setPaymentsSummary(null);
      } finally {
        setIsLoadingSummary(false);
      }
    };

    fetchPaymentsSummary();
  }, []);

  // Fetch payments from API
  useEffect(() => {
    const fetchPayments = async () => {
      const token = getApiToken();
      if (!token) {
        console.log('No API token available for payments');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await getCustomerPayments(token);
        if (response.status === 'success' && response.data?.items) {
          const transformedPayments = response.data.items.map(transformApiPayment);
          setApiPayments(transformedPayments);
        } else {
          console.error('Failed to fetch payments:', response.message || response.error);
          setApiPayments([]);
        }
      } catch (error: any) {
        console.error('Error fetching payments:', error);
        setApiPayments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
  }, []);

  // Use API payments
  const payments = apiPayments;

  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      if (filterStatus !== "all" && payment.status !== filterStatus) {
        return false;
      }
      
      if (filterPeriod !== "all") {
        const paymentDate = new Date(payment.date);
        const now = new Date();
        const monthsAgo = parseInt(filterPeriod);
        const cutoffDate = new Date(now.setMonth(now.getMonth() - monthsAgo));
        if (paymentDate < cutoffDate) {
          return false;
        }
      }
      
      return true;
    });
  }, [payments, filterStatus, filterPeriod]);

  // Use API summary data for cards, fallback to calculated values if API data not available
  const totalPaid = useMemo(() => {
    if (paymentsSummary?.paid_total !== undefined && paymentsSummary.paid_total !== null) {
      return paymentsSummary.paid_total;
    }
    // Fallback to calculated value if API summary not available
    return payments
      .filter(p => p.status === "paid")
      .reduce((sum, p) => sum + parseFloat(p.amount.replace("£", "").replace(",", "")), 0);
  }, [paymentsSummary, payments]);

  const totalPaymentsCount = useMemo(() => {
    if (paymentsSummary?.paid_count !== undefined && paymentsSummary.paid_count !== null) {
      return paymentsSummary.paid_count;
    }
    // Fallback to payments length if API summary not available
    return payments.length;
  }, [paymentsSummary, payments]);

  const getStatusColor = (status: Payment["status"]) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 border border-green-200";
      case "unpaid":
        return "bg-red-600 text-white border border-red-700";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      case "refunded":
        return "bg-gray-100 text-gray-800 border border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const handleDownloadInvoice = async (invoiceNumber: string) => {
    // Find the payment by invoice number
    const payment = payments.find(p => p.invoiceNumber === invoiceNumber);
    
    if (!payment) {
      toast.error(`Invoice ${invoiceNumber} not found.`);
      return;
    }

    toast.info(`Generating invoice ${invoiceNumber}...`);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Colors
      const primaryColor: [number, number, number] = [10, 26, 47]; // #0A1A2F
      const redColor: [number, number, number] = [220, 38, 38]; // red-600
      const grayColor: [number, number, number] = [107, 114, 128];
      const headerBg: [number, number, number] = [0, 51, 102]; // #003366
      
      await drawFireGuidePdfHeader(doc, { margin: 14, y: 7 });
      
      // INVOICE title
      doc.setTextColor(...primaryColor);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', pageWidth - 14, 24, { align: 'right' });
      
      // Invoice details (right side)
      const invoiceDate = new Date(payment.date).toLocaleDateString('en-GB');
      // Format date for table (more compact: "26 Jan 2026" on single line)
      const formattedDate = new Date(payment.date).toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...grayColor);
      
      doc.text('Invoice Date', pageWidth - 55, 38);
      doc.text('Invoice #', pageWidth - 55, 46);
      doc.text('Status', pageWidth - 55, 54);
      
      doc.setTextColor(...primaryColor);
      doc.setFont('helvetica', 'bold');
      doc.text(invoiceDate, pageWidth - 14, 38, { align: 'right' });
      doc.text(payment.invoiceNumber, pageWidth - 14, 46, { align: 'right' });
      doc.text(paymentStatusLabel(payment.status), pageWidth - 14, 54, { align: 'right' });
      
      // Customer/Professional info (left side)
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.setFontSize(11);
      doc.text('Invoice Details', 14, 42);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...grayColor);
      doc.text('Service: ' + payment.service, 14, 50);
      doc.text('Professional: ' + payment.professional, 14, 57);
      doc.text('Booking Ref: ' + payment.bookingRef, 14, 64);
      
      // Invoice Summary box
      const summaryY = 75;
      doc.setFillColor(248, 250, 252);
      doc.rect(pageWidth - 85, summaryY, 71, 30, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.setFontSize(10);
      doc.text('Invoice Summary', pageWidth - 80, summaryY + 7);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...grayColor);
      doc.text('Service', pageWidth - 80, summaryY + 15);
      doc.text('Amount', pageWidth - 80, summaryY + 23);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text(payment.service, pageWidth - 14, summaryY + 15, { align: 'right' });
      doc.setFontSize(12);
      doc.text(payment.amount, pageWidth - 14, summaryY + 23, { align: 'right' });
      
      // Payment History Section
      const historyY = summaryY + 50;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.setFontSize(12);
      doc.text('Payment History', 14, historyY);
      
      // Payment History table (customer invoice — no commission / earnings)
      const tableData = [[
        payment.invoiceNumber,
        formattedDate,
        payment.professional,
        payment.service,
        payment.amount,
        paymentStatusLabel(payment.status),
      ]];
      
      autoTable(doc, {
        startY: historyY + 5,
        head: [['REFERENCE', 'DATE', 'PROFESSIONAL', 'SERVICE', 'AMOUNT', 'STATUS']],
        body: tableData,
        theme: 'plain',
        headStyles: {
          fillColor: headerBg,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7,
          cellPadding: 4,
          minCellHeight: 8,
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 4,
        },
        columnStyles: {
          0: { cellWidth: 32 },
          1: { cellWidth: 28 },
          2: { cellWidth: 34 },
          3: { cellWidth: 38 },
          4: { cellWidth: 24, halign: 'right' },
          5: { cellWidth: 22, halign: 'center' },
        },
        margin: { left: 14, right: 14 },
      });
      
      // Get final Y position after table
      const finalY = (doc as any).lastAutoTable?.finalY || historyY + 30;
      
      // Payment Information
      const paymentInfoY = finalY + 10;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.setFontSize(11);
      doc.text('Payment Information', 14, paymentInfoY);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...grayColor);
      doc.text('Payment Method: ' + payment.paymentMethod, 14, paymentInfoY + 8);
      doc.text('Date: ' + invoiceDate, 14, paymentInfoY + 15);
      doc.text("Status: " + paymentStatusLabel(payment.status), 14, paymentInfoY + 22);
      
      // Footer
      const footerY = paymentInfoY + 32;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...grayColor);
      doc.setFontSize(8);
      doc.text('If you have any questions about this invoice, please contact', pageWidth / 2, footerY, { align: 'center' });
      doc.text('Fire Guide Support | support@fireguide.co.uk', pageWidth / 2, footerY + 6, { align: 'center' });
      
      doc.setFont('helvetica', 'bolditalic');
      doc.setTextColor(...redColor);
      doc.setFontSize(11);
      doc.text('Thank You', pageWidth / 2, footerY + 20, { align: 'center' });
      
      // Save PDF
      const fileName = `Invoice_${payment.invoiceNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success(`Invoice ${invoiceNumber} downloaded successfully!`);
    } catch (error: any) {
      console.error('Error generating invoice PDF:', error);
      toast.error("Failed to generate invoice. Please try again.");
    }
  };

  // Generate statement PDF using the payment data shown in cards
  const handleDownloadAll = async () => {
    if (payments.length === 0) {
      toast.error("No payments found to download.");
      return;
    }

    toast.info("Generating statement...");
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Colors
      const primaryColor: [number, number, number] = [10, 26, 47]; // #0A1A2F
      const redColor: [number, number, number] = [220, 38, 38]; // red-600
      const grayColor: [number, number, number] = [107, 114, 128];
      
      await drawFireGuidePdfHeader(doc, { margin: 14, y: 7 });
      
      // STATEMENT title
      doc.setTextColor(...primaryColor);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('STATEMENT', pageWidth - 14, 24, { align: 'right' });
      
      // Statement details (right side)
      const today = new Date();
      const statementDate = today.toLocaleDateString('en-GB');
      const statementNumber = `STM-${today.getFullYear()}-${String(payments.length).padStart(4, '0')}`;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...grayColor);
      
      doc.text('Statement Date', pageWidth - 55, 38);
      doc.text('Statement #', pageWidth - 55, 46);
      doc.text('Total Entries', pageWidth - 55, 54);
      
      doc.setTextColor(...primaryColor);
      doc.setFont('helvetica', 'bold');
      doc.text(statementDate, pageWidth - 14, 38, { align: 'right' });
      doc.text(statementNumber, pageWidth - 14, 46, { align: 'right' });
      doc.text(String(payments.length), pageWidth - 14, 54, { align: 'right' });
      
      // Professional Statement info (left side)
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.setFontSize(11);
      doc.text('Professional Statement', 14, 42);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...grayColor);
      doc.text('Fire Guide Professional', 14, 50);
      doc.text('Payment History Report', 14, 57);
      doc.text('United Kingdom', 14, 64);
      
      const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount.replace('£', '').replace(',', '')), 0);
      
      // Account Summary — customer-facing total only
      doc.setFillColor(248, 250, 252);
      doc.rect(pageWidth - 85, 70, 71, 26, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.setFontSize(10);
      doc.text('Account Summary', pageWidth - 80, 80);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...grayColor);
      doc.text('Total amount', pageWidth - 80, 92);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text(`£${totalAmount.toFixed(2)}`, pageWidth - 14, 92, { align: 'right' });
      
      // Payment History title
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.setFontSize(12);
      doc.text('Payment History', 14, 108);
      
      const tableData = payments.map(payment => {
        const date = new Date(payment.date);
        const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        return [
          payment.invoiceNumber,
          formattedDate,
          payment.professional,
          payment.service,
          payment.amount,
          paymentStatusLabel(payment.status),
        ];
      });
      
      autoTable(doc, {
        startY: 113,
        head: [['REFERENCE', 'DATE', 'PROFESSIONAL', 'SERVICE', 'AMOUNT', 'STATUS']],
        body: tableData,
        theme: 'plain',
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [71, 85, 105],
          fontStyle: 'bold',
          fontSize: 7,
          cellPadding: 2,
        },
        bodyStyles: {
          textColor: [51, 65, 85],
          fontSize: 7,
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 24 },
          2: { cellWidth: 32 },
          3: { cellWidth: 34 },
          4: { cellWidth: 22, halign: 'right' },
          5: { cellWidth: 20, halign: 'center' },
        },
        margin: { left: 14, right: 14 },
        tableWidth: 'auto',
      });
      
      const finalY = (doc as any).lastAutoTable.finalY + 16;
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...grayColor);
      doc.setFontSize(8);
      doc.text('If you have any questions about this statement, please contact', pageWidth / 2, finalY, { align: 'center' });
      doc.text('Fire Guide Support | support@fireguide.co.uk', pageWidth / 2, finalY + 6, { align: 'center' });
      
      doc.setFont('helvetica', 'bolditalic');
      doc.setTextColor(...redColor);
      doc.setFontSize(11);
      doc.text('Thank You', pageWidth / 2, finalY + 20, { align: 'center' });
      
      // Save PDF
      doc.save(`Payment_Statement_${today.toISOString().split('T')[0]}.pdf`);
      
      toast.success("Statement downloaded successfully!");
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error("Failed to generate statement. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Spent</p>
                {isLoadingSummary ? (
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                ) : (
                  <p className="text-2xl font-bold text-[#0A1A2F]">£{totalPaid.toFixed(2)}</p>
                )}
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Payments</p>
                {isLoadingSummary ? (
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                ) : (
                  <p className="text-2xl font-bold text-[#0A1A2F]">{totalPaymentsCount}</p>
                )}
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-row items-center justify-between gap-4">
            <div className="flex flex-row items-center gap-3">
              <Filter className="w-10 h-10 text-gray-400" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="1">Last Month</SelectItem>
                  <SelectItem value="3">Last 3 Months</SelectItem>
                  <SelectItem value="6">Last 6 Months</SelectItem>
                  <SelectItem value="12">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={handleDownloadAll}
            >
              <Download className="w-4 h-4 mr-2" />
              Download All Invoices
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading payments...</p>
          </CardContent>
        </Card>
      ) : filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No payments found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPayments.map((payment) => (
            <Card key={payment.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-[#0A1A2F] mb-1">{payment.service}</h3>
                        <p className="text-sm text-gray-600">Invoice: {payment.invoiceNumber}</p>
                      </div>
                      <Badge variant="custom" className={getStatusColor(payment.status)}>
                        {paymentStatusLabel(payment.status)}
                      </Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(payment.date).toLocaleDateString('en-GB')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <CreditCard className="w-4 h-4" />
                        <span>{payment.paymentMethod}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Receipt className="w-4 h-4" />
                        <span>Booking: {payment.bookingRef}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>{payment.professional}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <p className="text-gray-900">
                        Amount: <span className="text-xl font-semibold">{payment.amount}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex md:flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadInvoice(payment.invoiceNumber)}
                      className="flex-1 md:flex-none"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Invoice
                    </Button>
                    {payment.status === "paid" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadInvoice(payment.invoiceNumber)}
                        className="flex-1 md:flex-none"
                      >
                        <Receipt className="w-4 h-4 mr-2" />
                        Receipt
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
});