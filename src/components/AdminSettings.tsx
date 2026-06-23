import React, { useState, useEffect } from "react";
import { getApiToken } from "../lib/auth";
import { getAdminSeoSettings, saveAdminSeoSettings, getAdminNotificationSettings, saveAdminNotificationSettings, getAdminSystemSettings, saveAdminSystemSettings, getAdminSecuritySettings, saveAdminSecuritySettings, getAdminRadius, updateAdminRadius } from "../api/adminService";
import { Save, Globe, Search, Zap, Bell, Shield, MapPin } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import { Slider } from "./ui/slider";
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
  const [serviceRadius, setServiceRadius] = useState([25]);
  const [radiusSaving, setRadiusSaving] = useState(false);

  useEffect(() => {
    const token = getApiToken();
    if (!token) return;
    getAdminRadius(token)
      .then((res) => {
        if (res.status && res.radius != null) {
          const miles = Number(res.radius);
          if (!Number.isNaN(miles)) {
            setServiceRadius([miles]);
          }
        }
      })
      .catch(() => {});
  }, []);

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
  const handleSaveRadius = async () => {
    const token = getApiToken();
    if (!token) {
      toast.error("Not authenticated");
      return;
    }
    setRadiusSaving(true);
    try {
      const res = await updateAdminRadius({
        api_token: token,
        radius: serviceRadius[0],
      });
      if (res.status) {
        if (res.radius != null) {
          setServiceRadius([Number(res.radius)]);
        }
        toast.success(res.message || "Radius updated successfully.");
      } else {
        toast.error(res.message || "Failed to update radius");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update radius");
    } finally {
      setRadiusSaving(false);
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
      {/* Service Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#0A1A2F]">
            <MapPin className="h-5 w-5 text-red-600" />
            Service Area
          </CardTitle>
          <CardDescription className="text-gray-600">
            Define how far professionals can be matched within the platform search radius
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <Label className="text-base text-gray-900">Service Radius</Label>
              <span className="whitespace-nowrap text-base font-semibold text-red-600">
                {serviceRadius[0]} miles
              </span>
            </div>
            <Slider
              value={serviceRadius}
              onValueChange={setServiceRadius}
              min={5}
              max={100}
              step={5}
              className="py-4"
            />
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>5 miles</span>
              <span>100 miles</span>
            </div>
          </div>

          <Button
            onClick={() => void handleSaveRadius()}
            disabled={radiusSaving}
            className="bg-red-600 hover:bg-red-700"
          >
            <Save className="mr-2 h-4 w-4" />
            {radiusSaving ? "Saving..." : "Save Service Area"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}