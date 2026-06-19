import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  getMyProfessionalPayoutRequestList,
  type ProfessionalMyPayoutRequestItem,
} from "../api/bookingService";
import { getApiToken } from "../lib/auth";
import { toast } from "sonner";

function formatGbp(amount: string | number): string {
  const value = typeof amount === "number" ? amount : parseFloat(String(amount));
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatStatusLabel(status: string): string {
  if (!status) return "—";
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getPayoutStatusBadgeClass(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "paid" || normalized === "approved") {
    return "border border-green-200 bg-green-100 text-green-700";
  }
  if (normalized === "pending") {
    return "border border-yellow-200 bg-yellow-50 text-yellow-800";
  }
  if (normalized === "rejected" || normalized === "cancelled" || normalized === "canceled") {
    return "border border-red-200 bg-red-50 text-red-700";
  }
  return "border border-gray-200 bg-gray-100 text-gray-700";
}

function getBookingStatusBadgeClass(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "completed") {
    return "border border-green-200 bg-green-100 text-green-700";
  }
  if (normalized === "confirmed") {
    return "border border-blue-200 bg-blue-50 text-blue-700";
  }
  if (normalized === "cancelled" || normalized === "canceled") {
    return "border border-red-200 bg-red-50 text-red-700";
  }
  return "border border-gray-200 bg-gray-100 text-gray-700";
}

function getCustomerName(item: ProfessionalMyPayoutRequestItem): string {
  const customer = item.customer;
  if (!customer) return "—";
  const full = customer.full_name?.trim();
  if (full) return full;
  const parts = [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim();
  return parts || "—";
}

export function ProfessionalPayoutList() {
  const [items, setItems] = useState<ProfessionalMyPayoutRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayoutList = useCallback(async () => {
    const apiToken = getApiToken();
    if (!apiToken) {
      setItems([]);
      setError("Please log in to view your payout list.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getMyProfessionalPayoutRequestList(apiToken);
      const ok =
        response.status === true ||
        response.status === "success" ||
        String(response.status).toLowerCase() === "success";
      if (!ok) {
        throw new Error(response.message || "Failed to load payout list.");
      }
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Failed to load payout list.";
      setError(message);
      setItems([]);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPayoutList();
  }, [fetchPayoutList]);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="mt-5 md:mt-0">
        <h1 className="text-[#0A1A2F] mb-2">Payout List</h1>
        <p className="text-gray-600">View payout requests you have submitted to admin</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#0A1A2F]">Payout Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading payout list…
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-600">{error}</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Wallet className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p>No payout requests yet.</p>
            </div>
          ) : (
            <>
              {/* Mobile: card view */}
              <div className="block space-y-3 md:hidden">
                {items.map((item) => {
                  const serviceName = item.service?.name?.trim() || "—";
                  const bookingStatus = item.booking_details?.status?.trim() || "—";
                  const payoutStatus = item.status?.trim() || "—";

                  return (
                    <div
                      key={item.id}
                      className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{serviceName}</p>
                          <p className="mt-1 text-sm text-gray-700">{getCustomerName(item)}</p>
                        </div>
                        <p className="shrink-0 font-semibold text-gray-900 text-sm">
                          {formatGbp(item.amount)}
                        </p>
                      </div>

                      <div className="flex items-start justify-between gap-4 border-t border-gray-200 pt-3">
                        <div className="min-w-0">
                          <p className="mb-1.5 text-xs font-medium text-gray-500">Booking status</p>
                          <Badge
                            variant="custom"
                            className={getBookingStatusBadgeClass(bookingStatus)}
                          >
                            {formatStatusLabel(bookingStatus)}
                          </Badge>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="mb-1.5 text-xs font-medium text-gray-500">Payout status</p>
                          <Badge
                            variant="custom"
                            className={getPayoutStatusBadgeClass(payoutStatus)}
                          >
                            {formatStatusLabel(payoutStatus)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-gray-700">Service</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-700">Customer</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-700">Amount</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-700">Booking status</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-700">Payout status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((item) => {
                      const serviceName = item.service?.name?.trim() || "—";
                      const bookingStatus = item.booking_details?.status?.trim() || "—";
                      const payoutStatus = item.status?.trim() || "—";

                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="p-4">
                            <p className="text-sm text-gray-900">{serviceName}</p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-gray-900">{getCustomerName(item)}</p>
                          </td>
                          <td className="p-4">
                            <p className="font-semibold text-gray-900">{formatGbp(item.amount)}</p>
                          </td>
                          <td className="p-4">
                            <Badge
                              variant="custom"
                              className={getBookingStatusBadgeClass(bookingStatus)}
                            >
                              {formatStatusLabel(bookingStatus)}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge
                              variant="custom"
                              className={getPayoutStatusBadgeClass(payoutStatus)}
                            >
                              {formatStatusLabel(payoutStatus)}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
