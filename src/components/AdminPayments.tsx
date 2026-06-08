import React, { useState, useEffect } from "react";
import { getApiToken } from "../lib/auth";
import {
  createPlatformCommission,
  getAdminPaymentSummary,
  getAdminPaymentFilter,
  type AdminPaymentFilterPeriod,
  type AdminPaymentListItem,
} from "../api/adminService";
import { Search, DollarSign, TrendingUp, TrendingDown, Download, Settings, Eye, Loader2, CheckCircle } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fireGuideLogoImage from "../assets/FireguideLogo.png";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { toast } from "sonner";

function loadImageForPdf(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Logo image failed to load"));
    img.src = src;
  });
}

async function drawFireGuidePdfHeader(
  doc: jsPDF,
  opts?: { margin?: number; y?: number; logoMaxH?: number; logoMaxW?: number }
): Promise<void> {
  const margin = opts?.margin ?? 14;
  const y = opts?.y ?? 10;
  const logoMaxH = opts?.logoMaxH ?? 18;
  const logoMaxW = opts?.logoMaxW ?? 100;
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

const formatGbpPdf = (amount: number): string =>
  `£${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PAYMENT_PERIOD_LABELS: Record<string, string> = {
  all: "All Time",
  today: "Today",
  week: "This Week",
  month: "This Month",
};

function getBookingStatusBadgeClass(status: string): string {
  const base =
    "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-sm font-medium";
  switch (String(status ?? "").trim().toLowerCase()) {
    case "completed":
    case "complete":
      return `${base} bg-green-100 text-green-700 border-green-200`;
    case "confirmed":
    case "confirm":
      return `${base} bg-blue-100 text-blue-700 border-blue-200`;
    case "refunded":
    case "cancelled":
      return `${base} bg-red-100 text-red-700 border-red-200`;
    case "pending":
      return `${base} bg-yellow-100 text-yellow-700 border-yellow-200`;
    default:
      return `${base} bg-gray-100 text-gray-700 border-gray-200`;
  }
}

type TransactionRow = {
  id: string;
  reference: string;
  date: string;
  customer: string;
  customerEmail: string;
  professional: string;
  professionalEmail: string;
  service: string;
  amount: number;
  commission: number;
  commissionRate: string;
  professionalEarning: number;
  status: string;
  payoutStatus: string;
  bookingRef: string;
  paymentMethod: string;
  transactionFee: number;
};

function mapAdminPaymentListToRows(data: AdminPaymentListItem[]): TransactionRow[] {
  return data.map((item, idx) => {
    const parties = item.Parties || "";
    const [customer, professional] = parties.includes(" to ")
      ? parties.split(" to ").map((s) => s.trim())
      : [parties, ""];
    const serviceName = item.services?.[0]?.name ?? "";
    return {
      id: item.reference || `pay-${idx}`,
      reference: item.reference || "",
      date: item.date || "",
      customer: customer || "",
      customerEmail: "",
      professional: professional || "",
      professionalEmail: "",
      service: Array.isArray(item.services)
        ? item.services.map((s) => s.name).join(", ")
        : serviceName,
      amount: parseFloat(String(item.amount)) || 0,
      commission: parseFloat(String(item.commission?.amount ?? item.commission)) || 0,
      commissionRate: item.commission?.rate ?? "",
      professionalEarning: parseFloat(String(item.professional_earning)) || 0,
      status: item.booking_status || "",
      payoutStatus: item.payment_status || "",
      bookingRef: item.reference || "",
      paymentMethod: "—",
      transactionFee: 0,
    };
  });
}

function getPayoutStatusBadgeClass(status: string): string {
  const base =
    "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-medium";
  switch (String(status ?? "").trim().toLowerCase()) {
    case "paid":
      return `${base} bg-green-100 text-green-700 border-green-200`;
    case "pending":
      return `${base} bg-yellow-100 text-yellow-700 border-yellow-200`;
    default:
      return `${base} bg-gray-100 text-gray-700 border-gray-200`;
  }
}

export function AdminPayments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPlaceholder, setSearchPlaceholder] = useState("Search transactions...");
  const [compactLayout, setCompactLayout] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<AdminPaymentFilterPeriod>("all");
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  // const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [commissionRate, setCommissionRate] = useState<string>("");
  const [newCommissionRate, setNewCommissionRate] = useState("15");
  const [commissionUpdating, setCommissionUpdating] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  // const [selectedProfessionals, setSelectedProfessionals] = useState<number[]>([]);

  const [transactions, setTransactions] = useState<TransactionRow[]>([]);

  const filteredTransactions = transactions.filter(
    (transaction) =>
      transaction.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.professional.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.service.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // const pendingPayouts = [
  //   {
  //     id: 1,
  //     professional: "James Patterson",
  //     email: "james.patterson@fireguide.co.uk",
  //     amount: 140.25,
  //     transactions: 1,
  //     oldestDate: "Nov 19, 2025"
  //   },
  //   {
  //     id: 2,
  //     professional: "Lisa Anderson",
  //     email: "lisa.anderson@fireguide.co.uk",
  //     amount: 543.50,
  //     transactions: 3,
  //     oldestDate: "Nov 15, 2025"
  //   }
  // ];

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    pendingPayouts: 0,
    transactionCount: 0
  });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const updateLayout = () => {
      const narrow = mq.matches;
      setCompactLayout(narrow);
      setSearchPlaceholder(narrow ? "Search" : "Search transactions...");
    };
    updateLayout();
    mq.addEventListener("change", updateLayout);
    return () => mq.removeEventListener("change", updateLayout);
  }, []);

  const fetchPaymentTransactions = async (filter: AdminPaymentFilterPeriod = filterPeriod) => {
    const token = getApiToken();
    if (!token) return;
    setIsLoadingList(true);
    try {
      const res = await getAdminPaymentFilter({ api_token: token, filter });
      if (res.success && Array.isArray(res.data)) {
        setTransactions(mapAdminPaymentListToRows(res.data));
      } else {
        setTransactions([]);
        toast.error("Failed to load payment transactions");
      }
    } catch (e: unknown) {
      setTransactions([]);
      const message =
        e && typeof e === "object" && "message" in e && typeof (e as { message: string }).message === "string"
          ? (e as { message: string }).message
          : "Failed to load payment transactions";
      toast.error(message);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    const token = getApiToken();
    if (!token) return;
    getAdminPaymentSummary({ api_token: token })
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          setStats({
            totalRevenue: Number(d.total_revenue) || 0,
            totalCommission: parseFloat(String(d.platform_commission)) || 0,
            pendingPayouts: Number(d.pending_payouts) || 0,
            transactionCount: Number(d.total_transactions) || 0
          });
          if (d.commission_rate) setCommissionRate(d.commission_rate);
        }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    void fetchPaymentTransactions(filterPeriod);
  }, [filterPeriod]);

  const handleCommissionUpdate = async () => {
    const rate = parseFloat(newCommissionRate || "0");
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Please enter a valid commission rate (0-100)");
      return;
    }
    const token = getApiToken();
    if (!token) {
      toast.error("Not authenticated");
      return;
    }
    setCommissionUpdating(true);
    try {
      const res = await createPlatformCommission({ api_token: token, commission_rate: rate });
      if (res.success && res.data) {
        const updatedRate = res.data.commission_rate ?? String(rate);
        setCommissionRate(String(updatedRate).endsWith("%") ? String(updatedRate) : `${updatedRate}%`);
        setNewCommissionRate(String(updatedRate).replace(/%$/, "") || String(rate));
        toast.success(res.message || `Commission rate updated to ${updatedRate}%`);
        setCommissionModalOpen(false);
      } else {
        toast.error(res.message || "Failed to update commission rate");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update commission rate");
    } finally {
      setCommissionUpdating(false);
    }
  };

  // const handlePayoutSelected = () => {
  //   if (selectedProfessionals.length === 0) {
  //     toast.error("Please select at least one professional");
  //     return;
  //   }
  //   toast.success(`Processing payouts for ${selectedProfessionals.length} professional(s)`);
  //   setSelectedProfessionals([]);
  //   setPayoutModalOpen(false);
  // };

  // const toggleProfessionalSelection = (id: number) => {
  //   setSelectedProfessionals(prev =>
  //     prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
  //   );
  // };

  // const totalSelectedPayout = selectedProfessionals.reduce((sum, id) => {
  //   const prof = pendingPayouts.find(p => p.id === id);
  //   return sum + (prof?.amount || 0);
  // }, 0);

  const handleExportReport = async () => {
    if (filteredTransactions.length === 0) {
      toast.error("No transactions to export. Adjust your search or try again later.");
      return;
    }

    try {
      setIsExporting(true);
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const primaryBlue: [number, number, number] = [10, 26, 47];
      const headerBg: [number, number, number] = [10, 26, 47];
      const lightGray: [number, number, number] = [245, 245, 245];
      const reportDate = new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const periodLabel = PAYMENT_PERIOD_LABELS[filterPeriod] ?? "All Time";

      const exportTotalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
      const exportTotalCommission = filteredTransactions.reduce((sum, t) => sum + t.commission, 0);
      const exportTotalProfessional = filteredTransactions.reduce(
        (sum, t) => sum + t.professionalEarning,
        0
      );

      await drawFireGuidePdfHeader(doc, { margin: 14, y: 8, logoMaxH: 18, logoMaxW: 110 });

      doc.setTextColor(...primaryBlue);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("Payment Management Report", pageWidth - 14, 14, { align: "right" });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(`Generated: ${reportDate}`, pageWidth - 14, 21, { align: "right" });
      doc.text(`Period filter: ${periodLabel}`, pageWidth - 14, 26, { align: "right" });
      doc.text(`Transactions: ${filteredTransactions.length}`, pageWidth - 14, 31, {
        align: "right",
      });

      const summaryY = 42;
      doc.setFillColor(...lightGray);
      doc.rect(14, summaryY, pageWidth - 28, 22, "F");
      doc.setDrawColor(200, 200, 200);
      doc.rect(14, summaryY, pageWidth - 28, 22, "S");

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primaryBlue);
      doc.text("Platform Summary (exported rows)", 18, summaryY + 8);

      const col1 = 18;
      const col2 = pageWidth / 2 - 10;
      const col3 = pageWidth - 100;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text("Total Revenue", col1, summaryY + 15);
      doc.text("Platform Commission", col2, summaryY + 15);
      doc.text("Professional Payouts", col3, summaryY + 15);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text(formatGbpPdf(exportTotalAmount), col1, summaryY + 20);
      doc.text(formatGbpPdf(exportTotalCommission), col2, summaryY + 20);
      doc.text(formatGbpPdf(exportTotalProfessional), col3, summaryY + 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Dashboard totals — Revenue: ${formatGbpPdf(stats.totalRevenue)} | Commission: ${formatGbpPdf(stats.totalCommission)} | Pending payouts: ${formatGbpPdf(stats.pendingPayouts)} | All transactions: ${stats.transactionCount}`,
        18,
        summaryY + 26,
        { maxWidth: pageWidth - 36 }
      );

      const tableData = filteredTransactions.map((t) => {
        const parties =
          t.customer && t.professional
            ? `${t.customer} → ${t.professional}`
            : t.customer || t.professional || "—";
        const commissionCell = t.commissionRate
          ? `${formatGbpPdf(t.commission)}\n(${t.commissionRate})`
          : formatGbpPdf(t.commission);
        return [
          t.reference || "—",
          t.date || "—",
          parties,
          t.service || "—",
          formatGbpPdf(t.amount),
          commissionCell,
          formatGbpPdf(t.professionalEarning),
          (t.payoutStatus || "—").toString(),
          (t.status || "—").toString(),
        ];
      });

      autoTable(doc, {
        startY: 72,
        head: [
          [
            "Reference",
            "Date",
            "Parties",
            "Service",
            "Amount",
            "Commission",
            "Professional",
            "Payout",
            "Booking Status",
          ],
        ],
        body: tableData,
        theme: "striped",
        headStyles: {
          fillColor: headerBg,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 7,
          cellPadding: 2,
        },
        bodyStyles: {
          fontSize: 6.5,
          cellPadding: 2,
          overflow: "linebreak",
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 22 },
          2: { cellWidth: 32 },
          3: { cellWidth: 52 },
          4: { cellWidth: 20, halign: "right" },
          5: { cellWidth: 24, halign: "right" },
          6: { cellWidth: 22, halign: "right" },
          7: { cellWidth: 18, halign: "center" },
          8: { cellWidth: 22, halign: "center" },
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text(
            `Fire Guide — Payment Report | Page ${data.pageNumber} of ${pageCount}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 8,
            { align: "center" }
          );
        },
      });

      const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 72;
      const footerY = Math.min(finalY + 12, doc.internal.pageSize.getHeight() - 24);
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...primaryBlue);
      doc.text("Thank you for using Fire Guide Admin.", pageWidth / 2, footerY, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("support@fireguide.co.uk", pageWidth / 2, footerY + 5, { align: "center" });

      const fileDate = new Date().toISOString().split("T")[0];
      doc.save(`Fire_Guide_Payment_Report_${fileDate}.pdf`);
      toast.success(`Exported ${filteredTransactions.length} transaction(s) to PDF`);
    } catch (err: unknown) {
      console.error("Payment report PDF export failed:", err);
      const message = err instanceof Error ? err.message : "Failed to export payment report";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl text-[#0A1A2F] mb-2">Payment Management</h1>
          <p className="text-gray-600">Manage payments, commissions, and payouts</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <Button variant="outline" onClick={() => { setNewCommissionRate(commissionRate.replace(/%$/, "") || ""); setCommissionModalOpen(true); }} className="w-full md:w-auto">
            <Settings className="w-4 h-4 mr-2" />
            <span className="md:inline">Commission Settings</span>
          </Button>
          <Button
            className="w-full bg-red-600 hover:bg-red-700 md:w-auto"
            onClick={handleExportReport}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isExporting ? "Exporting…" : "Export Report"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl text-[#0A1A2F] mt-1">£{stats.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Platform Commission</p>
                <p className="text-2xl text-green-600 mt-1">£{stats.totalCommission.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Current rate: {commissionRate || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Payouts</p>
                <p className="text-2xl text-yellow-600 mt-1">£{stats.pendingPayouts.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            {/* Process Payouts entry — hidden with payout modal (restore if needed)
            <Button
              variant="link"
              className="text-xs p-0 h-auto mt-1"
              onClick={() => setPayoutModalOpen(true)}
            >
              Process Payouts →
            </Button>
            */}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total Transactions</p>
            <p className="text-2xl text-[#0A1A2F] mt-1">{stats.transactionCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & period filter */}
      <Card>
        <CardContent className="p-4">
          <div
            className={
              compactLayout
                ? "flex w-full flex-col gap-3"
                : "flex w-full items-center gap-4"
            }
          >
            <div className={compactLayout ? "relative w-full" : "relative min-w-0 flex-1"}>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 w-full pl-10"
              />
            </div>

            <div className={compactLayout ? "w-full shrink-0" : "w-[180px] shrink-0"}>
              <Select
                value={filterPeriod}
                onValueChange={(value) => setFilterPeriod(value as AdminPaymentFilterPeriod)}
              >
                <SelectTrigger className="h-11 w-full px-4" disabled={isLoadingList}>
                  <SelectValue
                    placeholder="All Time"
                    label={PAYMENT_PERIOD_LABELS[filterPeriod] ?? "All Time"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Reference</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Date</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Parties</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Service</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Amount</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Commission</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Professional</th>
                  <th className="min-w-[150px] whitespace-nowrap p-4 text-left text-sm font-medium text-gray-700">
                    Booking Status
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{transaction.reference}</p>
                      <p className="text-xs text-gray-500">{transaction.bookingRef}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-900">{transaction.date}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-900">{transaction.customer}</p>
                      <p className="text-xs text-gray-500">to {transaction.professional}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-700">{transaction.service}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-gray-900">£{Number(transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-green-600">£{Number(transaction.commission).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{transaction.commissionRate || commissionRate || "—"}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-blue-600">£{Number(transaction.professionalEarning).toFixed(2)}</p>
                      <Badge
                        variant="custom"
                        className={`mt-1 ${getPayoutStatusBadgeClass(transaction.payoutStatus)}`}
                      >
                        {transaction.payoutStatus}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap p-4">
                      <Badge variant="custom" className={getBookingStatusBadgeClass(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setDetailsModalOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {/* Payout (paper plane) — hidden with Process Payouts modal
                        {(transaction.payoutStatus === "pending" || transaction.status === "completed" || transaction.status === "confirmed") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTransaction(transaction);
                              setPayoutModalOpen(true);
                            }}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                        */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile / tablet card view */}
          <div className="divide-y lg:hidden">
            {filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="space-y-3 p-4 transition-colors hover:bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-gray-900">{transaction.reference}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{transaction.bookingRef}</p>
                    <p className="mt-1 text-xs text-gray-600">{transaction.date}</p>
                  </div>
                  <Badge variant="custom" className={getBookingStatusBadgeClass(transaction.status)}>
                    {transaction.status}
                  </Badge>
                </div>

                {/* Parties */}
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-500 flex-shrink-0 mt-0.5">From:</span>
                    <span className="text-sm text-gray-900 break-words">{transaction.customer}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-500 flex-shrink-0 mt-0.5">To:</span>
                    <span className="text-sm text-gray-900 break-words">{transaction.professional}</span>
                  </div>
                </div>

                {/* Service */}
                <div>
                  <p className="text-xs text-gray-500">Service</p>
                  <p className="text-sm text-gray-900 mt-0.5 break-words">{transaction.service}</p>
                </div>

                {/* Amount Section */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500">Total Amount</p>
                    <p className="font-semibold text-gray-900 mt-0.5">£{Number(transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Commission</p>
                    <p className="font-semibold text-green-600 mt-0.5">£{Number(transaction.commission).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{transaction.commissionRate || commissionRate || "—"}</p>
                  </div>
                </div>

                {/* Professional Earning & Payout */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500">Professional Earning</p>
                    <p className="font-semibold text-blue-600 mt-0.5">£{Number(transaction.professionalEarning).toFixed(2)}</p>
                  </div>
                  <Badge variant="custom" className={getPayoutStatusBadgeClass(transaction.payoutStatus)}>
                    {transaction.payoutStatus}
                  </Badge>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 w-full"
                  onClick={() => {
                    setSelectedTransaction(transaction);
                    setDetailsModalOpen(true);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4 shrink-0" />
                  View Details
                </Button>
              </div>
            ))}
          </div>

          {isLoadingList && (
            <div className="flex items-center justify-center gap-2 py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" aria-hidden />
              <p className="text-gray-500">Loading transactions…</p>
            </div>
          )}
          {!isLoadingList && filteredTransactions.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-gray-500">
                {searchTerm.trim()
                  ? "No transactions match your search"
                  : "No transactions found for this period"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commission Settings Modal */}
      <Dialog open={commissionModalOpen} onOpenChange={setCommissionModalOpen}>
        <DialogContent className="w-[92%] max-w-[360px] mx-auto p-4 pb-5 max-h-[85vh] overflow-y-auto md:max-w-lg md:p-6">
          <DialogHeader className="text-left mb-3">
            <DialogTitle className="text-lg leading-tight pr-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600 flex-shrink-0" />
              Commission Settings
            </DialogTitle>
            <DialogDescription className="text-sm mt-1.5">
              Update the platform commission rate applied to all transactions
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-xs font-medium text-blue-900 mb-1">Current Commission Rate</p>
              <p className="text-2xl text-blue-600 font-semibold">{commissionRate || "—"}</p>
            </div>

            <div>
              <Label htmlFor="new-commission" className="text-sm font-medium text-gray-700 mb-1.5 block">New Commission Rate (%)</Label>
              <Input
                id="new-commission"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={newCommissionRate}
                onChange={(e) => setNewCommissionRate(e.target.value)}
                className="w-full h-11 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                This rate will apply to all future transactions
              </p>
            </div>

            <div className="h-px bg-gray-200" />

            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-medium text-gray-900">Impact Calculation</h4>
              <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-xs">On £100 transaction</span>
                  <span className="font-semibold text-gray-900 text-sm">£{newCommissionRate} commission</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-xs">Professional receives</span>
                  <span className="font-semibold text-green-600 text-sm">£{(100 - parseFloat(newCommissionRate || "0")).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <Button
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-sm font-medium justify-center"
                onClick={() => void handleCommissionUpdate()}
                disabled={commissionUpdating}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {commissionUpdating ? "Updating..." : "Update Commission Rate"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setCommissionModalOpen(false)}
                className="w-full h-11 text-sm font-medium justify-center border-gray-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payout Management Modal — hidden by request (restore with state + pendingPayouts + handlers above)
      <Dialog open={payoutModalOpen} onOpenChange={setPayoutModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#0A1A2F] flex items-center gap-2">
              <Send className="w-6 h-6 text-green-600" />
              Process Payouts
            </DialogTitle>
            <DialogDescription>
              Select professionals to process pending payouts
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">Total Pending Payouts</p>
              <p className="text-2xl text-orange-600 font-semibold mt-1">
                £{pendingPayouts.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
              </p>
              <p className="text-sm text-orange-600 mt-1">
                {pendingPayouts.length} professional(s) waiting for payment
              </p>
            </div>

            <div className="space-y-3">
              {pendingPayouts.map((payout) => (
                <label
                  key={payout.id}
                  className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedProfessionals.includes(payout.id)}
                    onChange={() => toggleProfessionalSelection(payout.id)}
                    className="w-4 h-4 border-gray-300 rounded text-green-600 focus:ring-green-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{payout.professional}</p>
                    <p className="text-sm text-gray-600">{payout.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {payout.transactions} transaction(s) • Oldest: {payout.oldestDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-green-600">£{payout.amount.toFixed(2)}</p>
                  </div>
                </label>
              ))}
            </div>

            {selectedProfessionals.length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-green-900">Selected for Payout</p>
                    <p className="text-sm text-green-700 mt-1">
                      {selectedProfessionals.length} professional(s)
                    </p>
                  </div>
                  <p className="text-2xl font-semibold text-green-600">
                    £{totalSelectedPayout.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handlePayoutSelected}
              disabled={selectedProfessionals.length === 0}
            >
              <Send className="w-4 h-4 mr-2" />
              Process {selectedProfessionals.length} Payout(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      */}

      {/* Transaction Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto !px-8 !pb-10 sm:w-full">
          <DialogHeader className="!pb-8">
            <DialogTitle className="text-2xl text-[#0A1A2F]">Transaction Details</DialogTitle>
            <DialogDescription className="mt-3">{selectedTransaction?.reference}</DialogDescription>
          </DialogHeader>

          <div className="space-y-8 py-4">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                <Label className="text-sm text-gray-600">Customer</Label>
                <p className="mt-3 font-medium text-gray-900">{selectedTransaction?.customer}</p>
                <p className="mt-2 text-sm text-gray-600">{selectedTransaction?.customerEmail}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                <Label className="text-sm text-gray-600">Professional</Label>
                <p className="mt-3 font-medium text-gray-900">{selectedTransaction?.professional}</p>
                <p className="mt-2 text-sm text-gray-600">{selectedTransaction?.professionalEmail}</p>
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2 md:items-stretch">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
                <Label className="text-sm text-gray-600">Service</Label>
                <p className="mt-3 break-words font-medium text-gray-900">{selectedTransaction?.service}</p>
                <p className="mt-2 text-sm text-gray-600">Booking: {selectedTransaction?.bookingRef}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
                <h4 className="text-sm text-gray-600">Status</h4>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between gap-6">
                    <span className="shrink-0 text-sm font-medium text-gray-700 sm:text-base">Booking Status</span>
                    <Badge
                      variant="custom"
                      className={`shrink-0 whitespace-nowrap ${getBookingStatusBadgeClass(selectedTransaction?.status ?? "")}`}
                    >
                      {selectedTransaction?.status || "—"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-6">
                    <span className="shrink-0 text-sm font-medium text-gray-700 sm:text-base">Payment Status</span>
                    <Badge
                      variant="custom"
                      className={`shrink-0 whitespace-nowrap ${getPayoutStatusBadgeClass(selectedTransaction?.payoutStatus ?? "")}`}
                    >
                      {selectedTransaction?.payoutStatus || "—"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 rounded-xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
              <h4 className="text-base font-semibold text-gray-900">Payment Breakdown</h4>
              <div className="space-y-5 text-sm sm:text-base">
                <div className="flex items-center justify-between gap-6 border-b border-gray-200 pb-5">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-semibold text-gray-900">£{Number(selectedTransaction?.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between gap-6 border-b border-gray-200 pb-5">
                  <span className="text-gray-600">Transaction Fee</span>
                  <span className="text-gray-900">£{selectedTransaction?.transactionFee}</span>
                </div>
                <div className="flex items-center justify-between gap-6 border-b border-gray-200 pb-5">
                  <span className="text-gray-600">Platform Commission ({selectedTransaction?.commissionRate || commissionRate || "—"})</span>
                  <span className="text-green-600">£{Number(selectedTransaction?.commission).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between gap-6 pt-2">
                  <span className="text-gray-600">Professional Payment</span>
                  <span className="font-semibold text-blue-600">£{Number(selectedTransaction?.professionalEarning).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="!mt-8 !px-0 !pt-4">
            <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}