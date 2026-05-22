import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { getApiToken } from "../lib/auth";
import {
  approveAdminReview,
  createContactCustomerMessage,
  createContactProfessionalMessage,
  getAdminReviewsList,
  getAdminReviewsSummary,
  rejectAdminReview,
  type AdminReviewListItem,
} from "../api/adminService";
import { showReview, type ReviewResponse } from "../api/reviewsService";
import { Search, Star, CheckCircle, XCircle, Eye, Flag, AlertTriangle, MessageSquare, Mail, User, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { toast } from "sonner";

type ReviewDisplay = {
  id: number;
  professionalId: number | null;
  customer: string;
  customerEmail: string;
  professional: string;
  professionalEmail: string;
  rating: number;
  date: string;
  bookingRef: string;
  service: string;
  text: string;
  status: string;
  flagged: boolean;
  flagReason?: string;
  rejectionReason?: string;
  professionalResponse: string | null;
};

const isApiSuccess = (res: { success?: boolean; status?: string | boolean; message?: string }) => {
  if (res.success === true) return true;
  if (res.status === true || res.status === "success") return true;
  const msg = typeof res.message === "string" ? res.message.toLowerCase() : "";
  return msg.includes("success");
};

const normalizeReviewsList = (
  res: { data?: AdminReviewListItem[] | { reviews?: AdminReviewListItem[] } }
): AdminReviewListItem[] => {
  if (Array.isArray(res.data)) return res.data;
  const nested = res.data as { reviews?: AdminReviewListItem[] } | undefined;
  if (nested && Array.isArray(nested.reviews)) return nested.reviews;
  return [];
};

const coerceProfessionalId = (item: AdminReviewListItem | ReviewResponse | Record<string, unknown>): number | null => {
  const tryNum = (raw: unknown): number | null => {
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
    if (typeof raw === "string") {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n) && n > 0) return n;
    }
    return null;
  };
  const rec = item as Record<string, unknown>;
  const prof = rec.professional as { id?: number } | undefined;
  return (
    tryNum(rec.professional_id) ??
    tryNum(rec.professional_user_id) ??
    tryNum(prof?.id) ??
    tryNum((item as ReviewResponse).professional?.id)
  );
};

const formatReviewDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
};

const REVIEW_STATUS_FILTER_LABELS: Record<string, string> = {
  all: "All Status",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

function formatReviewStatusLabel(status: string): string {
  const s = String(status ?? "").trim().toLowerCase();
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getReviewStatusBadgeClass(status: string): string {
  const base =
    "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap";
  switch (String(status ?? "").trim().toLowerCase()) {
    case "approved":
      return `${base} bg-green-100 text-green-700 border-green-200`;
    case "pending":
      return `${base} bg-yellow-100 text-yellow-700 border-yellow-200`;
    case "rejected":
      return `${base} bg-red-100 text-red-700 border-red-200`;
    default:
      return `${base} bg-gray-100 text-gray-700 border-gray-200`;
  }
}

const mapListItemToDisplay = (item: AdminReviewListItem): ReviewDisplay => ({
  id: item.id,
  professionalId: coerceProfessionalId(item),
  customer: item.reviewer_name || "",
  customerEmail: item.reviewer_email || "",
  professional: item.professional_name || "",
  professionalEmail: item.professional_email || "",
  rating: parseInt(String(item.rating), 10) || 0,
  date: formatReviewDate(item.created_at),
  bookingRef: item.ref_code || item.booking_ref || `FG-${item.id}`,
  service: Array.isArray(item.services) ? item.services[0] || "—" : "—",
  text: item.feedback || "",
  status: (item.status || "").toLowerCase(),
  flagged: false,
  professionalResponse: null,
});

const mapShowDataToDisplay = (base: ReviewDisplay, raw: ReviewResponse | Record<string, unknown>): ReviewDisplay => {
  const rec = raw as Record<string, unknown>;
  const prof = rec.professional as { name?: string | null; id?: number } | undefined;
  const creator = rec.creator as { full_name?: string; email?: string } | undefined;
  const services = rec.services;
  const serviceLabel = Array.isArray(services)
    ? String(services[0] ?? base.service)
  : typeof services === "string"
    ? services
    : base.service;

  return {
    ...base,
    professionalId: coerceProfessionalId(raw) ?? base.professionalId,
    customer: String(rec.name ?? rec.reviewer_name ?? creator?.full_name ?? base.customer),
    customerEmail: String(rec.reviewer_email ?? creator?.email ?? base.customerEmail),
    professional: String(rec.professional_name ?? prof?.name ?? base.professional),
    professionalEmail: String(rec.professional_email ?? base.professionalEmail),
    rating: parseInt(String(rec.rating ?? base.rating), 10) || base.rating,
    date: rec.created_at ? formatReviewDate(String(rec.created_at)) : base.date,
    bookingRef: String(rec.ref_code ?? rec.booking_ref ?? base.bookingRef),
    service: serviceLabel,
    text: String(rec.feedback ?? base.text),
    status: String(rec.status ?? base.status).toLowerCase(),
    professionalResponse:
      typeof rec.professional_response === "string"
        ? rec.professional_response
        : base.professionalResponse,
  };
};

export function AdminReviews() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPlaceholder, setSearchPlaceholder] = useState("Search reviews...");
  const [compactLayout, setCompactLayout] = useState(false);
  /** Stack action buttons vertically on small phones only (≤767px). Medium+ matches large desktop. */
  const [mobileButtons, setMobileButtons] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [customerContactModalOpen, setCustomerContactModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewDisplay | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminResponse, setAdminResponse] = useState("");
  const [customerContactMessage, setCustomerContactMessage] = useState("");

  const [reviews, setReviews] = useState<ReviewDisplay[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [approvingReviewId, setApprovingReviewId] = useState<number | null>(null);
  const [rejectingReviewId, setRejectingReviewId] = useState<number | null>(null);
  const [sendingContactMessage, setSendingContactMessage] = useState(false);
  const [sendingCustomerContactMessage, setSendingCustomerContactMessage] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const loadReviewsSummary = useCallback(async () => {
    const token = getApiToken();
    if (!token) {
      setStatsLoading(false);
      return;
    }
    setStatsLoading(true);
    try {
      const summary = await getAdminReviewsSummary({ api_token: token });
      if (summary) {
        setStats({
          total: summary.total_review,
          pending: summary.pending_review,
          approved: summary.approved_review,
          rejected: summary.rejected_review,
        });
      }
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.data) {
        const d = e.response.data as { message?: string };
        toast.error(d.message || "Failed to load review summary.");
      }
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadReviewsList = useCallback(async () => {
    const token = getApiToken();
    if (!token) {
      setReviews([]);
      setListLoading(false);
      return;
    }
    setListLoading(true);
    try {
      const res = await getAdminReviewsList({ api_token: token });
      const rows = normalizeReviewsList(res);
      if (isApiSuccess(res) || res.data !== undefined) {
        setReviews(rows.map(mapListItemToDisplay));
      } else {
        setReviews([]);
        toast.error((res as { message?: string }).message || "Failed to load reviews.");
      }
    } catch (e: unknown) {
      setReviews([]);
      if (axios.isAxiosError(e) && e.response?.data) {
        const d = e.response.data as { message?: string };
        toast.error(d.message || "Failed to load reviews.");
      } else {
        toast.error(e instanceof Error ? e.message : "Failed to load reviews.");
      }
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReviewsSummary();
    void loadReviewsList();
  }, [loadReviewsSummary, loadReviewsList]);

  useEffect(() => {
    const mqCompact = window.matchMedia("(max-width: 1023px)");
    const mqMobileButtons = window.matchMedia("(max-width: 767px)");
    const updateLayout = () => {
      const narrow = mqCompact.matches;
      setCompactLayout(narrow);
      setMobileButtons(mqMobileButtons.matches);
      setSearchPlaceholder(
        narrow ? "Search" : "Search reviews by customer, professional, or content..."
      );
    };
    updateLayout();
    mqCompact.addEventListener("change", updateLayout);
    mqMobileButtons.addEventListener("change", updateLayout);
    return () => {
      mqCompact.removeEventListener("change", updateLayout);
      mqMobileButtons.removeEventListener("change", updateLayout);
    };
  }, []);

  const filteredReviews = reviews.filter((review) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      review.customer.toLowerCase().includes(q) ||
      review.professional.toLowerCase().includes(q) ||
      review.text.toLowerCase().includes(q) ||
      review.bookingRef.toLowerCase().includes(q);
    const matchesFilter =
      filterStatus === "all" || review.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const renderStars = (rating: number, size: "sm" | "md" = "md") => {
    const starClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
    return (
      <div className="flex shrink-0 items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starClass} ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const isReviewModerationSuccess = isApiSuccess;

  const refreshAfterModeration = useCallback(async () => {
    await Promise.all([loadReviewsSummary(), loadReviewsList()]);
  }, [loadReviewsSummary, loadReviewsList]);

  const handleApprove = async (review: ReviewDisplay) => {
    const token = getApiToken();
    if (!token) {
      toast.error("Please log in again to approve reviews.");
      return;
    }
    setApprovingReviewId(review.id);
    try {
      const res = await approveAdminReview({ api_token: token, id: review.id });
      if (isReviewModerationSuccess(res)) {
        setReviews((prev) =>
          prev.map((r) => (r.id === review.id ? { ...r, status: "approved" } : r))
        );
        if (selectedReview?.id === review.id) {
          setSelectedReview({ ...review, status: "approved" });
        }
        toast.success(res.message || `Review from ${review.customer} has been approved.`);
        setViewModalOpen(false);
        await refreshAfterModeration();
      } else {
        toast.error(res.message || "Could not approve this review.");
      }
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.data) {
        const d = e.response.data as { message?: string };
        if (d.message) {
          toast.error(d.message);
          return;
        }
      }
      toast.error(e instanceof Error ? e.message : "Could not approve this review.");
    } finally {
      setApprovingReviewId(null);
    }
  };

  const handleReject = async (review: ReviewDisplay) => {
    const token = getApiToken();
    if (!token) {
      toast.error("Please log in again to reject reviews.");
      return;
    }
    setRejectingReviewId(review.id);
    try {
      const res = await rejectAdminReview({ api_token: token, id: review.id });
      if (isReviewModerationSuccess(res)) {
        setReviews((prev) =>
          prev.map((r) => (r.id === review.id ? { ...r, status: "rejected" } : r))
        );
        if (selectedReview?.id === review.id) {
          setSelectedReview({ ...review, status: "rejected" });
        }
        toast.success(res.message || `Review from ${review.customer} has been rejected.`);
        setViewModalOpen(false);
        setRejectModalOpen(false);
        await refreshAfterModeration();
      } else {
        toast.error(res.message || "Could not reject this review.");
      }
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.data) {
        const d = e.response.data as { message?: string };
        if (d.message) {
          toast.error(d.message);
          return;
        }
      }
      toast.error(e instanceof Error ? e.message : "Could not reject this review.");
    } finally {
      setRejectingReviewId(null);
    }
  };

  const handleViewDetails = async (review: ReviewDisplay) => {
    setSelectedReview(review);
    setViewModalOpen(true);
    setDetailLoading(true);
    try {
      const res = await showReview(review.id);
      if (isApiSuccess(res) && res.data && typeof res.data === "object") {
        const detailed = mapShowDataToDisplay(review, res.data as ReviewResponse | Record<string, unknown>);
        setSelectedReview(detailed);
        setReviews((prev) => prev.map((r) => (r.id === review.id ? detailed : r)));
      } else if (!isApiSuccess(res)) {
        toast.error(res.message || "Could not load review details.");
      }
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.data) {
        const d = e.response.data as { message?: string };
        toast.error(d.message || "Could not load review details.");
      } else {
        toast.error(e instanceof Error ? e.message : "Could not load review details.");
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddResponse = (review: ReviewDisplay) => {
    setSelectedReview(review);
    setAdminResponse("");
    setCustomerContactModalOpen(false);
    setResponseModalOpen(true);
  };

  const handleContactCustomer = (review: ReviewDisplay) => {
    setSelectedReview(review);
    setCustomerContactMessage("");
    setResponseModalOpen(false);
    setCustomerContactModalOpen(true);
  };

  /** Used if the reject Dialog below is uncommented — calls same API as `handleReject` (body: api_token + id only). */
  const confirmRejection = async () => {
    if (!selectedReview) return;
    await handleReject(selectedReview);
    setRejectionReason("");
  };

  const isContactApiSuccess = (res: {
    success?: boolean;
    status?: string | boolean;
    message?: string;
  }) => {
    if (res.success === true) return true;
    if (res.status === true || res.status === "success") return true;
    const msg = typeof res.message === "string" ? res.message.toLowerCase() : "";
    if (msg.includes("success") || msg.includes("sent")) return true;
    return false;
  };

  const submitResponse = async () => {
    if (!adminResponse.trim()) {
      toast.error("Please enter a message");
      return;
    }
    if (!selectedReview?.professionalId) {
      toast.error("Professional ID is missing for this review. It cannot be sent until the list API includes professional_id.");
      return;
    }
    const token = getApiToken();
    if (!token) {
      toast.error("Please log in again.");
      return;
    }
    setSendingContactMessage(true);
    try {
      const res = await createContactProfessionalMessage({
        api_token: token,
        professional_id: selectedReview.professionalId,
        message: adminResponse.trim(),
      });
      if (isContactApiSuccess(res)) {
        toast.success(res.message || `Message sent to ${selectedReview.professional}.`);
        setResponseModalOpen(false);
        setAdminResponse("");
      } else {
        toast.error(res.message || "Could not send message.");
      }
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.data) {
        const d = e.response.data as { message?: string };
        if (d.message) {
          toast.error(d.message);
          return;
        }
      }
      toast.error(e instanceof Error ? e.message : "Could not send message.");
    } finally {
      setSendingContactMessage(false);
    }
  };

  const submitCustomerContact = async () => {
    if (!customerContactMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }
    const customerEmail = (selectedReview?.customerEmail ?? "").trim();
    if (!customerEmail) {
      toast.error("Reviewer email is missing for this review. Cannot send message.");
      return;
    }
    const token = getApiToken();
    if (!token) {
      toast.error("Please log in again.");
      return;
    }
    setSendingCustomerContactMessage(true);
    try {
      const res = await createContactCustomerMessage({
        api_token: token,
        customer_email: customerEmail,
        message: customerContactMessage.trim(),
      });
      if (isContactApiSuccess(res)) {
        toast.success(res.message || `Message sent to ${selectedReview.customer}.`);
        setCustomerContactModalOpen(false);
        setCustomerContactMessage("");
      } else {
        toast.error(res.message || "Could not send message.");
      }
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.data) {
        const d = e.response.data as { message?: string };
        if (d.message) {
          toast.error(d.message);
          return;
        }
      }
      toast.error(e instanceof Error ? e.message : "Could not send message.");
    } finally {
      setSendingCustomerContactMessage(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-[#0A1A2F] mb-2">Review Management</h1>
        <p className="text-gray-600">Moderate and manage customer reviews</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total Reviews</p>
            <p className="text-2xl text-[#0A1A2F] mt-1">
              {statsLoading ? "—" : stats.total}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl text-yellow-600 mt-1">
              {statsLoading ? "—" : stats.pending}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Approved</p>
            <p className="text-2xl text-green-600 mt-1">
              {statsLoading ? "—" : stats.approved}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Rejected</p>
            <p className="text-2xl text-red-600 mt-1">
              {statsLoading ? "—" : stats.rejected}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search & status filter */}
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
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-11 w-full px-4">
                  <SelectValue
                    placeholder="All Status"
                    label={REVIEW_STATUS_FILTER_LABELS[filterStatus] ?? "All Status"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      {listLoading ? (
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center gap-3 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            <p>Loading reviews…</p>
          </CardContent>
        </Card>
      ) : (
      <div className="space-y-4">
        {filteredReviews.map((review) => (
          <Card
            key={review.id}
            className={review.flagged ? "border-2 border-orange-300" : "border border-gray-200"}
          >
            <CardContent className="p-4 sm:p-5">
              <div className="space-y-4">
                <div
                  className={
                    compactLayout
                      ? "flex flex-col gap-2"
                      : "flex flex-wrap items-start justify-between gap-3"
                  }
                >
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                    {renderStars(review.rating, compactLayout ? "sm" : "md")}
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      <Badge variant="custom" className={getReviewStatusBadgeClass(review.status)}>
                        {formatReviewStatusLabel(review.status)}
                      </Badge>
                      {review.flagged && (
                        <Badge
                          variant="custom"
                          className="inline-flex items-center rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700"
                        >
                          <Flag className="mr-1 h-3 w-3" />
                          Flagged
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {review.date} • Booking: {review.bookingRef}
                  </p>
                </div>

                <div
                  className={
                    compactLayout
                      ? "flex flex-col gap-4 rounded-lg bg-gray-50 p-4"
                      : "grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 md:grid-cols-2"
                  }
                >
                  <div>
                    <p className="text-sm text-gray-600">Customer</p>
                    <p className="font-medium text-gray-900">{review.customer}</p>
                    <p className="text-sm text-gray-500">{review.customerEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Professional Reviewed</p>
                    <p className="font-medium text-gray-900">{review.professional}</p>
                    <p className="text-sm text-gray-500">{review.service}</p>
                  </div>
                </div>

                {/* Review Text */}
                <div>
                  <p className="text-gray-900">{review.text}</p>
                </div>

                {/* Professional Response */}
                {review.professionalResponse && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">Professional's Response</p>
                    <p className="text-sm text-blue-800">{review.professionalResponse}</p>
                  </div>
                )}

                {/* Flag Reason */}
                {review.flagged && review.flagReason && (
                  <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-900">Flag Reason</p>
                      <p className="text-sm text-orange-700">{review.flagReason}</p>
                    </div>
                  </div>
                )}

                {/* Rejection Reason */}
                {review.status === "rejected" && review.rejectionReason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-900">Rejection Reason</p>
                    <p className="text-sm text-red-700">{review.rejectionReason}</p>
                  </div>
                )}

                <div
                  className={
                    mobileButtons
                      ? "flex flex-col gap-2 border-t border-gray-100 pt-3"
                      : "-mx-4 flex min-w-0 items-center gap-2 overflow-x-auto border-t border-gray-100 px-4 pb-2 pt-3"
                  }
                  style={
                    mobileButtons
                      ? undefined
                      : { WebkitOverflowScrolling: "touch", paddingRight: "0.5rem" }
                  }
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className={mobileButtons ? "h-10 w-full" : "h-9 shrink-0 whitespace-nowrap"}
                    style={mobileButtons ? undefined : { minWidth: "max-content" }}
                    onClick={() => void handleViewDetails(review)}
                  >
                    <Eye className="mr-2 h-4 w-4 shrink-0" />
                    View Details
                  </Button>
                  {review.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        className={
                          mobileButtons
                            ? "h-10 w-full bg-green-600 hover:bg-green-700"
                            : "h-9 shrink-0 whitespace-nowrap bg-green-600 hover:bg-green-700"
                        }
                        style={mobileButtons ? undefined : { minWidth: "max-content" }}
                        disabled={approvingReviewId === review.id || rejectingReviewId === review.id}
                        onClick={() => void handleApprove(review)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4 shrink-0" />
                        {approvingReviewId === review.id ? "Approving…" : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={
                          mobileButtons
                            ? "h-10 w-full border-red-600 text-red-600 hover:bg-red-50"
                            : "h-9 shrink-0 whitespace-nowrap border-red-600 text-red-600 hover:bg-red-50"
                        }
                        style={mobileButtons ? undefined : { minWidth: "max-content" }}
                        disabled={rejectingReviewId === review.id || approvingReviewId === review.id}
                        onClick={() => void handleReject(review)}
                      >
                        <XCircle className="mr-2 h-4 w-4 shrink-0" />
                        {rejectingReviewId === review.id ? "Rejecting…" : "Reject"}
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className={mobileButtons ? "h-10 w-full" : "h-9 shrink-0 whitespace-nowrap"}
                    style={mobileButtons ? undefined : { minWidth: "max-content" }}
                    onClick={() => handleAddResponse(review)}
                    title="Contact Professional"
                  >
                    <MessageSquare className="mr-2 h-4 w-4 shrink-0" />
                    {mobileButtons ? "Contact Professional" : compactLayout ? "Contact Pro" : "Contact Professional"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={mobileButtons ? "h-10 w-full" : "h-9 shrink-0 whitespace-nowrap"}
                    style={mobileButtons ? undefined : { minWidth: "max-content" }}
                    onClick={() => handleContactCustomer(review)}
                    title="Contact Customer"
                  >
                    <Mail className="mr-2 h-4 w-4 shrink-0" />
                    {mobileButtons ? "Contact Customer" : compactLayout ? "Contact Cust." : "Contact Customer"}
                  </Button>
                  {!mobileButtons ? (
                    <span className="inline-block h-1 w-6 shrink-0" aria-hidden />
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {!listLoading && filteredReviews.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">
              {searchTerm.trim() || filterStatus !== "all"
                ? "No reviews match your search or filter"
                : "No reviews found"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* View Details Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#0A1A2F]">Review Details</DialogTitle>
            <DialogDescription>Complete review information</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {detailLoading && (
              <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin text-red-600" />
                <span>Loading review details…</span>
              </div>
            )}
            <div
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 p-4 ${
                detailLoading ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <div>
                <p className="mb-2 text-sm text-gray-600">Rating</p>
                {renderStars(selectedReview?.rating || 0)}
              </div>
              <Badge
                variant="custom"
                className={getReviewStatusBadgeClass(selectedReview?.status ?? "")}
              >
                {formatReviewStatusLabel(selectedReview?.status ?? "")}
              </Badge>
            </div>

            <Separator />

            <div
              className={
                compactLayout ? "flex flex-col gap-4" : "grid grid-cols-1 gap-4 md:grid-cols-2"
              }
            >
              <div>
                <Label className="text-sm text-gray-600">Customer</Label>
                <p className="font-medium text-gray-900 mt-1">{selectedReview?.customer}</p>
                <p className="text-sm text-gray-600">{selectedReview?.customerEmail}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Professional</Label>
                <p className="font-medium text-gray-900 mt-1">{selectedReview?.professional}</p>
                <p className="text-sm text-gray-600">{selectedReview?.professionalEmail}</p>
              </div>
            </div>

            <div>
              <Label className="text-sm text-gray-600">Service & Booking</Label>
              <p className="font-medium text-gray-900 mt-1">{selectedReview?.service}</p>
              <p className="text-sm text-gray-600">Booking: {selectedReview?.bookingRef}</p>
              <p className="text-sm text-gray-600">Date: {selectedReview?.date}</p>
            </div>

            <Separator />

            <div>
              <Label className="text-sm text-gray-600 mb-2 block">Review Content</Label>
              <p className="text-gray-900 p-4 bg-gray-50 rounded-lg">{selectedReview?.text}</p>
            </div>

            {selectedReview?.professionalResponse && (
              <div>
                <Label className="text-sm text-gray-600 mb-2 block">Professional's Response</Label>
                <p className="text-gray-900 p-4 bg-blue-50 rounded-lg">{selectedReview?.professionalResponse}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>
              Close
            </Button>
            {selectedReview?.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                  disabled={
                    detailLoading ||
                    !!selectedReview &&
                    (approvingReviewId === selectedReview.id || rejectingReviewId === selectedReview.id)
                  }
                  onClick={() => selectedReview && void handleReject(selectedReview)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {selectedReview && rejectingReviewId === selectedReview.id ? "Rejecting…" : "Reject"}
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  disabled={
                    detailLoading ||
                    !!selectedReview &&
                    (approvingReviewId === selectedReview.id || rejectingReviewId === selectedReview.id)
                  }
                  onClick={() => selectedReview && void handleApprove(selectedReview)}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {selectedReview && approvingReviewId === selectedReview.id ? "Approving…" : "Approve"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal — commented out (do not remove). Uncomment block + `setRejectModalOpen(true)` in `handleReject` to restore.
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#0A1A2F] flex items-center gap-2">
              <XCircle className="w-6 h-6 text-red-600" />
              Reject Review
            </DialogTitle>
            <DialogDescription>
              Reject the review from {selectedReview?.customer}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                {renderStars(selectedReview?.rating || 0)}
              </div>
              <p className="text-sm text-gray-900 mt-2">{selectedReview?.text}</p>
            </div>

            <div>
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inappropriate-language">Inappropriate Language</SelectItem>
                  <SelectItem value="spam">Spam or Fake Review</SelectItem>
                  <SelectItem value="policy-violation">Violates Content Policy</SelectItem>
                  <SelectItem value="factual-inaccuracy">Factual Inaccuracy</SelectItem>
                  <SelectItem value="personal-information">Contains Personal Information</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                The review will be permanently rejected and hidden from the platform. The customer will be notified via email.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={confirmRejection}>
              <XCircle className="w-4 h-4 mr-2" />
              Reject Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      */}

      {/* Admin Response Modal */}
      <Dialog open={responseModalOpen} onOpenChange={setResponseModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#0A1A2F] flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              Contact Professional
            </DialogTitle>
            <DialogDescription>
              Send a message to {selectedReview?.professional} about this review
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Professional</p>
              <p className="font-medium text-gray-900">{selectedReview?.professional}</p>
              <p className="text-sm text-gray-600">{selectedReview?.professionalEmail}</p>
              {selectedReview?.professionalId != null && (
                <p className="text-xs text-gray-500 mt-2">Professional ID: {selectedReview.professionalId}</p>
              )}
              {selectedReview != null && selectedReview.professionalId == null && (
                <p className="text-xs text-amber-700 mt-2">
                  No professional ID on this review record — sending is disabled until the reviews list API includes{" "}
                  <code className="text-[11px]">professional_id</code>.
                </p>
              )}
            </div>

            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Review Reference</p>
              <div className="flex items-center gap-2 mb-2">
                {renderStars(selectedReview?.rating || 0)}
              </div>
              <p className="text-sm text-gray-900">{selectedReview?.text}</p>
            </div>

            <div>
              <Label htmlFor="admin-response">Your Message *</Label>
              <Textarea
                id="admin-response"
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Type your message to the professional..."
                className="mt-2"
                rows={5}
              />
              <p className="text-xs text-gray-500 mt-1">
                This message will be sent via email to the professional
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResponseModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={sendingContactMessage || !selectedReview?.professionalId}
              onClick={() => void submitResponse()}
            >
              <Mail className="mr-2 h-4 w-4" />
              {sendingContactMessage ? "Sending…" : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Customer Modal */}
      <Dialog open={customerContactModalOpen} onOpenChange={setCustomerContactModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl text-[#0A1A2F]">
              <User className="h-6 w-6 text-blue-600" />
              Contact Customer
            </DialogTitle>
            <DialogDescription>
              Send a message to {selectedReview?.customer} about this review
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Customer</p>
              <p className="font-medium text-gray-900">{selectedReview?.customer}</p>
              <p className="text-sm text-gray-600">{selectedReview?.customerEmail}</p>
              {(selectedReview?.customerEmail ?? "").trim() ? (
                <p className="text-xs text-gray-500 mt-2">Will send to: {(selectedReview?.customerEmail ?? "").trim()}</p>
              ) : (
                <p className="text-xs text-amber-700 mt-2">
                  No <code className="text-[11px]">reviewer_email</code> on this review — sending is disabled.
                </p>
              )}
            </div>

            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Review Reference</p>
              <div className="flex items-center gap-2 mb-2">
                {renderStars(selectedReview?.rating || 0)}
              </div>
              <p className="text-sm text-gray-900">{selectedReview?.text}</p>
            </div>

            <div>
              <Label htmlFor="admin-customer-message">Your Message *</Label>
              <Textarea
                id="admin-customer-message"
                value={customerContactMessage}
                onChange={(e) => setCustomerContactMessage(e.target.value)}
                placeholder="Type your message to the customer..."
                className="mt-2"
                rows={5}
              />
              <p className="text-xs text-gray-500 mt-1">This message will be sent via email to the customer</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomerContactModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={sendingCustomerContactMessage || !(selectedReview?.customerEmail ?? "").trim()}
              onClick={() => void submitCustomerContact()}
            >
              <Mail className="mr-2 h-4 w-4" />
              {sendingCustomerContactMessage ? "Sending…" : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
