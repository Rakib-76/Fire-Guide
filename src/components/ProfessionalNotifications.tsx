import React, { useState, useEffect } from "react";
import { Bell, Calendar, DollarSign, AlertCircle, CheckCircle, Info, Trash2, Filter, X } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import {
  fetchNotifications,
  fetchUnreadNotifications,
  fetchBookingsNotifications,
  fetchPaymentsNotifications,
  // fetchReviewsNotifications,
  // fetchSystemNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  // deleteAllNotifications,
  deleteNotification as deleteNotificationAPI,
  getProfessionalNotificationDedupeKey,
} from "../api/notificationsService";
import { getApiToken } from "../lib/auth";
import { mergeProfessionalNotificationSeenKeys, emitProfessionalNotificationsMutated } from "../lib/professionalNotificationSeen";

interface Notification {
  id: number;
  type: "booking" | "payment" | "system" | "review";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: "low" | "medium" | "high";
}

export function ProfessionalNotifications() {
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]); // Store all notifications from all categories
  const [notifications, setNotifications] = useState<Notification[]>([]); // Current tab's notifications
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);

  // Format timestamp from ISO date string to relative time
  const formatTimestamp = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) {
        return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
      } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
      } else {
        // Format as date if older than a week
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    } catch (error) {
      return dateString;
    }
  };

  // Map API category to component type
  const mapCategoryToType = (category: string): "booking" | "payment" | "system" | "review" => {
    switch (category) {
      case "bookings":
        return "booking";
      case "payments":
        return "payment";
      case "reviews":
        return "review";
      case "system":
        return "system";
      default:
        return "system";
    }
  };

  // Function to load notifications from API
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const apiToken = getApiToken();
      
      if (!apiToken) {
        toast.error("Authentication token not found. Please log in again.");
        setLoading(false);
        return;
      }

      let response;
      
      // Call specific API based on active tab
      if (activeTab === "booking") {
        console.log("Fetching bookings notifications...");
        response = await fetchBookingsNotifications({ api_token: apiToken });
      } else if (activeTab === "payment") {
        console.log("Fetching payments notifications...");
        response = await fetchPaymentsNotifications({ api_token: apiToken });
      // Reviews tab hidden — restore when re-enabling the Reviews tab trigger below.
      // } else if (activeTab === "review") {
      //   console.log("Fetching reviews notifications...");
      //   response = await fetchReviewsNotifications({ api_token: apiToken });
      // } else if (activeTab === "system") {
      //   console.log("Fetching system notifications...");
      //   response = await fetchSystemNotifications({ api_token: apiToken });
      } else if (activeTab === "unread") {
        console.log("Fetching unread notifications...");
        response = await fetchUnreadNotifications({ api_token: apiToken });
      } else if (activeTab === "all") {
        // Single feed: POST /notifications { api_token }
        response = await fetchNotifications({ api_token: apiToken });
      } else {
        response = await fetchNotifications({ api_token: apiToken });
      }

      const dataArray = response?.data && Array.isArray(response.data) ? response.data : [];

      if (response && (response.status === true || response.status === "success" || response.status === "true")) {
        if (dataArray.length > 0) {
            const mappedNotifications: Notification[] = dataArray.map((item) => {
              return {
                id: item.id,
                type: mapCategoryToType(item.category),
                title: item.title,
                message: item.content,
                timestamp: formatTimestamp(item.created_at),
                read: Boolean(item.is_read),
                priority: item.priority,
              };
            });
            
            if (activeTab === "all") {
              // For "all" tab, update both allNotifications and notifications
              setAllNotifications(mappedNotifications);
              setNotifications(mappedNotifications);
              mergeProfessionalNotificationSeenKeys(dataArray.map((item) => getProfessionalNotificationDedupeKey(item)));
              emitProfessionalNotificationsMutated();
            } else {
              // For other tabs, update the specific category in allNotifications
              // and set notifications to the current tab's data
              setNotifications(mappedNotifications);
              
              // Update allNotifications by replacing notifications of the current category
              setAllNotifications(prevAll => {
                const categoryType = mapCategoryToType(
                  activeTab === "booking" ? "bookings" :
                  activeTab === "payment" ? "payments" :
                  activeTab === "review" ? "reviews" :
                  activeTab === "system" ? "system" : "system"
                );
                
                // Remove old notifications of this category and add new ones
                const filtered = prevAll.filter(n => n.type !== categoryType);
                return [...filtered, ...mappedNotifications];
              });
            }
        } else {
            setNotifications([]);
            if (activeTab === "all") {
              setAllNotifications([]);
            }
        }
      } else {
        toast.error(response?.message || "Failed to load notifications");
        setNotifications([]);
        if (activeTab === "all") {
          setAllNotifications([]);
        }
      }
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      toast.error(error.message || "Failed to load notifications");
      setNotifications([]);
      if (activeTab === "all") {
        setAllNotifications([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications from API on component mount and when tab changes
  useEffect(() => {
    loadNotifications();
  }, [activeTab]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "booking":
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case "payment":
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case "review":
        return <CheckCircle className="w-5 h-5 text-purple-600" />;
      case "system":
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const markAsRead = async (id: number) => {
    try {
      const apiToken = getApiToken();
      
      if (!apiToken) {
        toast.error("Authentication token not found. Please log in again.");
        return;
      }

      console.log("Marking notification as read - ID:", id);
      const response = await markNotificationAsRead({ 
        api_token: apiToken,
        notification_id: id 
      });
      
      console.log("Mark as read response:", response);
      
      if (response.status === true) {
        // Update local state directly without reloading
        setAllNotifications(allNotifications.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        ));
        setNotifications(notifications.map(notif =>
          notif.id === id ? { ...notif, read: true } : notif
        ));
        mergeProfessionalNotificationSeenKeys([`id:${id}`]);
        emitProfessionalNotificationsMutated();
        toast.success(response.message || "Marked as read");
      } else {
        toast.error(response.message || "Failed to mark notification as read");
      }
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      toast.error(error.message || "Failed to mark notification as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      const apiToken = getApiToken();
      
      if (!apiToken) {
        toast.error("Authentication token not found. Please log in again.");
        return;
      }

      console.log("Marking all notifications as read...");
      const response = await markAllNotificationsAsRead({ api_token: apiToken });
      
      console.log("Mark all as read response:", response);
      
      if (response.status === true) {
        // Update local state directly without reloading - mark all unread as read
        setAllNotifications(allNotifications.map(notif => ({ ...notif, read: true })));
        setNotifications(notifications.map(notif => ({ ...notif, read: true })));
        mergeProfessionalNotificationSeenKeys(allNotifications.map((n) => `id:${n.id}`));
        emitProfessionalNotificationsMutated();
        toast.success(response.message || "All notifications marked as read");
      } else {
        toast.error(response.message || "Failed to mark all notifications as read");
      }
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error);
      toast.error(error.message || "Failed to mark all notifications as read");
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      const apiToken = getApiToken();
      
      if (!apiToken) {
        toast.error("Authentication token not found. Please log in again.");
        return;
      }

      console.log("Deleting notification - ID:", id);
      const response = await deleteNotificationAPI({ 
        api_token: apiToken,
        notification_id: id 
      });
      
      console.log("Delete notification response:", response);
      
      if (response.status === true) {
        // Update local state directly without reloading
        setAllNotifications(allNotifications.filter(notif => notif.id !== id));
        setNotifications(notifications.filter(notif => notif.id !== id));
        emitProfessionalNotificationsMutated();
        toast.success(response.message || "Notification deleted");
      } else {
        toast.error(response.message || "Failed to delete notification");
      }
    } catch (error: any) {
      console.error("Error deleting notification:", error);
      toast.error(error.message || "Failed to delete notification");
    }
  };

  /* Clear All button hidden on professional notifications — restore with the button below.
  const clearAll = async () => {
    try {
      const apiToken = getApiToken();

      if (!apiToken) {
        toast.error("Authentication token not found. Please log in again.");
        return;
      }

      console.log("Deleting all notifications...");
      const response = await deleteAllNotifications({ api_token: apiToken });

      console.log("Delete all notifications response:", response);

      if (response.status === true) {
        setAllNotifications([]);
        setNotifications([]);
        emitProfessionalNotificationsMutated();
        toast.success(response.message || "All notifications cleared");
      } else {
        toast.error(response.message || "Failed to delete all notifications");
      }
    } catch (error: any) {
      console.error("Error deleting all notifications:", error);
      toast.error(error.message || "Failed to delete all notifications");
    }
  };
  */

  const filterNotifications = (type: string) => {
    // For "all" tab, use allNotifications; for others, use notifications
    const sourceNotifications = type === "all" ? allNotifications : notifications;
    if (type === "all") return sourceNotifications;
    if (type === "unread") return sourceNotifications.filter(n => !n.read);
    return sourceNotifications.filter(n => n.type === type);
  };

  const unreadCount = allNotifications.filter(n => !n.read).length;
  const filteredNotifications = filterNotifications(activeTab);

  if (loading) {
    return (
      <div className="space-y-6 w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl text-[#0A1A2F] mb-2">Notifications</h1>
            <p className="text-gray-600">Loading notifications...</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-500">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl text-[#0A1A2F] mb-2">Notifications</h1>
          <p className="text-gray-600">
            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {allNotifications.length > 0 && (
            <>
              <Button variant="outline" onClick={markAllAsRead} className="text-sm">
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark All as Read
              </Button>
              {/* <Button variant="outline" onClick={clearAll} className="text-sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button> */}
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0">
        <div className="min-w-0 w-full overflow-x-auto overscroll-x-contain scroll-smooth [-webkit-overflow-scrolling:touch] md:overflow-visible">
          <TabsList className="inline-flex h-auto w-max min-w-full flex-nowrap justify-start gap-1 p-1 md:grid md:w-full md:grid-cols-4 md:overflow-visible">
            <TabsTrigger value="all" className="relative shrink-0 text-xs md:text-sm">
              All
              {allNotifications.length > 0 && (
                <Badge variant="secondary" className="ml-1 md:ml-2 px-1.5 py-0.5 text-xs">
                  {allNotifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread" className="relative shrink-0 text-xs md:text-sm">
              Unread
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 md:ml-2 px-1.5 py-0.5 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="booking" className="shrink-0 text-xs md:text-sm">
              Bookings
            </TabsTrigger>
            <TabsTrigger value="payment" className="shrink-0 text-xs md:text-sm">
              Payments
            </TabsTrigger>
            {/* <TabsTrigger value="review" className="shrink-0 text-xs md:text-sm">
            Reviews
          </TabsTrigger> */}
            {/* <TabsTrigger value="system" className="shrink-0 text-xs md:text-sm">
              System
            </TabsTrigger> */}
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="mt-6 w-full">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl text-gray-900 mb-2">No notifications</h3>
                <p className="text-gray-500">
                  {activeTab === "unread" 
                    ? "You're all caught up! No unread notifications."
                    : "You don't have any notifications in this category."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 w-full">
              {filteredNotifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`transition-all hover:shadow-md w-full ${!notification.read ? 'border-l-4 border-l-red-600 bg-red-50/30' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="mt-1 flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className={`${!notification.read ? 'font-semibold' : 'font-medium'} text-gray-900 break-words`}>
                                {notification.title}
                              </h3>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-red-600 rounded-full flex-shrink-0"></div>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 break-words">
                              {notification.message}
                            </p>
                          </div>
                          
                          <Badge className={`${getPriorityColor(notification.priority)} flex-shrink-0`} variant="outline">
                            {notification.priority}
                          </Badge>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <p className="text-xs text-gray-400">{notification.timestamp}</p>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="text-xs h-8"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Mark as read
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNotification(notification.id)}
                              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}