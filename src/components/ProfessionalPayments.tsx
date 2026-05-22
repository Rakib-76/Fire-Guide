import React, { useState, useEffect } from "react";
import { 
  DollarSign, 
  Download, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Calendar, 
  Search,
  Loader2
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { filterPaymentInvoices, PaymentInvoiceItem, getEarningsSummary, getMonthlyEarnings, type PaymentInvoiceFilterPeriod } from "../api/paymentService";
import { getApiToken } from "../lib/auth";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fireGuideLogoImage from "../assets/FireguideLogo.png";

function loadImageForPdf(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Logo image failed to load"));
    img.src = src;
  });
}

/** Fire Guide logo in PDF header (replaces red FG placeholder). */
async function drawFireGuidePdfHeader(
  doc: jsPDF,
  opts?: { margin?: number; y?: number; logoMaxH?: number; logoMaxW?: number }
): Promise<void> {
  const margin = opts?.margin ?? 14;
  const y = opts?.y ?? 10;
  const logoMaxH = opts?.logoMaxH ?? 16;
  const logoMaxW = opts?.logoMaxW ?? 95;
  try {
    const logoImg = await loadImageForPdf(fireGuideLogoImage);
    const nw = logoImg.naturalWidth || logoImg.width;
    const nh = logoImg.naturalHeight || logoImg.height;
    const ratio = nw > 0 && nh > 0 ? nw / nh : 3.5;
    let logoH = logoMaxH;
    let logoW = logoH * ratio;
    if (logoW > logoMaxW) {
      logoW = logoMaxW;
      logoH = logoW / ratio;
    }
    doc.addImage(logoImg, "PNG", margin, y, logoW, logoH);
  } catch {
    doc.setFillColor(220, 38, 38);
    doc.rect(margin, y, 18, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("FG", margin + 5, y + 8);
  }
}

interface PaymentHistoryItem {
  id: number;
  reference: string;
  bookingRef: string;
  date: string;
  customer: string;
  service: string;
  amount: number;
  commission: number;
  netAmount: number;
  status: "paid" | "pending";
  paidOn: string | null;
}

const PAYMENT_FILTER_LABELS: Record<PaymentInvoiceFilterPeriod, string> = {
  all_time: "All Time",
  this_month: "This Month",
  this_quarter: "This Quarter",
  this_year: "This Year",
};

const formatGbp = (amount: number): string =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

export function ProfessionalPayments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<PaymentInvoiceFilterPeriod>("all_time");
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState({
    available: 0,
    pending: 0,
    total: 0
  });
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [monthlyEarnings, setMonthlyEarnings] = useState<Array<{ month: string; earnings: number; jobs: number }>>([]);
  const [isLoadingMonthlyEarnings, setIsLoadingMonthlyEarnings] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Function to download statement as PDF using Payment History data
  const handleDownloadStatement = async () => {
    try {
      setIsDownloading(true);
      
      // Use the paymentHistory state which is already loaded from the API
      if (!paymentHistory || paymentHistory.length === 0) {
        toast.error("No payment history found to download");
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Colors
      const primaryBlue = [0, 51, 102] as [number, number, number];
      const headerBg = [0, 51, 102] as [number, number, number];
      const lightGray = [245, 245, 245] as [number, number, number];
      
      // Calculate totals from payment history
      const totalAmount = paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
      const totalCommission = paymentHistory.reduce((sum, payment) => sum + payment.commission, 0);
      const totalNetEarnings = paymentHistory.reduce((sum, payment) => sum + payment.netAmount, 0);
      const statementDate = new Date().toLocaleDateString('en-GB');
      const statementNumber = `STM-${new Date().getFullYear()}-${String(paymentHistory.length).padStart(4, '0')}`;
      
      await drawFireGuidePdfHeader(doc, { margin: 14, y: 10, logoMaxH: 16, logoMaxW: 95 });
      
      // STATEMENT Title
      doc.setTextColor(...primaryBlue);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('STATEMENT', pageWidth - 14, 18, { align: 'right' });
      
      // Statement Info Box (right side)
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Statement Date', pageWidth - 60, 30);
      doc.text('Statement #', pageWidth - 60, 37);
      doc.text('Total Entries', pageWidth - 60, 44);
      
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text(statementDate, pageWidth - 14, 30, { align: 'right' });
      doc.text(statementNumber, pageWidth - 14, 37, { align: 'right' });
      doc.text(String(paymentHistory.length), pageWidth - 14, 44, { align: 'right' });
      
      // Bill To Section
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Professional Statement', 14, 35);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Fire Guide Professional', 14, 42);
      doc.text('Payment History Report', 14, 48);
      doc.text('United Kingdom', 14, 54);
      
      // Account Summary Box
      const summaryY = 65;
      doc.setFillColor(...lightGray);
      doc.rect(pageWidth - 80, summaryY, 66, 32, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(pageWidth - 80, summaryY, 66, 32, 'S');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryBlue);
      doc.text('Account Summary', pageWidth - 77, summaryY + 7);
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Total Amount', pageWidth - 77, summaryY + 14);
      doc.setTextColor(0, 0, 0);
      doc.text(`£${totalAmount.toFixed(2)}`, pageWidth - 17, summaryY + 14, { align: 'right' });
      
      doc.setTextColor(100, 100, 100);
      doc.text('Commission (15%)', pageWidth - 77, summaryY + 21);
      doc.setTextColor(220, 38, 38);
      doc.text(`-£${totalCommission.toFixed(2)}`, pageWidth - 17, summaryY + 21, { align: 'right' });
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('Your Earnings', pageWidth - 77, summaryY + 28);
      doc.setTextColor(34, 139, 34);
      doc.text(`£${totalNetEarnings.toFixed(2)}`, pageWidth - 17, summaryY + 28, { align: 'right' });
      
      // Payment History Section
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Payment History', 14, 105);
      
      // Table data from paymentHistory
      const tableData = paymentHistory.map((payment) => {
        return [
          payment.reference,
          payment.date,
          payment.customer,
          payment.service,
          `£${payment.amount.toFixed(2)}`,
          `-£${payment.commission.toFixed(2)}`,
          `£${payment.netAmount.toFixed(2)}`,
          payment.status.charAt(0).toUpperCase() + payment.status.slice(1)
        ];
      });
      
      // Add the table
      autoTable(doc, {
        startY: 110,
        head: [['REFERENCE', 'DATE', 'CUSTOMER', 'SERVICE', 'AMOUNT', 'COMMISSION', 'EARNINGS', 'STATUS']],
        body: tableData,
        theme: 'plain',
        headStyles: {
          fillColor: headerBg,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7,
          cellPadding: 2,
        },
        bodyStyles: {
          fontSize: 7,
          cellPadding: 2,
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 22 },
          2: { cellWidth: 22 },
          3: { cellWidth: 32 },
          4: { cellWidth: 18, halign: 'right' },
          5: { cellWidth: 22, halign: 'right', textColor: [220, 38, 38] },
          6: { cellWidth: 20, halign: 'right', textColor: [34, 139, 34] },
          7: { cellWidth: 18, halign: 'center' },
        },
        margin: { left: 14, right: 14 },
      });
      
      // Get the final Y position after the table
      const finalY = (doc as any).lastAutoTable?.finalY || 150;
      
      // Total Earnings Box
      const balanceBoxY = finalY + 15;
      doc.setFillColor(...lightGray);
      doc.rect(pageWidth - 80, balanceBoxY, 66, 12, 'F');
      doc.setDrawColor(...primaryBlue);
      doc.setLineWidth(0.5);
      doc.rect(pageWidth - 80, balanceBoxY, 66, 12, 'S');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryBlue);
      doc.text('Total Earnings:', pageWidth - 77, balanceBoxY + 8);
      doc.setTextColor(34, 139, 34);
      doc.text(`£${totalNetEarnings.toFixed(2)}`, pageWidth - 17, balanceBoxY + 8, { align: 'right' });
      
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
      
      // Download the PDF
      doc.save(`Fire_Guide_Statement_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success(`Statement downloaded with ${paymentHistory.length} payment(s)`);
    } catch (err: any) {
      console.error("Error downloading statement:", err);
      toast.error(err?.message || "Failed to download statement");
    } finally {
      setIsDownloading(false);
    }
  };

  // Helper function to format date
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

  // Helper function to map API response to PaymentHistoryItem
  const mapApiResponseToPayment = (apiPayment: PaymentInvoiceItem): PaymentHistoryItem => {
    const amount = parseFloat(apiPayment.price) || 0;
    const commission = amount * 0.15; // 15% commission
    const netAmount = amount - commission;
    
    // Get customer name from professional_booking or cardholder_name
    const customer = apiPayment.professional_booking?.first_name || apiPayment.cardholder_name || "Unknown";
    
    // Generate booking reference from professional_booking id or use tx_ref
    const bookingRef = apiPayment.professional_booking 
      ? `FG-${apiPayment.professional_booking.id}` 
      : apiPayment.tx_ref || `INV-${apiPayment.id}`;
    
    // Get paid date if status is paid
    const paidOn = apiPayment.status === "paid" && apiPayment.updated_at 
      ? formatDate(apiPayment.updated_at) 
      : null;

    // Get service name from API response
    const serviceName = apiPayment.service?.name || "Fire Risk Assessment";

    return {
      id: apiPayment.id,
      reference: apiPayment.tx_ref || `INV-${apiPayment.id}`,
      bookingRef: bookingRef,
      date: formatDate(apiPayment.created_at),
      customer: customer,
      service: serviceName,
      amount: amount,
      commission: commission,
      netAmount: netAmount,
      status: apiPayment.status === "paid" ? "paid" : "pending",
      paidOn: paidOn
    };
  };

  // Fetch earnings summary from API
  const fetchEarningsSummary = async () => {
    try {
      setIsLoadingBalance(true);
      const apiToken = getApiToken();
      if (!apiToken) {
        console.warn("No API token available for fetching earnings summary");
        return;
      }

      const summary = await getEarningsSummary(apiToken);
      if (summary.success && summary.data) {
        setBalance({
          available: summary.data.available_balance || 0,
          pending: summary.data.pending || 0,
          total: summary.data.total_earned || 0
        });
      }
    } catch (err: any) {
      console.error("Error fetching earnings summary:", err);
      // Don't show toast for earnings summary errors, just log them
      // Keep default values (0) on error
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Fetch monthly earnings from API
  const fetchMonthlyEarnings = async () => {
    try {
      setIsLoadingMonthlyEarnings(true);
      const apiToken = getApiToken();
      if (!apiToken) {
        console.warn("No API token available for fetching monthly earnings");
        return;
      }

      const earnings = await getMonthlyEarnings(apiToken);
      console.log("Raw monthly earnings from API:", earnings);
      
      // Map API response to expected format with safe defaults
      const mappedEarnings = earnings.map((item: any) => ({
        month: item.month || item.name || 'Unknown',
        earnings: typeof item.earnings === 'number' ? item.earnings : 
                  typeof item.amount === 'number' ? item.amount :
                  typeof item.total === 'number' ? item.total :
                  parseFloat(item.earnings) || parseFloat(item.amount) || parseFloat(item.total) || 0,
        jobs: typeof item.jobs === 'number' ? item.jobs :
              typeof item.count === 'number' ? item.count :
              parseInt(item.jobs) || parseInt(item.count) || 0
      }));
      
      console.log("Mapped monthly earnings:", mappedEarnings);
      setMonthlyEarnings(mappedEarnings);
    } catch (err: any) {
      console.error("Error fetching monthly earnings:", err);
      // Don't show toast for monthly earnings errors, just log them
      // Keep empty array on error
      setMonthlyEarnings([]);
    } finally {
      setIsLoadingMonthlyEarnings(false);
    }
  };

  // Fetch payment invoices from API (optionally filtered by period)
  const fetchPaymentInvoices = async (filter: PaymentInvoiceFilterPeriod = filterPeriod) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const apiToken = getApiToken();
      if (!apiToken) {
        throw new Error("API token not found. Please log in.");
      }

      const invoices = await filterPaymentInvoices(apiToken, filter);
      const mappedPayments = invoices.map(mapApiResponseToPayment);
      
      // Sort by date (newest first)
      mappedPayments.sort((a, b) => {
        const dateA = new Date(invoices.find(inv => inv.id === a.id)?.created_at || '');
        const dateB = new Date(invoices.find(inv => inv.id === b.id)?.created_at || '');
        return dateB.getTime() - dateA.getTime();
      });
      
      setPaymentHistory(mappedPayments);
    } catch (err: any) {
      console.error("Error fetching payment invoices:", err);
      setError(err?.message || "Failed to fetch payment invoices");
      toast.error(err?.message || "Failed to fetch payment invoices");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch earnings on mount; payment history refetches when filter changes
  useEffect(() => {
    fetchEarningsSummary();
    fetchMonthlyEarnings();
  }, []);

  useEffect(() => {
    void fetchPaymentInvoices(filterPeriod);
  }, [filterPeriod]);

  const filteredPayments = paymentHistory.filter((payment) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      payment.reference.toLowerCase().includes(searchLower) ||
      payment.bookingRef.toLowerCase().includes(searchLower) ||
      payment.customer.toLowerCase().includes(searchLower) ||
      payment.service.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Page Header - Mobile Optimized */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-5 md:mt-0">
        <div>
          <h1 className="text-[#0A1A2F] mb-2">Payments & Earnings</h1>
          <p className="text-gray-600">Track your income and payment history</p>
        </div>
        <Button 
          className="bg-red-600 hover:bg-red-700 w-full md:w-auto"
          onClick={handleDownloadStatement}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Download Statement
            </>
          )}
        </Button>
      </div>

      {/* Balance Cards - Mobile Optimized */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
        {/* Available Balance - Green Card */}
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-green-100 text-sm">Available Balance</p>
              <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-green-100" />
            </div>
            <p className="text-3xl md:text-4xl font-bold">{formatGbp(balance.available)}</p>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Pending</p>
              <Clock className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" />
            </div>
            <p className="text-3xl md:text-4xl text-[#0A1A2F] font-bold mb-2">{formatGbp(balance.pending)}</p>
            <p className="text-sm text-gray-500">Will be available in 2-3 days</p>
          </CardContent>
        </Card>

        {/* Total Earned */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Total Earned</p>
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            </div>
            <p className="text-3xl md:text-4xl text-[#0A1A2F] font-bold mb-2">{formatGbp(balance.total)}</p>
            <p className="text-sm text-green-600 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              +18% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Earnings - Mobile Optimized Stacked Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#0A1A2F]">Monthly Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {monthlyEarnings.map((month, index) => (
              <div key={index} className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm md:text-base">{month.month || "Unknown"}</p>
                    <p className="text-xs md:text-sm text-gray-500">{month.jobs || 0} completed jobs</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-xl md:text-2xl font-semibold text-gray-900">{formatGbp(month.earnings ?? 0)}</p>
                  <p className="text-xs md:text-sm text-gray-500 whitespace-nowrap">after commission</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Commission Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-blue-900">Commission Structure</p>
              <p className="text-sm text-blue-800 mt-1">
                Fire Guide charges a 15% platform commission on each booking. Your earnings are automatically calculated and displayed below.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <CardTitle className="text-[#0A1A2F]">Payment History</CardTitle>
            <Select
              value={filterPeriod}
              onValueChange={(value) => setFilterPeriod(value as PaymentInvoiceFilterPeriod)}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue
                  placeholder="All Time"
                  label={PAYMENT_FILTER_LABELS[filterPeriod]}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_time">All Time</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="this_quarter">This Quarter</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Mobile: Card-based layout, Desktop: Table */}
          <div className="block md:hidden space-y-3">
            {filteredPayments.map((payment) => (
              <div key={payment.id} className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{payment.reference}</p>
                    <p className="text-xs text-gray-500">{payment.bookingRef}</p>
                  </div>
                  {payment.status === "paid" ? (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Paid
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-700">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-gray-700">{payment.customer}</p>
                  <p className="text-sm text-gray-600">{payment.service}</p>
                  <p className="text-xs text-gray-500">{payment.date}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                  <div>
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="font-semibold text-gray-900 text-sm">£{payment.amount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Commission</p>
                    <p className="text-sm text-red-600">-£{payment.commission.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Earnings</p>
                    <p className="font-semibold text-green-600 text-sm">£{payment.netAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Reference</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Date</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Customer</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Service</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Amount</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Commission</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Your Earnings</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{payment.reference}</p>
                      <p className="text-xs text-gray-500">{payment.bookingRef}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-900">{payment.date}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-900">{payment.customer}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-700">{payment.service}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-gray-900">£{payment.amount}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-red-600">-£{payment.commission.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">15%</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-green-600">£{payment.netAmount.toFixed(2)}</p>
                    </td>
                    <td className="p-4">
                      {payment.status === "paid" ? (
                        <div>
                          <Badge className="bg-green-100 text-green-700 mb-1">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Paid
                          </Badge>
                          <p className="text-xs text-gray-500">{payment.paidOn}</p>
                        </div>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-700">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isLoading && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Loading payment history...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="text-center py-12">
              <p className="text-red-500 mb-2">{error}</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => void fetchPaymentInvoices(filterPeriod)}
              >
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !error && filteredPayments.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No payment records found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout Settings — hidden until bank payout flow is ready
      <Card>
        <CardHeader>
          <CardTitle className="text-[#0A1A2F]">Payout Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Bank Account</p>
                  <p className="text-sm text-gray-600 mt-1">**** **** **** 1234</p>
                  <p className="text-sm text-gray-500">Barclays Bank</p>
                </div>
                <Badge className="bg-green-100 text-green-700 w-fit">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              Update Bank Details
            </Button>
          </div>
        </CardContent>
      </Card>
      */}
    </div>
  );
}