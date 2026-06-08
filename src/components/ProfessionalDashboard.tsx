import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { 
  LayoutDashboard,
  User, 
  DollarSign, 
  Clock, 
  Calendar, 
  CreditCard, 
  ShieldCheck, 
  Bell, 
  Settings, 
  Menu, 
  X, 
  LogOut, 
  Flame,
  Briefcase,
  TrendingUp,
  FileText,
  MessageCircle,
  MessageSquare,
  Loader2,
  Wallet
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  getProfessionalBookings,
  ProfessionalBookingItem,
  getProfessionalBookingCustomerName,
} from "../api/bookingService";
import { getApiToken, getProfessionalId, getSessionUserDisplay, getUserFullName } from "../lib/auth";
import {
  getProfileCompletionPercentage,
  ProfileCompletionDetails,
  getDashboardSummary,
  DashboardSummaryData,
  formatProfessionalDashboardMoney,
  getProfessionalContactAdminMessages,
  type ProfessionalAdminContactMessageItem,
} from "../api/professionalsService";
import { getPaymentInvoices, PaymentInvoiceItem } from "../api/paymentService";
import { ProfessionalBookings } from "./ProfessionalBookings";
import { ProfessionalPayments } from "./ProfessionalPayments";
import { ProfessionalPayoutList } from "./ProfessionalPayoutList";
import { ProfessionalVerification } from "./ProfessionalVerification";
import { ProfessionalSettings } from "./ProfessionalSettings";
import { ProfessionalNotifications } from "./ProfessionalNotifications";
import { ProfessionalProfileContent } from "./ProfessionalProfileContent";
import { ProfessionalPricingContent } from "./ProfessionalPricingContent";
import { ProfessionalAvailabilityContent } from "./ProfessionalAvailabilityContent";
import { ProfessionalCustomQuoteContent } from "./ProfessionalCustomQuoteContent";
import logoImage from "figma:asset/629703c093c2f72bf409676369fecdf03c462cd2.png";
import { setCompleteProfileReminderFlag } from "../lib/professionalProfileReminder";
import { toast } from "sonner";
import {
  loadProfessionalNotificationSeenKeys,
  subscribeProfessionalNotificationSeen,
  subscribeProfessionalNotificationMutated,
} from "../lib/professionalNotificationSeen";
import {
  fetchNotifications,
  getProfessionalNotificationDedupeKey,
  type NotificationApiItem,
} from "../api/notificationsService";

interface ProfessionalDashboardProps {
  onLogout: () => void;
  onNavigateToReports: () => void;
}

type ProfessionalView =
  | "dashboard"
  | "profile"
  | "pricing-overview"
  | "availability"
  | "bookings"
  | "payments"
  | "payout-list"
  | "custom-quote"
  | "verification"
  | "admin-messages"
  | "settings"
  | "notifications";

export function ProfessionalDashboard({ onLogout, onNavigateToReports }: ProfessionalDashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { view } = useParams<{ view?: string }>();
  const validViews: ProfessionalView[] = [
    "dashboard",
    "profile",
    "pricing-overview",
    "availability",
    "bookings",
    "payments",
    "payout-list",
    "custom-quote",
    "verification",
    "admin-messages",
    "settings",
    "notifications",
  ];
  
  // Determine current view from URL parameter, default to "dashboard"
  // Legacy routes: "pricing" → pricing-overview; "block-booking-day" → availability (blocking lives there now)
  const resolvedView =
    view === "pricing"
      ? "pricing-overview"
      : view === "block-booking-day"
        ? "availability"
        : view;
  const currentViewFromUrl: ProfessionalView = (resolvedView && validViews.includes(resolvedView as ProfessionalView)) 
    ? (resolvedView as ProfessionalView) 
    : "dashboard";
  
  const [activeMenu, setActiveMenu] = useState<ProfessionalView>(currentViewFromUrl);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminContactMessages, setAdminContactMessages] = useState<ProfessionalAdminContactMessageItem[]>([]);
  const [isLoadingAdminContactMessages, setIsLoadingAdminContactMessages] = useState(false);

  const [headerNotificationFeed, setHeaderNotificationFeed] = useState<NotificationApiItem[]>([]);
  const [headerNotificationTick, setHeaderNotificationTick] = useState(0);

  const professionalSeenKeys = useMemo(() => {
    void headerNotificationTick;
    return loadProfessionalNotificationSeenKeys();
  }, [headerNotificationFeed, headerNotificationTick]);

  const unreadProfessionalNotificationCount = useMemo(() => {
    return headerNotificationFeed.reduce((acc, n) => {
      if (n.is_read) return acc;
      if (professionalSeenKeys.has(getProfessionalNotificationDedupeKey(n))) return acc;
      return acc + 1;
    }, 0);
  }, [headerNotificationFeed, professionalSeenKeys]);

  const refreshHeaderNotificationFeed = useCallback(async () => {
    const token = getApiToken();
    if (!token) {
      setHeaderNotificationFeed([]);
      return;
    }
    try {
      const res = await fetchNotifications({ api_token: token });
      setHeaderNotificationFeed(Array.isArray(res.data) ? res.data : []);
    } catch {
      setHeaderNotificationFeed([]);
    }
  }, []);

  useEffect(() => {
    refreshHeaderNotificationFeed();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshHeaderNotificationFeed();
      }
    }, 90_000);
    const onFocus = () => void refreshHeaderNotificationFeed();
    window.addEventListener("focus", onFocus);
    const unsubSeen = subscribeProfessionalNotificationSeen(() => {
      setHeaderNotificationTick((t) => t + 1);
    });
    const unsubMut = subscribeProfessionalNotificationMutated(() => {
      void refreshHeaderNotificationFeed();
    });
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      unsubSeen();
      unsubMut();
    };
  }, [refreshHeaderNotificationFeed]);

  useEffect(() => {
    if (activeMenu === "notifications") {
      void refreshHeaderNotificationFeed();
    }
  }, [activeMenu, refreshHeaderNotificationFeed]);

  // Sync state with URL parameter when it changes (including on mount and URL changes)
  useEffect(() => {
    setActiveMenu(currentViewFromUrl);
  }, [currentViewFromUrl]);

  useEffect(() => {
    const st = location.state as { showCompleteProfileReminder?: boolean } | null;
    if (!st?.showCompleteProfileReminder) return;
    setCompleteProfileReminderFlag();
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: {} });
  }, [location.state, location.pathname, location.search, navigate]);

  // Old "Block Booking Day" URL → normalize to Availability in the address bar
  useEffect(() => {
    if (view === "block-booking-day") {
      navigate("/professional/dashboard/availability", { replace: true });
    }
  }, [view, navigate]);

  // Admin messages — POST /contact-professional/get when this section is open
  useEffect(() => {
    if (activeMenu !== "admin-messages") return;

    let cancelled = false;

    const load = async () => {
      const token = getApiToken();
      if (!token) {
        setAdminContactMessages([]);
        setIsLoadingAdminContactMessages(false);
        toast.error("Please log in to view admin messages.");
        return;
      }

      setIsLoadingAdminContactMessages(true);
      try {
        const response = await getProfessionalContactAdminMessages({ api_token: token });
        if (cancelled) return;
        setAdminContactMessages(Array.isArray(response.data) ? response.data : []);
      } catch (error: unknown) {
        if (!cancelled) {
          console.error("Error fetching admin messages:", error);
          setAdminContactMessages([]);
          const msg =
            error && typeof error === "object" && "message" in error
              ? String((error as { message?: string }).message)
              : "Failed to load admin messages.";
          toast.error(msg);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAdminContactMessages(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeMenu]);
  
  // Handler to update both state and URL
  const handleViewChange = (view: ProfessionalView) => {
    setActiveMenu(view);
    if (view === "dashboard") {
      navigate("/professional/dashboard", { replace: true });
    } else {
      navigate(`/professional/dashboard/${view}`, { replace: true });
    }
  };

  const menuItems = [
    { id: "dashboard" as ProfessionalView, label: "Dashboard", icon: LayoutDashboard },
    { id: "profile" as ProfessionalView, label: "Profile", icon: User },
    { id: "pricing-overview" as ProfessionalView, label: "Pricing", icon: DollarSign },
    { id: "availability" as ProfessionalView, label: "Availability", icon: Clock },
    { id: "bookings" as ProfessionalView, label: "Bookings", icon: Calendar },
    { id: "payments" as ProfessionalView, label: "Payments", icon: CreditCard },
    { id: "payout-list" as ProfessionalView, label: "Payout List", icon: Wallet },
    { id: "custom-quote" as ProfessionalView, label: "Custom Quote", icon: MessageCircle },
    { id: "verification" as ProfessionalView, label: "Verification Status", icon: ShieldCheck },
    { id: "admin-messages" as ProfessionalView, label: "Admin-Message", icon: MessageSquare },
    { id: "notifications" as ProfessionalView, label: "Notifications", icon: Bell },
    { id: "settings" as ProfessionalView, label: "Settings", icon: Settings },
  ];

  // Dashboard summary state
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummaryData | null>(null);
  const [isLoadingDashboardSummary, setIsLoadingDashboardSummary] = useState(false);

  const professionalWelcomeName = useMemo(() => {
    const session = getSessionUserDisplay();
    if (session?.name?.trim()) return session.name.trim();
    const fullName = getUserFullName();
    if (fullName?.trim()) {
      const first = fullName.trim().split(/\s+/)[0];
      return first || fullName.trim();
    }
    return "there";
  }, []);

  // Fetch dashboard summary from API
  const fetchDashboardSummary = async () => {
    try {
      setIsLoadingDashboardSummary(true);
      const apiToken = getApiToken();
      if (!apiToken) {
        setDashboardSummary(null);
        return;
      }

      const summary = await getDashboardSummary(apiToken);
      setDashboardSummary(summary);
    } catch (err: unknown) {
      console.error("Error fetching dashboard summary:", err);
      setDashboardSummary(null);
    } finally {
      setIsLoadingDashboardSummary(false);
    }
  };

  // Generate stats from API data
  const stats = [
    {
      title: "Upcoming Jobs",
      value: dashboardSummary?.upcoming_jobs?.count?.toString() ?? "0",
      change: `+${dashboardSummary?.upcoming_jobs?.this_week ?? 0} this week`,
      icon: Briefcase,
      color: "blue",
      bgColor: "bg-blue-100",
      textColor: "text-blue-600",
      iconBg: "bg-blue-600"
    },
    {
      title: "Total Earnings",
      value: formatProfessionalDashboardMoney(dashboardSummary?.earnings?.total),
      change: `+${formatProfessionalDashboardMoney(dashboardSummary?.earnings?.this_month)} this month`,
      icon: TrendingUp,
      color: "green",
      bgColor: "bg-green-100",
      textColor: "text-green-600",
      iconBg: "bg-green-600"
    },
    {
      title: "All Reports",
      value: dashboardSummary?.reports?.total?.toString() ?? "0",
      icon: FileText,
      color: "orange",
      bgColor: "bg-orange-100",
      textColor: "text-orange-600",
      iconBg: "bg-orange-600"
    }
  ];

  const [upcomingJobs, setUpcomingJobs] = useState<Array<{
    id: number | string;
    service: string;
    client: string;
    date: string;
    location: string;
    status: "confirmed" | "pending";
  }>>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [profileCompletionPercentage, setProfileCompletionPercentage] = useState(0);
  const [profileCompletionDetails, setProfileCompletionDetails] = useState<ProfileCompletionDetails | null>(null);
  const [isLoadingProfileCompletion, setIsLoadingProfileCompletion] = useState(false);
  const [recentPayments, setRecentPayments] = useState<Array<{
    amount: string;
    client: string;
    date: string;
    status: string;
  }>>([]);
  const [isLoadingRecentPayments, setIsLoadingRecentPayments] = useState(false);

  const getOverviewJobStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
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

  const getOverviewJobStatusLabel = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === "me") return "Pending";
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Helper function to format date
  const formatJobDate = (dateStr: string, timeStr: string): string => {
    try {
      const date = new Date(dateStr);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Reset time to compare dates only
      today.setHours(0, 0, 0, 0);
      tomorrow.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      
      // Format time
      let formattedTime = timeStr;
      if (timeStr.includes("AM") || timeStr.includes("PM")) {
        formattedTime = timeStr; // Already in AM/PM format
      } else {
        // Convert 24-hour to AM/PM if needed
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        formattedTime = `${hour12}:${minutes} ${ampm}`;
      }
      
      if (date.getTime() === today.getTime()) {
        return `Today, ${formattedTime}`;
      } else if (date.getTime() === tomorrow.getTime()) {
        return `Tomorrow, ${formattedTime}`;
      } else {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${monthNames[date.getMonth()]} ${date.getDate()}, ${formattedTime}`;
      }
    } catch (e) {
      return `${dateStr} at ${timeStr}`;
    }
  };

  // Fetch upcoming jobs from API
  const fetchUpcomingJobs = async () => {
    try {
      setIsLoadingJobs(true);
      const apiToken = getApiToken();
      if (!apiToken) {
        console.warn("No API token available for fetching upcoming jobs");
        return;
      }

      const bookings = await getProfessionalBookings();
      
      // Filter for upcoming/pending/confirmed bookings and map to job format
      const jobs = bookings
        .filter((booking) => {
          const status = booking.status?.toLowerCase() || '';
          return status === 'pending' || status === 'confirmed';
        })
        .slice(0, 3) // Only show first 3
        .map((booking: ProfessionalBookingItem) => {
          // Get service name from selected_service or default
          const serviceName = booking.selected_service?.name || "Fire Risk Assessment";
          
          const clientName = getProfessionalBookingCustomerName(booking);
          
          // Format date and time
          const formattedDate = formatJobDate(booking.selected_date, booking.selected_time);
          
          // Format location from city and post_code
          const location = booking.city && booking.post_code
            ? `${booking.city}, ${booking.post_code}`
            : booking.city || booking.property_address || "Location";
          
          // Map status
          const status = booking.status?.toLowerCase() === 'confirmed' ? 'confirmed' : 'pending';
          
          return {
            id: booking.id,
            service: serviceName,
            client: clientName,
            date: formattedDate,
            location: location,
            status: status as "confirmed" | "pending"
          };
        });
      
      setUpcomingJobs(jobs);
    } catch (err: any) {
      console.error("Error fetching upcoming jobs:", err);
      // On error, set empty array so UI doesn't break
      setUpcomingJobs([]);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  // Helper function to format date as "X days ago"
  const formatTimeAgo = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      const diffInWeeks = Math.floor(diffInDays / 7);
      const diffInMonths = Math.floor(diffInDays / 30);

      if (diffInDays === 0) {
        return "Today";
      } else if (diffInDays === 1) {
        return "1 day ago";
      } else if (diffInDays < 7) {
        return `${diffInDays} days ago`;
      } else if (diffInWeeks === 1) {
        return "1 week ago";
      } else if (diffInWeeks < 4) {
        return `${diffInWeeks} weeks ago`;
      } else if (diffInMonths === 1) {
        return "1 month ago";
      } else {
        return `${diffInMonths} months ago`;
      }
    } catch (e) {
      return dateString;
    }
  };

  // Fetch recent payments from API
  const fetchRecentPayments = async () => {
    try {
      setIsLoadingRecentPayments(true);
      const apiToken = getApiToken();
      if (!apiToken) {
        console.warn("No API token available for fetching recent payments");
        return;
      }

      const invoices = await getPaymentInvoices(apiToken);
      
      // Sort by created_at (newest first) and take first 3
      const sortedInvoices = [...invoices].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      }).slice(0, 3);

      // Map to display format
      const payments = sortedInvoices.map((invoice: PaymentInvoiceItem) => {
        // Get client name from professional_booking or cardholder_name
        const clientName = invoice.professional_booking?.first_name || invoice.cardholder_name || "Client";
        
        // Format amount with £ symbol
        const amount = `£${parseFloat(invoice.price) || 0}`;
        
        // Format date as "X days ago"
        const timeAgo = formatTimeAgo(invoice.created_at);
        
        // Map status - API uses "pending"/"paid", UI shows "completed" for paid
        const status = invoice.status === "paid" ? "completed" : invoice.status || "pending";

        return {
          amount,
          client: clientName,
          date: timeAgo,
          status
        };
      });

      setRecentPayments(payments);
    } catch (err: any) {
      console.error("Error fetching recent payments:", err);
      // On error, keep empty array
      setRecentPayments([]);
    } finally {
      setIsLoadingRecentPayments(false);
    }
  };

  // Fetch profile completion from API
  const fetchProfileCompletion = async () => {
    try {
      setIsLoadingProfileCompletion(true);
      const professionalId = getProfessionalId();
      const apiToken = getApiToken();
      
      if (!professionalId) {
        console.warn("No professional ID available for fetching profile completion");
        return;
      }

      const response = await getProfileCompletionPercentage({
        professional_id: professionalId,
        api_token: apiToken || undefined
      });
      
      if (response.status === true && response.details && response.profile_completion_percentage !== undefined) {
        setProfileCompletionPercentage(response.profile_completion_percentage);
        setProfileCompletionDetails(response.details);
      }
    } catch (err: any) {
      console.error("Error fetching profile completion:", err);
      // On error, keep default values (0)
    } finally {
      setIsLoadingProfileCompletion(false);
    }
  };

  // Fetch upcoming jobs on component mount
  useEffect(() => {
    if (activeMenu === "dashboard") {
      fetchDashboardSummary();
      fetchUpcomingJobs();
      fetchProfileCompletion();
      fetchRecentPayments();
    }
  }, [activeMenu]);

  const formatAdminMessageTimestamp = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffInSeconds < 60) {
        return `${diffInSeconds} second${diffInSeconds !== 1 ? "s" : ""} ago`;
      }
      if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
      }
      if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
      }
      if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days !== 1 ? "s" : ""} ago`;
      }
      return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return dateString;
    }
  };

  const adminMessageRowKey = (item: ProfessionalAdminContactMessageItem, index: number): string => {
    if (typeof item.id === "number" && item.id > 0) return `id:${item.id}`;
    const stamp = item.created_at || "";
    const head = (item.message || "").slice(0, 80);
    return `h:${stamp}|${head}|${index}`;
  };

  const renderAdminMessages = () => (
    <div>
      <div className="mb-8">
        <h1 className="text-[#0A1A2F] mb-2 text-2xl md:text-3xl font-semibold tracking-tight">Admin-Message</h1>
        <p className="text-gray-600">Messages from the Fire Guide team about your account or jobs.</p>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Your messages</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingAdminContactMessages ? (
            <div className="text-center py-12 text-gray-500">
              <Loader2 className="w-8 h-8 mx-auto mb-3 text-gray-400 animate-spin" />
              <p className="text-sm">Loading messages...</p>
            </div>
          ) : adminContactMessages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No admin messages yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[...adminContactMessages]
                .sort((a, b) => {
                  const ta = new Date(a.created_at || 0).getTime();
                  const tb = new Date(b.created_at || 0).getTime();
                  return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
                })
                .map((row, index) => (
                  <div
                    key={adminMessageRowKey(row, index)}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:border-red-200 hover:bg-red-50/50 transition-all"
                  >
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900">{row.title || "Admin message"}</h4>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap break-words">{row.message || ""}</p>
                      {row.created_at ? (
                        <p className="text-xs text-gray-500 mt-2">{formatAdminMessageTimestamp(row.created_at)}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeMenu) {
      case "dashboard":
        return renderDashboard();
      case "bookings":
        return <ProfessionalBookings onViewDetails={(id) => console.log("View booking:", id)} />;
      case "payments":
        return <ProfessionalPayments />;
      case "payout-list":
        return <ProfessionalPayoutList />;
      case "custom-quote":
        return <ProfessionalCustomQuoteContent />;
      case "verification":
        return <ProfessionalVerification />;
      case "admin-messages":
        return renderAdminMessages();
      case "settings":
        return <ProfessionalSettings />;
      case "notifications":
        return <ProfessionalNotifications />;
      case "profile":
        return <ProfessionalProfileContent />;
      case "pricing-overview":
        return <ProfessionalPricingContent />;
      case "availability":
        return <ProfessionalAvailabilityContent />;
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-[#0A1A2F] mb-2">
          Welcome back, {professionalWelcomeName}
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your business today
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => {
          // Determine click handler based on card type
          const getClickHandler = () => {
            if (stat.title === "Upcoming Jobs") {
              return () => handleViewChange("bookings");
            } else if (stat.title === "Total Earnings") {
              return () => handleViewChange("payments");
            } else if (stat.title === "All Reports") {
              return onNavigateToReports;
            }
            return undefined;
          };

          return (
            <Card 
              key={index} 
              className="border-0 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98]"
              onClick={getClickHandler()}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-3xl text-[#0A1A2F] mb-1">
                      {isLoadingDashboardSummary ? "…" : stat.value}
                    </p>
                    {"change" in stat && stat.change ? (
                      <p className={`text-sm ${stat.textColor}`}>
                        {isLoadingDashboardSummary ? "…" : stat.change}
                      </p>
                    ) : null}
                  </div>
                  <div className={`w-12 h-12 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {/* Upload Report — hidden per product request
        <Button 
          onClick={onNavigateToReports}
          className="h-auto py-4 bg-red-600 hover:bg-red-700 justify-start"
        >
          <FileText className="w-5 h-5 mr-3" />
          <div className="text-left">
            <p className="font-semibold">Upload Report</p>
            <p className="text-xs opacity-90">Submit completed job reports</p>
          </div>
        </Button>
        */}
        <Button 
          variant="outline" 
          className="h-auto py-4 justify-start border-2"
          onClick={() => handleViewChange("availability")}
        >
          <Calendar className="w-5 h-5 mr-3 text-blue-600" />
          <div className="text-left">
            <p className="font-semibold text-gray-900">Manage Availability</p>
            <p className="text-xs text-gray-600">Update your schedule</p>
          </div>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 justify-start border-2"
          onClick={() => handleViewChange("payments")}
        >
          <DollarSign className="w-5 h-5 mr-3 text-green-600" />
          <div className="text-left">
            <p className="font-semibold text-gray-900">View Payments</p>
            <p className="text-xs text-gray-600">Check earnings & invoices</p>
          </div>
        </Button>
      </div>

      {/* Upcoming Jobs */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Upcoming Jobs</span>
            <Button 
              variant="ghost" 
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => handleViewChange("bookings")}
            >
              View All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingJobs ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-6 h-6 mx-auto mb-2 text-gray-300 animate-spin" />
              <p className="text-sm">Loading upcoming jobs...</p>
            </div>
          ) : upcomingJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No upcoming jobs</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:border-red-200 hover:bg-red-50/50 transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{job.service}</h4>
                      <Badge
                        className={`shrink-0 whitespace-nowrap ${getOverviewJobStatusBadgeClass(job.status)}`}
                      >
                        {getOverviewJobStatusLabel(job.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{job.client}</p>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {job.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {job.location}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingRecentPayments ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-6 h-6 mx-auto mb-2 text-gray-300 animate-spin" />
                <p className="text-sm">Loading recent payments...</p>
              </div>
            ) : recentPayments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No recent payments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{payment.client}</p>
                      <p className="text-sm text-gray-500">{payment.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{payment.amount}</p>
                      <p className="text-xs text-gray-500">{payment.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Profile Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Profile Strength</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {isLoadingProfileCompletion ? "..." : `${profileCompletionPercentage}%`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${isLoadingProfileCompletion ? 0 : profileCompletionPercentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    profileCompletionDetails?.basic_info === 20 ? "bg-green-100" : "bg-yellow-100"
                  }`}>
                    <span className={`text-xs ${
                      profileCompletionDetails?.basic_info === 20 ? "text-green-600" : "text-yellow-600"
                    }`}>
                      {profileCompletionDetails?.basic_info === 20 ? "✓" : "!"}
                    </span>
                  </div>
                  <span className="text-gray-600">Basic information completed</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    profileCompletionDetails?.certificates === 20 ? "bg-green-100" : "bg-yellow-100"
                  }`}>
                    <span className={`text-xs ${
                      profileCompletionDetails?.certificates === 20 ? "text-green-600" : "text-yellow-600"
                    }`}>
                      {profileCompletionDetails?.certificates === 20 ? "✓" : "!"}
                    </span>
                  </div>
                  <span className="text-gray-600">Certifications uploaded</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    profileCompletionDetails?.profile_image === 20 ? "bg-green-100" : "bg-yellow-100"
                  }`}>
                    <span className={`text-xs ${
                      profileCompletionDetails?.profile_image === 20 ? "text-green-600" : "text-yellow-600"
                    }`}>
                      {profileCompletionDetails?.profile_image === 20 ? "✓" : "!"}
                    </span>
                  </div>
                  <span className="text-gray-600">Add profile photo</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    profileCompletionDetails?.selected_services === 20 ? "bg-green-100" : "bg-yellow-100"
                  }`}>
                    <span className={`text-xs ${
                      profileCompletionDetails?.selected_services === 20 ? "text-green-600" : "text-yellow-600"
                    }`}>
                      {profileCompletionDetails?.selected_services === 20 ? "✓" : "!"}
                    </span>
                  </div>
                  <span className="text-gray-600">Update availability calendar</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header - MATCHES ADMIN HEADER EXACTLY */}
      <header className="fixed top-0 left-0 right-0 bg-[#1a2942] border-b border-white/10 z-50">
        <div className="flex items-center justify-between px-4 md:px-6 h-14">
          {/* Left - Hamburger + Logo */}
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-white hover:text-red-500 transition-colors p-1"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <button
              onClick={() => {
                navigate("/");
              }}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              aria-label="Go to home"
            >
              <img src={logoImage} alt="Fire Guide" className="h-10" />
            </button>
            <Badge variant="secondary" className="bg-red-600 text-white border-0 text-sm px-2 py-0.5">
              Pro
            </Badge>
          </div>
          
          {/* Right - Action Icons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative text-white hover:text-red-500 transition-colors overflow-visible p-1.5 shrink-0"
              onClick={() => {
                void refreshHeaderNotificationFeed();
                handleViewChange("notifications");
              }}
              aria-label={`Notifications${unreadProfessionalNotificationCount > 0 ? `, ${unreadProfessionalNotificationCount} unread` : ""}`}
            >
              <span className="relative inline-flex h-9 w-9 items-center justify-center">
                <Bell className="h-5 w-5" aria-hidden />
                {unreadProfessionalNotificationCount > 0 && (
                  <span
                    className="absolute -right-0.5 -top-0.5 z-10 flex h-[1.375rem] min-w-[1.375rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white shadow-sm ring-2 ring-white tabular-nums sm:h-6 sm:min-w-6 sm:text-xs"
                    aria-hidden
                  >
                    {unreadProfessionalNotificationCount > 99 ? "99+" : unreadProfessionalNotificationCount}
                  </span>
                )}
              </span>
            </button>
            <button
              className="text-white hover:text-red-500 transition-colors"
              onClick={() => handleViewChange("settings")}
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              className="text-white hover:text-red-500 transition-colors"
              onClick={onLogout}
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex pt-14 w-full min-w-0 overflow-x-hidden">
        {/* Sidebar - Fixed below header, never scrolls */}
        <aside
          className={`fixed top-[56px] left-0 h-[calc(100vh-56px)] w-64 bg-white border-r shadow-lg lg:shadow-none transition-all duration-300 ease-in-out z-40 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="p-6 h-full flex flex-col overflow-y-auto">
            {/* Close button for mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden absolute top-4 right-4"
            >
              <X className="w-5 h-5" />
            </button>

            <nav className="space-y-2 flex-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    handleViewChange(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeMenu === item.id
                      ? "bg-red-50 text-red-600 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {item.id === "notifications" && unreadProfessionalNotificationCount > 0 && (
                    <Badge className="ml-auto bg-red-600 text-white min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full text-xs tabular-nums border-0">
                      {unreadProfessionalNotificationCount > 99 ? "99+" : unreadProfessionalNotificationCount}
                    </Badge>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Spacer for fixed sidebar on large screens */}
        <div className="hidden lg:block w-64 flex-shrink-0"></div>

        {/* Main Content — full width beside sidebar */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 w-full min-w-0 overflow-x-hidden">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}