import React, { useState, useEffect } from "react";
import { getApiToken } from "../lib/auth";
import { getAdminSeoSettings, saveAdminSeoSettings, getAdminNotificationSettings, saveAdminNotificationSettings, getAdminSystemSettings, saveAdminSystemSettings, getAdminSecuritySettings, saveAdminSecuritySettings } from "../api/adminService";
import { Save, Globe, Search, Zap, Bell, Shield } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import { toast } from "sonner";

export function AdminSettings() {
  const [seoTitle, setSeoTitle] = useState("Fire Guide - Book Fire Safety Services Instantly");
  const [seoDescription, setSeoDescription] = useState("Compare and book qualified fire safety professionals in your area. Instant booking, secure payment, transparent pricing.");
  const [keywords, setKeywords] = useState("fire safety, fire risk assessment, fire equipment, emergency lighting");
  const [seoSaving, setSeoSaving] = useState(false);

  useEffect(() => {
    const token = getApiToken();
    if (!token) return;
    getAdminSeoSettings({ api_token: token })
      .then((res) => {
        if (res.status && res.data) {
          setSeoTitle(res.data.meta_title || "");
          setSeoDescription(res.data.meta_description || "");
          setKeywords(res.data.keywords || "");
        }
      })
      .catch(() => {});
  }, []);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [adminEmail, setAdminEmail] = useState("admin@fireguide.com");
  const [notificationSaving, setNotificationSaving] = useState(false);

  useEffect(() => {
    const token = getApiToken();
    if (!token) return;
    getAdminNotificationSettings({ api_token: token })
      .then((res) => {
        if (res.status && res.data) {
          setEmailNotifications(res.data.email_notifications === true);
          setSmsNotifications(res.data.sms_notifications === true);
          setAdminEmail(res.data.admin_alert_email || "admin@fireguide.com");
        }
      })
      .catch(() => {});
  }, []);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [bookingBuffer, setBookingBuffer] = useState("24");
  const [cancellationWindow, setCancellationWindow] = useState("48");
  const [systemSaving, setSystemSaving] = useState(false);

  useEffect(() => {
    const token = getApiToken();
    if (!token) return;
    getAdminSystemSettings({ api_token: token })
      .then((res) => {
        if (res.status && res.data) {
          setMaintenanceMode(res.data.maintenance_mode === true);
          setAutoApprove(res.data.auto_approve_professionals === true);
          setBookingBuffer(String(res.data.booking_buffer_time ?? 24));
          setCancellationWindow(String(res.data.cancellation_window ?? 48));
        }
      })
      .catch(() => {});
  }, []);
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [maxLoginAttempts, setMaxLoginAttempts] = useState("5");
  const [securitySaving, setSecuritySaving] = useState(false);

  useEffect(() => {
    const token = getApiToken();
    if (!token) return;
    getAdminSecuritySettings({ api_token: token })
      .then((res) => {
        if (res.status && res.data) {
          setSessionTimeout(String(res.data.session_timeout ?? 30));
          setMaxLoginAttempts(String(res.data.max_login_attempts ?? 5));
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveSEO = async () => {
    const token = getApiToken();
    if (!token) {
      toast.error("Not authenticated");
      return;
    }
    setSeoSaving(true);
    try {
      const res = await saveAdminSeoSettings({
        api_token: token,
        meta_title: seoTitle,
        meta_description: seoDescription,
        keywords
      });
      if ((res.status || (res as any).success) && res.data) {
        setSeoTitle(res.data.meta_title ?? seoTitle);
        setSeoDescription(res.data.meta_description ?? seoDescription);
        setKeywords(res.data.keywords ?? keywords);
        toast.success(res.message || "SEO settings saved successfully!");
      } else {
        toast.error(res.message || "Failed to save SEO settings");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to save SEO settings");
    } finally {
      setSeoSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    const token = getApiToken();
    if (!token) {
      toast.error("Not authenticated");
      return;
    }
    setNotificationSaving(true);
    try {
      const res = await saveAdminNotificationSettings({
        api_token: token,
        admin_alert_email: adminEmail,
        email_notifications: emailNotifications,
        sms_notifications: smsNotifications
      });
      if (res.status && res.data) {
        setEmailNotifications(res.data.email_notifications === true);
        setSmsNotifications(res.data.sms_notifications === true);
        setAdminEmail(res.data.admin_alert_email ?? adminEmail);
        toast.success(res.message || "Notification settings saved successfully!");
      } else {
        toast.error(res.message || "Failed to save notification settings");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to save notification settings");
    } finally {
      setNotificationSaving(false);
    }
  };

  const handleSaveSystem = async () => {
    const token = getApiToken();
    if (!token) {
      toast.error("Not authenticated");
      return;
    }
    setSystemSaving(true);
    try {
      const res = await saveAdminSystemSettings({
        api_token: token,
        maintenance_mode: maintenanceMode,
        auto_approve_professionals: autoApprove,
        booking_buffer_time: parseInt(bookingBuffer, 10) || 24,
        cancellation_window: parseInt(cancellationWindow, 10) || 48
      });
      if (res.status && res.data) {
        setMaintenanceMode(res.data.maintenance_mode === true);
        setAutoApprove(res.data.auto_approve_professionals === true);
        setBookingBuffer(String(res.data.booking_buffer_time ?? 24));
        setCancellationWindow(String(res.data.cancellation_window ?? 48));
        toast.success(res.message || "System settings saved successfully!");
      } else {
        toast.error(res.message || "Failed to save system settings");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to save system settings");
    } finally {
      setSystemSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    const token = getApiToken();
    if (!token) {
      toast.error("Not authenticated");
      return;
    }
    setSecuritySaving(true);
    try {
      const res = await saveAdminSecuritySettings({
        api_token: token,
        session_timeout: parseInt(sessionTimeout, 10) || 30,
        max_login_attempts: parseInt(maxLoginAttempts, 10) || 5
      });
      if (res.status && res.data) {
        setSessionTimeout(String(res.data.session_timeout ?? 30));
        setMaxLoginAttempts(String(res.data.max_login_attempts ?? 5));
        toast.success(res.message || "Security settings saved successfully!");
      } else {
        toast.error(res.message || "Failed to save security settings");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to save security settings");
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleClearCache = () => {
    toast.success("Cache cleared successfully!");
  };

  const handleResetStats = () => {
    toast.error("This action cannot be performed in demo mode.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-[#0A1A2F] mb-2">Platform Settings</h1>
        <p className="text-gray-600">Configure platform-wide settings and preferences</p>
      </div>

      {/* SEO Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#0A1A2F] flex items-center gap-2">
            <Globe className="w-5 h-5" />
            SEO Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="seo-title">Meta Title</Label>
            <Input
              id="seo-title"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              className="mt-2"
              placeholder="Page title for search engines"
            />
            <p className="text-sm text-gray-500 mt-1">{seoTitle.length}/60 characters</p>
          </div>

          <div>
            <Label htmlFor="seo-description">Meta Description</Label>
            <Textarea
              id="seo-description"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              className="mt-2"
              rows={3}
              placeholder="Description shown in search results"
            />
            <p className="text-sm text-gray-500 mt-1">{seoDescription.length}/160 characters</p>
          </div>

          <div>
            <Label htmlFor="keywords">Keywords</Label>
            <Input
              id="keywords"
              className="mt-2"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="fire safety, fire risk assessment, fire equipment"
            />
          </div>

          <Button onClick={() => void handleSaveSEO()} disabled={seoSaving} className="bg-red-600 hover:bg-red-700">
            <Save className="w-4 h-4 mr-2" />
            {seoSaving ? "Saving..." : "Save SEO Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#0A1A2F] flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Email Notifications</p>
              <p className="text-sm text-gray-500">Send email notifications to users</p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">SMS Notifications</p>
              <p className="text-sm text-gray-500">Send SMS alerts for urgent updates</p>
            </div>
            <Switch
              checked={smsNotifications}
              onCheckedChange={setSmsNotifications}
            />
          </div>

          <Separator />

          <div>
            <Label htmlFor="admin-email">Admin Alert Email</Label>
            <Input
              id="admin-email"
              type="email"
              className="mt-2"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@fireguide.com"
            />
            <p className="text-sm text-gray-500 mt-1">Receive important platform alerts</p>
          </div>

          <Button onClick={() => void handleSaveNotifications()} disabled={notificationSaving} className="bg-red-600 hover:bg-red-700">
            <Save className="w-4 h-4 mr-2" />
            {notificationSaving ? "Saving..." : "Save Notification Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#0A1A2F] flex items-center gap-2">
            <Zap className="w-5 h-5" />
            System Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Maintenance Mode</p>
              <p className="text-sm text-gray-500">Temporarily disable public access to the platform</p>
            </div>
            <Switch
              checked={maintenanceMode}
              onCheckedChange={setMaintenanceMode}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Auto-Approve Professionals</p>
              <p className="text-sm text-gray-500">Automatically approve new professional registrations</p>
            </div>
            <Switch
              checked={autoApprove}
              onCheckedChange={setAutoApprove}
            />
          </div>

          <Separator />

          <div>
            <Label htmlFor="booking-buffer">Booking Buffer Time (hours)</Label>
            <Input
              id="booking-buffer"
              type="number"
              className="mt-2"
              value={bookingBuffer}
              onChange={(e) => setBookingBuffer(e.target.value)}
              placeholder="24"
            />
            <p className="text-sm text-gray-500 mt-1">Minimum notice required for bookings</p>
          </div>

          <div>
            <Label htmlFor="cancellation-window">Cancellation Window (hours)</Label>
            <Input
              id="cancellation-window"
              type="number"
              className="mt-2"
              value={cancellationWindow}
              onChange={(e) => setCancellationWindow(e.target.value)}
              placeholder="48"
            />
            <p className="text-sm text-gray-500 mt-1">Hours before appointment when cancellations are allowed</p>
          </div>

          <Button onClick={() => void handleSaveSystem()} disabled={systemSaving} className="bg-red-600 hover:bg-red-700">
            <Save className="w-4 h-4 mr-2" />
            {systemSaving ? "Saving..." : "Save System Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#0A1A2F] flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
            <Input
              id="session-timeout"
              type="number"
              className="mt-2"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              placeholder="30"
            />
            <p className="text-sm text-gray-500 mt-1">Automatically log out inactive users</p>
          </div>

          <div>
            <Label htmlFor="max-attempts">Max Login Attempts</Label>
            <Input
              id="max-attempts"
              type="number"
              className="mt-2"
              value={maxLoginAttempts}
              onChange={(e) => setMaxLoginAttempts(e.target.value)}
              placeholder="5"
            />
            <p className="text-sm text-gray-500 mt-1">Lock account after failed attempts</p>
          </div>

          <Button onClick={() => void handleSaveSecurity()} disabled={securitySaving} className="bg-red-600 hover:bg-red-700">
            <Save className="w-4 h-4 mr-2" />
            {securitySaving ? "Saving..." : "Save Security Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Clear All Cache</p>
              <p className="text-sm text-gray-600">Remove all cached data from the platform</p>
            </div>
            <Button onClick={handleClearCache} variant="outline" className="border-red-600 text-red-600 hover:bg-red-50">
              Clear Cache
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Reset Platform Statistics</p>
              <p className="text-sm text-gray-600">Reset all analytics and statistics (cannot be undone)</p>
            </div>
            <Button onClick={handleResetStats} variant="outline" className="border-red-600 text-red-600 hover:bg-red-50">
              Reset Stats
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}