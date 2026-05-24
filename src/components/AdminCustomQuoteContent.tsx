import { useState, useEffect, type CSSProperties } from "react";
import { Search, Loader2, FileText, MoreVertical, Eye, Pencil, UserPlus, User, Calendar, FileCheck, Mail, Phone } from "lucide-react";
import { Card, CardContent } from "./ui/card";
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
  DialogFooter,
} from "./ui/dialog";
import { getAllCustomQuoteRequests, getSingleCustomQuoteRequest, assignProfessionalToQuoteRequest, updateQuoteRequestStatus, AdminQuoteRequestItem } from "../api/customQuoteRequestsService";
import { fetchProfessionals, ProfessionalResponse } from "../api/professionalsService";
import { getApiToken } from "../lib/auth";
import { toast } from "sonner";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { CustomQuoteRequestDetailsPanel, customQuoteRequestListSubtitle } from "./CustomQuoteRequestDetailsPanel";

const QUOTE_FILTER_LABELS: Record<string, string> = {
  all: "All status",
  pending: "Pending",
  reviewed: "Reviewed",
  quoted: "Quoted",
  assigned: "Assigned",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminCustomQuoteContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [records, setRecords] = useState<AdminQuoteRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsRecordId, setDetailsRecordId] = useState<number | null>(null);
  const [detailsRecord, setDetailsRecord] = useState<AdminQuoteRequestItem | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [updateRecord, setUpdateRecord] = useState<AdminQuoteRequestItem | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [assignRecord, setAssignRecord] = useState<AdminQuoteRequestItem | null>(null);
  const [professionals, setProfessionals] = useState<ProfessionalResponse[]>([]);
  const [professionalsLoading, setProfessionalsLoading] = useState(false);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("");
  const [assignQuotedPrice, setAssignQuotedPrice] = useState<string>("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [compactLayout, setCompactLayout] = useState(false);
  const [searchPlaceholder, setSearchPlaceholder] = useState(
    "Search by customer, email, service, or ID..."
  );
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const updateLayout = () => {
      const narrow = mq.matches;
      setCompactLayout(narrow);
      setSearchPlaceholder(
        narrow ? "Search" : "Search by customer, email, service, or ID..."
      );
    };
    updateLayout();
    mq.addEventListener("change", updateLayout);
    return () => mq.removeEventListener("change", updateLayout);
  }, []);

  const fetchRecords = async () => {
    const token = getApiToken();
    if (!token) {
      setError("Not authenticated");
      setRecords([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await getAllCustomQuoteRequests(token);
      if (response.status && Array.isArray(response.data)) {
        setRecords(response.data);
      } else {
        setRecords([]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load quote requests";
      setError(msg);
      toast.error(msg);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      !searchTerm ||
      record.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.service?.service_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(record.id).includes(searchTerm);

    const matchesFilter =
      filterStatus === "all" || record.status?.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ITEMS_PER_PAGE));
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const startItem = filteredRecords.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredRecords.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

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

  const formatStatus = (status: string) =>
    status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : "";

  const handleViewDetails = async (record: AdminQuoteRequestItem) => {
    setDetailsRecordId(record.id);
    setDetailsRecord(null);
    setDetailsError(null);
    const token = getApiToken();
    if (!token) {
      setDetailsError("Not authenticated");
      return;
    }
    setDetailsLoading(true);
    try {
      const response = await getSingleCustomQuoteRequest(token, record.id);
      if (response.status && response.data) {
        setDetailsRecord(response.data);
      } else {
        setDetailsError("Failed to load details");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load quote request details";
      setDetailsError(msg);
      toast.error(msg);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleUpdate = (record: AdminQuoteRequestItem) => {
    setUpdateRecord(record);
    setSelectedStatus(record.status || "");
  };

  const STATUS_OPTIONS = ["pending", "reviewed", "quoted", "assigned"];

  const handleUpdateStatusSubmit = async () => {
    const token = getApiToken();
    if (!token || !updateRecord) return;
    if (!selectedStatus.trim()) {
      toast.error("Please select a status");
      return;
    }
    setUpdateLoading(true);
    try {
      await updateQuoteRequestStatus(token, updateRecord.id, selectedStatus);
      toast.success("Status updated successfully");
      setUpdateRecord(null);
      setSelectedStatus("");
      fetchRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleAssignProfessional = (record: AdminQuoteRequestItem) => {
    setAssignRecord(record);
    setSelectedProfessionalId("");
  };

  // Fetch professionals when Assign modal opens
  useEffect(() => {
    if (!assignRecord) return;
    const load = async () => {
      setProfessionalsLoading(true);
      try {
        const list = await fetchProfessionals(1);
        setProfessionals(list);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load professionals");
        setProfessionals([]);
      } finally {
        setProfessionalsLoading(false);
      }
    };
    load();
  }, [assignRecord]);

  const handleAssignSubmit = async () => {
    const token = getApiToken();
    if (!token || !assignRecord) return;
    const profId = parseInt(selectedProfessionalId, 10);
    if (!selectedProfessionalId || isNaN(profId)) {
      toast.error("Please select a professional");
      return;
    }
    const price = parseFloat(assignQuotedPrice.replace(/[^0-9.]/g, ""));
    if (Number.isNaN(price) || price < 0) {
      toast.error("Please enter a valid quoted price (0 or greater)");
      return;
    }
    setAssignLoading(true);
    try {
      await assignProfessionalToQuoteRequest(token, assignRecord.id, profId, price);
      toast.success("Professional assigned and price updated successfully");
      setAssignRecord(null);
      setSelectedProfessionalId("");
      setAssignQuotedPrice("");
      fetchRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign professional");
    } finally {
      setAssignLoading(false);
    }
  };

  const formatQuotedPrice = (value: unknown) => {
    if (value == null || value === "") return "—";
    return `£${Number(value).toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const renderTableActions = (record: AdminQuoteRequestItem) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Actions">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" hideBackdrop className="min-w-[10rem]">
        <DropdownMenuItem onClick={() => handleViewDetails(record)}>
          <Eye className="w-4 h-4 mr-2" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleUpdate(record)}>
          <Pencil className="w-4 h-4 mr-2" />
          Update
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAssignProfessional(record)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Assign Professional
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderCardQuoteActions = (record: AdminQuoteRequestItem) => (
    <div className="grid grid-cols-1 gap-2 border-t border-gray-100 pt-3 md:grid-cols-3 md:gap-3 md:pt-4">
      <Button
        variant="outline"
        size="sm"
        className="h-10 w-full"
        onClick={() => handleViewDetails(record)}
      >
        <Eye className="mr-2 h-4 w-4 shrink-0" />
        View Details
      </Button>
      <Button variant="outline" size="sm" className="h-10 w-full" onClick={() => handleUpdate(record)}>
        <Pencil className="mr-2 h-4 w-4 shrink-0" />
        Update
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-10 w-full"
        onClick={() => handleAssignProfessional(record)}
      >
        <UserPlus className="mr-2 h-4 w-4 shrink-0" />
        Assign
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-[#0A1A2F] text-xl font-semibold mb-1">Custom Quote</h1>
        <p className="text-sm text-gray-500">Manage custom quote requests from customers.</p>
      </div>

      {/* Filters — match AdminBookings / AdminCustomers */}
      <Card>
        <CardContent className="p-4">
          <div className="flex w-full items-center gap-2 md:gap-4">
            <div className="relative min-w-0 flex-1">
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
            <div className="w-auto shrink-0 [&>div]:w-auto">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-11 w-auto min-w-[8.5rem] justify-start gap-1 border-gray-200 px-4 [&>svg]:shrink-0 [&>svg]:text-[#0A1A2F] [&>svg]:opacity-90">
                  <SelectValue
                    compact
                    placeholder="All status"
                    label={QUOTE_FILTER_LABELS[filterStatus] ?? "All status"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="quoted">Quoted</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quote requests — cards below lg (phone + tablet), table on lg+ (like AdminPayments) */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-red-600">{error}</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p className="text-gray-600">No quote requests found.</p>
            </div>
          ) : (
            <>
              <div className="hidden min-w-0 max-w-full overflow-x-auto lg:block">
                <table className="w-full min-w-[44rem] table-auto">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="whitespace-nowrap p-4 text-left text-sm font-medium text-gray-700">ID</th>
                      <th className="min-w-[8rem] p-4 text-left text-sm font-medium text-gray-700">Customer</th>
                      <th className="min-w-[7rem] p-4 text-left text-sm font-medium text-gray-700">Service</th>
                      <th className="whitespace-nowrap p-4 text-left text-sm font-medium text-gray-700">Status</th>
                      <th className="whitespace-nowrap p-4 text-left text-sm font-medium text-gray-700">Date</th>
                      <th className="p-4 text-left text-sm font-medium text-gray-700">Professional</th>
                      <th className="whitespace-nowrap p-4 text-left text-sm font-medium text-gray-700">Quoted Price</th>
                      <th className="whitespace-nowrap p-4 text-left text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {paginatedRecords.map((record) => {
                      const listSubtitle = customQuoteRequestListSubtitle(record.request_data);
                      return (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="p-4">
                            <p className="font-medium text-gray-900">#{record.id}</p>
                          </td>
                          <td className="p-4">
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900">{record.customer_name}</p>
                              <p className="text-xs text-gray-500 break-all">{record.customer_email}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {record.service?.service_name ?? "—"}
                            </p>
                            {listSubtitle && (
                              <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{listSubtitle}</p>
                            )}
                          </td>
                          <td className="p-4">
                            <Badge variant="custom" style={statusStyle(record.status)}>{formatStatus(record.status)}</Badge>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-gray-700 whitespace-nowrap">{formatDate(record.created_at)}</p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-gray-700 break-words">
                              {record.professional?.name ?? "—"}
                            </p>
                          </td>
                          <td className="p-4">
                            <p className="text-sm font-medium text-gray-700 whitespace-nowrap">
                              {formatQuotedPrice(record.quoted_price)}
                            </p>
                          </td>
                          <td className="p-4">{renderTableActions(record)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y lg:hidden">
                {paginatedRecords.map((record) => {
                  const listSubtitle = customQuoteRequestListSubtitle(record.request_data);
                  return (
                    <div key={record.id} className="space-y-3 p-4 md:space-y-4 md:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-gray-900 md:text-lg">
                            #{record.id} · {record.customer_name}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 break-words">
                            {record.service?.service_name ?? "—"}
                          </p>
                        </div>
                        <Badge variant="custom" className="shrink-0" style={statusStyle(record.status)}>
                          {formatStatus(record.status)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                        <div className="flex items-start gap-2 md:col-span-2">
                          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                          <p className="break-all text-sm text-gray-600">{record.customer_email}</p>
                        </div>

                        {listSubtitle && (
                          <p className="line-clamp-2 text-xs text-gray-600 md:col-span-2">{listSubtitle}</p>
                        )}

                        <div>
                          <p className="text-xs text-gray-500">Date</p>
                          <p className="text-sm text-gray-900">{formatDate(record.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Quoted price</p>
                          <p className="text-sm font-medium text-gray-900">
                            {formatQuotedPrice(record.quoted_price)}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-xs text-gray-500">Professional</p>
                          <p className="text-sm text-gray-900 break-words">
                            {record.professional?.name ?? "—"}
                          </p>
                        </div>
                      </div>

                      {renderCardQuoteActions(record)}
                    </div>
                  );
                })}
              </div>

              {filteredRecords.length > ITEMS_PER_PAGE && (
                <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 p-4 sm:flex-row">
                  <p className="text-sm text-gray-600">
                    Showing {startItem}–{endItem} of {filteredRecords.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600 px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View Details Modal */}
      <Dialog
        open={detailsRecordId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsRecordId(null);
            setDetailsRecord(null);
            setDetailsError(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-gray-100 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <DialogTitle className="text-xl font-bold text-[#0A1A2F]">
                Quote Request #{detailsRecordId ?? detailsRecord?.id}
              </DialogTitle>
              {detailsRecord && (
                <Badge variant="custom" style={statusStyle(detailsRecord.status)}>{formatStatus(detailsRecord.status)}</Badge>
              )}
            </div>
          </DialogHeader>
          {detailsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
            </div>
          ) : detailsError ? (
            <div className="py-8 text-center">
              <p className="text-red-600 font-medium">{detailsError}</p>
            </div>
          ) : detailsRecord ? (
            <div className="space-y-6 pt-2">
              {/* Top row: Customer & Service */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-red-600" />
                    </div>
                    <p className="font-semibold text-gray-800">Customer</p>
                  </div>
                  <p className="text-gray-900 font-medium">{detailsRecord.customer_name}</p>
                  <div className="flex items-center gap-2 mt-1 text-gray-600">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="break-words">{detailsRecord.customer_email}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-gray-600">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{detailsRecord.customer_phone}</span>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FileCheck className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="font-semibold text-gray-800">Service</p>
                  </div>
                  <p className="text-gray-900 font-medium">{detailsRecord.service?.service_name ?? "—"}</p>
                </div>
              </div>

              {/* Middle row: Dates, User, Professional */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-amber-600" />
                    </div>
                    <p className="font-semibold text-gray-800">Dates</p>
                  </div>
                  <p className="text-sm text-gray-700">Created: {formatDate(detailsRecord.created_at)}</p>
                  <p className="text-sm text-gray-700 mt-0.5">Updated: {formatDate(detailsRecord.updated_at)}</p>
                </div>
                {detailsRecord.user && (
                  <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-green-600" />
                      </div>
                      <p className="font-semibold text-gray-800">User Account</p>
                    </div>
                    <p className="text-gray-900 font-medium">{detailsRecord.user.full_name}</p>
                    <p className="text-sm text-gray-600">{detailsRecord.user.email}</p>
                  </div>
                )}
                {detailsRecord.professional && (
                  <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-indigo-600" />
                      </div>
                      <p className="font-semibold text-gray-800">Assigned Professional</p>
                    </div>
                    <p className="text-gray-900 font-medium">{detailsRecord.professional.name}</p>
                    {detailsRecord.professional.email && (
                      <p className="text-sm text-gray-600">{detailsRecord.professional.email}</p>
                    )}
                  </div>
                )}
                {(detailsRecord.quoted_price != null && detailsRecord.quoted_price !== "") && (
                  <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="font-semibold text-gray-800">Quoted Price</p>
                    </div>
                    <p className="text-gray-900 font-medium text-lg">
                      £{Number(detailsRecord.quoted_price).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>

              {/* Request Details - full width (summary from access_note when present) */}
              <CustomQuoteRequestDetailsPanel requestData={detailsRecord.request_data} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Update Status Modal */}
      <Dialog
        open={!!updateRecord}
        onOpenChange={(open) => {
          if (!open) {
            setUpdateRecord(null);
            setSelectedStatus("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
          </DialogHeader>
          {updateRecord && (
            <div className="space-y-4 py-4">
              <p className="text-gray-600">
                Update status for quote request #{updateRecord.id} ({updateRecord.customer_name}).
              </p>
              <div>
                <Label htmlFor="status-select">Select Status</Label>
                <select
                  id="status-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="mt-2 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="">Choose a status...</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateRecord(null)} disabled={updateLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatusSubmit}
              disabled={!selectedStatus.trim() || updateLoading}
            >
              {updateLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Status"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Professional Modal */}
      <Dialog
        open={!!assignRecord}
        onOpenChange={(open) => {
          if (!open) {
            setAssignRecord(null);
            setSelectedProfessionalId("");
            setAssignQuotedPrice("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Professional</DialogTitle>
          </DialogHeader>
          {assignRecord && (
            <div className="space-y-4 py-4">
              <p className="text-gray-600">
                Assign a professional to quote request #{assignRecord.id} for {assignRecord.customer_name}.
              </p>
              <div>
                <Label htmlFor="assign-quoted-price">Quoted Price (£)</Label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                  <Input
                    id="assign-quoted-price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={assignQuotedPrice}
                    onChange={(e) => setAssignQuotedPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="w-full pl-8"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="professional-select">Select Professional</Label>
                {professionalsLoading ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500">Loading professionals...</span>
                  </div>
                ) : (
                  <select
                    id="professional-select"
                    value={selectedProfessionalId}
                    onChange={(e) => setSelectedProfessionalId(e.target.value)}
                    className="mt-2 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="">Choose a professional...</option>
                    {professionals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.business_name ? `(${p.business_name})` : ""} - {p.email}
                      </option>
                    ))}
                  </select>
                )}
                {!professionalsLoading && professionals.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">No professionals available.</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignRecord(null)} disabled={assignLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignSubmit}
              disabled={!selectedProfessionalId || assignLoading || professionalsLoading || assignQuotedPrice.trim() === ""}
            >
              {assignLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
