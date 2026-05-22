import React, { useState, useEffect } from "react";
import {
  getProfessionalPaymentInvoiceList,
  getProfessionalPayoutDashboard,
  getProfessionalPayoutRequestList,
  normalizeProfessionalPayoutDashboard,
  ProfessionalPaymentInvoiceItem,
  ProfessionalPayoutDashboardData,
  ProfessionalPayoutRequestItem,
  updateProfessionalPaymentInvoiceStatus,
  updateAdminPayoutRequestStatus,
} from "../api/adminService";
import { getApiToken } from "../lib/auth";
import {
  Wallet,
  User,
  FileText,
  CreditCard,
  Calendar,
  RefreshCw,
  Mail,
  PoundSterling,
  CheckCircle2,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { toast } from "sonner";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function displayAccountNumber(num: string): string {
  return num || "—";
}

const PAYOUT_STATUS_FILTER_LABELS: Record<string, string> = {
  all: "All statuses",
  pending: "Pending",
  paid: "Paid",
};

function formatStatusLabel(status: string | null | undefined): string {
  const s = String(status ?? "").trim();
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function getInvoiceStatusBadgeClass(status: string): string {
  const base =
    "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-sm font-medium capitalize";
  switch (String(status ?? "").trim().toLowerCase()) {
    case "paid":
      return `${base} bg-green-100 text-green-700 border-green-200`;
    case "pending":
      return `${base} bg-yellow-100 text-yellow-700 border-yellow-200`;
    default:
      return `${base} bg-gray-100 text-gray-700 border-gray-200`;
  }
}

function formatPayoutSummaryAmount(value: number): string {
  return value.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function invoiceProfessionalId(inv: ProfessionalPaymentInvoiceItem): number | null {
  return (
    inv.professional_id ??
    inv.professional?.id ??
    inv.booking?.professional_id ??
    null
  );
}

function invoiceBookingId(inv: ProfessionalPaymentInvoiceItem): number | null {
  return inv.booking_id ?? inv.booking?.id ?? null;
}

function invoiceMatchesPayoutRequest(
  inv: ProfessionalPaymentInvoiceItem,
  req: ProfessionalPayoutRequestItem
): boolean {
  const bookingId = invoiceBookingId(inv);
  if (bookingId == null || bookingId !== req.booking_id) return false;
  if (req.professional_id != null) {
    const professionalId = invoiceProfessionalId(inv);
    return professionalId != null && professionalId === req.professional_id;
  }
  return true;
}

function findPayoutRequestForInvoice(
  inv: ProfessionalPaymentInvoiceItem,
  requests: ProfessionalPayoutRequestItem[]
): ProfessionalPayoutRequestItem | undefined {
  return requests.find((req) => invoiceMatchesPayoutRequest(inv, req));
}

export function AdminPayout() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPlaceholder, setSearchPlaceholder] = useState("Search invoices...");
  const [statusFilter, setStatusFilter] = useState("all");
  const [compactLayout, setCompactLayout] = useState(false);
  const [mobileButtons, setMobileButtons] = useState(false);
  const [invoices, setInvoices] = useState<ProfessionalPaymentInvoiceItem[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<ProfessionalPayoutRequestItem[]>([]);
  const [payoutDashboard, setPayoutDashboard] = useState<ProfessionalPayoutDashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [summaryRefreshing, setSummaryRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  type PayoutDetail = NonNullable<
    ProfessionalPaymentInvoiceItem["professional"]["payout_detail"]
  >;
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<PayoutDetail | null>(null);
  const [markingPaidInvoiceId, setMarkingPaidInvoiceId] = useState<number | null>(null);

  const applyPayoutDashboardResponse = (dashboardRes: Awaited<
    ReturnType<typeof getProfessionalPayoutDashboard>
  > | null) => {
    const dashboardOk =
      dashboardRes != null &&
      (dashboardRes.status === true || dashboardRes.success === true);
    const normalizedDashboard = normalizeProfessionalPayoutDashboard(dashboardRes);
    if (dashboardOk && normalizedDashboard) {
      setPayoutDashboard(normalizedDashboard);
    } else {
      setPayoutDashboard(null);
    }
  };

  const fetchInvoices = async (options?: { refresh?: boolean }) => {
    const token = getApiToken();
    if (!token) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    const isRefresh = options?.refresh === true;
    if (isRefresh) {
      setSummaryRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [dashboardResult, invoiceResult, payoutRequestResult] = await Promise.allSettled([
        getProfessionalPayoutDashboard({ api_token: token }),
        getProfessionalPaymentInvoiceList({ api_token: token }),
        getProfessionalPayoutRequestList({ api_token: token }),
      ]);

      applyPayoutDashboardResponse(
        dashboardResult.status === "fulfilled" ? dashboardResult.value : null
      );

      if (
        invoiceResult.status === "fulfilled" &&
        invoiceResult.value.status &&
        Array.isArray(invoiceResult.value.data)
      ) {
        setInvoices(invoiceResult.value.data);
      } else {
        setInvoices([]);
        setError("Failed to load invoices");
      }

      if (
        payoutRequestResult.status === "fulfilled" &&
        payoutRequestResult.value.status &&
        Array.isArray(payoutRequestResult.value.data)
      ) {
        setPayoutRequests(payoutRequestResult.value.data);
      } else {
        setPayoutRequests([]);
      }
    } catch {
      setError("Failed to load payout data");
      setInvoices([]);
      setPayoutRequests([]);
      setPayoutDashboard(null);
    } finally {
      if (isRefresh) {
        setSummaryRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    const mqCompact = window.matchMedia("(max-width: 1023px)");
    const mqMobileButtons = window.matchMedia("(max-width: 767px)");
    const updateLayout = () => {
      const narrow = mqCompact.matches;
      setCompactLayout(narrow);
      setMobileButtons(mqMobileButtons.matches);
      setSearchPlaceholder(narrow ? "Search" : "Search invoices...");
    };
    updateLayout();
    mqCompact.addEventListener("change", updateLayout);
    mqMobileButtons.addEventListener("change", updateLayout);
    return () => {
      mqCompact.removeEventListener("change", updateLayout);
      mqMobileButtons.removeEventListener("change", updateLayout);
    };
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    const statusOk =
      statusFilter === "all" ||
      String(inv.status ?? "").trim().toLowerCase() === statusFilter;
    if (!statusOk) return false;
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    const haystack = [
      String(inv.id),
      inv.professional?.name,
      inv.professional?.email,
      String(inv.booking?.id ?? ""),
      inv.amount,
      inv.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  const summaryTotalInvoices = payoutDashboard?.total_invoices ?? 0;
  const summaryPendingInvoices = payoutDashboard?.pending_invoices ?? 0;
  const summaryTotalAmount = payoutDashboard?.total_amount ?? 0;
  const summaryTotalPendingAmount = payoutDashboard?.total_pending_amount ?? 0;

  const handleMarkAsPaid = async (inv: ProfessionalPaymentInvoiceItem) => {
    const token = getApiToken();
    if (!token) {
      toast.error("Not authenticated");
      return;
    }
    if (!inv.professional?.id) {
      toast.error("Professional ID missing");
      return;
    }

    try {
      setMarkingPaidInvoiceId(inv.id);
      const matchedRequest = findPayoutRequestForInvoice(inv, payoutRequests);

      const res = await updateProfessionalPaymentInvoiceStatus({
        api_token: token,
        id: inv.id,
        professional_id: inv.professional.id,
      });

      if (res.status !== true) {
        toast.error(res.message || "Failed to update invoice status");
        return;
      }

      if (matchedRequest?.status === "pending") {
        const payoutRes = await updateAdminPayoutRequestStatus({
          api_token: token,
          payout_request_id: matchedRequest.id,
          status: "approved",
          admin_note: null,
        });
        if (payoutRes.status !== true) {
          toast.error(payoutRes.message || "Invoice paid but payout request not updated");
          await fetchInvoices();
          return;
        }
      }

      toast.success(res.message || "Invoice marked as paid");
      await fetchInvoices({ refresh: true });
    } catch (e: any) {
      toast.error(e?.message || "Failed to update invoice status");
    } finally {
      setMarkingPaidInvoiceId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="mb-2 text-3xl text-[#0A1A2F]">Payout</h1>
          <p className="text-gray-600">
            Professional payment invoices and payout details.
          </p>
        </div>
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-12 text-center">
            <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-gray-400" />
            <p className="text-gray-500">Loading payout data…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="mb-2 text-3xl text-[#0A1A2F]">Payout</h1>
          <p className="text-gray-600">
            Professional payment invoices and payout details.
          </p>
        </div>
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button variant="outline" onClick={() => void fetchInvoices()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-3xl text-[#0A1A2F]">Payout</h1>
        <p className="text-gray-600">
          Professional payment invoices and payout details.
        </p>
      </div>

      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div
            className={
              compactLayout
                ? "grid grid-cols-2 gap-4"
                : "flex flex-wrap items-end justify-between gap-4"
            }
          >
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">
                Total invoices
              </p>
              <p className="text-xl font-semibold text-gray-900">
                {summaryRefreshing ? "—" : summaryTotalInvoices.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">
                Pending invoices
              </p>
              <p className="text-xl font-semibold text-amber-700">
                {summaryRefreshing ? "—" : summaryPendingInvoices.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">
                Total amount
              </p>
              <p className="text-xl font-semibold text-gray-900">
                {summaryRefreshing ? "—" : `£${formatPayoutSummaryAmount(summaryTotalAmount)}`}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">
                Total pending amount
              </p>
              <p className="text-xl font-semibold text-amber-700">
                {summaryRefreshing
                  ? "—"
                  : `£${formatPayoutSummaryAmount(summaryTotalPendingAmount)}`}
              </p>
            </div>
            <div className={compactLayout ? "col-span-2 flex justify-end" : "shrink-0"}>
              <Button
                variant="outline"
                size="sm"
                className="h-11 w-full max-w-[140px]"
                onClick={() => void fetchInvoices({ refresh: true })}
                disabled={summaryRefreshing || loading}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${summaryRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search & status filter */}
      <Card className="border border-gray-200 bg-white shadow-sm">
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 w-full px-4">
                  <SelectValue
                    placeholder="All statuses"
                    label={PAYOUT_STATUS_FILTER_LABELS[statusFilter] ?? "All statuses"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {invoices.length === 0 ? (
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-12 text-center text-gray-500">
            <Wallet className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>No payment invoices yet.</p>
          </CardContent>
        </Card>
      ) : filteredInvoices.length === 0 ? (
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="p-12 text-center text-gray-500">
            <Wallet className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p>
              {searchTerm.trim() || statusFilter !== "all"
                ? "No invoices match your search or filter"
                : "No payment invoices yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((inv) => {
            const matchedRequest = findPayoutRequestForInvoice(inv, payoutRequests);
            const amountFormatted = parseFloat(inv.amount).toLocaleString("en-GB", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            return (
              <Card
                key={inv.id}
                className="overflow-hidden border border-gray-200 bg-white shadow-sm"
              >
                <CardHeader className="border-b border-gray-100 bg-gray-50/50 px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        Invoice #{inv.id}
                      </span>
                      <Badge
                        variant="custom"
                        className={getInvoiceStatusBadgeClass(inv.status)}
                      >
                        {formatStatusLabel(inv.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-lg font-semibold text-gray-900">
                      <PoundSterling className="h-4 w-4 shrink-0 text-gray-500" />
                      {amountFormatted}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  <div
                    className={
                      compactLayout
                        ? "flex flex-col gap-4"
                        : "grid grid-cols-1 gap-4 lg:grid-cols-3"
                    }
                  >
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                        <User className="w-3.5 h-3.5" />
                        Professional
                      </h3>
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">
                          {inv.professional?.name ?? "—"}
                        </p>
                        <p className="text-gray-600 flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          {inv.professional?.email ?? "—"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        Booking
                      </h3>
                      <div className="text-sm">
                        <p className="text-gray-700">
                          <span className="text-gray-500">ID:</span>{" "}
                          {inv.booking?.id ?? "—"}
                        </p>
                        <p className="text-gray-700 mt-0.5">
                          <span className="text-gray-500">Price:</span> £
                          {inv.booking?.price != null
                            ? Number(inv.booking.price).toLocaleString("en-GB", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "—"}
                        </p>
                        <p className="mt-0.5 text-gray-700">
                          <span className="text-gray-500">Status:</span>{" "}
                          {formatStatusLabel(inv.booking?.status)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5" />
                        Payout account
                      </h3>
                      {inv.professional?.payout_detail ? (
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">
                            {inv.professional.payout_detail.account_holder_name}
                          </p>
                          <p className="text-gray-600 mt-0.5">
                            Sort code: {inv.professional.payout_detail.sort_code || "—"}
                          </p>
                          <p className="text-gray-600">
                            Account:{" "}
                            {displayAccountNumber(
                              inv.professional.payout_detail.account_number
                            )}
                          </p>
                          {inv.professional.payout_detail.note && (
                            <p className="text-gray-500 text-xs mt-1 italic">
                              {inv.professional.payout_detail.note}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No payout details</p>
                      )}
                    </div>
                  </div>

                  {matchedRequest?.status === "pending" && inv.status !== "paid" && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Requested a payout.</span>
                    </div>
                  )}

                  <div
                    className={
                      mobileButtons
                        ? "mt-3 flex flex-col gap-3 border-t border-gray-100 pt-3"
                        : "mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3"
                    }
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        Created: {formatDate(inv.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        Updated: {formatDate(inv.updated_at)}
                      </span>
                    </div>
                    <div
                      className={
                        mobileButtons
                          ? "flex w-full flex-col gap-2"
                          : "flex shrink-0 items-center gap-2"
                      }
                    >
                      {inv.status === "pending" && (
                        <Button
                          size="sm"
                          className={
                            mobileButtons
                              ? "h-10 w-full bg-green-600 text-white hover:bg-green-700"
                              : "bg-green-600 text-white hover:bg-green-700"
                          }
                          onClick={() => handleMarkAsPaid(inv)}
                          disabled={markingPaidInvoiceId === inv.id}
                        >
                          {markingPaidInvoiceId === inv.id ? "Marking..." : "Mark as Paid"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        disabled={!inv.professional?.payout_detail}
                        onClick={() => {
                          if (!inv.professional?.payout_detail) return;
                          setSelectedAccount(inv.professional.payout_detail);
                          setAccountModalOpen(true);
                        }}
                        className={
                          mobileButtons
                            ? "h-10 w-full bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 disabled:text-white"
                            : "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 disabled:text-white"
                        }
                      >
                        Account Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={accountModalOpen} onOpenChange={setAccountModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payout Account Details</DialogTitle>
          </DialogHeader>
          {selectedAccount ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Account holder name
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedAccount.account_holder_name || "—"}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Sort code</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedAccount.sort_code || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Account number
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {displayAccountNumber(selectedAccount.account_number)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Note</p>
                  <p className="text-sm text-gray-700">{selectedAccount.note || "—"}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No payout details available.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
