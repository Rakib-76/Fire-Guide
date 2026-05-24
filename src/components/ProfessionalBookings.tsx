import React, { useState, useEffect } from "react";
import { Search, Calendar, MapPin, Clock, User, ChevronRight, Filter, X, CheckCircle, AlertCircle, Phone, Mail, Home, FileText, Navigation, Loader2, Upload, XCircle, Wallet, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  getProfessionalBookings,
  ProfessionalBookingItem,
  acceptProfessionalBooking,
  updateProfessionalBooking,
  searchProfessionalBookings,
  getBookingSummary,
  changeProfessionalBookingStatus,
  requestProfessionalPayout,
  requestProfessionalRenewal,
  getProfessionalBookingCustomerName,
  getProfessionalBookingCustomerEmail,
  getProfessionalBookingCustomerPhone,
  splitProfessionalBookingCustomerName,
  getProfessionalBookingPaymentStatus,
  getProfessionalBookingPaymentStatusLabel,
} from "../api/bookingService";
import { cancelCustomerBooking } from "../api/authService";
import { UploadCompletionReportModal, UploadReportBookingData } from "./UploadCompletionReportModal";
import { RescheduleCalendarPicker } from "./RescheduleCalendarPicker";
import { getApiToken, getProfessionalId } from "../lib/auth";
import {
  getPayoutRequestedBookingIds,
  markPayoutRequestedBookingId,
  bookingHasPayoutRequestFromApi,
} from "../lib/professionalPayoutRequestLocal";
import {
  getRenewalRequestedBookingIds,
  markRenewalRequestedBookingId,
  bookingHasRenewalRequestFromApi,
  isRenewalAlreadySentMessage,
} from "../lib/professionalRenewalRequestLocal";
import { toast } from "sonner";
import { buildProfessionalBookingServiceDetails } from "../lib/bookingServiceDetails";

interface ProfessionalBookingsProps {
  onViewDetails: (bookingId: number) => void;
}

interface Booking {
  id: number;
  reference: string;
  service: string;
  customer: string;
  customerEmail: string;
  customerPhone: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  propertySize: string;
  price: string;
  status: string;
  paymentStatus: string;
  isRenewal: boolean;
  notes: string;
  propertyType?: string;
  floors?: number;
  accessInstructions?: string;
  serviceDetails: Array<{ label: string; value: string }>;
}

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

// Helper function to format time from 24-hour to AM/PM format
const formatTimeToAMPM = (time24Hour: string): string => {
  // Handle formats like "15:00:00", "9:00:00", "15:30:00"
  if (!time24Hour) return "";

  const match = time24Hour.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!match) return time24Hour; // Return original if parsing fails

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = hours >= 12 ? "PM" : "AM";

  // Convert to 12-hour format
  if (hours === 0) {
    hours = 12;
  } else if (hours > 12) {
    hours = hours - 12;
  }

  return `${hours}:${minutes} ${period}`;
};

const normalizeBookingStatus = (status: string | undefined | null): string =>
  (status ?? "").toLowerCase().trim();

const isMeBookingStatus = (status: string): boolean =>
  normalizeBookingStatus(status) === "me";

const professionalRescheduleSubmittedMessage =
  "Your reschedule request has been sent. Please wait while your Customer reviews and approves the new date and time.";

const getStatusLabel = (status: string): string => {
  const normalized = normalizeBookingStatus(status);
  if (normalized === "pending" || normalized === "me") return "Pending";
  if (normalized === "confirmed") return "Confirmed";
  if (normalized === "completed") return "Completed";
  if (normalized === "cancelled" || normalized === "canceled") return "Cancelled";
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const getStatusBannerClass = (status: string): string => {
  const normalized = normalizeBookingStatus(status);
  if (normalized === "confirmed") return "bg-green-50 border border-green-200";
  if (normalized === "pending" || normalized === "me") {
    return "bg-yellow-50 border border-yellow-200";
  }
  if (normalized === "cancelled" || normalized === "canceled") {
    return "bg-red-50 border border-red-200";
  }
  return "bg-blue-50 border border-blue-200";
};

// Helper function to format price
const formatPrice = (price: string): string => {
  return `£${price}`;
};

const parseIsRenewal = (value: unknown): boolean => {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return false;
};

// Helper function to map API response to Booking interface
const mapApiResponseToBooking = (apiBooking: ProfessionalBookingItem): Booking => {
  const location = [apiBooking.property_address, apiBooking.city, apiBooking.post_code]
    .filter(Boolean)
    .join(", ");

  return {
    id: apiBooking.id,
    reference: apiBooking.ref_code || `FG-${apiBooking.id}`,
    service:
      apiBooking.service?.service_name ??
      apiBooking.service_name ??
      (apiBooking.selected_service && "name" in apiBooking.selected_service
        ? apiBooking.selected_service.name
        : undefined) ??
      "General Service",
    customer: getProfessionalBookingCustomerName(apiBooking),
    customerEmail: getProfessionalBookingCustomerEmail(apiBooking),
    customerPhone: getProfessionalBookingCustomerPhone(apiBooking),
    date: formatDate(apiBooking.selected_date),
    time: formatTimeToAMPM(apiBooking.selected_time),
    duration: "2-3 hours", // Default duration as API doesn't provide this
    location: location,
    propertySize: "Medium (6-25 people)", // Default as API doesn't provide this
    price: formatPrice(apiBooking.price),
    status: normalizeBookingStatus(apiBooking.status) || "pending",
    paymentStatus: getProfessionalBookingPaymentStatus(apiBooking),
    isRenewal: parseIsRenewal(apiBooking.is_renewal),
    notes: apiBooking.additional_notes || "",
    propertyType: undefined, // Not available in API
    floors: undefined, // Not available in API
    accessInstructions:
      (typeof apiBooking.access_note === "string" && apiBooking.access_note.trim()) ||
      undefined,
    serviceDetails: buildProfessionalBookingServiceDetails(apiBooking),
  };
};

export function ProfessionalBookings({ onViewDetails }: ProfessionalBookingsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [completingBookingId, setCompletingBookingId] = useState<number | null>(null);
  const [rejectingBookingId, setRejectingBookingId] = useState<number | null>(null);
  const [payoutRequestBookingId, setPayoutRequestBookingId] = useState<number | null>(null);
  const [renewalRequestBookingId, setRenewalRequestBookingId] = useState<number | null>(null);
  const [payoutRequestedIds, setPayoutRequestedIds] = useState<Set<number>>(
    () => new Set(getPayoutRequestedBookingIds())
  );
  const [renewalRequestedIds, setRenewalRequestedIds] = useState<Set<number>>(
    () => new Set(getRenewalRequestedBookingIds())
  );
  const [showUploadReportModal, setShowUploadReportModal] = useState(false);
  const [uploadReportBooking, setUploadReportBooking] = useState<UploadReportBookingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [bookingsData, setBookingsData] = useState<Booking[]>([]);
  const [allBookingsData, setAllBookingsData] = useState<Booking[]>([]); // For stats calculation
  const [apiBookingsMap, setApiBookingsMap] = useState<Map<number, ProfessionalBookingItem>>(new Map());
  const [stats, setStats] = useState({
    upcoming: 0,
    pending: 0,
    completed: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const syncPayoutRequestedFromBookings = (bookings: ProfessionalBookingItem[]) => {
    setPayoutRequestedIds((prev) => {
      const next = new Set(prev);
      for (const booking of bookings) {
        if (bookingHasPayoutRequestFromApi(booking as unknown as Record<string, unknown>)) {
          next.add(booking.id);
          markPayoutRequestedBookingId(booking.id);
        }
      }
      return next;
    });
  };

  const syncRenewalRequestedFromBookings = (bookings: ProfessionalBookingItem[]) => {
    setRenewalRequestedIds((prev) => {
      const next = new Set(prev);
      for (const booking of bookings) {
        if (bookingHasRenewalRequestFromApi(booking as unknown as Record<string, unknown>)) {
          next.add(booking.id);
          markRenewalRequestedBookingId(booking.id);
        }
      }
      return next;
    });
  };

  const hasPayoutRequestBeenSent = (bookingId: number) => payoutRequestedIds.has(bookingId);
  const hasRenewalRequestBeenSent = (bookingId: number) => renewalRequestedIds.has(bookingId);

  const markRenewalRequestSent = (bookingId: number) => {
    markRenewalRequestedBookingId(bookingId);
    setRenewalRequestedIds((prev) => new Set(prev).add(bookingId));
  };

  // Fetch booking summary (stats) from API
  const fetchBookingSummary = async () => {
    try {
      setIsLoadingStats(true);
      const apiToken = getApiToken();

      if (!apiToken) {
        console.warn("No API token available for fetching summary");
        toast.error("Please log in to view booking summary");
        return;
      }

      console.log("Fetching booking summary with token:", apiToken.substring(0, 20) + "...");

      // Call the /professional_booking/summary API to get booking counts
      const summaryResponse = await getBookingSummary(apiToken);
      console.log("Booking summary response:", summaryResponse);

      if (summaryResponse.status === true && summaryResponse.data) {
        const newStats = {
          upcoming: summaryResponse.data.upcoming || 0,
          pending: summaryResponse.data.pending || 0,
          completed: summaryResponse.data.completed || 0,
        };
        console.log("Setting stats:", newStats);
        setStats(newStats);
      } else {
        console.warn("Invalid response format:", summaryResponse);
      }
    } catch (err: any) {
      console.error("Error fetching booking summary:", err);
      // On error, fall back to calculating from allBookingsData
      const fallbackStats = {
        upcoming: allBookingsData.filter(b => b.status === "confirmed").length,
        pending: allBookingsData.filter(b => b.status === "pending").length,
        completed: allBookingsData.filter(b => b.status === "completed").length,
      };
      console.log("Using fallback stats:", fallbackStats);
      setStats(fallbackStats);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Fetch all bookings (fallback for stats if API fails)
  const fetchAllBookings = async () => {
    try {
      const bookings = await getProfessionalBookings();
      const mappedBookings = bookings.map(mapApiResponseToBooking);
      setAllBookingsData(mappedBookings);
    } catch (err: any) {
      console.error("Error fetching all bookings:", err);
    }
  };

  // Fetch bookings from API with optional search/filter
  const fetchBookings = async (search?: string, status?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      let bookings: ProfessionalBookingItem[];

      // Use search API if search term or status filter is active
      // Always send both parameters if at least one is active
      if (search?.trim() || (status && status !== "all")) {
        const searchParams: { search?: string; status?: string } = {};
        // Always include search if provided (even single characters)
        if (search?.trim()) {
          searchParams.search = search.trim();
        }
        // Include status if not "all"
        if (status && status !== "all") {
          searchParams.status = status;
        }
        // Call search API even with just search term
        bookings = await searchProfessionalBookings(searchParams);
      } else {
        // Use regular get all API if no search/filter
        bookings = await getProfessionalBookings();
      }

      const mappedBookings = bookings.map(mapApiResponseToBooking);
      setBookingsData(mappedBookings);
      syncPayoutRequestedFromBookings(bookings);
      syncRenewalRequestedFromBookings(bookings);
      // Store raw API data for reschedule
      const map = new Map<number, ProfessionalBookingItem>();
      bookings.forEach(booking => {
        map.set(booking.id, booking);
      });
      setApiBookingsMap(map);
    } catch (err: any) {
      console.error("Error fetching bookings:", err);
      setError(err?.message || "Failed to fetch bookings");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load - fetch summary and bookings
  useEffect(() => {
    fetchBookingSummary();
    fetchAllBookings();
    fetchBookings();
  }, []);

  // Debounced search/filter - fetch when search or filter changes
  useEffect(() => {
    // If search term is empty and status is "all", fetch all bookings
    if (!searchTerm.trim() && filterStatus === "all") {
      fetchBookings();
      return;
    }

    // For search/filter, use shorter debounce to show results quickly
    const timeoutId = setTimeout(() => {
      fetchBookings(searchTerm.trim() || undefined, filterStatus !== "all" ? filterStatus : undefined);
    }, 300); // Reduced debounce to 300ms for faster response

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filterStatus]);

  // Use bookingsData directly since filtering is done by API
  const filteredBookings = bookingsData;

  const getStatusColor = (status: string) => {
    switch (normalizeBookingStatus(status)) {
      case "confirmed":
        return "border border-green-200 bg-green-100 text-green-700";
      case "pending":
      case "me":
        return "border border-yellow-200 bg-yellow-50 text-yellow-800";
      case "completed":
        return "border border-blue-200 bg-blue-100 text-blue-700";
      case "cancelled":
      case "canceled":
        return "border border-red-200 bg-red-100 text-red-700";
      default:
        return "border border-gray-200 bg-gray-100 text-gray-700";
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

  const renderPaymentStatusBadge = (paymentStatus: string) => (
    <Badge className={`shrink-0 whitespace-nowrap ${getPaymentStatusColor(paymentStatus)}`}>
      {getProfessionalBookingPaymentStatusLabel(paymentStatus)}
    </Badge>
  );

  const renderPriceWithPaymentStatus = (
    price: string,
    paymentStatus: string,
    priceClassName = "text-xl font-semibold text-gray-900"
  ) => (
    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
      <p className={priceClassName}>{price}</p>
      {renderPaymentStatusBadge(paymentStatus)}
    </div>
  );

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const handleViewReport = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowReportModal(true);
  };

  const handleAcceptBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowAcceptModal(true);
  };

  const confirmAcceptBooking = async () => {
    if (!selectedBooking) return;

    const apiToken = getApiToken();
    if (!apiToken) {
      toast.error("Authentication required. Please log in again.");
      return;
    }

    try {
      setIsAccepting(true);
      await acceptProfessionalBooking({
        api_token: apiToken,
        id: selectedBooking.id
      });

      toast.success("Booking accepted successfully!");

      // Refresh the bookings list and summary to get updated data
      await fetchBookings();
      await fetchBookingSummary();

      setShowAcceptModal(false);
      setSelectedBooking(null);
    } catch (err: any) {
      console.error("Error accepting booking:", err);
      toast.error(err?.message || "Failed to accept booking. Please try again.");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRejectBooking = async (booking: Booking) => {
    const apiToken = getApiToken();
    if (!apiToken) {
      toast.error("Authentication required. Please log in again.");
      return;
    }

    setRejectingBookingId(booking.id);
    try {
      const response = await cancelCustomerBooking(apiToken, booking.id);
      const ok =
        response.status === "success" ||
        (response as { success?: boolean }).success === true;
      if (!ok) {
        toast.error(response.message || "Failed to reject booking. Please try again.");
        return;
      }
      toast.success(response.message || "Booking rejected successfully.");
      await fetchBookings();
      await fetchBookingSummary();
      if (selectedBooking?.id === booking.id) {
        setShowDetailsModal(false);
        setSelectedBooking(null);
      }
    } catch (err: any) {
      console.error("Error rejecting booking:", err);
      toast.error(err?.message || "Failed to reject booking. Please try again.");
    } finally {
      setRejectingBookingId(null);
    }
  };

  const handleOpenUploadReport = (booking: Booking) => {
    const apiBooking = apiBookingsMap.get(booking.id);
    setUploadReportBooking({
      id: booking.id,
      user_id: apiBooking?.user_id ?? null,
      reference: booking.reference,
      service: booking.service,
      customer: booking.customer,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      date: booking.date,
      time: booking.time,
      location: booking.location,
      status: booking.status,
    });
    setShowUploadReportModal(true);
  };

  const handleGetDirections = (location: string) => {
    const encodedLocation = encodeURIComponent(location);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedLocation}`, '_blank');
  };

  const handleReschedule = (booking: Booking) => {
    setSelectedBooking(booking);
    setRescheduleDate("");
    setRescheduleTime("");
    setRescheduleReason("");
    setShowRescheduleModal(true);
  };

  const handleCloseReschedule = (open: boolean) => {
    setShowRescheduleModal(open);
    if (!open) {
      setRescheduleDate("");
      setRescheduleTime("");
      setRescheduleReason("");
    }
  };

  const professionalIdForCalendar = getProfessionalId();

  const handleMarkAsCompleted = async (booking: Booking) => {
    const apiToken = getApiToken();
    if (!apiToken) {
      toast.error("Authentication required. Please login again.");
      return;
    }

    try {
      setCompletingBookingId(booking.id);
      // Always fetch latest from professional_wise_get, then use that ID as booking_id.
      const latest = await getProfessionalBookings();
      const match = latest.find((b) => b.id === booking.id);
      if (!match) {
        toast.error("Booking not found in latest list");
        return;
      }

      const response = await changeProfessionalBookingStatus({
        api_token: apiToken,
        booking_id: match.id,
      });

      if (response.status === true) {
        toast.success(response.message || "Booking marked as completed!");
        await fetchBookings();
        await fetchBookingSummary();
      } else {
        toast.error(response.message || "Failed to mark as completed");
      }
    } catch (err: any) {
      console.error("Error marking booking as completed:", err);
      toast.error(err?.message || "Failed to mark as completed. Please try again.");
    } finally {
      setCompletingBookingId(null);
    }
  };

  const handleRenewalRequest = async (booking: Booking) => {
    const apiToken = getApiToken();
    if (!apiToken) {
      toast.error("Authentication required. Please login again.");
      return;
    }

    if (booking.status !== "completed") {
      toast.error("Renewal requests are only available for completed bookings.");
      return;
    }

    if (!booking.isRenewal) {
      return;
    }

    try {
      setRenewalRequestBookingId(booking.id);
      const response = await requestProfessionalRenewal({
        api_token: apiToken,
        booking_id: booking.id,
      });

      const ok =
        response.success === true ||
        response.status === true ||
        response.status === "success" ||
        String(response.status).toLowerCase() === "success";

      const message = response.message || "";

      if (ok) {
        markRenewalRequestSent(booking.id);
        toast.success(message || "Renewal request sent successfully.");
        return;
      }

      if (isRenewalAlreadySentMessage(message)) {
        markRenewalRequestSent(booking.id);
        toast.info(message);
        return;
      }

      toast.error(message || "Failed to send renewal request.");
    } catch (err: unknown) {
      console.error("Error sending renewal request:", err);
      const message =
        err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Failed to send renewal request. Please try again.";

      if (isRenewalAlreadySentMessage(message)) {
        markRenewalRequestSent(booking.id);
        toast.info(message);
      } else {
        toast.error(message);
      }
    } finally {
      setRenewalRequestBookingId(null);
    }
  };

  const handlePayoutRequest = async (booking: Booking) => {
    const apiToken = getApiToken();
    if (!apiToken) {
      toast.error("Authentication required. Please login again.");
      return;
    }

    if (booking.status !== "completed") {
      toast.error("Payout can only be requested for completed bookings.");
      return;
    }

    try {
      setPayoutRequestBookingId(booking.id);
      const response = await requestProfessionalPayout({
        api_token: apiToken,
        booking_id: booking.id,
      });

      const ok =
        response.status === true ||
        response.status === "success" ||
        String(response.status).toLowerCase() === "success";

      if (ok) {
        markPayoutRequestedBookingId(booking.id);
        setPayoutRequestedIds((prev) => new Set(prev).add(booking.id));
        toast.success(response.message || "Payout request submitted to admin.");
      } else {
        toast.error(response.message || "Failed to submit payout request.");
      }
    } catch (err: unknown) {
      console.error("Error submitting payout request:", err);
      const message =
        err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Failed to submit payout request. Please try again.";
      if (/already/i.test(message)) {
        markPayoutRequestedBookingId(booking.id);
        setPayoutRequestedIds((prev) => new Set(prev).add(booking.id));
        toast.info(message);
      } else {
        toast.error(message);
      }
    } finally {
      setPayoutRequestBookingId(null);
    }
  };

  // Helper function to convert 12-hour time to 24-hour format with seconds
  const convertTimeTo24Hour = (time12Hour: string): string => {
    // Handle formats like "9:00 AM", "10:30 AM", "12:00 PM", "1:00 PM"
    const match = time12Hour.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return "09:00:00"; // Default if parsing fails

    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3].toUpperCase();

    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
  };

  const confirmReschedule = async () => {
    if (!selectedBooking || !rescheduleDate || !rescheduleTime) {
      toast.error("Please select both date and time");
      return;
    }

    const apiBooking = apiBookingsMap.get(selectedBooking.id);
    if (!apiBooking) {
      toast.error("Booking data not found");
      return;
    }

    const apiToken = getApiToken();
    const professionalId = getProfessionalId();

    if (!apiToken) {
      toast.error("Authentication required. Please login again.");
      return;
    }

    if (!professionalId) {
      toast.error("Professional ID not found. Please login again.");
      return;
    }

    try {
      setIsRescheduling(true);

      // Convert time to 24-hour format with seconds
      const time24Hour = convertTimeTo24Hour(rescheduleTime);

      // Extract numeric price (remove currency symbols)
      const priceValue =
        parseFloat(String(apiBooking.price ?? "0").replace(/[^0-9.-]/g, "")) || 0;

      const customerName = getProfessionalBookingCustomerName(apiBooking);
      const { first_name, last_name } = splitProfessionalBookingCustomerName(customerName);

      const updateData = {
        api_token: apiToken,
        id: apiBooking.id,
        selected_date: rescheduleDate,
        selected_time: time24Hour,
        price: priceValue,
        first_name: apiBooking.first_name?.trim() || first_name,
        last_name: apiBooking.last_name?.trim() || last_name,
        email: getProfessionalBookingCustomerEmail(apiBooking),
        phone: getProfessionalBookingCustomerPhone(apiBooking),
        property_address: apiBooking.property_address,
        longitude: parseFloat(apiBooking.longitude) || 0,
        latitude: parseFloat(apiBooking.latitude) || 0,
        city: apiBooking.city,
        post_code: apiBooking.post_code,
        additional_notes: apiBooking.additional_notes || "",
        reason: rescheduleReason || "",
        professional_id: professionalId,
      };

      const response = await updateProfessionalBooking(updateData);

      if (response.status === "success" || response.message?.toLowerCase().includes("success")) {
        toast.success(response.message || "Appointment rescheduled successfully!");
        setShowRescheduleModal(false);
        setSelectedBooking(null);
        setRescheduleDate("");
        setRescheduleTime("");
        setRescheduleReason("");
        // Refresh bookings and summary to show updated data
        await fetchBookings();
        await fetchBookingSummary();
      } else {
        toast.error(response.message || "Failed to reschedule appointment");
      }
    } catch (err: any) {
      console.error("Error rescheduling booking:", err);
      toast.error(err?.message || "Failed to reschedule appointment. Please try again.");
    } finally {
      setIsRescheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      <style>{`
        .booking-details-modal {
          max-width: 900px !important;
          width: 95vw !important;
          min-width: 320px !important;
        }
        @media (min-width: 640px) {
          .booking-details-modal {
            width: 90vw !important;
          }
        }
        @media (min-width: 1024px) {
          .booking-details-modal {
            width: 900px !important;
          }
        }
      `}</style>
      <div>
        <h1 className="text-3xl text-[#0A1A2F] mb-2">My Bookings</h1>
        <p className="text-gray-600">Manage your appointments and schedule</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Upcoming</p>
            {isLoadingStats ? (
              <Loader2 className="w-6 h-6 text-green-600 mt-1 animate-spin" />
            ) : (
              <p className="text-2xl text-green-600 mt-1">{stats.upcoming}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Pending</p>
            {isLoadingStats ? (
              <Loader2 className="w-6 h-6 text-yellow-600 mt-1 animate-spin" />
            ) : (
              <p className="text-2xl text-yellow-600 mt-1">{stats.pending}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Completed</p>
            {isLoadingStats ? (
              <Loader2 className="w-6 h-6 text-blue-600 mt-1 animate-spin" />
            ) : (
              <p className="text-2xl text-blue-600 mt-1">{stats.completed}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 w-full">

            {/* SEARCH – FULL WIDTH */}
            <div className="relative w-full flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>

            {/* FILTER */}
            <div className="w-full md:w-48 shrink-0">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">Loading bookings...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <p className="text-red-500 mb-4">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bookings List */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <Card key={booking.id} className="@container hover:shadow-lg transition-shadow min-w-0 overflow-hidden">
              <CardContent className="p-4 sm:p-6 min-w-0">
                {/* Mobile: title → ref → status + price on their own row */}
                <div className="mb-4 min-w-0 md:hidden space-y-2">
                  <h3 className="text-lg text-[#0A1A2F] break-words">{booking.service}</h3>
                  <p className="text-sm text-gray-500 break-all">Ref: {booking.reference}</p>
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
                    <Badge className={`w-fit shrink-0 whitespace-nowrap ${getStatusColor(booking.status)}`}>
                      {getStatusLabel(booking.status)}
                    </Badge>
                    {renderPriceWithPaymentStatus(booking.price, booking.paymentStatus)}
                  </div>
                </div>

                {/* Tablet/desktop: original header layout */}
                <div className="hidden md:flex items-start justify-between mb-4 min-w-0">
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-xl text-[#0A1A2F]">{booking.service}</h3>
                      <Badge className={`shrink-0 ${getStatusColor(booking.status)}`}>
                        {getStatusLabel(booking.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">Ref: {booking.reference}</p>
                  </div>
                  {renderPriceWithPaymentStatus(booking.price, booking.paymentStatus)}
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">{booking.customer}</p>
                        <p className="text-sm text-gray-500">{booking.customerEmail}</p>
                        <p className="text-sm text-gray-500">{booking.customerPhone}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">{booking.date} at {booking.time}</p>
                        <p className="text-sm text-gray-500">Duration: {booking.duration}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-700">{booking.location}</p>
                        <p className="text-sm text-gray-500">{booking.propertySize}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {booking.notes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-900">
                      <strong>Notes:</strong> {booking.notes}
                    </p>
                  </div>
                )}

                {isMeBookingStatus(booking.status) && (
                  <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 mb-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <p className="text-sm text-amber-900">{professionalRescheduleSubmittedMessage}</p>
                  </div>
                )}

                <Separator className="my-4" />

                <div className="grid grid-cols-1 items-stretch gap-3 @[36rem]:grid-cols-4 @[52rem]:grid-cols-5 md:grid-cols-4 xl:grid-cols-5 [&>button]:w-full [&>button]:min-h-10 [&>button]:px-4 [&>button]:py-2.5 [&>button]:text-sm [&>button]:whitespace-nowrap @[36rem]:[&>button]:h-full @[36rem]:[&>button]:min-h-[3.25rem]">
                  <Button
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => handleViewDetails(booking)}
                  >
                    <span className="truncate">
                      <span className="md:hidden">View Full Details</span>
                      <span className="hidden md:inline">View Details</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  </Button>

                  {booking.status === "confirmed" && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleGetDirections(booking.location)}
                      >
                        <Navigation className="w-4 h-4 mr-2" />
                        Get Directions
                      </Button>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleMarkAsCompleted(booking)}
                        disabled={completingBookingId === booking.id}
                      >
                        {completingBookingId === booking.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Completing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark as Completed
                          </>
                        )}
                      </Button>
                    </>
                  )}

                  {!isMeBookingStatus(booking.status) &&
                    (booking.status === "pending" || booking.status === "confirmed") && (
                    <Button
                      variant="outline"
                      onClick={() => handleReschedule(booking)}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Reschedule time
                    </Button>
                  )}

                  {(booking.status === "confirmed" || booking.status === "completed") && (
                      <Button
                        variant="outline"
                        onClick={() => handleOpenUploadReport(booking)}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Report
                      </Button>
                  )}

                  {booking.status === "completed" && booking.isRenewal && (
                    hasRenewalRequestBeenSent(booking.id) ? (
                      <div
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900 @[36rem]:col-span-4 @[52rem]:col-span-5 md:justify-start"
                        title="You have already sent a renewal request for this booking"
                      >
                        <CheckCircle className="h-4 w-4 shrink-0 text-indigo-600" />
                        <span>Renewal request sent</span>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="border-blue-600 text-blue-700 hover:bg-blue-50"
                        onClick={() => void handleRenewalRequest(booking)}
                        disabled={renewalRequestBookingId === booking.id}
                        title="Send Renewal Request"
                      >
                        {renewalRequestBookingId === booking.id ? (
                          <>
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 shrink-0" />
                            <span className="xl:hidden">Renewal</span>
                            <span className="hidden xl:inline">Send Renewal Request</span>
                          </>
                        )}
                      </Button>
                    )
                  )}

                  {booking.status === "completed" && (
                    hasPayoutRequestBeenSent(booking.id) ? (
                      <div
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 @[36rem]:col-span-4 @[52rem]:col-span-5 md:justify-start"
                        title="You have already submitted a payout request for this booking"
                      >
                        <CheckCircle className="h-4 w-4 shrink-0 text-blue-600" />
                        <span>Payout request sent</span>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="border-green-600 text-green-700 hover:bg-green-50"
                        onClick={() => void handlePayoutRequest(booking)}
                        disabled={payoutRequestBookingId === booking.id}
                        title="Send PayOut Request"
                      >
                        {payoutRequestBookingId === booking.id ? (
                          <>
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <>
                            <Wallet className="h-4 w-4 shrink-0" />
                            <span className="xl:hidden">PayOut</span>
                            <span className="hidden xl:inline">Send PayOut Request</span>
                          </>
                        )}
                      </Button>
                    )
                  )}

                  {booking.status === "pending" && !isMeBookingStatus(booking.status) && (
                    <>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleAcceptBooking(booking)}
                        disabled={rejectingBookingId === booking.id}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Accept Booking
                      </Button>
                      <Button
                        variant="outline"
                        className="border-red-600 text-red-600 hover:bg-red-50"
                        onClick={() => void handleRejectBooking(booking)}
                        disabled={rejectingBookingId === booking.id}
                      >
                        {rejectingBookingId === booking.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Rejecting...
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject Booking
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !error && filteredBookings.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No bookings found</p>
          </CardContent>
        </Card>
      )}

      {/* View Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent
          className="booking-details-modal max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#0A1A2F]">Booking Details</DialogTitle>
            <DialogDescription>
              Complete information for booking {selectedBooking?.reference}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6 mt-4 px-4 sm:px-6 min-w-0 overflow-x-hidden">
              {/* Status Banner */}
              <div className={`p-4 rounded-lg min-w-0 overflow-hidden ${getStatusBannerClass(selectedBooking.status)}`}>
                {/* Mobile: status → reference → price on separate row */}
                <div className="space-y-2 min-w-0 md:hidden">
                  <div className="font-semibold text-gray-900 flex flex-wrap items-center gap-2">
                    <span>Status:</span>
                    <Badge className={`w-fit shrink-0 whitespace-nowrap ${getStatusColor(selectedBooking.status)}`}>
                      {getStatusLabel(selectedBooking.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 break-all">
                    Reference: {selectedBooking.reference}
                  </p>
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-200/80">
                    <span className="text-sm font-medium text-gray-700">Price</span>
                    {renderPriceWithPaymentStatus(
                      selectedBooking.price,
                      selectedBooking.paymentStatus,
                      "text-2xl font-bold text-gray-900"
                    )}
                  </div>
                </div>

                {/* Tablet/desktop: original side-by-side layout */}
                <div className="hidden md:flex items-center justify-between gap-4 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                      <span>Status:</span>
                      <Badge className={`shrink-0 ${getStatusColor(selectedBooking.status)}`}>
                        {getStatusLabel(selectedBooking.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Reference: {selectedBooking.reference}</p>
                  </div>
                  {renderPriceWithPaymentStatus(
                    selectedBooking.price,
                    selectedBooking.paymentStatus,
                    "text-2xl font-bold text-gray-900"
                  )}
                </div>
              </div>

              {/* Service questionnaire details from API (service name omitted — shown on list card) */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Home className="w-5 h-5 shrink-0" />
                  Service details
                </h3>
                {selectedBooking.serviceDetails.length > 0 ? (
                  <div className="bg-gray-50 p-4 rounded-lg space-y-1.5 text-sm text-gray-600">
                    {selectedBooking.serviceDetails.map((row) => (
                      <p key={row.label}>
                        {row.label}: <span className="text-gray-900">{row.value}</span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No additional service details.</p>
                )}
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Customer Information
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p><strong>Name:</strong> {selectedBooking.customer}</p>
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <strong>Email:</strong>
                    <a href={`mailto:${selectedBooking.customerEmail}`} className="text-red-600 hover:underline">
                      {selectedBooking.customerEmail}
                    </a>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <strong>Phone:</strong>
                    <a href={`tel:${selectedBooking.customerPhone}`} className="text-red-600 hover:underline">
                      {selectedBooking.customerPhone}
                    </a>
                  </p>
                </div>
              </div>

              {/* Appointment Details */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Appointment Details
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p><strong>Date:</strong> {selectedBooking.date}</p>
                  <p><strong>Time:</strong> {selectedBooking.time}</p>
                  <p><strong>Duration:</strong> {selectedBooking.duration}</p>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Location
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p>{selectedBooking.location}</p>
                  {selectedBooking.accessInstructions && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm"><strong>Access Instructions:</strong></p>
                      <p className="text-sm text-gray-700 mt-1">{selectedBooking.accessInstructions}</p>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full mt-3"
                    onClick={() => handleGetDirections(selectedBooking.location)}
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Open in Google Maps
                  </Button>
                </div>
              </div>

              {/* Notes */}
              {selectedBooking.notes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Special Requirements
                  </h3>
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <p className="text-gray-900">{selectedBooking.notes}</p>
                  </div>
                </div>
              )}

              {isMeBookingStatus(selectedBooking.status) && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <p className="text-sm text-amber-900">{professionalRescheduleSubmittedMessage}</p>
                </div>
              )}

              {/* Action Buttons — stack full width on mobile */}
              <div className="flex flex-col gap-2.5 pt-4 border-t pb-5 sm:pb-6 min-w-0">
                {selectedBooking.status === "pending" && !isMeBookingStatus(selectedBooking.status) && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 min-w-0">
                    <Button
                      className="w-full sm:flex-1 h-11 justify-center bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleAcceptBooking(selectedBooking);
                      }}
                      disabled={rejectingBookingId === selectedBooking.id}
                    >
                      <CheckCircle className="w-4 h-4 mr-2 shrink-0" />
                      Accept Booking
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full sm:flex-1 h-11 justify-center border-red-600 text-red-600 hover:bg-red-50"
                      onClick={() => void handleRejectBooking(selectedBooking)}
                      disabled={rejectingBookingId === selectedBooking.id}
                    >
                      {rejectingBookingId === selectedBooking.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 shrink-0 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-2 shrink-0" />
                          Reject Booking
                        </>
                      )}
                    </Button>
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 min-w-0">
                  {!isMeBookingStatus(selectedBooking.status) &&
                    (selectedBooking.status === "pending" || selectedBooking.status === "confirmed") && (
                    <Button
                      variant="outline"
                      className="w-full sm:flex-1 h-11 justify-center"
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleReschedule(selectedBooking);
                      }}
                    >
                      <Calendar className="w-4 h-4 mr-2 shrink-0" />
                      Reschedule time
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setShowDetailsModal(false)}
                    className="w-full sm:flex-1 h-11 justify-center"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Report Modal */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#0A1A2F]">Fire Safety Report</DialogTitle>
            <DialogDescription>
              Report for booking {selectedBooking?.reference}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6 mt-4">
              {/* Report Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-lg">
                <h2 className="text-2xl font-bold mb-2">{selectedBooking.service}</h2>
                <p className="opacity-90">{selectedBooking.customer}</p>
                <p className="opacity-90">{selectedBooking.location}</p>
                <p className="opacity-90 mt-2">Date: {selectedBooking.date}</p>
              </div>

              {/* Report Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">12</p>
                  <p className="text-sm text-gray-600">Compliant Items</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-center">
                  <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-600">3</p>
                  <p className="text-sm text-gray-600">Actions Required</p>
                </div>
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-center">
                  <X className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600">0</p>
                  <p className="text-sm text-gray-600">Critical Issues</p>
                </div>
              </div>

              {/* Key Findings */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Key Findings</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Fire alarm system operational</p>
                      <p className="text-sm text-gray-600">All alarm points tested and functioning correctly</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Emergency exits clear</p>
                      <p className="text-sm text-gray-600">All emergency routes are unobstructed</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Fire extinguisher servicing due</p>
                      <p className="text-sm text-gray-600">2 extinguishers require annual service within 30 days</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Recommendations</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>Schedule fire extinguisher servicing for next month</li>
                    <li>Update fire evacuation plan to include new staff members</li>
                    <li>Conduct fire drill within next 3 months</li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button className="flex-1 bg-red-600 hover:bg-red-700">
                  <FileText className="w-4 h-4 mr-2" />
                  Download PDF Report
                </Button>
                <Button variant="outline" className="flex-1">
                  <Mail className="w-4 h-4 mr-2" />
                  Email to Customer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Accept Booking Modal */}
      <Dialog open={showAcceptModal} onOpenChange={setShowAcceptModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F]">Accept Booking</DialogTitle>
            <DialogDescription>
              Confirm that you want to accept this booking
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 mt-4 px-6">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="font-semibold text-gray-900 mb-2">{selectedBooking.service}</p>
                <p className="text-sm text-gray-600">{selectedBooking.customer}</p>
                <p className="text-sm text-gray-600">{selectedBooking.date} at {selectedBooking.time}</p>
                <p className="text-sm text-gray-600">{selectedBooking.location}</p>
              </div>

              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">What happens next:</p>
                    <ul className="text-sm text-green-800 mt-2 space-y-1">
                      <li>• The customer will be notified immediately</li>
                      <li>• The booking will appear in your confirmed appointments</li>
                      <li>• You'll receive a reminder 24 hours before</li>
                      <li>• Payment will be processed after service completion</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 py-6">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={confirmAcceptBooking}
                  disabled={isAccepting}
                >
                  {isAccepting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm & Accept
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAcceptModal(false)}
                  className="flex-1"
                  disabled={isAccepting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={showRescheduleModal} onOpenChange={handleCloseReschedule}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Request a new date and time for this booking
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-5">
              <div className="bg-gray-100 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Current Appointment</p>
                <p className="font-semibold text-gray-900">
                  {selectedBooking.date} at {selectedBooking.time}
                </p>
                <p className="text-sm text-gray-600">{selectedBooking.customer}</p>
              </div>

              {professionalIdForCalendar != null && !Number.isNaN(Number(professionalIdForCalendar)) ? (
                <RescheduleCalendarPicker
                  professionalId={Number(professionalIdForCalendar)}
                  selectedDate={rescheduleDate}
                  selectedTime={rescheduleTime}
                  onSelectDate={(d) => {
                    setRescheduleDate(d);
                    setRescheduleTime("");
                  }}
                  onSelectTime={setRescheduleTime}
                />
              ) : (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  Calendar could not be loaded (missing professional profile). Please complete your profile or try again later.
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="rescheduleReason" className="text-sm font-medium">
                  Reason (Optional)
                </Label>
                <Textarea
                  id="rescheduleReason"
                  placeholder="Optional: explain why you need a different date or time..."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  rows={3}
                  className="w-full resize-none"
                />
              </div>

              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  This will send a reschedule request to the customer. They must approve the new date and time.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={confirmReschedule}
                  disabled={!rescheduleDate || !rescheduleTime || isRescheduling}
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
                  onClick={() => handleCloseReschedule(false)}
                  className="flex-1"
                  disabled={isRescheduling}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <UploadCompletionReportModal
        open={showUploadReportModal}
        onOpenChange={setShowUploadReportModal}
        booking={uploadReportBooking}
      />
    </div>
  );
}