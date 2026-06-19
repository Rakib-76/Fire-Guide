import React, { useState, useEffect, useCallback, useRef } from "react";
import { Bell, User, Briefcase, Calendar, CalendarClock, CreditCard, Star, Settings, AlertCircle, CheckCircle, Info, Trash2, Send, Loader2 } from "lucide-react";
import { useAdminNotificationNavigation } from "../hooks/useAdminNotificationNavigation";
import { getApiToken } from "../lib/auth";
import {
  getAdminNotificationsSummary,
  fetchAdminNotificationsByPath,
  adminMarkAllNotificationsAsRead,
  // adminClearAllNotifications,
  adminMarkNotificationAsRead,
  adminDeleteSingleNotification,
  AdminNotificationItem,
  type AdminNotificationCards,
} from "../api/adminService";
import {
  isApprovalNotification,
  isNegativeNotification,
  isBookingRescheduleNotification,
  isBookingCancellationNotification,
} from "../api/notificationsService";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { toast } from "sonner";
import axios from "axios";
import { emitAdminNotificationSummaryUpdated } from "../lib/adminNotificationSummaryEvents";

function toastMutationError(e: unknown, fallback: string) {
  if (axios.isAxiosError(e)) {
    const m = (e.response?.data as { message?: string } | undefined)?.message;
    toast.error(m && m.trim() ? m : e.message || fallback);
  } else {
    toast.error(e instanceof Error ? e.message : fallback);
  }
}

/** Admin "All" list: `/admin/notifications/all`. */
const ADMIN_NOTIFICATIONS_ALL_PATH = "/admin/notifications/all";

const ADMIN_NOTIFICATION_TAB_PATH: Record<string, string> = {
  all: ADMIN_NOTIFICATIONS_ALL_PATH,
  unread: "/admin/notifications/unread",
  user: "/admin/notifications/users",
  professional: "/admin/notifications/professionals",
  payment: "/admin/notifications/payments",
  // system: "/admin/notifications/system",
};

const NOTIFICATION_FILTER_TABS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "user", label: "Users" },
  { value: "professional", label: "Professionals" },
  { value: "payment", label: "Payments" },
  // { value: "system", label: "System" },
] as const;

const notificationTabTriggerClass =
  "flex shrink-0 items-center justify-center gap-1.5 min-w-[72px] whitespace-nowrap rounded-md px-3 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm";

type AdminNotificationKind =
  | "approval"
  | "alert"
  | "booking"
  | "payment"
  | "review"
  | "user"
  | "professional"
  | "system"
  | "general";

function resolveAdminNotificationKind(
  category: string,
  title: string,
  message: string
): AdminNotificationKind {
  const cat = (category || "").toLowerCase().trim();
  const combined = `${title} ${message} ${category}`.toLowerCase();

  if (isApprovalNotification(title, message)) return "approval";
  if (isNegativeNotification(title, message) || isBookingCancellationNotification(title, message)) {
    return "alert";
  }
  if (
    cat.includes("booking") ||
    /\bbook(ing)?\b/.test(combined) ||
    isBookingRescheduleNotification(title, message)
  ) {
    return "booking";
  }
  if (
    cat.includes("payment") ||
    cat.includes("payout") ||
    cat.includes("refund") ||
    /\bpayment\b/.test(combined) ||
    /\bpayout\b/.test(combined) ||
    /\brefund\b/.test(combined)
  ) {
    return "payment";
  }
  if (cat.includes("review") || /\breview\b/.test(combined) || /\brating\b/.test(combined)) {
    return "review";
  }
  if (
    cat.includes("professional") ||
    /\bprofessional\b/.test(combined) ||
    /\bverif(y|ication)\b/.test(combined) ||
    /\bcertif/.test(combined)
  ) {
    return "professional";
  }
  if (
    cat.includes("user") ||
    cat.includes("customer") ||
    cat.includes("client") ||
    /\bcustomer\b/.test(combined) ||
    /\buser\b/.test(combined)
  ) {
    return "user";
  }
  if (
    cat.includes("system") ||
    /\bsystem\b/.test(combined) ||
    /\bmaintenance\b/.test(combined) ||
    /\bplatform\b/.test(combined)
  ) {
    return "system";
  }
  if (cat.includes("alert") || /\burgent\b/.test(combined) || /\bcritical\b/.test(combined)) {
    return "alert";
  }
  return "general";
}

function getAdminNotificationIcon(
  category: string,
  title: string,
  message: string
): React.ReactNode {
  const kind = resolveAdminNotificationKind(category, title, message);

  if (kind === "approval") {
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  }
  if (kind === "alert") {
    return <AlertCircle className="h-5 w-5 text-orange-600" />;
  }
  if (kind === "booking") {
    if (isBookingRescheduleNotification(title, message)) {
      return <CalendarClock className="h-5 w-5 text-amber-600" />;
    }
    return <Calendar className="h-5 w-5 text-blue-600" />;
  }
  if (kind === "payment") {
    return <CreditCard className="h-5 w-5 text-green-600" />;
  }
  if (kind === "review") {
    return <Star className="h-5 w-5 text-purple-600" />;
  }
  if (kind === "user") {
    return <User className="h-5 w-5 text-blue-600" />;
  }
  if (kind === "professional") {
    return <Briefcase className="h-5 w-5 text-indigo-600" />;
  }
  if (kind === "system") {
    return <Settings className="h-5 w-5 text-gray-600" />;
  }
  return <Bell className="h-5 w-5 text-gray-500" />;
}

export function AdminNotifications() {
  const { navigateFromNotification } = useAdminNotificationNavigation();
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [notificationCards, setNotificationCards] = useState<AdminNotificationCards | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [pendingBulk, setPendingBulk] = useState<null | "mark_all" | "clear_all">(null);
  const [pendingRow, setPendingRow] = useState<null | { id: number; action: "read" | "delete" }>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const notificationTabsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 768px)").matches) return;
    const container = notificationTabsScrollRef.current;
    if (!container) return;
    const activeEl = container.querySelector<HTMLElement>('[data-state="active"]');
    activeEl?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeTab]);

  /** Summary stat cards (separate from per-tab list APIs). */
  useEffect(() => {
    const token = getApiToken();
    if (!token) return;
    let cancelled = false;
    setDetailsLoading(true);
    getAdminNotificationsSummary({ api_token: token })
      .then((cards) => {
        if (!cancelled && cards) {
          setNotificationCards(cards);
          emitAdminNotificationSummaryUpdated();
        }
      })
      .catch(() => {
        if (!cancelled) setNotificationCards(null);
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshSummaryQuiet = useCallback(async () => {
    const token = getApiToken();
    if (!token) return;
    try {
      const cards = await getAdminNotificationsSummary({ api_token: token });
      if (cards) {
        setNotificationCards(cards);
        emitAdminNotificationSummaryUpdated();
      }
    } catch {
      /* keep existing summary on transient errors */
    }
  }, []);

  const loadNotificationsForTab = useCallback(async (tab: string) => {
    const token = getApiToken();
    if (!token) {
      setNotifications([]);
      return;
    }
    const path = ADMIN_NOTIFICATION_TAB_PATH[tab];
    setListLoading(true);
    try {
      if (path) {
        const rows = await fetchAdminNotificationsByPath(token, path);
        setNotifications(rows);
      } else {
        setNotifications([]);
      }
    } catch (e: unknown) {
      console.error("Admin notifications list:", e);
      toast.error(e instanceof Error ? e.message : "Failed to load notifications");
      setNotifications([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotificationsForTab(activeTab);
  }, [activeTab, loadNotificationsForTab]);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [recipientType, setRecipientType] = useState("all_users");
  const [notificationPriority, setNotificationPriority] = useState("medium");

  const getNotificationIcon = (notification: AdminNotificationItem) =>
    getAdminNotificationIcon(notification.category, notification.title, notification.message);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const markAsRead = async (id: number, options?: { silent?: boolean }) => {
    const token = getApiToken();
    if (!token) {
      if (!options?.silent) toast.error("Not signed in");
      return;
    }
    setPendingRow({ id, action: "read" });
    try {
      await adminMarkNotificationAsRead({ api_token: token, notification_id: id });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setPendingRow(null);
      if (!options?.silent) toast.success("Marked as read");
      await refreshSummaryQuiet();
      if (!options?.silent) await loadNotificationsForTab(activeTab);
    } catch (e: unknown) {
      if (!options?.silent) toastMutationError(e, "Failed to mark as read");
    } finally {
      setPendingRow(null);
    }
  };

  const onNotificationCardClick = (notification: AdminNotificationItem) => {
    if (notification.is_read === 0) {
      void markAsRead(notification.id, { silent: true });
    }
    navigateFromNotification({
      id: notification.id,
      category: notification.category,
      source_category: notification.source_category ?? notification.category,
      title: notification.title,
      message: notification.message,
      content: notification.message,
    });
  };

  const markAllAsRead = async () => {
    const token = getApiToken();
    if (!token) {
      toast.error("Not signed in");
      return;
    }
    setPendingBulk("mark_all");
    try {
      await adminMarkAllNotificationsAsRead({ api_token: token });
      toast.success("All notifications marked as read");
      await refreshSummaryQuiet();
      await loadNotificationsForTab(activeTab);
    } catch (e: unknown) {
      toastMutationError(e, "Failed to mark all as read");
    } finally {
      setPendingBulk(null);
    }
  };

  const deleteNotification = async (id: number) => {
    const token = getApiToken();
    if (!token) {
      toast.error("Not signed in");
      return;
    }
    setPendingRow({ id, action: "delete" });
    try {
      await adminDeleteSingleNotification({ api_token: token, notification_id: id });
      toast.success("Notification deleted");
      await refreshSummaryQuiet();
      await loadNotificationsForTab(activeTab);
    } catch (e: unknown) {
      toastMutationError(e, "Failed to delete notification");
    } finally {
      setPendingRow(null);
    }
  };

  /* Admin "Clear All" hidden — restore with the button block below.
  const clearAll = async () => {
    const token = getApiToken();
    if (!token) {
      toast.error("Not signed in");
      return;
    }
    setPendingBulk("clear_all");
    try {
      await adminClearAllNotifications({ api_token: token });
      toast.success("All notifications cleared");
      await refreshSummaryQuiet();
      await loadNotificationsForTab(activeTab);
    } catch (e: unknown) {
      toastMutationError(e, "Failed to clear notifications");
    } finally {
      setPendingBulk(null);
    }
  };
  */

  const sendNotification = () => {
    if (!notificationTitle || !notificationMessage) {
      toast.error("Please fill in all required fields");
      return;
    }

    toast.success(`Notification sent to ${recipientType.replace('_', ' ')}`);
    setIsComposeOpen(false);
    setNotificationTitle("");
    setNotificationMessage("");
    setRecipientType("all_users");
    setNotificationPriority("medium");
  };

  const unreadCount = notifications.filter((n) => n.is_read === 0).length;
  const unreadTabCount =
    notificationCards?.unread != null ? notificationCards.unread : unreadCount;
  const displayUnreadCount = unreadTabCount;

  const stats = {
    total:
      detailsLoading
        ? "—"
        : notificationCards?.total_notifications ??
          (activeTab === "all" ? notifications.length : 0),
    unread: detailsLoading ? "—" : unreadTabCount,
    payments:
      detailsLoading
        ? "—"
        : notificationCards?.payments ??
          notificationCards?.critical ??
          notifications.filter((n) => (n.category || "").toLowerCase().includes("payment")).length,
    systemAlerts:
      detailsLoading ? "—" : (notificationCards?.system_alerts ?? notifications.filter((n) => (n.category || "").toLowerCase().includes("system")).length),
  };

  return (
    <div className="space-y-6 min-w-0">
      <div className="w-full max-w-[375px] mx-auto px-4 pt-4 pb-6 md:max-w-none md:px-0 md:pt-0">
        
        {/* VERTICAL AUTO LAYOUT - 14px spacing between major sections */}
        <div className="flex flex-col gap-3.5">
          
          {/* 1. HEADER TEXT */}
          <div>
            <h1 className="text-2xl font-semibold text-[#0A1A2F]">Notifications</h1>
            <p className="text-sm text-gray-500 mt-2">
              {displayUnreadCount > 0 ? `${displayUnreadCount} unread notification${displayUnreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>

          {/* 2. BUTTON GROUP - Vertical stack with 10px spacing */}
          <div className="flex flex-col gap-2.5 md:flex-row md:gap-2">
            <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
              <DialogTrigger asChild>
                <Button className="w-full h-12 bg-red-600 hover:bg-red-700 text-white text-sm font-medium justify-center rounded-lg md:w-auto md:h-10">
                  <Send className="w-4 h-4 mr-2" />
                  Send Notification
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[92%] max-w-[360px] mx-auto p-4 pb-5 max-h-[85vh] overflow-y-auto md:max-w-2xl md:p-6">
                <DialogHeader className="text-center mb-3 md:text-left">
                  <DialogTitle className="text-lg leading-tight pr-6">Send Platform Notification</DialogTitle>
                  <DialogDescription className="text-sm mt-1.5">
                    Send a notification to users or professionals on the platform
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3">
                  <div>
                    <Label htmlFor="recipient" className="text-sm font-medium text-gray-700 mb-1.5 block">Recipient Type</Label>
                    <Select value={recipientType} onValueChange={setRecipientType}>
                      <SelectTrigger id="recipient" className="w-full h-11 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_users">All Users (Customers & Professionals)</SelectItem>
                        <SelectItem value="customers">All Customers</SelectItem>
                        <SelectItem value="professionals">All Professionals</SelectItem>
                        <SelectItem value="active_professionals">Active Professionals Only</SelectItem>
                        <SelectItem value="new_users">New Users (Last 7 days)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority" className="text-sm font-medium text-gray-700 mb-1.5 block">Priority Level</Label>
                    <Select value={notificationPriority} onValueChange={setNotificationPriority}>
                      <SelectTrigger id="priority" className="w-full h-11 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - Informational</SelectItem>
                        <SelectItem value="medium">Medium - Standard</SelectItem>
                        <SelectItem value="high">High - Important</SelectItem>
                        <SelectItem value="critical">Critical - Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="title" className="text-sm font-medium text-gray-700 mb-1.5 block">Notification Title</Label>
                    <Input
                      id="title"
                      value={notificationTitle}
                      onChange={(e) => setNotificationTitle(e.target.value)}
                      className="w-full h-11 text-sm"
                      placeholder="Enter notification title"
                    />
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-sm font-medium text-gray-700 mb-1.5 block">Message</Label>
                    <Textarea
                      id="message"
                      value={notificationMessage}
                      onChange={(e) => setNotificationMessage(e.target.value)}
                      className="w-full min-h-[96px] text-sm resize-none"
                      rows={4}
                      placeholder="Enter notification message"
                    />
                  </div>

                  <div className="flex flex-row gap-2 justify-end pt-2 md:gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsComposeOpen(false)}
                      className="w-[48%] h-11 text-sm md:w-auto md:h-10"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={sendNotification} 
                      className="w-[48%] h-11 bg-red-600 hover:bg-red-700 text-sm md:w-auto md:h-10"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Send
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {displayUnreadCount > 0 && (
              <Button 
                variant="outline" 
                onClick={() => void markAllAsRead()} 
                disabled={pendingBulk !== null || pendingRow !== null || listLoading}
                className="w-full h-11 text-sm font-medium justify-center rounded-lg border-gray-300 md:w-auto md:h-10"
              >
                {pendingBulk === "mark_all" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Mark All as Read
              </Button>
            )}

            {/* {notifications.length > 0 && (
              <Button
                variant="outline"
                onClick={() => void clearAll()}
                disabled={pendingBulk !== null || pendingRow !== null || listLoading}
                className="w-full h-11 text-sm font-medium justify-center rounded-lg border-gray-300 md:w-auto md:h-10"
              >
                {pendingBulk === "clear_all" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Clear All
              </Button>
            )} */}
          </div>

          {/* 3. STATS CARDS - contextual icons per notification type */}
          <div className="flex flex-col gap-3 md:grid md:grid-cols-3 md:gap-4">
            <Card className="w-full border-gray-200 shadow-sm rounded-lg">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                    <Bell className="h-4 w-4 text-slate-600" />
                  </div>
                  <p className="text-xs text-gray-500">Total Notifications</p>
                </div>
                <p className="text-3xl font-semibold text-[#0A1A2F]">{stats.total}</p>
              </CardContent>
            </Card>

            <Card className="w-full border-gray-200 shadow-sm rounded-lg">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
                    <Bell className="h-4 w-4 text-red-600" />
                  </div>
                  <p className="text-xs text-gray-500">Unread</p>
                </div>
                <p className="text-3xl font-semibold text-[#0A1A2F]">{stats.unread}</p>
              </CardContent>
            </Card>

            <Card className="w-full border-gray-200 shadow-sm rounded-lg">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
                    <CreditCard className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-xs text-gray-500">Payments</p>
                </div>
                <p className="text-3xl font-semibold text-[#0A1A2F]">{stats.payments}</p>
              </CardContent>
            </Card>

            {/* System summary card — hidden
            <Card className="w-full border-gray-200 shadow-sm rounded-lg">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                    <Settings className="h-4 w-4 text-gray-600" />
                  </div>
                  <p className="text-xs text-gray-500">System</p>
                </div>
                <p className="text-3xl font-semibold text-[#0A1A2F]">{stats.systemAlerts}</p>
              </CardContent>
            </Card>
            */}
          </div>

          {/* 4. TABS — slider on mobile only; md+ full row (single TabsList) */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0">
            <div className="relative -mx-4 mb-3 min-w-0 px-4 md:mx-0 md:px-0">
              <div
                ref={notificationTabsScrollRef}
                className="overflow-x-auto md:overflow-visible"
                style={{ WebkitOverflowScrolling: "touch" }}
                aria-label="Notification filters"
              >
                <TabsList className="inline-flex h-11 w-max min-w-0 flex-nowrap gap-1 rounded-lg bg-gray-100 p-1 md:grid md:h-11 md:w-full md:grid-cols-5">
                  {NOTIFICATION_FILTER_TABS.map(({ value, label }) => (
                    <TabsTrigger key={value} value={value} className={notificationTabTriggerClass}>
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <div
                className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-10 md:hidden"
                style={{ background: "linear-gradient(to right, #fff 20%, transparent)" }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-10 md:hidden"
                style={{ background: "linear-gradient(to left, #fff 20%, transparent)" }}
                aria-hidden
              />
            </div>

            {/* 5. NOTIFICATION ALERT CARDS - Vertical layout, 16px padding */}
            <TabsContent value={activeTab} className="mt-3.5">
              {listLoading ? (
                <Card className="w-full border-gray-200 shadow-sm rounded-lg">
                  <CardContent className="p-12 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-10 h-10 text-gray-400 animate-spin" aria-hidden />
                    <p className="text-sm text-gray-600">Loading notifications…</p>
                  </CardContent>
                </Card>
              ) : notifications.length === 0 ? (
                <Card className="w-full border-gray-200 shadow-sm rounded-lg">
                  <CardContent className="p-12 text-center">
                    <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4">
                      <Bell className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-base font-medium text-gray-900 mb-2">No notifications</h3>
                    <p className="text-sm text-gray-500">
                      {activeTab === "unread" 
                        ? "You're all caught up! No unread notifications."
                        : "You don't have any notifications in this category."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {notifications.map((notification) => {
                    const rowLocked =
                      pendingBulk !== null ||
                      (pendingRow !== null && pendingRow.id === notification.id);
                    return (
                    <Card 
                      key={notification.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onNotificationCardClick(notification)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onNotificationCardClick(notification);
                        }
                      }}
                      className={`w-full shadow-sm rounded-lg transition-shadow hover:shadow-md cursor-pointer ${
                        notification.is_read === 0 
                          ? 'border-l-[3px] border-l-red-600 bg-red-50/50 border-y border-r border-gray-200' 
                          : 'border border-gray-200'
                      } ${
                        notification.priority === 'critical' 
                          ? 'ring-2 ring-red-400 ring-offset-1' 
                          : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        {/* Vertical Layout - Icon → Title → Description → Timestamp */}
                        <div className="flex flex-col">
                          {/* Icon + Title Row */}
                          <div className="flex items-start gap-2 mb-2">
                            <div className="flex-shrink-0 mt-0.5">
                              {getNotificationIcon(notification)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className={`text-sm ${notification.is_read === 0 ? 'font-semibold' : 'font-medium'} text-gray-900 break-words flex-1 leading-tight`}>
                                  {notification.title}
                                </h3>
                                {notification.is_read === 0 && (
                                  <div className="w-2 h-2 bg-red-600 rounded-full flex-shrink-0 mt-1"></div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Priority Badge */}
                          <div className="mb-1.5 ml-7">
                            <Badge 
                              className={`${getPriorityColor(notification.priority)} text-[11px] px-2 py-0.5 font-medium`} 
                              variant="outline"
                            >
                              {notification.priority}
                            </Badge>
                          </div>

                          {/* Description */}
                          <p className="text-sm text-gray-600 leading-relaxed break-words ml-7 mb-2">
                            {notification.message}
                          </p>

                          {/* Category Badge */}
                          {notification.category && (
                            <div className="ml-7 mb-2">
                              <Badge variant="outline" className="text-[11px] px-2 py-0.5 bg-gray-50 border-gray-300">
                                {notification.category}
                              </Badge>
                            </div>
                          )}

                          {/* Timestamp + Actions */}
                          <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-400 ml-7">{notification.date}</p>
                            
                            <div className="flex flex-col gap-2 ml-7">
                              {notification.actions?.can_mark_read && notification.is_read === 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void markAsRead(notification.id);
                                  }}
                                  disabled={rowLocked}
                                  className="w-full h-9 justify-start text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                                >
                                  {pendingRow?.id === notification.id && pendingRow.action === "read" ? (
                                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin shrink-0" aria-hidden />
                                  ) : (
                                    <CheckCircle className="w-3.5 h-3.5 mr-2 shrink-0" />
                                  )}
                                  Mark as read
                                </Button>
                              )}
                              {notification.actions?.can_delete !== false && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void deleteNotification(notification.id);
                                  }}
                                  disabled={rowLocked}
                                  className="w-full h-9 justify-start text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                                >
                                  {pendingRow?.id === notification.id && pendingRow.action === "delete" ? (
                                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin shrink-0" aria-hidden />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5 mr-2 shrink-0" />
                                  )}
                                  Delete
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}