import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  CreditCard,
  Star,
  FileText,
  Settings,
  Bell,
  DollarSign,
  TrendingUp,
  Activity,
  CalendarCheck,
  UserCheck,
  AlertCircle,
  Menu,
  X,
  LogOut,
  Flame,
  MessageSquare,
  Wallet,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { getApiToken } from "../lib/auth";
import { ADMIN_NOTIFICATION_SUMMARY_UPDATED } from "../lib/adminNotificationSummaryEvents";
import {
  getAdminOverviewSummary,
  AdminOverviewSummaryData,
  getAdminRecentBookings,
  AdminRecentBookingItem,
  getAdminNotificationsSummary,
  fetchAdminNotificationsByPath,
} from "../api/adminService";
import { AdminCustomers } from "./AdminCustomers";
import { AdminProfessionals } from "./AdminProfessionals";
import { AdminBookings } from "./AdminBookings";
import { AdminPayments } from "./AdminPayments";
import { AdminReviews } from "./AdminReviews";
import { AdminServices } from "./AdminServices";
import { AdminSettings } from "./AdminSettings";
import { AdminNotifications } from "./AdminNotifications";
import { AdminPayout } from "./AdminPayout";
import { FRABasePriceContent } from "./FRABasePriceContent";
import { AdminCustomQuoteContent } from "./AdminCustomQuoteContent";
import { AdminNoticePeriod } from "./AdminNoticePeriod";
import logoImage from "figma:asset/629703c093c2f72bf409676369fecdf03c462cd2.png";

interface AdminDashboardProps {
  onLogout: () => void;
}

type AdminView = "dashboard" | "customers" | "professionals" | "bookings" | "payments" | "payout" | "reviews" | "services" | "fra-base-price" | "notice-period" | "custom-quote" | "notifications" | "settings";

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { view } = useParams<{ view?: string }>();
  const validViews: AdminView[] = ["dashboard", "customers", "professionals", "bookings", "payments", "payout", "reviews", "services", "fra-base-price", "notice-period", "custom-quote", "notifications", "settings"];
  
  // Determine current view from URL parameter or pathname, default to "dashboard"
  // Check if we're on the services/add or services/edit route
  const isServicesAddRoute = location.pathname === "/admin/dashboard/services/add";
  const isServicesEditRoute = location.pathname.startsWith("/admin/dashboard/services/edit/");
  const currentViewFromUrl: AdminView = (isServicesAddRoute || isServicesEditRoute)
    ? "services"
    : (view && validViews.includes(view as AdminView)) 
      ? (view as AdminView) 
      : "dashboard";
  
  const [currentView, setCurrentView] = useState<AdminView>(currentViewFromUrl);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [summary, setSummary] = useState<AdminOverviewSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [recentBookings, setRecentBookings] = useState<AdminRecentBookingItem[]>([]);
  const [recentBookingsLoading, setRecentBookingsLoading] = useState(false);
  const [adminUnreadNotificationCount, setAdminUnreadNotificationCount] = useState(0);

  const refreshAdminHeaderUnread = useCallback(async () => {
    const token = getApiToken();
    if (!token) {
      setAdminUnreadNotificationCount(0);
      return;
    }
    try {
      // Summary `unread` is sometimes missing/0 while `/admin/notifications/unread` still returns rows
      // (same fallback as AdminNotifications `unreadTabCount` vs list filter).
      const [cards, unreadRows] = await Promise.all([
        getAdminNotificationsSummary({ api_token: token }),
        fetchAdminNotificationsByPath(token, "/admin/notifications/unread").catch(() => []),
      ]);
      const fromSummary = cards?.unread ?? 0;
      const fromList = Array.isArray(unreadRows)
        ? unreadRows.filter((n) => n.is_read === 0).length
        : 0;
      setAdminUnreadNotificationCount(Math.max(fromSummary, fromList));
    } catch {
      setAdminUnreadNotificationCount(0);
    }
  }, []);

  useEffect(() => {
    void refreshAdminHeaderUnread();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshAdminHeaderUnread();
    }, 90_000);
    const onFocus = () => void refreshAdminHeaderUnread();
    window.addEventListener("focus", onFocus);
    const onSummaryEvent = () => void refreshAdminHeaderUnread();
    window.addEventListener(ADMIN_NOTIFICATION_SUMMARY_UPDATED, onSummaryEvent);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(ADMIN_NOTIFICATION_SUMMARY_UPDATED, onSummaryEvent);
    };
  }, [refreshAdminHeaderUnread]);

  useEffect(() => {
    if (currentView === "notifications") void refreshAdminHeaderUnread();
  }, [currentView, refreshAdminHeaderUnread]);

  // Fetch admin overview summary when dashboard view is shown
  useEffect(() => {
    if (currentView !== "dashboard") return;
    const token = getApiToken();
    if (!token) return;
    let cancelled = false;
    setSummaryLoading(true);
    getAdminOverviewSummary({ api_token: token })
      .then((res) => {
        const ok = res && (res.success === true || res.status === true) && res.data;
        if (!cancelled && ok) setSummary(res.data);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });
    return () => { cancelled = true; };
  }, [currentView]);

  // Fetch recent bookings when dashboard view is shown
  useEffect(() => {
    if (currentView !== "dashboard") return;
    const token = getApiToken();
    if (!token) return;
    let cancelled = false;
    setRecentBookingsLoading(true);
    getAdminRecentBookings({ api_token: token })
      .then((res) => {
        if (!cancelled && res.success && Array.isArray(res.data)) setRecentBookings(res.data);
        else if (!cancelled) setRecentBookings([]);
      })
      .catch(() => {
        if (!cancelled) setRecentBookings([]);
      })
      .finally(() => {
        if (!cancelled) setRecentBookingsLoading(false);
      });
    return () => { cancelled = true; };
  }, [currentView]);

  // Sync state with URL parameter when it changes (including on mount and URL changes)
  useEffect(() => {
    setCurrentView(currentViewFromUrl);
  }, [currentViewFromUrl, location.pathname]);
  
  // Handler to update both state and URL
  const handleViewChange = (view: AdminView) => {
    setCurrentView(view);
    if (view === "dashboard") {
      navigate("/admin/dashboard", { replace: true });
    } else {
      navigate(`/admin/dashboard/${view}`, { replace: true });
    }
  };

  const menuItems = [
    { id: "dashboard" as AdminView, label: "Dashboard", icon: LayoutDashboard },
    { id: "customers" as AdminView, label: "Customers", icon: Users },
    { id: "professionals" as AdminView, label: "Professionals", icon: Briefcase },
    { id: "bookings" as AdminView, label: "Bookings", icon: Calendar },
    { id: "payments" as AdminView, label: "Payments", icon: CreditCard },
    { id: "payout" as AdminView, label: "Payout", icon: Wallet },
    { id: "reviews" as AdminView, label: "Reviews", icon: Star },
    { id: "services" as AdminView, label: "Services", icon: FileText },
    { id: "fra-base-price" as AdminView, label: "Pricing", icon: DollarSign },
    { id: "notice-period" as AdminView, label: "Notice Period", icon: Calendar },
    { id: "custom-quote" as AdminView, label: "Custom Quote", icon: MessageSquare },
    { id: "notifications" as AdminView, label: "Notifications", icon: Bell },
    { id: "settings" as AdminView, label: "Settings", icon: Settings },
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-800 mb-1">Dashboard Overview</h1>
        <p className="text-sm text-gray-500">Welcome back! Here&apos;s what&apos;s happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
              <p className="text-gray-900">
                {summaryLoading ? "—" : summary != null ? `£${Number(summary.total_revenue).toLocaleString()}` : "—"}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-green-600 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +12.5% from last month
              </p>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Active Bookings</p>
              <p className="text-gray-900">
                {summaryLoading ? "—" : summary != null ? String(summary.active_bookings) : "—"}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-blue-600 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                18 scheduled today
              </p>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CalendarCheck className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Total Customers</p>
              <p className="text-gray-900">
                {summaryLoading ? "—" : summary != null ? (summary.total_customer ?? summary.total_customers ?? 0).toLocaleString() : "—"}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-purple-600 flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                +89 this month
              </p>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Active Professionals</p>
              <p className="text-gray-900">
                {summaryLoading ? "—" : summary != null ? String(summary.active_professionals) : "—"}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-orange-600 flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                5 pending approval
              </p>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Alerts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-800">Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {recentBookingsLoading ? (
                <p className="text-sm text-gray-500 py-4">Loading...</p>
              ) : recentBookings.length > 0 ? (
                recentBookings.map((booking) => {
                  const amount = booking.price != null && booking.price !== "" ? `£${Number(booking.price).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : "—";
                  const serviceLabel = booking.selected_service_id != null ? `Service #${booking.selected_service_id}` : "Booking";
                  return (
                    <div key={booking.id} className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{booking.user?.full_name ?? "—"}</p>
                        <p className="text-xs text-gray-600">{serviceLabel}</p>
                        <p className="text-xs text-gray-400">with {booking.professional?.name ?? "—"}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm text-gray-900">{amount}</p>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                            booking.status === "confirmed" ? "bg-green-100 text-green-700" :
                            booking.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                            booking.status === "completed" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 py-4">No recent bookings</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-800">System Alerts</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex gap-3 p-3 bg-yellow-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-900">5 Professionals Pending Approval</p>
                  <p className="text-xs text-yellow-700 mt-0.5">Review and approve new professional applications</p>
                  <button 
                    className="text-xs text-yellow-800 mt-1 hover:underline"
                    onClick={() => handleViewChange("professionals")}
                  >
                    Review Now →
                  </button>
                </div>
              </div>

              <div className="flex gap-3 p-3 bg-blue-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-900">3 Reviews Pending Moderation</p>
                  <p className="text-xs text-blue-700 mt-0.5">Check and moderate customer reviews</p>
                  <button 
                    className="text-xs text-blue-800 mt-1 hover:underline"
                    onClick={() => handleViewChange("reviews")}
                  >
                    View Reviews →
                  </button>
                </div>
              </div>

              <div className="flex gap-3 p-3 bg-green-50 rounded-lg">
                <Activity className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-green-900">Platform Running Smoothly</p>
                  <p className="text-xs text-green-700 mt-0.5">All systems operational • Last checked 2 mins ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (currentView) {
      case "dashboard":
        return renderDashboard();
      case "customers":
        return <AdminCustomers />;
      case "professionals":
        return <AdminProfessionals />;
      case "bookings":
        return <AdminBookings />;
      case "payments":
        return <AdminPayments />;
      case "payout":
        return <AdminPayout />;
      case "reviews":
        return <AdminReviews />;
      case "services":
        return <AdminServices />;
      case "fra-base-price":
        return <FRABasePriceContent isAdmin />;
      case "notice-period":
        return <AdminNoticePeriod />;
      case "custom-quote":
        return <AdminCustomQuoteContent />;
      case "notifications":
        return <AdminNotifications />;
      case "settings":
        return <AdminSettings />;
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen ">
      {/* Top Header - FIXED AND STICKY */}
      <header className="fixed top-0 left-0 right-0 bg-[#1a2942] border-b border-white/10 z-50">
        <div className="flex items-center justify-between px-4 md:px-6 h-14">
          {/* Logo - Left */}
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
              <img src={logoImage} alt="Fire Guide Admin" className="h-10" />
            </button>
            <Badge variant="secondary" className="bg-red-600 text-white border-0 text-sm px-2 py-0.5 hidden md:inline-flex">
              Admin
            </Badge>
          </div>
          
          {/* Admin Actions - Right */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative text-white hover:text-red-500 transition-colors overflow-visible p-1.5 shrink-0"
              onClick={() => {
                void refreshAdminHeaderUnread();
                handleViewChange("notifications");
              }}
              aria-label={`Notifications${adminUnreadNotificationCount > 0 ? `, ${adminUnreadNotificationCount} unread` : ""}`}
            >
              <span className="relative inline-flex h-9 w-9 items-center justify-center">
                <Bell className="h-5 w-5" aria-hidden />
                {adminUnreadNotificationCount > 0 && (
                  <span
                    className="absolute -right-0.5 -top-0.5 z-10 flex h-[1.375rem] min-w-[1.375rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white shadow-sm ring-2 ring-[#1a2942] tabular-nums sm:h-6 sm:min-w-6 sm:text-xs"
                    aria-hidden
                  >
                    {adminUnreadNotificationCount > 99 ? "99+" : adminUnreadNotificationCount}
                  </span>
                )}
              </span>
            </button>
            <button
              className="text-white hover:text-red-500 transition-colors"
              onClick={() => handleViewChange("settings")}
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              className="text-white hover:text-red-500 transition-colors"
              onClick={onLogout}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex pt-14">
        {/* Sidebar - Fixed below header, never scrolls */}
        <aside
          className={`fixed top-[56px] left-0 h-[calc(100vh-56px)] w-56 bg-white border-r border-gray-200 shadow-lg lg:shadow-none transition-all duration-300 ease-in-out z-40 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {/* Close button for mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute top-4 right-4 text-gray-600 hover:text-red-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="h-full overflow-y-auto">
            <nav className="p-4 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleViewChange(item.id);
                      if (window.innerWidth < 1024) {
                        setSidebarOpen(false);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? "bg-red-50 text-red-600"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.id === "notifications" && adminUnreadNotificationCount > 0 && (
                      <Badge className="ml-auto shrink-0 bg-red-600 text-white min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full text-xs tabular-nums border-0">
                        {adminUnreadNotificationCount > 99 ? "99+" : adminUnreadNotificationCount}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Spacer for fixed sidebar on large screens */}
        <div className="hidden lg:block w-56 flex-shrink-0"></div>

        {/* Main Content - Original layout, centered */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-white w-full min-w-0">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}