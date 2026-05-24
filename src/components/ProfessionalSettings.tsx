import React, { useState, useEffect } from "react";
import { Save, User, Bell, Lock, CreditCard, Mail, Phone, MapPin, Eye, EyeOff } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { getPayoutDetails, createOrUpdatePayoutDetails } from "../api/paymentService";
import { getPrivacySettings, createOrUpdatePrivacySettings, getNotificationSettings, createOrUpdateNotificationSettings, updateProfessionalUser, getProfessionalUser } from "../api/professionalsService";
import { getApiToken, getProfessionalId } from "../lib/auth";
import { changePassword } from "../api/authService";

export function ProfessionalSettings() {
  // Account Settings
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [accountLoading, setAccountLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isCurrentPasswordFocused, setIsCurrentPasswordFocused] = useState(false);

  // Notification Preferences
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [bookingAlerts, setBookingAlerts] = useState(false);
  const [paymentAlerts, setPaymentAlerts] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  // Privacy Settings
  const [profileVisibility, setProfileVisibility] = useState("public");
  const [showPhoneNumber, setShowPhoneNumber] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [allowReviews, setAllowReviews] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(true);

  // Payout Settings
  const [accountHolderName, setAccountHolderName] = useState("");
  const [sortCode, setSortCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(true);

  // Function to fetch account settings (can be called from multiple places)
  const fetchAccountSettings = async () => {
    try {
      setAccountLoading(true);
      const apiToken = getApiToken();
      
      if (!apiToken) {
        console.warn("API token not found. Cannot fetch account settings.");
        setAccountLoading(false);
        return;
      }

      // Fetch professional user account data from the correct endpoint
      const accountData = await getProfessionalUser({
        api_token: apiToken
      });
      
      if (accountData) {
        // Map the API response directly to state
        setFullName(accountData.full_name || "");
        setEmail(accountData.email || "");
        setPhone(accountData.phone || "");
        setAddress(accountData.business_location || "");
      } else {
        // No data found - keep fields empty
        setFullName("");
        setEmail("");
        setPhone("");
        setAddress("");
      }
    } catch (error: any) {
      console.error("Error fetching account settings:", error);
      // Don't show toast error, just log it - user might not have professional data set up yet
      // Keep fields empty so user can enter data
      setFullName("");
      setEmail("");
      setPhone("");
      setAddress("");
    } finally {
      setAccountLoading(false);
    }
  };

  // Fetch account settings from API on component mount
  useEffect(() => {
    fetchAccountSettings();
    // Ensure password fields are empty on mount and reset focus state
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsCurrentPasswordFocused(false);
    
    // Clear any autofilled values after a short delay (browsers sometimes autofill after mount)
    const clearAutofillTimer = setTimeout(() => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }, 100);
    
    return () => clearTimeout(clearAutofillTimer);
  }, []);

  const handleSaveAccount = async () => {
    try {
      const apiToken = getApiToken();
      
      if (!apiToken) {
        toast.error("Authentication token not found. Please log in again.");
        return;
      }

      // Validate required fields
      if (!fullName.trim()) {
        toast.error("Full name is required");
        return;
      }
      if (!email.trim()) {
        toast.error("Email address is required");
        return;
      }
      if (!phone.trim()) {
        toast.error("Phone number is required");
        return;
      }
      if (!address.trim()) {
        toast.error("Business address is required");
        return;
      }

      console.log("Saving account settings...");
      const response = await updateProfessionalUser({
        api_token: apiToken,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        business_location: address.trim(),
      });
      
      console.log("Save account settings response:", response);
      
      // Refresh account settings to get updated data
      await fetchAccountSettings();
      
      toast.success("Account settings saved successfully!");
    } catch (error: any) {
      console.error("Error saving account settings:", error);
      toast.error(error.message || "Failed to save account settings");
    }
  };

  const handleChangePassword = async () => {
    try {
      // Validate passwords match
      if (newPassword !== confirmPassword) {
        toast.error("New passwords do not match!");
        return;
      }
      
      // Validate password length
      if (newPassword.length < 8) {
        toast.error("Password must be at least 8 characters long!");
        return;
      }
      
      // Validate current password is provided
      if (!currentPassword.trim()) {
        toast.error("Current password is required!");
        return;
      }

      const apiToken = getApiToken();
      
      if (!apiToken) {
        toast.error("Authentication token not found. Please log in again.");
        return;
      }

      setIsChangingPassword(true);
      
      console.log("Changing password...");
      const response = await changePassword({
        api_token: apiToken,
        current_password: currentPassword.trim(),
        new_password: newPassword.trim(),
        new_password_confirmation: confirmPassword.trim(),
      });
      
      console.log("Change password response:", response);
      
      if (response.status === true) {
        toast.success(response.message || "Password changed successfully!");
        // Clear password fields on success and reset focus state
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setIsCurrentPasswordFocused(false);
      } else {
        toast.error(response.message || "Failed to change password");
      }
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Function to fetch notification settings (can be called from multiple places)
  const fetchNotificationSettings = async () => {
    try {
      setNotificationLoading(true);
      const apiToken = getApiToken();
      
      if (!apiToken) {
        console.warn("API token not found. Cannot fetch notification settings.");
        setNotificationLoading(false);
        return;
      }

      const notificationData = await getNotificationSettings(apiToken);
      
      if (notificationData) {
        // Map API values: handle both number (1/0) and boolean formats
        setEmailNotifications(
          typeof notificationData.is_email_notifications === 'boolean' 
            ? notificationData.is_email_notifications 
            : notificationData.is_email_notifications === 1
        );
        setSmsNotifications(
          typeof notificationData.is_sms_notifications === 'boolean' 
            ? notificationData.is_sms_notifications 
            : notificationData.is_sms_notifications === 1
        );
        setPushNotifications(
          typeof notificationData.is_push_notifications === 'boolean' 
            ? notificationData.is_push_notifications 
            : notificationData.is_push_notifications === 1
        );
        setBookingAlerts(
          typeof notificationData.is_booking_alert === 'boolean' 
            ? notificationData.is_booking_alert 
            : notificationData.is_booking_alert === 1
        );
        setPaymentAlerts(
          typeof notificationData.is_payment_alert === 'boolean' 
            ? notificationData.is_payment_alert 
            : notificationData.is_payment_alert === 1
        );
        setMarketingEmails(
          typeof notificationData.is_marketing_emails === 'boolean' 
            ? notificationData.is_marketing_emails 
            : notificationData.is_marketing_emails === 1
        );
      } else {
        // No data exists - keep default values (all OFF)
        setEmailNotifications(false);
        setSmsNotifications(false);
        setPushNotifications(false);
        setBookingAlerts(false);
        setPaymentAlerts(false);
        setMarketingEmails(false);
      }
    } catch (error: any) {
      console.error("Error fetching notification settings:", error);
      // Don't show toast error, just log it - user might not have notification settings set up yet
      // Keep default values so user can create new notification settings
      setEmailNotifications(false);
      setSmsNotifications(false);
      setPushNotifications(false);
      setBookingAlerts(false);
      setPaymentAlerts(false);
      setMarketingEmails(false);
    } finally {
      setNotificationLoading(false);
    }
  };

  // Fetch notification settings from API on component mount
  useEffect(() => {
    fetchNotificationSettings();
  }, []);

  const handleSaveNotifications = async () => {
    try {
      const apiToken = getApiToken();
      
      if (!apiToken) {
        toast.error("Authentication token not found. Please log in again.");
        return;
      }

      setIsSavingNotifications(true);

      const response = await createOrUpdateNotificationSettings({
        api_token: apiToken,
        is_email_notifications: emailNotifications,
        is_sms_notifications: smsNotifications,
        is_push_notifications: pushNotifications,
        is_booking_alert: bookingAlerts,
        is_payment_alert: paymentAlerts,
        is_marketing_emails: marketingEmails,
      });
      
      await fetchNotificationSettings();
      
      toast.success(response.message || "Notification preferences saved successfully!");
    } catch (error: any) {
      console.error("Error saving notification settings:", error);
      toast.error(error.message || "Failed to save notification preferences");
    } finally {
      setIsSavingNotifications(false);
    }
  };

  // Function to fetch privacy settings (can be called from multiple places)
  const fetchPrivacySettings = async () => {
    try {
      setPrivacyLoading(true);
      const apiToken = getApiToken();
      
      if (!apiToken) {
        console.warn("API token not found. Cannot fetch privacy settings.");
        setPrivacyLoading(false);
        return;
      }

      const privacyData = await getPrivacySettings(apiToken);
      
      if (privacyData) {
        setProfileVisibility(privacyData.profile_visibility || "public");
        // Map API values: handle both boolean and number (1/0) formats
        setShowPhoneNumber(
          typeof privacyData.is_show_phone === 'boolean' 
            ? privacyData.is_show_phone 
            : privacyData.is_show_phone === 1
        );
        setShowEmail(
          typeof privacyData.is_show_email === 'boolean' 
            ? privacyData.is_show_email 
            : privacyData.is_show_email === 1
        );
        setAllowReviews(
          typeof privacyData.is_allow_customer_review === 'boolean' 
            ? privacyData.is_allow_customer_review 
            : privacyData.is_allow_customer_review === 1
        );
      } else {
        // No data exists - keep default values
        setProfileVisibility("public");
        setShowPhoneNumber(false);
        setShowEmail(false);
        setAllowReviews(false);
      }
    } catch (error: any) {
      console.error("Error fetching privacy settings:", error);
      // Don't show toast error, just log it - user might not have privacy settings set up yet
      // Keep default values so user can create new privacy settings
      setProfileVisibility("public");
      setShowPhoneNumber(false);
      setShowEmail(false);
      setAllowReviews(false);
    } finally {
      setPrivacyLoading(false);
    }
  };

  // Fetch privacy settings from API on component mount
  useEffect(() => {
    fetchPrivacySettings();
  }, []);

  const handleSavePrivacy = async () => {
    try {
      const apiToken = getApiToken();
      
      if (!apiToken) {
        toast.error("Authentication token not found. Please log in again.");
        return;
      }

      console.log("Saving privacy settings...");
      // Send boolean values directly (API accepts boolean, not 1/0)
      const response = await createOrUpdatePrivacySettings({
        api_token: apiToken,
        profile_visibility: profileVisibility,
        is_show_phone: showPhoneNumber,
        is_show_email: showEmail,
        is_allow_customer_review: allowReviews,
      });
      
      console.log("Save privacy settings response:", response);
      
      // Refresh privacy settings to get updated data
      await fetchPrivacySettings();
      
      toast.success("Privacy settings saved successfully!");
    } catch (error: any) {
      console.error("Error saving privacy settings:", error);
      toast.error(error.message || "Failed to save privacy settings");
    }
  };

  // Function to fetch payout details (can be called from multiple places)
  const fetchPayoutDetails = async () => {
    try {
      setPayoutLoading(true);
      const apiToken = getApiToken();
      
      if (!apiToken) {
        console.warn("API token not found. Cannot fetch payout details.");
        setPayoutLoading(false);
        return;
      }

      const payoutData = await getPayoutDetails(apiToken);
      
      if (payoutData) {
        setAccountHolderName(payoutData.account_holder_name || "");
        setSortCode(payoutData.sort_code || "");
        setAccountNumber(payoutData.account_number || "");
      } else {
        // No data exists - keep form fields empty for user to enter
        setAccountHolderName("");
        setSortCode("");
        setAccountNumber("");
      }
    } catch (error: any) {
      console.error("Error fetching payout details:", error);
      // Don't show toast error, just log it - user might not have payout details set up yet
      // Keep form fields empty so user can create new payout details
      setAccountHolderName("");
      setSortCode("");
      setAccountNumber("");
    } finally {
      setPayoutLoading(false);
    }
  };

  // Fetch payout details from API on component mount
  useEffect(() => {
    fetchPayoutDetails();
  }, []);

  const handleSavePayout = async () => {
    try {
      const apiToken = getApiToken();
      
      if (!apiToken) {
        toast.error("Authentication token not found. Please log in again.");
        return;
      }

      // Validate required fields
      if (!accountHolderName || !sortCode || !accountNumber) {
        toast.error("Please fill in all required fields.");
        return;
      }

      console.log("Saving payout details...");
      const response = await createOrUpdatePayoutDetails({
        api_token: apiToken,
        account_holder_name: accountHolderName,
        sort_code: sortCode,
        account_number: accountNumber,
        note: "Primary payout account",
      });
      
      console.log("Save payout details response:", response);
      
      // Refresh payout details to get updated data
      await fetchPayoutDetails();
      
      toast.success("Payout settings saved successfully!");
    } catch (error: any) {
      console.error("Error saving payout details:", error);
      toast.error(error.message || "Failed to save payout settings");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-[#0A1A2F] mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#0A1A2F] flex items-center gap-2">
            <User className="w-5 h-5" />
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <div className="relative mt-2">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative mt-2">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Business Address</Label>
            <div className="relative mt-2">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Button onClick={handleSaveAccount} className="bg-red-600 hover:bg-red-700">
            <Save className="w-4 h-4 mr-2" />
            Save Account Settings
          </Button>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#0A1A2F] flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative mt-2">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              {/* Hidden dummy field to prevent browser autofill */}
              <input
                type="password"
                style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
                tabIndex={-1}
                autoComplete="new-password"
                readOnly
              />
              <Input
                id="currentPassword"
                name="current-password-field"
                type={showPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                onFocus={() => {
                  setIsCurrentPasswordFocused(true);
                  // Clear any autofilled value on focus
                  if (currentPassword && !isCurrentPasswordFocused) {
                    setCurrentPassword("");
                  }
                }}
                className="pl-10 pr-10"
                placeholder="Enter current password"
                autoComplete="new-password"
                readOnly={!isCurrentPasswordFocused}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative mt-2">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10"
                placeholder="Enter new password"
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">Must be at least 8 characters</p>
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative mt-2">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <Button 
            onClick={handleChangePassword} 
            className="bg-red-600 hover:bg-red-700"
            disabled={isChangingPassword}
          >
            <Save className="w-4 h-4 mr-2" />
            {isChangingPassword ? "Changing Password..." : "Change Password"}
          </Button>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#0A1A2F] flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Email Notifications</p>
              <p className="text-sm text-gray-500">Receive notifications via email</p>
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
              <p className="text-sm text-gray-500">Receive urgent updates via SMS</p>
            </div>
            <Switch
              checked={smsNotifications}
              onCheckedChange={setSmsNotifications}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Push Notifications</p>
              <p className="text-sm text-gray-500">Receive browser notifications</p>
            </div>
            <Switch
              checked={pushNotifications}
              onCheckedChange={setPushNotifications}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Booking Alerts</p>
              <p className="text-sm text-gray-500">Notify me of new bookings and changes</p>
            </div>
            <Switch
              checked={bookingAlerts}
              onCheckedChange={setBookingAlerts}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Payment Alerts</p>
              <p className="text-sm text-gray-500">Notify me of payments and payouts</p>
            </div>
            <Switch
              checked={paymentAlerts}
              onCheckedChange={setPaymentAlerts}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Marketing Emails</p>
              <p className="text-sm text-gray-500">Receive tips and promotional offers</p>
            </div>
            <Switch
              checked={marketingEmails}
              onCheckedChange={setMarketingEmails}
            />
          </div>

          <Button
            onClick={handleSaveNotifications}
            className="bg-red-600 hover:bg-red-700"
            disabled={isSavingNotifications || notificationLoading}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSavingNotifications ? "Saving…" : "Save Notification Preferences"}
          </Button>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#0A1A2F] flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Privacy Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="profileVisibility">Profile Visibility</Label>
            <Select value={profileVisibility} onValueChange={setProfileVisibility}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public - Visible to all customers</SelectItem>
                <SelectItem value="limited">Limited - Visible in search results only</SelectItem>
                <SelectItem value="private">Private - Not visible to customers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Show Phone Number</p>
              <p className="text-sm text-gray-500">Display phone number on public profile</p>
            </div>
            <Switch
              checked={showPhoneNumber}
              onCheckedChange={setShowPhoneNumber}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Show Email Address</p>
              <p className="text-sm text-gray-500">Display email address on public profile</p>
            </div>
            <Switch
              checked={showEmail}
              onCheckedChange={setShowEmail}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Allow Customer Reviews</p>
              <p className="text-sm text-gray-500">Let customers leave reviews on your profile</p>
            </div>
            <Switch
              checked={allowReviews}
              onCheckedChange={setAllowReviews}
            />
          </div>

          <Button onClick={handleSavePrivacy} className="bg-red-600 hover:bg-red-700">
            <Save className="w-4 h-4 mr-2" />
            Save Privacy Settings
          </Button>
        </CardContent>
      </Card>

      {/* Payout Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#0A1A2F] flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payout Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Changes to payout details may take 1-2 business days to process. Ensure all information is accurate.
            </p>
          </div>

          <div>
            <Label htmlFor="accountHolderName">Account Holder Name</Label>
            <Input
              id="accountHolderName"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sortCode">Sort Code</Label>
              <Input
                id="sortCode"
                value={sortCode}
                onChange={(e) => setSortCode(e.target.value)}
                className="mt-2"
                placeholder="12-34-56"
              />
            </div>

            <div>
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="mt-2"
                placeholder="12345678"
              />
            </div>
          </div>

          <Button onClick={handleSavePayout} className="bg-red-600 hover:bg-red-700">
            <Save className="w-4 h-4 mr-2" />
            Save Payout Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}