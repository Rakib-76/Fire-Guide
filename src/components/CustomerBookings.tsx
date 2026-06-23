import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { 
  Calendar, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Clock, 
  FileText,
  Download,
  CheckCircle,
  Building2,
  Loader2,
  AlertCircle,
  CreditCard,
  Star,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import { Booking } from "../App";
import { getCustomerAllBookings, CustomerAllBookingItem, cancelCustomerBooking, rescheduleCustomerBooking } from "../api/authService";
import { acceptProfessionalBooking } from "../api/bookingService";
import { getBookingReport, type GetBookingReportResponse } from "../api/professionalsService";
import { resolveApiBaseUrl } from "../lib/apiBaseUrl";
import {
  storePaymentInvoice,
  isPaymentInvoiceStoreSuccess,
  extractStripeCheckoutUrl,
  extractTxRefFromInvoiceResponse,
} from "../api/paymentService";
import {
  getStripeCheckoutSuccessUrl,
  getPaymentFailedPageUrl,
  PAYMENT_RETURN_STORAGE_KEY,
  type PaymentReturnContext,
} from "../lib/paymentAppUrls";
import { getApiToken, getUserInfo, getUserFullName, getUserEmail } from "../lib/auth";
import { createReview, updateReview, showReview, fetchReviews } from "../api/reviewsService";
import { RescheduleCalendarPicker } from "./RescheduleCalendarPicker";
import { buildBookingServiceDetailsFromApiSelectedService } from "../lib/bookingServiceDetails";
import {
  getCustomQuoteRequestDisplayRows,
  loadQuoteRequestDurationLabelMap,
} from "./CustomQuoteRequestDetailsPanel";
import {
  getBookingPaymentStatusKey,
  getBookingPaymentStatusLabel,
  isBookingPaymentPaid,
  isBookingPaidLocally,
} from "../lib/bookingPaymentStatus";

// Available time slots for rescheduling (fallback when professional_id is missing)
const TIME_SLOTS = [
  "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
  "05:00 PM", "05:30 PM", "06:00 PM"
];

// Reschedule form data interface
interface RescheduleFormData {
  date: string;
  time: string;
  reason: string;
}

interface CustomerBookingsProps {
  bookings: Booking[];
  onUpdateBooking: (bookingId: string, updates: Partial<Booking>) => void;
  onDeleteBooking: (bookingId: string) => void;
}

/** Laravel may send is_paid as bool, 1/0, or "1"/"0"; some rows use payment_status / payment.status. */
function parseApiBookingPaid(apiBooking: CustomerAllBookingItem): boolean {
  return isBookingPaymentPaid(apiBooking);
}

function getBookingPaymentStatus(booking: Booking): string {
  const bookingId = parseInt(booking.id, 10);
  if (Number.isFinite(bookingId) && isBookingPaidLocally(bookingId)) {
    return "paid";
  }
  if (booking.isPaid) return "paid";
  if (booking.paymentStatus === "paid") return "paid";
  return booking.paymentStatus || "unpaid";
}

function isBookingPaid(booking: Booking): boolean {
  const bookingId = parseInt(booking.id, 10);
  if (Number.isFinite(bookingId) && isBookingPaidLocally(bookingId)) return true;
  return booking.isPaid === true || getBookingPaymentStatus(booking) === "paid";
}

function parseApiBookingCanReview(apiBooking: CustomerAllBookingItem): boolean {
  const v = apiBooking.can_review;
  if (v == null) return false;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  return s === "on" || s === "1" || s === "true" || s === "yes";
}

function parseApiBookingHasReview(apiBooking: CustomerAllBookingItem): boolean {
  if (parseApiBookingReviewId(apiBooking) != null) return true;
  const candidates = [apiBooking.has_review, apiBooking.is_reviewed];
  for (const raw of candidates) {
    if (raw === true || raw === 1 || raw === "1") return true;
    if (typeof raw === "string" && ["true", "yes", "reviewed", "submitted"].includes(raw.toLowerCase())) {
      return true;
    }
  }
  return loadBookingReviewIds()[apiBooking.id.toString()] != null;
}

const CUSTOMER_REVIEWED_BOOKING_IDS_KEY = "fireguide_customer_reviewed_booking_ids";

function loadCustomerReviewedBookingIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CUSTOMER_REVIEWED_BOOKING_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string" && id.length > 0));
  } catch {
    return new Set();
  }
}

function persistCustomerReviewedBookingIds(ids: Set<string>): void {
  localStorage.setItem(CUSTOMER_REVIEWED_BOOKING_IDS_KEY, JSON.stringify([...ids]));
}

const CUSTOMER_BOOKING_REVIEW_IDS_KEY = "fireguide_customer_booking_review_ids";

function loadBookingReviewIds(): Record<string, number> {
  try {
    const raw = localStorage.getItem(CUSTOMER_BOOKING_REVIEW_IDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [key, val] of Object.entries(parsed)) {
      const n = typeof val === "number" ? val : parseInt(String(val), 10);
      if (typeof key === "string" && key.length > 0 && Number.isFinite(n) && n > 0) out[key] = n;
    }
    return out;
  } catch {
    return {};
  }
}

function persistBookingReviewId(bookingId: string, reviewId: number): void {
  const map = loadBookingReviewIds();
  map[bookingId] = reviewId;
  localStorage.setItem(CUSTOMER_BOOKING_REVIEW_IDS_KEY, JSON.stringify(map));
}

function parseApiBookingReviewId(apiBooking: CustomerAllBookingItem): number | undefined {
  const tryNum = (raw: unknown): number | undefined => {
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
    if (typeof raw === "string") {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n) && n > 0) return n;
    }
    return undefined;
  };
  return tryNum(apiBooking.review_id) ?? tryNum(apiBooking.review?.id);
}

const normalizeApiBookingStatus = (status: string | undefined | null): string =>
  (status ?? "").toLowerCase().trim();

const getCustomerStatusLabelFromApi = (status: string | undefined | null): string => {
  const api = normalizeApiBookingStatus(status);
  if (api === "pending" || api === "me") return "Pending";
  if (api === "confirmed") return "Confirmed";
  if (api === "completed") return "Completed";
  if (api === "cancelled" || api === "canceled") return "Cancelled";
  if (!api) return "Unknown";
  return api.charAt(0).toUpperCase() + api.slice(1);
};

const getCustomerStatusLabel = (booking: Booking): string =>
  getCustomerStatusLabelFromApi(booking.apiStatus ?? booking.displayStatus);

const isMeRescheduleStatus = (booking: Booking): boolean =>
  normalizeApiBookingStatus(booking.apiStatus) === "me";

const hasBookingUpdatedBy = (booking: Booking): boolean =>
  booking.updatedById != null && !Number.isNaN(Number(booking.updatedById));

/** Reschedule submitted banner ? only when status is `me` and API set `updated_by`. */
const showCustomerRescheduleSubmittedMessage = (booking: Booking): boolean =>
  isMeRescheduleStatus(booking) && hasBookingUpdatedBy(booking);

const needsCustomerAcceptReschedule = (booking: Booking): boolean =>
  normalizeApiBookingStatus(booking.apiStatus) === "pending";

const customerRescheduleSubmittedMessage =
  "Your reschedule request has been sent. Please wait while your professional reviews and approves the new date and time.";

// Transform API booking to local Booking format
const transformApiBooking = (apiBooking: CustomerAllBookingItem): Booking => {
  // Map API status to filter category (for filtering purposes)
  const mapStatusToCategory = (status: string): "upcoming" | "completed" | "cancelled" => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'completed') return 'completed';
    if (lowerStatus === 'cancelled' || lowerStatus === 'canceled') return 'cancelled';
    // confirmed, pending, etc. are considered upcoming for filtering
    return 'upcoming';
  };

  // Format address
  const fullAddress = [
    apiBooking.property_address,
    apiBooking.city,
    apiBooking.post_code
  ].filter(Boolean).join(', ');

  // Get service name from API response, fallback to default
  const serviceName = apiBooking.service?.service_name || 'Fire Safety Service';

  // Get professional name - check both full_name and name fields
  const professionalName = apiBooking.professional?.full_name || apiBooking.professional?.name || 'Professional';

  // Root `email` / `phone` on this payload are the customer's (booking holder), not the professional's.
  const prof = apiBooking.professional;
  const professionalEmail =
    (typeof apiBooking.professional_email === "string" && apiBooking.professional_email.trim()) ||
    (typeof prof?.email === "string" && prof.email.trim()) ||
    "";
  const professionalPhone =
    (typeof apiBooking.professional_phone === "string" && apiBooking.professional_phone.trim()) ||
    (typeof prof?.phone === "string" && prof.phone.trim()) ||
    (typeof prof?.mobile === "string" && prof.mobile.trim()) ||
    (typeof prof?.number === "string" && prof.number.trim()) ||
    (prof?.number != null && String(prof.number).trim()) ||
    "";

  const selectedServiceDetails = buildBookingServiceDetailsFromApiSelectedService(
    apiBooking.selected_service ?? null
  );
  const customQuoteRequestData = apiBooking.custom_quote_details?.request_data;
  const serviceDetails =
    selectedServiceDetails.length > 0
      ? selectedServiceDetails
      : customQuoteRequestData
        ? getCustomQuoteRequestDisplayRows(customQuoteRequestData).map(({ label, value }) => ({
            label,
            value,
          }))
        : [];

  return {
    id: apiBooking.id.toString(),
    service: serviceName,
    professional: professionalName,
    professionalEmail,
    professionalPhone,
    date: apiBooking.selected_date,
    time: apiBooking.selected_time,
    location: fullAddress || 'Address not specified',
    price: new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(parseFloat(String(apiBooking.price ?? "0"))),
    status: mapStatusToCategory(apiBooking.status),
    apiStatus: normalizeApiBookingStatus(apiBooking.status),
    displayStatus: getCustomerStatusLabelFromApi(apiBooking.status),
    bookingRef: apiBooking.ref_code || `FG-${apiBooking.id}`,
    hasReport: ["completed", "confirmed"].includes(apiBooking.status.toLowerCase()),
    isPaid: parseApiBookingPaid(apiBooking),
    paymentStatus: getBookingPaymentStatusKey(apiBooking),
    professionalId: apiBooking.professional?.id,
    updatedById: apiBooking.updated_by?.id ?? null,
    reviewId:
      parseApiBookingReviewId(apiBooking) ?? loadBookingReviewIds()[apiBooking.id.toString()],
    hasReview: parseApiBookingHasReview(apiBooking),
    canReview: parseApiBookingCanReview(apiBooking),
    customerEmail: typeof apiBooking.email === "string" ? apiBooking.email.trim() : "",
    serviceDetails,
    customQuoteRequestData:
      selectedServiceDetails.length === 0 && customQuoteRequestData
        ? customQuoteRequestData
        : undefined,
  };
};

const bookingHasSubmittedReview = (booking: Booking, reviewedLocally: Set<string>): boolean => {
  if (booking.hasReview === true) return true;
  if (reviewedLocally.has(booking.id)) return true;
  if (booking.reviewId != null && booking.reviewId > 0) return true;
  const storedReviewId = loadBookingReviewIds()[booking.id];
  return storedReviewId != null && storedReviewId > 0;
};

/** Completed + paid bookings eligible for a new review (API `can_review` must be on). */
const bookingCanGiveReview = (booking: Booking, reviewedLocally: Set<string>): boolean =>
  normalizeApiBookingStatus(booking.apiStatus) === "completed" &&
  booking.canReview === true &&
  isBookingPaid(booking) &&
  booking.professionalId != null &&
  !bookingHasSubmittedReview(booking, reviewedLocally);

/** Completed + paid bookings with an existing review — allow update. */
const bookingCanUpdateReview = (booking: Booking, reviewedLocally: Set<string>): boolean =>
  normalizeApiBookingStatus(booking.apiStatus) === "completed" &&
  isBookingPaid(booking) &&
  booking.professionalId != null &&
  bookingHasSubmittedReview(booking, reviewedLocally);

/** Show Pay when the booking can still be paid (not cancelled, not recorded as paid). */
const bookingNeedsPayment = (booking: Booking): boolean =>
  booking.status !== "cancelled" && !isBookingPaid(booking);

/** Cancel allowed unless professional confirmed, completed, or already cancelled (paid/unpaid ignored). */
const bookingAllowsCustomerCancel = (booking: Booking): boolean => {
  if (booking.status === "cancelled" || booking.status === "completed") return false;
  const apiStatus = normalizeApiBookingStatus(booking.apiStatus);
  if (apiStatus === "confirmed" || apiStatus === "completed") return false;
  return true;
};

const bookingAllowsCustomerReschedule = (booking: Booking): boolean =>
  booking.status === "upcoming" &&
  !needsCustomerAcceptReschedule(booking) &&
  !showCustomerRescheduleSubmittedMessage(booking);

const parseBookingPriceNumber = (priceLabel: string): number => {
  const n = parseFloat(String(priceLabel).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

function sanitizeReportFilenamePart(ref: string): string {
  return ref.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-+|-+$/g, "") || "booking";
}

function isGetBookingReportSuccess(res: GetBookingReportResponse): boolean {
  const s = res.status;
  return s === true || s === "success" || s === "Success";
}

function extractReportImageFromResponse(res: GetBookingReportResponse): string | null {
  const d = res.data;
  if (!d || typeof d !== "object") return null;
  const record = d as Record<string, unknown>;
  const candidates = [record.report_image, record.report_file, record.file, record.url];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

function isLikelyRawBase64(value: string): boolean {
  const compact = value.replace(/\s/g, "");
  if (compact.length < 80) return false;
  if (compact.includes("/") || compact.includes("\\") || /\.[a-z0-9]{2,5}$/i.test(compact)) {
    return false;
  }
  return /^[A-Za-z0-9+/=]+$/.test(compact);
}

function normalizeReportImagePayload(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("data:") || /^https?:\/\//i.test(t) || t.startsWith("/")) return t;
  if (isLikelyRawBase64(t)) {
    return `data:image/png;base64,${t.replace(/\s/g, "")}`;
  }
  return t;
}

function buildReportAssetUrlCandidates(raw: string): string[] {
  const normalized = normalizeReportImagePayload(raw);
  if (normalized.startsWith("data:")) return [normalized];

  const origin = resolveApiBaseUrl().replace(/\/api\/?$/, "");
  const urls = new Set<string>();

  if (/^https?:\/\//i.test(normalized)) {
    urls.add(normalized);
    try {
      const parsed = new URL(normalized);
      if (!parsed.pathname.startsWith("/storage/")) {
        const withStorage = `${parsed.origin}/storage${parsed.pathname}`;
        urls.add(withStorage);
      }
    } catch {
      /* ignore */
    }
    return [...urls];
  }

  const path = normalized.startsWith("/") ? normalized : `/${normalized.replace(/^\/+/, "")}`;
  urls.add(`${origin}${path}`);

  if (!path.startsWith("/storage/")) {
    urls.add(`${origin}/storage${path}`);
    const leaf = path.replace(/^\/+/, "");
    if (!leaf.startsWith("reports/")) {
      urls.add(`${origin}/storage/reports/${leaf}`);
    }
  }

  return [...urls];
}

/** Same-origin path for Vite `/storage` proxy (dev) when asset is on the API host. */
function toProxiedAssetFetchUrl(absoluteUrl: string): string {
  const apiOrigin = resolveApiBaseUrl().replace(/\/api\/?$/, "");
  try {
    const asset = new URL(absoluteUrl, apiOrigin);
    const api = new URL(apiOrigin);
    if (asset.origin === api.origin) {
      return `${asset.pathname}${asset.search}`;
    }
  } catch {
    /* keep absolute */
  }
  return absoluteUrl;
}

async function isValidReportBlob(blob: Blob): Promise<boolean> {
  if (blob.size < 4) return false;
  if (blob.type.startsWith("image/") || blob.type === "application/pdf") return true;

  const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const isPng =
    header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
  const isJpeg = header[0] === 0xff && header[1] === 0xd8;
  const isPdf =
    header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;
  if (isPng || isJpeg || isPdf) return true;

  const prefix = (await blob.slice(0, 32).text()).trim().toLowerCase();
  if (prefix.startsWith("<!doctype") || prefix.startsWith("<html") || prefix.startsWith("{")) {
    return false;
  }
  return false;
}

async function fetchReportBlobFromUrl(absoluteUrl: string): Promise<Blob | null> {
  const fetchTargets = [toProxiedAssetFetchUrl(absoluteUrl)];
  if (!fetchTargets.includes(absoluteUrl)) fetchTargets.push(absoluteUrl);

  for (const target of fetchTargets) {
    try {
      const res = await fetch(target);
      if (!res.ok) continue;
      const blob = await res.blob();
      if (await isValidReportBlob(blob)) return blob;
    } catch {
      /* try next */
    }
  }
  return null;
}

function filenameFromUrl(url: string, fallback: string): string {
  try {
    const last = new URL(url, window.location.origin).pathname.split("/").filter(Boolean).pop();
    if (last) return decodeURIComponent(last);
  } catch {
    /* ignore */
  }
  return fallback;
}

function triggerBrowserFileDownload(blobUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function openReportInNewTab(url: string): void {
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

function extensionFromMime(mime: string): string {
  if (mime.includes("pdf")) return ".pdf";
  if (mime.includes("png")) return ".png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  if (mime.includes("webp")) return ".webp";
  return ".jpg";
}

async function downloadReportImage(
  fileRaw: string,
  booking: Booking
): Promise<"downloaded" | "opened"> {
  const ref = sanitizeReportFilenamePart(booking.bookingRef || booking.id);
  const fallbackFilename = `FireGuide-Report-${ref}.png`;
  const candidates = buildReportAssetUrlCandidates(fileRaw);
  const payload = candidates[0] ?? fileRaw.trim();

  if (payload.startsWith("data:")) {
    const mimeMatch = payload.match(/^data:([^;]+);/);
    const mime = mimeMatch?.[1] || "image/png";
    triggerBrowserFileDownload(payload, `${ref}${extensionFromMime(mime)}`);
    return "downloaded";
  }

  for (const absoluteUrl of candidates) {
    const blob = await fetchReportBlobFromUrl(absoluteUrl);
    if (!blob) continue;

    const filename = filenameFromUrl(absoluteUrl, fallbackFilename);
    const blobUrl = URL.createObjectURL(blob);
    triggerBrowserFileDownload(blobUrl, filename);
    URL.revokeObjectURL(blobUrl);
    return "downloaded";
  }

  const openUrl = candidates.find((u) => /^https?:\/\//i.test(u)) ?? candidates[candidates.length - 1];
  if (openUrl && !openUrl.startsWith("data:")) {
    openReportInNewTab(openUrl);
    return "opened";
  }

  throw new Error("Could not download a valid report file.");
}

export const CustomerBookings = React.memo(function CustomerBookings({ bookings: propBookings, onUpdateBooking, onDeleteBooking }: CustomerBookingsProps) {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed" | "cancelled">("all");
  
  // API data state
  const [apiBookings, setApiBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState<string | null>(null); // Track which booking is being cancelled
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
  const [acceptingBookingId, setAcceptingBookingId] = useState<string | null>(null);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(loadCustomerReviewedBookingIds);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState("");
  const [reviewHoverRating, setReviewHoverRating] = useState(0);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [reviewName, setReviewName] = useState("");
  const [reviewEmail, setReviewEmail] = useState("");
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [loadingReviewDetails, setLoadingReviewDetails] = useState(false);
  const [submittingReviewId, setSubmittingReviewId] = useState<string | null>(null);

  // Reschedule modal state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [bookingToReschedule, setBookingToReschedule] = useState<Booking | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState<RescheduleFormData>({
    date: '',
    time: '',
    reason: ''
  });
  const [fraDurationLabels, setFraDurationLabels] = useState<ReadonlyMap<number, string>>(
    () => new Map()
  );

  useEffect(() => {
    loadQuoteRequestDurationLabelMap().then(setFraDurationLabels);
  }, []);

  const selectedBookingServiceDetails = useMemo(() => {
    if (!selectedBooking) return [];
    if (selectedBooking.customQuoteRequestData) {
      return getCustomQuoteRequestDisplayRows(
        selectedBooking.customQuoteRequestData,
        fraDurationLabels
      );
    }
    return (selectedBooking.serviceDetails ?? []).map((row, index) => ({
      id: `service-${index}`,
      label: row.label,
      value: row.value,
    }));
  }, [selectedBooking, fraDurationLabels]);

  const fetchBookingsFromApi = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    const token = getApiToken();
    if (!token) {
      console.log("No API token available for bookings");
      if (!silent) setIsLoading(false);
      return;
    }

    if (!silent) setIsLoading(true);
    try {
      const response = await getCustomerAllBookings(token);
      if (response.status === "success" && response.data?.bookings) {
        const transformedBookings = response.data.bookings.map(transformApiBooking);
        setApiBookings(transformedBookings);
        setReviewedBookingIds((prev) => {
          const next = new Set(prev);
          let changed = false;
          for (const b of transformedBookings) {
            if (
              b.hasReview ||
              (b.reviewId != null && b.reviewId > 0) ||
              loadBookingReviewIds()[b.id] != null
            ) {
              if (!next.has(b.id)) {
                next.add(b.id);
                changed = true;
              }
            }
          }
          if (changed) persistCustomerReviewedBookingIds(next);
          return changed ? next : prev;
        });
      } else {
        console.error("Failed to fetch bookings:", response.message || response.error);
        setApiBookings([]);
      }
    } catch (error: unknown) {
      console.error("Error fetching bookings:", error);
      setApiBookings([]);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBookingsFromApi();
  }, [fetchBookingsFromApi]);

  /** Keep “reviewed” bookings in sync with stored review ids (survives refresh). */
  useEffect(() => {
    const reviewIdByBooking = loadBookingReviewIds();
    const bookingIds = Object.keys(reviewIdByBooking);
    if (bookingIds.length === 0) return;
    setReviewedBookingIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of bookingIds) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      if (changed) persistCustomerReviewedBookingIds(next);
      return changed ? next : prev;
    });
  }, []);

  // After Stripe / webhook, `is_paid` updates on the server ????????? refresh when user returns to the tab.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchBookingsFromApi({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchBookingsFromApi]);

  // Use API bookings
  const bookings = apiBookings;

  // Keep details modal in sync after silent refetch (e.g. `is_paid` from webhook).
  useEffect(() => {
    setSelectedBooking((prev) => {
      if (!prev) return null;
      const next = apiBookings.find((b) => b.id === prev.id);
      return next ?? prev;
    });
  }, [apiBookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => 
      filter === "all" ? true : booking.status === filter
    );
  }, [bookings, filter]);

  const getStatusColor = (booking: Booking) => {
    const lowerStatus = normalizeApiBookingStatus(booking.apiStatus ?? booking.displayStatus);
    switch (lowerStatus) {
      case "upcoming":
      case "confirmed":
        return "bg-blue-50 text-blue-800 border border-blue-200";
      case "pending":
      case "me":
        return "bg-yellow-50 text-yellow-800 border border-yellow-200";
      case "completed":
        return "bg-green-50 text-green-800 border border-green-200";
      case "cancelled":
      case "canceled":
        return "bg-red-50 text-red-800 border border-red-200";
      default:
        if (booking.status === "completed") {
          return "bg-green-50 text-green-800 border border-green-200";
        }
        if (booking.status === "cancelled") {
          return "bg-red-50 text-red-800 border border-red-200";
        }
        return "bg-gray-50 text-gray-800 border border-gray-200";
    }
  };

  const getPaymentStatusColor = (paymentStatus: string) => {
    switch (paymentStatus) {
      case "paid":
        return "border border-green-200 bg-green-100 text-green-700";
      case "failed":
        return "border border-red-200 bg-red-100 text-red-700";
      case "refunded":
        return "border border-gray-200 bg-gray-100 text-gray-800";
      case "pending":
        return "border border-yellow-200 bg-yellow-100 text-yellow-800";
      case "unpaid":
        return "border border-red-700 bg-red-600 text-white";
      default:
        return "border border-red-700 bg-red-600 text-white";
    }
  };

  const renderPaymentStatusBadge = (booking: Booking) => (
    <Badge
      variant="custom"
      className={`shrink-0 whitespace-nowrap ${getPaymentStatusColor(getBookingPaymentStatus(booking))}`}
    >
      {getBookingPaymentStatusLabel(getBookingPaymentStatus(booking))}
    </Badge>
  );

  const handleAcceptReschedule = async (booking: Booking) => {
    const token = getApiToken();
    if (!token) {
      toast.error("Authentication required. Please log in again.");
      return;
    }

    setAcceptingBookingId(booking.id);
    try {
      const response = await acceptProfessionalBooking({
        api_token: token,
        id: parseInt(booking.id, 10),
      });

      const ok =
        response.status === "success" ||
        String(response.status).toLowerCase() === "success";

      if (ok) {
        toast.success(response.message || "Reschedule accepted successfully.");
        setSelectedBooking(null);
        await fetchBookingsFromApi({ silent: true });
      } else {
        toast.error(response.message || "Failed to accept reschedule.");
      }
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string"
          ? (error as { message: string }).message
          : "Failed to accept reschedule. Please try again.";
      toast.error(message);
    } finally {
      setAcceptingBookingId(null);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    const token = getApiToken();
    if (!token) {
      toast.error("Authentication required. Please log in again.");
      return;
    }

    setIsCancelling(bookingId);
    try {
      const response = await cancelCustomerBooking(token, parseInt(bookingId, 10));
      const ok =
        response.status === "success" ||
        String(response.status).toLowerCase() === "success" ||
        (response as { success?: boolean }).success === true;
      if (ok) {
        toast.success(response.message || "Booking cancelled successfully. Refund will be processed within 5-7 days.");
        setSelectedBooking(null);
        const cancelledUpdates: Partial<Booking> = {
          status: "cancelled",
          apiStatus: "cancelled",
          displayStatus: "Cancelled",
        };
        setApiBookings((prev) =>
          prev.map((booking) =>
            booking.id === bookingId ? { ...booking, ...cancelledUpdates } : booking
          )
        );
        onUpdateBooking(bookingId, cancelledUpdates);
      } else {
        toast.error(response.message || "Failed to cancel booking. Please try again.");
      }
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      toast.error(error.message || "Failed to cancel booking. Please try again.");
    } finally {
      setIsCancelling(null);
    }
  };

  const openGiveReviewModal = (booking: Booking) => {
    setEditingReviewId(null);
    setReviewBooking(booking);
    setReviewRating("");
    setReviewHoverRating(0);
    setReviewFeedback("");
    const defaultName =
      getUserFullName()?.trim() ||
      getUserInfo()?.name?.trim() ||
      "";
    setReviewName(defaultName);
    const defaultEmail =
      booking.customerEmail?.trim() ||
      getUserEmail()?.trim() ||
      "";
    setReviewEmail(defaultEmail);
  };

  const resolveReviewIdForBooking = async (booking: Booking): Promise<number | null> => {
    if (booking.reviewId != null && booking.reviewId > 0) return booking.reviewId;
    const stored = loadBookingReviewIds()[booking.id];
    if (stored) return stored;
    if (!booking.professionalId) return null;
    try {
      const reviews = await fetchReviews();
      const matches = reviews.filter((r) => r.professional?.id === booking.professionalId);
      if (matches.length === 0) return null;
      const latest = [...matches].sort((a, b) => b.id - a.id)[0];
      persistBookingReviewId(booking.id, latest.id);
      return latest.id;
    } catch {
      return null;
    }
  };

  const openUpdateReviewModal = async (booking: Booking) => {
    setReviewBooking(booking);
    setReviewHoverRating(0);
    setLoadingReviewDetails(true);
    setEditingReviewId(null);

    const defaultEmail =
      booking.customerEmail?.trim() ||
      getUserEmail()?.trim() ||
      "";
    setReviewEmail(defaultEmail);

    try {
      const reviewId = await resolveReviewIdForBooking(booking);
      if (!reviewId) {
        toast.error("Could not find your review to update. Please try again later.");
        setReviewBooking(null);
        return;
      }

      setEditingReviewId(reviewId);

      let name = getUserFullName()?.trim() || getUserInfo()?.name?.trim() || "";
      let rating = "";
      let feedback = "";

      try {
        const res = await showReview(reviewId);
        const ok =
          res.status === "success" ||
          res.success === true ||
          (res.data != null && typeof res.data === "object");
        if (ok && res.data && typeof res.data === "object") {
          const d = res.data as Record<string, unknown>;
          name = String(d.name ?? name);
          rating = String(d.rating ?? "");
          feedback = String(d.feedback ?? "");
        }
      } catch {
        const reviews = await fetchReviews();
        const found = reviews.find((r) => r.id === reviewId);
        if (found) {
          name = found.name || name;
          rating = found.rating || "";
          feedback = found.feedback || "";
        }
      }

      setReviewName(name);
      setReviewRating(rating ? String(Math.round(Number(rating))) : "");
      setReviewFeedback(feedback);
      setApiBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, reviewId, hasReview: true } : b))
      );
    } catch {
      toast.error("Could not load your review. Please try again.");
      setReviewBooking(null);
    } finally {
      setLoadingReviewDetails(false);
    }
  };

  const closeGiveReviewModal = () => {
    setReviewBooking(null);
    setReviewRating("");
    setReviewHoverRating(0);
    setReviewFeedback("");
    setReviewName("");
    setReviewEmail("");
    setEditingReviewId(null);
    setLoadingReviewDetails(false);
  };

  const handleSubmitReview = async () => {
    if (!reviewBooking?.professionalId) {
      toast.error("Professional information is missing for this booking.");
      return;
    }
    if (!reviewName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    const isUpdate = editingReviewId != null && editingReviewId > 0;
    const emailTrimmed = reviewEmail.trim();
    if (!isUpdate) {
      if (!emailTrimmed) {
        toast.error("Please enter your email.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        toast.error("Please enter a valid email address.");
        return;
      }
    }
    if (!reviewRating) {
      toast.error("Please select a rating.");
      return;
    }
    if (!reviewFeedback.trim()) {
      toast.error("Please enter your feedback.");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to submit a review.");
      return;
    }

    setSubmittingReviewId(reviewBooking.id);
    try {
      if (isUpdate) {
        const response = await updateReview({
          api_token: token,
          id: editingReviewId,
          name: reviewName.trim(),
          rating: String(reviewRating),
          feedback: reviewFeedback.trim(),
          professional_id: Number(reviewBooking.professionalId),
        });

        const failed =
          response.status === "failed" ||
          response.status === "error" ||
          response.success === false;

        if (failed) {
          toast.error(response.message || response.error || "Failed to update feedback.");
          return;
        }

        const ok =
          response.status === "success" ||
          response.success === true ||
          Boolean(response.message && !response.error);

        if (!ok) {
          toast.error(response.message || response.error || "Failed to update feedback.");
          return;
        }

        persistBookingReviewId(reviewBooking.id, editingReviewId);
        setApiBookings((prev) =>
          prev.map((b) =>
            b.id === reviewBooking.id ? { ...b, hasReview: true, reviewId: editingReviewId } : b
          )
        );
        toast.success(response.message || "Your feedback has been updated.");
        closeGiveReviewModal();
        return;
      }

      const response = await createReview({
        api_token: token,
        name: reviewName.trim(),
        email: emailTrimmed,
        rating: String(reviewRating),
        feedback: reviewFeedback.trim(),
        professional_id: Number(reviewBooking.professionalId),
      });

      const failed =
        response.status === "failed" ||
        response.status === "error" ||
        response.success === false;

      if (failed) {
        const validation = (response as { data?: Record<string, string[]> }).data;
        const emailErr = validation?.email?.[0];
        toast.error(emailErr || response.message || response.error || "Failed to send feedback.");
        return;
      }

      const ok =
        response.status === "success" ||
        response.success === true ||
        Boolean(response.message && !response.error);

      if (!ok) {
        toast.error(response.message || response.error || "Failed to send feedback.");
        return;
      }

      const createdReviewId =
        response.data && typeof response.data === "object" && "id" in response.data
          ? Number((response.data as { id: number }).id)
          : NaN;

      setReviewedBookingIds((prev) => {
        const next = new Set(prev).add(reviewBooking.id);
        persistCustomerReviewedBookingIds(next);
        return next;
      });
      if (Number.isFinite(createdReviewId) && createdReviewId > 0) {
        persistBookingReviewId(reviewBooking.id, createdReviewId);
      }
      setApiBookings((prev) =>
        prev.map((b) =>
          b.id === reviewBooking.id
            ? {
                ...b,
                hasReview: true,
                reviewId: Number.isFinite(createdReviewId) && createdReviewId > 0 ? createdReviewId : b.reviewId,
              }
            : b
        )
      );
      toast.success(response.message || "Thank you! Your feedback has been sent.");
      closeGiveReviewModal();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err && typeof (err as { message: string }).message === "string"
          ? (err as { message: string }).message
          : "Failed to send feedback. Please try again.";
      toast.error(message);
    } finally {
      setSubmittingReviewId(null);
    }
  };

  const handleDownloadReport = async (booking: Booking) => {
    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to download the report.");
      return;
    }

    const bookingId = parseInt(booking.id, 10);
    if (!Number.isFinite(bookingId) || bookingId <= 0) {
      toast.error("Invalid booking reference. Please refresh and try again.");
      return;
    }

    setDownloadingReportId(booking.id);
    try {
      const response = await getBookingReport({ api_token: token, booking_id: bookingId });
      if (!isGetBookingReportSuccess(response)) {
        toast.error(response.message || "Could not load the report. Please try again.");
        return;
      }

      const imageRaw = extractReportImageFromResponse(response);
      if (!imageRaw) {
        toast.error("No report image was returned for this booking.");
        return;
      }

      const result = await downloadReportImage(imageRaw, booking);
      if (result === "opened") {
        toast.success("Report opened in a new tab ????????? save the image from your browser if needed.");
      } else {
        toast.success(`Report downloaded for ${booking.bookingRef || booking.id}`);
      }
    } catch (e: unknown) {
      console.error("Report download error:", e);
      const message =
        e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
          ? (e as { message: string }).message
          : "Could not download the report. Please try again.";
      toast.error(message);
    } finally {
      setDownloadingReportId(null);
    }
  };

  const handlePayBooking = async (booking: Booking) => {
    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to complete payment.");
      return;
    }

    if (booking.status === "cancelled") {
      toast.error("This booking was cancelled ????????? payment is not available.");
      return;
    }

    const professionalBookingId = parseInt(booking.id, 10);
    if (!Number.isFinite(professionalBookingId) || professionalBookingId <= 0) {
      toast.error("Invalid booking reference. Please refresh and try again.");
      return;
    }

    const price = parseBookingPriceNumber(booking.price);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Could not read the booking amount. Please contact support.");
      return;
    }

    setPayingBookingId(booking.id);
    try {
      const successUrl = getStripeCheckoutSuccessUrl();
      const failedUrl = getPaymentFailedPageUrl();

      const response = await storePaymentInvoice({
        api_token: token,
        professional_booking_id: professionalBookingId,
        price,
        success_url: successUrl,
        cancel_url: failedUrl,
        failure_url: failedUrl,
      });

      const checkoutUrl = extractStripeCheckoutUrl(response);
      const txRef = extractTxRefFromInvoiceResponse(response);

      const returnCtx: PaymentReturnContext = {
        amountPaid: price,
        totalAmount: price,
        paidIncentives: 0,
        paidBalance: 0,
        paidOnline: price,
        orderIds: [booking.bookingRef || `FG-${professionalBookingId}`],
        transactionId: txRef ?? "",
        bookingId: professionalBookingId,
      };
      try {
        sessionStorage.setItem(PAYMENT_RETURN_STORAGE_KEY, JSON.stringify(returnCtx));
      } catch {
        /* ignore */
      }

      if (isPaymentInvoiceStoreSuccess(response) && checkoutUrl) {
        toast.success("Redirecting to secure payment?????????");
        window.location.assign(checkoutUrl);
        return;
      }
      if (isPaymentInvoiceStoreSuccess(response) && !checkoutUrl) {
        throw {
          message:
            (response as { message?: string })?.message ||
            "Could not start checkout: server did not return a Stripe link. Your booking has not been marked paid.",
        };
      }
      throw { message: (response as { message?: string })?.message || "Failed to start payment" };
    } catch (error: unknown) {
      console.error("Pay booking error:", error);
      const err = error as { message?: string; status?: number };
      toast.error(err.message || "Could not start payment. Please try again.");
      if (typeof err.status === "number" && err.status !== 401) {
        window.location.assign(getPaymentFailedPageUrl());
      }
    } finally {
      setPayingBookingId(null);
    }
  };

  // Open reschedule modal
  const handleOpenReschedule = (booking: Booking) => {
    // Close the Booking Details modal first
    setSelectedBooking(null);
    
    // Open the Reschedule modal
    setBookingToReschedule(booking);
    setRescheduleForm({
      date: '',
      time: '',
      reason: ''
    });
    setShowRescheduleModal(true);
  };

  // Close reschedule modal
  const handleCloseReschedule = () => {
    setShowRescheduleModal(false);
    setBookingToReschedule(null);
    setRescheduleForm({
      date: '',
      time: '',
      reason: ''
    });
  };

  // Format date for display (e.g., "Jan 20, 2026 at 10:30 AM")
  const formatAppointmentDate = (date: string, time: string) => {
    try {
      const dateObj = new Date(date);
      const formattedDate = dateObj.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      return `${formattedDate} at ${time}`;
    } catch {
      return `${date} at ${time}`;
    }
  };

  // Convert 12-hour time to 24-hour format for API
  const convertTo24Hour = (time12h: string): string => {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (hours === '12') {
      hours = modifier === 'AM' ? '00' : '12';
    } else if (modifier === 'PM') {
      hours = String(parseInt(hours, 10) + 12);
    }
    
    return `${hours.padStart(2, '0')}:${minutes}:00`;
  };

  // Handle reschedule form submission
  const handleRescheduleSubmit = async () => {
    if (!bookingToReschedule) return;
    
    // Validate required fields
    if (!rescheduleForm.date || !rescheduleForm.time) {
      toast.error("Please select a new date and time.");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Authentication required. Please log in again.");
      return;
    }

    // Convert time to 24-hour format
    const formattedTime = convertTo24Hour(rescheduleForm.time);

    setIsRescheduling(true);
    try {
      const response = await rescheduleCustomerBooking(
        token,
        parseInt(bookingToReschedule.id),
        rescheduleForm.date,
        formattedTime,
        rescheduleForm.reason || 'Rescheduled by customer'
      );
      
      if (response.status === 'success') {
        toast.success(response.message || "Reschedule request sent successfully!");
        await fetchBookingsFromApi({ silent: true });
        handleCloseReschedule();
        setSelectedBooking(null);
      } else {
        toast.error(response.message || "Failed to reschedule booking. Please try again.");
      }
    } catch (error: any) {
      console.error('Error rescheduling booking:', error);
      toast.error(error.message || "Failed to reschedule booking. Please try again.");
    } finally {
      setIsRescheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 -mx-1 px-1">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          className={filter === "all" ? "bg-red-600 hover:bg-red-700" : ""}
        >
          All Bookings ({bookings.length})
        </Button>
        <Button
          variant={filter === "upcoming" ? "default" : "outline"}
          onClick={() => setFilter("upcoming")}
          className={filter === "upcoming" ? "bg-red-600 hover:bg-red-700" : ""}
        >
          Upcoming ({bookings.filter(b => b.status === "upcoming").length})
        </Button>
        <Button
          variant={filter === "completed" ? "default" : "outline"}
          onClick={() => setFilter("completed")}
          className={filter === "completed" ? "bg-red-600 hover:bg-red-700" : ""}
        >
          Completed ({bookings.filter(b => b.status === "completed").length})
        </Button>
        <Button
          variant={filter === "cancelled" ? "default" : "outline"}
          onClick={() => setFilter("cancelled")}
          className={filter === "cancelled" ? "bg-red-600 hover:bg-red-700" : ""}
        >
          Cancelled ({bookings.filter(b => b.status === "cancelled").length})
        </Button>
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading bookings...</p>
          </CardContent>
        </Card>
      ) : filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No bookings found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredBookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-lg transition-shadow overflow-hidden">
              <CardContent className="p-4 sm:p-6 min-w-0">
                <div className="flex flex-col md:flex-row md:justify-between gap-4 min-w-0">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1 pr-1">
                        <h3 className="text-[#0A1A2F] mb-1 text-base sm:text-lg break-words">
                          {booking.service}
                        </h3>
                        <p className="text-sm text-gray-600 break-all">Ref: {booking.bookingRef}</p>
                      </div>
                      <Badge
                        variant="custom"
                        className={`w-fit shrink-0 whitespace-nowrap ${getStatusColor(booking)}`}
                      >
                        {getCustomerStatusLabel(booking)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-start gap-2 text-gray-600 min-w-0">
                        <User className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="break-words">{booking.professional}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <span>{new Date(booking.date).toLocaleDateString('en-GB')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>{booking.time}</span>
                      </div>
                      <div className="flex items-start gap-2 text-gray-600 min-w-0 sm:col-span-2">
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="break-words">{booking.location}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-gray-900">
                          Total: <span className="font-semibold">{booking.price}</span>
                        </p>
                        {renderPaymentStatusBadge(booking)}
                      </div>
                    </div>

                    {showCustomerRescheduleSubmittedMessage(booking) && (
                      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                        <p className="text-sm text-amber-900">{customerRescheduleSubmittedMessage}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 w-full min-w-0 md:w-auto md:min-w-[9.5rem] md:shrink-0 border-t border-gray-100 pt-4 md:border-t-0 md:pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedBooking(booking)}
                      className="w-full md:w-auto justify-center"
                    >
                      View Details
                    </Button>
                    {needsCustomerAcceptReschedule(booking) && (
                      <Button
                        size="sm"
                        className="w-full md:w-auto justify-center bg-green-600 hover:bg-green-700"
                        onClick={() => void handleAcceptReschedule(booking)}
                        disabled={
                          acceptingBookingId === booking.id ||
                          isCancelling === booking.id ||
                          payingBookingId === booking.id
                        }
                      >
                        {acceptingBookingId === booking.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Accepting...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Accept
                          </>
                        )}
                      </Button>
                    )}
                    {bookingNeedsPayment(booking) && (
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full md:w-auto justify-center bg-red-600 hover:bg-red-700"
                        onClick={() => handlePayBooking(booking)}
                        disabled={payingBookingId === booking.id || isCancelling === booking.id}
                      >
                        {payingBookingId === booking.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Redirecting...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pay
                          </>
                        )}
                      </Button>
                    )}
                    {bookingAllowsCustomerCancel(booking) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full md:w-auto justify-center text-red-600 hover:text-red-700"
                        onClick={() => handleCancelBooking(booking.id)}
                        disabled={isCancelling === booking.id || payingBookingId === booking.id}
                      >
                        {isCancelling === booking.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          'Cancel'
                        )}
                      </Button>
                    )}
                    {booking.hasReport && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full md:w-auto justify-center"
                        onClick={() => handleDownloadReport(booking)}
                        disabled={downloadingReportId === booking.id}
                      >
                        {downloadingReportId === booking.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Report
                          </>
                        )}
                      </Button>
                    )}
                    {bookingCanGiveReview(booking, reviewedBookingIds) && (
                      <Button
                        type="button"
                        size="sm"
                        className="w-full md:w-auto justify-center bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => openGiveReviewModal(booking)}
                      >
                        Give Feedback
                      </Button>
                    )}
                    {bookingCanUpdateReview(booking, reviewedBookingIds) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        className="w-full md:w-auto justify-center !bg-amber-600 hover:!bg-amber-700 text-white border-amber-600"
                        onClick={() => void openUpdateReviewModal(booking)}
                      >
                        Update Feedback
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Give Feedback Dialog */}
      <Dialog open={reviewBooking !== null} onOpenChange={(open) => !open && closeGiveReviewModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F]">
              {editingReviewId ? "Update Feedback" : "Give Feedback"}
            </DialogTitle>
            <DialogDescription>
              {editingReviewId
                ? `Edit your review for ${reviewBooking?.professional} — ${reviewBooking?.service}.`
                : `Share your experience with ${reviewBooking?.professional} for ${reviewBooking?.service}.`}
            </DialogDescription>
          </DialogHeader>

          {reviewBooking && (
            <form
              className="space-y-4 py-2"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSubmitReview();
              }}
            >
              {loadingReviewDetails && (
                <div className="flex items-center justify-center gap-2 py-6 text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin text-red-600" />
                  <span>Loading your review…</span>
                </div>
              )}
              <div className={`space-y-4 ${loadingReviewDetails ? "hidden" : ""}`}>
              <div className="space-y-2">
                <Label htmlFor="review-name">
                  Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="review-name"
                  type="text"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
              {!editingReviewId && (
              <div className="space-y-2">
                <Label htmlFor="review-email">
                  Reviewer email <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="review-email"
                  type="email"
                  value={reviewEmail}
                  onChange={(e) => setReviewEmail(e.target.value)}
                  placeholder="e.g. john.doe@example.com"
                  autoComplete="email"
                  required
                />
              </div>
              )}
              <div className="space-y-2">
                <Label>
                  Rating <span className="text-red-600">*</span>
                </Label>
                <div
                  className="flex gap-1"
                  onMouseLeave={() => setReviewHoverRating(0)}
                  role="group"
                  aria-label="Rating out of 5 stars"
                >
                  {[1, 2, 3, 4, 5].map((star) => {
                    const activeStars = reviewHoverRating || Number(reviewRating) || 0;
                    return (
                      <button
                        key={star}
                        type="button"
                        className="rounded p-0.5 transition-transform hover:scale-110"
                        onClick={() => setReviewRating(String(star))}
                        onMouseEnter={() => setReviewHoverRating(star)}
                        aria-label={`${star} star${star > 1 ? "s" : ""}`}
                        aria-pressed={Number(reviewRating) === star}
                      >
                        <Star
                          className={`h-9 w-9 ${
                            activeStars >= star
                              ? "fill-yellow-400 text-yellow-500"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="review-feedback">
                  Feedback <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  id="review-feedback"
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  rows={4}
                  placeholder="e.g. Excellent service and very professional."
                  required
                />
              </div>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeGiveReviewModal}
                  disabled={submittingReviewId !== null || loadingReviewDetails}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={
                    editingReviewId
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }
                  disabled={submittingReviewId === reviewBooking.id || loadingReviewDetails}
                >
                  {submittingReviewId === reviewBooking.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingReviewId ? "Updating..." : "Sending..."}
                    </>
                  ) : editingReviewId ? (
                    "Update"
                  ) : (
                    "Send"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Booking Details Dialog */}
      <Dialog open={selectedBooking !== null} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-2xl p-0 gap-0 overflow-hidden max-h-[min(92vh,820px)] flex flex-col">
          <DialogHeader className="border-b border-gray-100 px-5 sm:px-6 py-4 shrink-0 text-left">
            <DialogTitle className="text-lg sm:text-xl font-semibold text-[#0A1A2F] pr-8">
              Booking Details
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-gray-500">
              Reference: {selectedBooking?.bookingRef}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <>
            <div className="overflow-y-auto flex-1 min-h-0 px-5 sm:px-6 pt-5 pb-5 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="text-base sm:text-lg font-medium text-[#0A1A2F] leading-snug break-words pr-2">
                  {selectedBooking.service}
                </h3>
                <Badge
                  variant="custom"
                  className={`shrink-0 mt-1 sm:mt-1.5 ${getStatusColor(selectedBooking)}`}
                >
                  {getCustomerStatusLabel(selectedBooking)}
                </Badge>
              </div>

              {selectedBookingServiceDetails.length > 0 && (
                <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 sm:p-5">
                  <p className="text-sm text-gray-500 mb-3">Service details</p>
                  <div className="space-y-1.5 text-sm text-gray-600">
                    {selectedBookingServiceDetails.map((row) => (
                      <p key={row.id}>
                        {row.label}: <span className="text-gray-900">{row.value}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10">
                <div className="space-y-5">
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Date &amp; Time</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 text-sm text-gray-800">
                        <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
                        <span>
                          {new Date(selectedBooking.date).toLocaleDateString("en-GB")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm text-gray-800">
                        <Clock className="h-4 w-4 shrink-0 text-gray-400" />
                        <span>{selectedBooking.time}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Location</p>
                    <div className="flex items-start gap-2.5 text-sm text-gray-800">
                      <MapPin className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                      <span className="leading-relaxed break-words">{selectedBooking.location}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Professional</p>
                    <div className="flex items-center gap-3 mb-3">
                      {selectedBooking.professionalImage ? (
                        <img
                          src={selectedBooking.professionalImage}
                          alt={selectedBooking.professional}
                          className={`h-10 w-10 shrink-0 object-cover ${
                            selectedBooking.professionalType === "company"
                              ? "rounded-lg"
                              : "rounded-full"
                          }`}
                        />
                      ) : (
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center bg-gray-100 ${
                            selectedBooking.professionalType === "company"
                              ? "rounded-lg"
                              : "rounded-full"
                          }`}
                        >
                          {selectedBooking.professionalType === "company" ? (
                            <Building2 className="h-5 w-5 text-gray-500" />
                          ) : (
                            <User className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                      )}
                      <p className="text-sm font-semibold text-gray-900 break-words">
                        {selectedBooking.professional}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 text-sm text-gray-700 min-w-0">
                        <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="break-all">{selectedBooking.professionalEmail}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm text-gray-700 min-w-0">
                        <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="break-all">{selectedBooking.professionalPhone}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 mb-2">Payment</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-2xl sm:text-3xl font-bold text-[#0A1A2F] tabular-nums">
                        {selectedBooking.price}
                      </p>
                      {renderPaymentStatusBadge(selectedBooking)}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {!isBookingPaid(selectedBooking) && selectedBooking.status !== "cancelled" && (
                        <p className="text-sm text-amber-700 inline-flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          Payment required — use Pay to complete checkout
                        </p>
                      )}
                      {selectedBooking.status === "cancelled" && !isBookingPaid(selectedBooking) && (
                        <p className="text-sm text-gray-600">
                          Booking cancelled — payment is not available.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {selectedBooking.hasReport && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-green-100">
                      <FileText className="h-5 w-5 text-green-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-green-900 leading-snug">
                        Compliance report ready
                      </p>
                      <p className="mt-1 text-sm text-green-700 leading-relaxed">
                        Your fire safety report is available to download.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleDownloadReport(selectedBooking)}
                    className="mt-4 w-full bg-green-600 hover:bg-green-700"
                    disabled={downloadingReportId === selectedBooking.id}
                  >
                    {downloadingReportId === selectedBooking.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Downloading report...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download report
                      </>
                    )}
                  </Button>
                </div>
              )}

              {bookingCanGiveReview(selectedBooking, reviewedBookingIds) && (
                <Button
                  type="button"
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => openGiveReviewModal(selectedBooking)}
                >
                  Give Feedback
                </Button>
              )}
              {bookingCanUpdateReview(selectedBooking, reviewedBookingIds) && (
                <Button
                  type="button"
                  variant="default"
                  className="w-full !bg-amber-600 hover:!bg-amber-700 text-white border-amber-600"
                  onClick={() => void openUpdateReviewModal(selectedBooking)}
                >
                  Update Feedback
                </Button>
              )}

              {selectedBooking.status === "upcoming" &&
                showCustomerRescheduleSubmittedMessage(selectedBooking) && (
                  <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <p className="text-sm text-amber-900">{customerRescheduleSubmittedMessage}</p>
                  </div>
                )}
            </div>

            {selectedBooking.status === "upcoming" && (
              <div className="shrink-0 border-t border-gray-100 bg-white px-5 sm:px-6 pt-4 pb-5 sm:pb-6 space-y-3">
                {needsCustomerAcceptReschedule(selectedBooking) && (
                  <Button
                    className="w-full h-11 justify-center bg-green-600 hover:bg-green-700"
                    onClick={() => void handleAcceptReschedule(selectedBooking)}
                    disabled={
                      acceptingBookingId === selectedBooking.id ||
                      isCancelling === selectedBooking.id ||
                      payingBookingId === selectedBooking.id
                    }
                  >
                    {acceptingBookingId === selectedBooking.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Accept reschedule
                      </>
                    )}
                  </Button>
                )}
                {bookingNeedsPayment(selectedBooking) && (
                  <Button
                    className="w-full h-11 justify-center bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => handlePayBooking(selectedBooking)}
                    disabled={
                      payingBookingId === selectedBooking.id ||
                      isCancelling === selectedBooking.id
                    }
                  >
                    {payingBookingId === selectedBooking.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Redirecting...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pay now
                      </>
                    )}
                  </Button>
                )}
                {(bookingAllowsCustomerReschedule(selectedBooking) ||
                  bookingAllowsCustomerCancel(selectedBooking)) && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-2 min-w-0">
                    {bookingAllowsCustomerReschedule(selectedBooking) && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOpenReschedule(selectedBooking)}
                        className="w-full sm:flex-1 h-11 justify-center border-gray-300 bg-white text-[#0A1A2F] font-normal hover:bg-gray-50"
                        disabled={
                          isCancelling === selectedBooking.id ||
                          payingBookingId === selectedBooking.id ||
                          acceptingBookingId === selectedBooking.id
                        }
                      >
                        Reschedule
                      </Button>
                    )}
                    {bookingAllowsCustomerCancel(selectedBooking) && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleCancelBooking(selectedBooking.id)}
                        className="w-full sm:flex-1 h-11 justify-center border-gray-300 bg-white text-red-600 font-normal hover:bg-red-50 hover:text-red-700"
                        disabled={
                          isCancelling === selectedBooking.id ||
                          payingBookingId === selectedBooking.id
                        }
                      >
                        {isCancelling === selectedBooking.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          "Cancel Booking"
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule Appointment Modal */}
      <Dialog open={showRescheduleModal} onOpenChange={handleCloseReschedule}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Request a new date and time for this booking
            </DialogDescription>
          </DialogHeader>

          {bookingToReschedule && (
            <div className="space-y-5">
              {/* Current Appointment Card */}
              <div className="bg-gray-100 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Current Appointment</p>
                <p className="font-semibold text-gray-900">
                  {formatAppointmentDate(bookingToReschedule.date, bookingToReschedule.time)}
                </p>
                <p className="text-sm text-gray-600">{bookingToReschedule.professional}</p>
              </div>

              {/* New date & time ????????? calendar + slots (same APIs as booking flow) when professional_id exists */}
              {bookingToReschedule.professionalId != null && bookingToReschedule.professionalId > 0 ? (
                <RescheduleCalendarPicker
                  professionalId={bookingToReschedule.professionalId}
                  selectedDate={rescheduleForm.date}
                  selectedTime={rescheduleForm.time}
                  onSelectDate={(d) => setRescheduleForm((prev) => ({ ...prev, date: d, time: "" }))}
                  onSelectTime={(t) => setRescheduleForm((prev) => ({ ...prev, time: t }))}
                />
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reschedule-date" className="text-sm font-medium">
                      New Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="reschedule-date"
                      type="date"
                      value={rescheduleForm.date}
                      onChange={(e) => setRescheduleForm((prev) => ({ ...prev, date: e.target.value }))}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reschedule-time" className="text-sm font-medium">
                      New Time <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={rescheduleForm.time}
                      onValueChange={(value) => setRescheduleForm((prev) => ({ ...prev, time: value }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a time" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Reason (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="reschedule-reason" className="text-sm font-medium">
                  Reason (Optional)
                </Label>
                <Textarea
                  id="reschedule-reason"
                  placeholder="Optional: explain why you need a different date or time?????????"
                  value={rescheduleForm.reason}
                  onChange={(e) => setRescheduleForm(prev => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                  className="w-full resize-none"
                />
              </div>

              {/* Info Message */}
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  This sends a reschedule request. The professional may need to approve the new date and time.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleRescheduleSubmit}
                  disabled={isRescheduling || !rescheduleForm.date || !rescheduleForm.time}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {isRescheduling ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Send Reschedule Request
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCloseReschedule}
                  disabled={isRescheduling}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
});