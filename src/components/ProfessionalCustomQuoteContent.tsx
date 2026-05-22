import React, { useState, useEffect, type CSSProperties } from "react";
import { Search, Loader2, FileText, MoreVertical, User, Mail, Phone, Calendar, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  getProfessionalCustomQuoteRequests,
  ProfessionalQuoteRequestItem,
  ProfessionalCustomQuoteResponse,
  markQuoteRequestAsCompleted,
} from "../api/customQuoteRequestsService";
import { getApiToken } from "../lib/auth";
import { getCustomQuoteRequestDisplayRows } from "./CustomQuoteRequestDetailsPanel";
import { toast } from "sonner";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPreferredDate(dateStr: string | null | undefined): string {
  const raw = dateStr != null ? String(dateStr).trim() : "";
  if (!raw) return "—";
  const d = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Top-level `preferred_date` or nested inside `request_data` (API varies). */
function getQuoteRequestPreferredDate(record: ProfessionalQuoteRequestItem): string | null {
  const top = record.preferred_date;
  if (top != null && String(top).trim()) return String(top).trim();

  try {
    const parsed =
      typeof record.request_data === "string"
        ? JSON.parse(record.request_data)
        : record.request_data;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const rec = parsed as Record<string, unknown>;
      const fromJson = rec.preferred_date ?? rec.preffered_date;
      if (fromJson != null && String(fromJson).trim()) return String(fromJson).trim();
    }
  } catch {
    /* ignore */
  }
  return null;
}

function formatQuotedPrice(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(num) || num < 0) return null;
  return `£${num.toFixed(2)}`;
}

/** Laravel may send is_paid as bool, 1/0, or "1"/"0"; some rows use payment_status. */
function isProfessionalQuoteRequestPaid(record: ProfessionalQuoteRequestItem): boolean {
  const raw = record.is_paid;
  if (raw === true) return true;
  if (raw === false || raw === 0 || raw === "0") return false;
  if (raw === 1 || raw === "1") return true;
  if (typeof raw === "string" && ["true", "yes", "paid"].includes(raw.toLowerCase())) return true;
  const ps = (record.payment_status ?? "").toString().trim().toLowerCase();
  if (ps === "paid" || ps === "completed" || ps === "succeeded" || ps === "success") return true;
  return false;
}

export function ProfessionalCustomQuoteContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [data, setData] = useState<ProfessionalCustomQuoteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsRecord, setDetailsRecord] = useState<ProfessionalQuoteRequestItem | null>(null);
  const [markingCompleteId, setMarkingCompleteId] = useState<number | null>(null);

  const requests: ProfessionalQuoteRequestItem[] = data?.requests ?? [];
  const professionalName = data?.professional?.full_name ?? "—";
  const detailsOpen = detailsRecord !== null;

  const fetchData = async () => {
    const token = getApiToken();
    if (!token) {
      setError("Not authenticated");
      setData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await getProfessionalCustomQuoteRequests(token);
      setData(response);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load quote requests";
      setError(msg);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRecords = requests.filter((record) => {
    const matchesSearch =
      !searchTerm ||
      record.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.service?.service_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(record.id).includes(searchTerm);

    const matchesFilter =
      filterStatus === "all" || record.status?.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  const acceptBadgeStyle: CSSProperties = {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    border: "1px solid #93c5fd",
  };

  const statusStyle = (status: string): CSSProperties => {
    switch (status?.toLowerCase()) {
      case "pending":
        return { backgroundColor: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" };
      case "reviewed":
        return { backgroundColor: "#e0f2fe", color: "#0369a1", border: "1px solid #7dd3fc" };
      case "quoted":
        return { backgroundColor: "#d1fae5", color: "#047857", border: "1px solid #6ee7b7" };
      case "assigned":
        return { backgroundColor: "#ede9fe", color: "#5b21b6", border: "1px solid #c4b5fd" };
      case "accept":
      case "accepted":
        return acceptBadgeStyle;
      case "completed":
        return {
          backgroundColor: "#dcfce7",
          color: "#166534",
          border: "1px solid #22c55e",
        };
      default:
        return { backgroundColor: "#f1f5f9", color: "#334155", border: "1px solid #e2e8f0" };
    }
  };

  const formatStatus = (status: string) => {
    const lower = String(status ?? "").trim().toLowerCase();
    if (lower === "accept" || lower === "accepted") return "Accepted";
    if (!status) return "";
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  const renderQuoteActions = (record: ProfessionalQuoteRequestItem, layout: "table" | "card") => {
    if (layout === "card") {
      return (
        <div className="pt-2 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            className="h-10 w-full"
            onClick={() => setDetailsRecord(record)}
          >
            <Eye className="w-4 h-4 mr-1.5 shrink-0" />
            View Details
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="More actions">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[10rem]">
            <DropdownMenuItem onClick={() => setDetailsRecord(record)}>View Details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const handleMarkQuoteCompleted = async (record: ProfessionalQuoteRequestItem) => {
    const token = getApiToken();
    if (!token) {
      toast.error("Please log in again to continue.");
      return;
    }

    if ((record.status ?? "").toLowerCase() === "completed") {
      toast.info("This quote request is already completed.");
      return;
    }

    setMarkingCompleteId(record.id);
    try {
      await markQuoteRequestAsCompleted(token, record.id);
      const nextUpdatedAt = new Date().toISOString();

      setData((prev) => {
        if (!prev?.requests) return prev;
        return {
          ...prev,
          requests: prev.requests.map((r) =>
            r.id === record.id ? { ...r, status: "completed", updated_at: nextUpdatedAt } : r
          ),
        };
      });

      setDetailsRecord((prev) =>
        prev && prev.id === record.id ? { ...prev, status: "completed", updated_at: nextUpdatedAt } : prev
      );
      toast.success(`Quote #${record.id} marked as completed.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark as completed.");
    } finally {
      setMarkingCompleteId(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#0A1A2F]">Custom Quote</h1>
        <p className="text-gray-600 mt-1">Manage custom quote requests from customers.</p>
      </div>

      <Card className="border border-gray-200 shadow-sm min-w-0 overflow-hidden">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <CardTitle className="text-[#0A1A2F]">Custom Quote Requests</CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm bg-white"
              >
                <option value="all">All status</option>
                <option value="pending">Pending</option>
                {/* <option value="reviewed">Reviewed</option> */}
                {/* <option value="quoted">Quoted</option> */}
                <option value="assigned">Assigned</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by customer, email, service, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No quote requests found.</p>
            </div>
          ) : (
            <>
              {/* Phone: cards with actions */}
              <div
                className={`md:hidden space-y-3 min-w-0 ${detailsOpen ? "invisible" : ""}`}
                aria-hidden={detailsOpen}
              >
                {filteredRecords.map((record) => (
                  <div
                    key={record.id}
                    className="rounded-lg border border-gray-200 bg-white p-4 space-y-3 min-w-0"
                  >
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900">#{record.id}</p>
                        <p className="text-sm text-gray-900 font-medium break-words">
                          {record.service?.service_name ?? "—"}
                        </p>
                      </div>
                      <Badge variant="custom" className="shrink-0" style={statusStyle(record.status)}>
                        {formatStatus(record.status)}
                      </Badge>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{record.customer_name}</p>
                      <p className="text-xs text-gray-500 break-all">{record.customer_email}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Preferred date</p>
                        <p className="text-gray-900">
                          {formatPreferredDate(getQuoteRequestPreferredDate(record))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Professional</p>
                        <p className="text-gray-900">{professionalName}</p>
                      </div>
                    </div>
                    {renderQuoteActions(record, "card")}
                  </div>
                ))}
              </div>

              {/* Tablet/desktop: scrollable table; sticky Actions on md–lg only */}
              <div
                className={`hidden md:block min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-gray-200 ${
                  detailsOpen ? "invisible" : ""
                }`}
                aria-hidden={detailsOpen}
              >
                <table className="w-full min-w-[44rem] table-auto">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left p-3 md:p-4 text-sm font-medium text-gray-700 whitespace-nowrap">
                        ID
                      </th>
                      <th className="text-left p-3 md:p-4 text-sm font-medium text-gray-700 min-w-[8rem]">
                        Customer
                      </th>
                      <th className="text-left p-3 md:p-4 text-sm font-medium text-gray-700 min-w-[7rem]">
                        Service
                      </th>
                      <th className="text-left p-3 md:p-4 text-sm font-medium text-gray-700 whitespace-nowrap">
                        Status
                      </th>
                      <th className="text-left p-3 md:p-4 text-sm font-medium text-gray-700 whitespace-nowrap">
                        Preferred Date
                      </th>
                      <th className="hidden lg:table-cell text-left p-4 text-sm font-medium text-gray-700">
                        Professional
                      </th>
                      <th className="text-right p-3 md:p-4 text-sm font-medium text-gray-700 w-14 md:sticky md:right-0 md:z-[1] md:bg-gray-50 lg:static lg:z-auto lg:w-px lg:whitespace-nowrap shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)] md:shadow-[-6px_0_8px_-2px_rgba(0,0,0,0.06)] lg:shadow-none">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="group hover:bg-gray-50">
                        <td className="p-3 md:p-4 whitespace-nowrap">
                          <p className="font-medium text-gray-900">#{record.id}</p>
                        </td>
                        <td className="p-3 md:p-4">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900">{record.customer_name}</p>
                            <p className="text-xs text-gray-500 break-all hidden lg:block">
                              {record.customer_email}
                            </p>
                          </div>
                        </td>
                        <td className="p-3 md:p-4">
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {record.service?.service_name ?? "—"}
                          </p>
                        </td>
                        <td className="p-3 md:p-4 whitespace-nowrap">
                          <Badge variant="custom" style={statusStyle(record.status)}>
                            {formatStatus(record.status)}
                          </Badge>
                        </td>
                        <td className="p-3 md:p-4 whitespace-nowrap">
                          <p className="text-sm text-gray-700">
                            {formatPreferredDate(getQuoteRequestPreferredDate(record))}
                          </p>
                        </td>
                        <td className="hidden lg:table-cell p-4">
                          <p className="text-sm text-gray-700">{professionalName}</p>
                        </td>
                        <td className="p-3 md:p-4 text-right md:sticky md:right-0 md:z-[1] md:bg-white lg:static lg:z-auto group-hover:bg-gray-50 w-14 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)] md:shadow-[-6px_0_8px_-2px_rgba(0,0,0,0.06)] lg:shadow-none lg:w-px lg:whitespace-nowrap">
                          {renderQuoteActions(record, "table")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Customer Details Modal */}
      <Dialog
        open={detailsRecord !== null}
        onOpenChange={(open) => {
          if (!open) setDetailsRecord(null);
        }}
      >
        <DialogContent
          className="!mx-0 !w-[min(92vw,80rem)] !max-w-[min(92vw,80rem)] max-h-[85vh] overflow-hidden flex flex-col rounded-xl transition-all duration-300 ease-out"
          style={{ width: "min(92vw, 80rem)", maxWidth: "min(92vw, 80rem)" }}
        >
          <DialogHeader className="border-b border-gray-100 pb-4 flex-shrink-0">
            <div>
              <DialogTitle className="text-xl font-bold text-[#0A1A2F]">
                Customer Details
              </DialogTitle>
              {detailsRecord && (
                <p className="text-sm text-gray-600 font-normal mt-1">
                  {detailsRecord.customer_name}
                </p>
              )}
            </div>
          </DialogHeader>
          {detailsRecord && (
            <div className="space-y-6 pt-2 overflow-y-auto flex-1 min-h-0">
              {/* Customer details – primary focus */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-red-600" />
                  </div>
                  <p className="font-semibold text-gray-800">Contact information</p>
                </div>
                <div className="space-y-3">
                  <p className="text-gray-900 font-medium text-lg">{detailsRecord.customer_name}</p>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4 flex-shrink-0 text-gray-500" />
                    <a
                      href={`mailto:${detailsRecord.customer_email}`}
                      className="break-all text-blue-600 hover:underline"
                    >
                      {detailsRecord.customer_email}
                    </a>
                  </div>
                  {detailsRecord.customer_phone ? (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4 flex-shrink-0 text-gray-500" />
                      <a
                        href={`tel:${detailsRecord.customer_phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {detailsRecord.customer_phone}
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">No phone provided</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Related quote request context */}
              <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="font-semibold text-gray-800">Related quote request</p>
                  {isProfessionalQuoteRequestPaid(detailsRecord) ? (
                    <Badge className="border border-green-200 bg-green-50 text-green-800 hover:bg-green-50">
                      Paid
                    </Badge>
                  ) : (
                    <Badge className="border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-50">
                      Unpaid
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-sm text-gray-600">Request #{detailsRecord.id}</span>
                  <Badge variant="custom" style={statusStyle(detailsRecord.status)}>
                    {formatStatus(detailsRecord.status)}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Service</p>
                    <p className="text-gray-900 mt-0.5">{detailsRecord.service?.service_name ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preferred date</p>
                    <p className="text-gray-900 mt-0.5">
                      {formatPreferredDate(
                        detailsRecord ? getQuoteRequestPreferredDate(detailsRecord) : null
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dates</p>
                    <p className="text-gray-700 mt-0.5">Created: {formatDate(detailsRecord.created_at)}</p>
                    <p className="text-gray-700 mt-0.5">Updated: {formatDate(detailsRecord.updated_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Professional</p>
                    <p className="text-gray-700 mt-0.5">{professionalName}</p>
                  </div>
                  {formatQuotedPrice(detailsRecord.quoted_price) && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quoted price</p>
                      <p className="text-gray-900 mt-0.5 font-semibold">
                        {formatQuotedPrice(detailsRecord.quoted_price)}
                      </p>
                    </div>
                  )}
                </div>
                {getCustomQuoteRequestDisplayRows(detailsRecord.request_data).length > 0 && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Request details</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {getCustomQuoteRequestDisplayRows(detailsRecord.request_data).map((row) => (
                        <div
                          key={row.id}
                          className="rounded-md border border-gray-200 bg-white/80 px-3 py-2.5"
                        >
                          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                            {row.label}
                          </p>
                          <p className="text-sm text-gray-900 font-medium mt-1.5 leading-snug">{row.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3">
                  <div className="ml-auto">
                    {isProfessionalQuoteRequestPaid(detailsRecord) &&
                      (detailsRecord.status ?? "").toLowerCase() !== "completed" && (
                      <Button
                        type="button"
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        disabled={markingCompleteId === detailsRecord.id}
                        onClick={() => handleMarkQuoteCompleted(detailsRecord)}
                      >
                        {markingCompleteId === detailsRecord.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                            Marking...
                          </>
                        ) : (
                          "Mark as Complete"
                        )}
                      </Button>
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
