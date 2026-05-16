import React, { useState, useEffect } from "react";
import {
  getProfessionalPaymentInvoiceList,
  getProfessionalPayoutRequestList,
  ProfessionalPaymentInvoiceItem,
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
} from "lucide-react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
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
  const [invoices, setInvoices] = useState<ProfessionalPaymentInvoiceItem[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<ProfessionalPayoutRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  type PayoutDetail = NonNullable<
    ProfessionalPaymentInvoiceItem["professional"]["payout_detail"]
  >;
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<PayoutDetail | null>(null);
  const [markingPaidInvoiceId, setMarkingPaidInvoiceId] = useState<number | null>(null);

  const fetchInvoices = async () => {
    const token = getApiToken();
    if (!token) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const [invoiceResult, payoutRequestResult] = await Promise.allSettled([
        getProfessionalPaymentInvoiceList({ api_token: token }),
        getProfessionalPayoutRequestList({ api_token: token }),
      ]);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const totalAmount = invoices.reduce(
    (sum, inv) => sum + parseFloat(inv.amount || "0"),
    0
  );
  const paidCount = invoices.filter((i) => i.status === "paid").length;

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
      await fetchInvoices();
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
          <h1 className="text-gray-800 mb-1">Payout</h1>
          <p className="text-sm text-gray-500">
            Professional payment invoices and payout details.
          </p>
        </div>
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
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
          <h1 className="text-gray-800 mb-1">Payout</h1>
          <p className="text-sm text-gray-500">
            Professional payment invoices and payout details.
          </p>
        </div>
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button variant="outline" onClick={fetchInvoices}>
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
        <h1 className="text-gray-800 mb-1">Payout</h1>
        <p className="text-sm text-gray-500">
          Professional payment invoices and payout details.
        </p>
      </div>

      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Total invoices
              </p>
              <p className="text-xl font-semibold text-gray-900">{invoices.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Paid</p>
              <p className="text-xl font-semibold text-green-700">{paidCount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Total amount
              </p>
              <p className="text-xl font-semibold text-gray-900">
                £
                {totalAmount.toLocaleString("en-GB", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchInvoices} className="shrink-0">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
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
      ) : (
        <div className="space-y-4">
          {invoices.map((inv) => {
            const matchedRequest = findPayoutRequestForInvoice(inv, payoutRequests);
            return (
              <Card
                key={inv.id}
                className="bg-white border border-gray-200 shadow-sm overflow-hidden"
              >
                <CardHeader className="pb-2 pt-4 px-4 sm:px-6 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-500">
                        Invoice #{inv.id}
                      </span>
                      <Badge
                        variant={inv.status === "paid" ? "default" : "secondary"}
                        className={
                          inv.status === "paid"
                            ? "bg-green-600 hover:bg-green-700 text-white border-transparent"
                            : inv.status === "pending"
                              ? "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100"
                              : ""
                        }
                      >
                        {inv.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                      <PoundSterling className="w-4 h-4 text-gray-500" />
                      {parseFloat(inv.amount).toLocaleString("en-GB", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        <p className="text-gray-700 mt-0.5">
                          <span className="text-gray-500">Status:</span>{" "}
                          <Badge variant="outline" className="text-xs font-normal">
                            {inv.booking?.status ?? "—"}
                          </Badge>
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
                    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Requested a payout.</span>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Created: {formatDate(inv.created_at)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Updated: {formatDate(inv.updated_at)}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      {inv.status === "pending" && (
                        <Button
                          size="sm"
                          className="bg-green-600 text-white hover:bg-green-700"
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
                        className="bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 disabled:text-white"
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
        <DialogContent className="sm:max-w-md">
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
