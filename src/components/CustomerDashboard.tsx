import React, { useState, useEffect, useMemo, useRef, useCallback, startTransition, type CSSProperties } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { CustomerBookings } from "./CustomerBookings";
import { CustomerPayments } from "./CustomerPayments";
import { 
  Flame, 
  LogOut, 
  User, 
  Calendar, 
  CreditCard, 
  Home,
  Bell,
  Settings,
  Shield,
  Clock,
  CheckCircle,
  TrendingUp,
  Menu,
  X,
  LayoutDashboard,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Star,
  Heart,
  Bookmark,
  Lock,
  Eye,
  EyeOff,
  FileText,
  Activity,
  MessageSquare,
  Mail,
  Phone,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Booking } from "../App";
import { Payment } from "../App";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { toast } from "sonner";
import logoImage from "figma:asset/629703c093c2f72bf409676369fecdf03c462cd2.png";
import { uploadProfileImage, UploadProfileImageRequest, updateUser, UpdateUserRequest, getCustomerDashboardSummary, CustomerDashboardSummaryData, getCustomerUpcomingBookings, CustomerUpcomingBookingItem, getCustomerData, updateCustomerData, UpdateCustomerDataRequest, changePassword, getCustomerNotifications, CustomerNotificationItem, getCustomerNotificationDedupeKey, getCustomerContactAdminMessages, CustomerAdminContactMessageItem, deleteAccount, getRecentActivity, RecentActivityItem, enableNotification, disableNotification, NotificationPreferencesData, getNotificationPreferences } from "../api/authService";
import { getApiToken, getUserInfo, setUserInfo } from "../lib/auth";
import { formatGbp, parseApiMoneyAmount } from "../lib/money";
import { Loader2, Upload, ArrowLeft, Save } from "lucide-react";
import { storeAddress, StoreAddressRequest, fetchAddresses, AddressResponse, deleteAddress, updateAddress } from "../api/addressService";
import {
  getMyQuoteRequests,
  updateQuoteRequestStatus,
  type MyQuoteRequestItem,
} from "../api/customQuoteRequestsService";
import {
  storePaymentInvoiceQuoteCustomer,
  isPaymentInvoiceStoreSuccess,
  extractStripeCheckoutUrl,
  extractTxRefFromInvoiceResponse,
} from "../api/paymentService";
import {
  getPaymentFailedPageUrl,
  PAYMENT_RETURN_STORAGE_KEY,
  type PaymentReturnContext,
} from "../lib/paymentAppUrls";
import { isCustomQuoteRequestPaidLocally } from "../lib/customQuotePaymentLocal";
import {
  getCustomQuoteRequestDisplayRows,
  loadQuoteRequestDurationLabelMap,
} from "./CustomQuoteRequestDetailsPanel";
import { CustomQuoteSubmittedModal } from "./CustomQuoteSubmittedModal";
import type { CustomQuoteSuccessLocationState } from "../lib/customQuoteSuccessNavigation";

const CUSTOMER_NOTIFICATION_SEEN_KEYS = "fireguide_customer_notification_seen_keys";

function loadCustomerNotificationSeenKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(CUSTOMER_NOTIFICATION_SEEN_KEYS);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string" && x.length > 0));
  } catch {
    return new Set();
  }
}

function persistCustomerNotificationSeenKeys(keys: Set<string>) {
  try {
    localStorage.setItem(CUSTOMER_NOTIFICATION_SEEN_KEYS, JSON.stringify([...keys]));
  } catch {
    /* ignore */
  }
}

function isNotificationReadFromApi(n: CustomerNotificationItem): boolean {
  if (n.read === true) return true;
  const ir = n.is_read as unknown;
  return ir === true || ir === 1 || ir === "1";
}

/** API unread flag or not yet dismissed locally after opening the notifications page. */
function isNotificationUnread(n: CustomerNotificationItem, seenKeys: Set<string>): boolean {
  if (isNotificationReadFromApi(n)) return false;
  return !seenKeys.has(getCustomerNotificationDedupeKey(n));
}

/** API may return default as 1, true, or "1" */
function isStoredAddressDefault(value: unknown): boolean {
  return value === 1 || value === true || value === "1";
}

function normalizeAddressId(id: string | number): number {
  return typeof id === "string" ? parseInt(id, 10) : id;
}

function normalizeAddressOwnerId(userId: unknown): number {
  if (userId === null || userId === undefined) return NaN;
  return typeof userId === "string" ? parseInt(userId, 10) : Number(userId);
}

/** True when GET /addresses returned rows for more than one user (backend should not do this). */
function addressListHasMultipleOwners(list: AddressResponse[]): boolean {
  const ids = new Set<number>();
  for (const a of list) {
    const uid = normalizeAddressOwnerId(a.user_id);
    if (!Number.isNaN(uid)) ids.add(uid);
  }
  return ids.size > 1;
}

function filterAddressesForCustomerUser(
  list: AddressResponse[],
  customerUserId: number | null
): AddressResponse[] {
  if (customerUserId == null) return list;
  return list.filter((a) => normalizeAddressOwnerId(a.user_id) === customerUserId);
}

function formatActivityDateDisplay(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString.split(" ")[0];
    return date.toISOString().split("T")[0];
  } catch {
    return dateString.split(" ")[0];
  }
}

function parseQuotedPriceNumberForQuote(quoted: string | number | null | undefined): number {
  if (quoted == null || quoted === "") return NaN;
  const n = typeof quoted === "number" ? quoted : parseFloat(String(quoted).replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

/** Resolve quoted amount from API row (several backends use different keys). */
function getQuoteRequestQuotedPriceRaw(req: MyQuoteRequestItem): string | number | null | undefined {
  const root = req as MyQuoteRequestItem & Record<string, unknown>;
  const candidates: unknown[] = [
    req.quoted_price,
    root.price,
    root.quoted_amount,
    root.total_price,
    root.amount,
    root.total,
  ];
  for (const raw of candidates) {
    if (raw != null && raw !== "") return raw as string | number;
  }
  try {
    const parsed =
      typeof req.request_data === "string" ? JSON.parse(req.request_data) : req.request_data;
    if (parsed && typeof parsed === "object" && parsed !== null) {
      const rec = parsed as Record<string, unknown>;
      for (const key of ["quoted_price", "price", "quoted_amount", "total_price", "amount", "total"]) {
        const v = rec[key];
        if (v != null && v !== "") return v as string | number;
      }
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

function getQuoteRequestQuotedPriceNumber(req: MyQuoteRequestItem): number {
  return parseQuotedPriceNumberForQuote(getQuoteRequestQuotedPriceRaw(req));
}

/**
 * True when API `is_paid` explicitly means paid — hide Pay when true.
 * Handles bool, 0/1, and common string forms from Laravel/JSON.
 */
function isQuoteRequestIsPaidFieldTrue(req: MyQuoteRequestItem): boolean {
  const ir = req.is_paid;
  if (ir === false || ir === 0 || ir === "0") return false;
  if (typeof ir === "string") {
    const t = ir.trim().toLowerCase();
    if (t === "" || t === "false" || t === "no" || t === "unpaid") return false;
    if (t === "true" || t === "yes" || t === "paid" || t === "1") return true;
  }
  if (ir === true || ir === 1 || ir === "1") return true;
  return false;
}

function isQuoteRequestPaid(req: MyQuoteRequestItem): boolean {
  if (isQuoteRequestIsPaidFieldTrue(req)) return true;
  const ps = req.payment_status;
  if (ps != null && String(ps).trim() !== "" && String(ps).toLowerCase() === "paid") return true;
  const st = req.status;
  if (st != null && String(st).trim().toLowerCase() === "paid") return true;
  return isCustomQuoteRequestPaidLocally(req.id);
}

function normalizeQuoteRequestStatus(status: string | undefined | null): string {
  return String(status ?? "").trim().toLowerCase();
}

function isQuoteRequestStatusAssigned(req: MyQuoteRequestItem): boolean {
  return normalizeQuoteRequestStatus(req.status) === "assigned";
}

function isQuoteRequestStatusAccept(req: MyQuoteRequestItem): boolean {
  const s = normalizeQuoteRequestStatus(req.status);
  return (
    s === "accept" ||
    s === "accepted" ||
    s === "approve" ||
    s === "approved" ||
    s.startsWith("accept")
  );
}

function isAddressUpdateSuccess(response: {
  status?: boolean | string;
  success?: boolean;
  message?: string;
  error?: string;
}): boolean {
  const s = response.status;
  return (
    s === true ||
    s === "success" ||
    s === "true" ||
    response.success === true
  );
}

interface CustomerDashboardProps {
  onLogout: () => void;
  onBookNewService: () => void;
  bookings: Booking[];
  payments: Payment[];
  onUpdateBooking: (bookingId: string, updates: Partial<Booking>) => void;
  onDeleteBooking: (bookingId: string) => void;
}

type CustomerView =
  | "overview"
  | "bookings"
  | "payments"
  | "quote-requests"
  | "profile"
  | "admin-messages"
  | "settings"
  | "notifications";

export function CustomerDashboard({ 
  onLogout, 
  onBookNewService,
  bookings,
  payments,
  onUpdateBooking,
  onDeleteBooking
}: CustomerDashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { view, id: addressIdParam } = useParams<{ view?: string; id?: string }>();
  const validViews: CustomerView[] = [
    "overview",
    "bookings",
    "payments",
    "quote-requests",
    "profile",
    "admin-messages",
    "settings",
    "notifications",
  ];
  
  // Check if we're on the add or edit address route
  const isAddAddressRoute = location.pathname === "/customer/dashboard/profile/addresses/add";
  const isEditAddressRoute = location.pathname.startsWith("/customer/dashboard/profile/addresses/edit/");
  
  // Safely parse address ID from URL parameter
  let addressIdToEdit: number | null = null;
  if (isEditAddressRoute && addressIdParam) {
    const parsedId = parseInt(addressIdParam, 10);
    if (!isNaN(parsedId) && parsedId > 0) {
      addressIdToEdit = parsedId;
    } else {
      console.error("Invalid address ID in URL:", addressIdParam);
    }
  }
  
  // Determine current view from URL parameter, default to "overview"
  const currentViewFromUrl: CustomerView = (view && validViews.includes(view as CustomerView)) 
    ? (view as CustomerView) 
    : "overview";
  
  const [currentView, setCurrentView] = useState<CustomerView>(currentViewFromUrl);
  const currentViewRef = useRef<CustomerView>(currentView);
  currentViewRef.current = currentView;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [customQuoteSuccessModalOpen, setCustomQuoteSuccessModalOpen] = useState(false);

  const [addresses, setAddresses] = useState<AddressResponse[]>([]);
  /** Set when GET /addresses mixes user_ids; we filter to getCustomerData().data.id */
  const customerUserIdForAddressesRef = useRef<number | null>(null);

  const resolveCustomerUserIdForAddresses = async (token: string): Promise<number | null> => {
    if (customerUserIdForAddressesRef.current !== null) {
      return customerUserIdForAddressesRef.current;
    }
    try {
      const cr = await getCustomerData(token);
      if (cr.status === true && cr.data?.id != null) {
        customerUserIdForAddressesRef.current = cr.data.id;
        return cr.data.id;
      }
    } catch {
      /* leave null */
    }
    return null;
  };

  const scopeAddressesIfNeeded = async (
    raw: AddressResponse[],
    token: string
  ): Promise<AddressResponse[]> => {
    if (!addressListHasMultipleOwners(raw)) return raw;
    await resolveCustomerUserIdForAddresses(token);
    return filterAddressesForCustomerUser(raw, customerUserIdForAddressesRef.current);
  };
  
  // Sync state with URL parameter when it changes (including on mount and URL changes)
  useEffect(() => {
    // If on add or edit address route, set view to profile
    if (isAddAddressRoute || isEditAddressRoute) {
      setCurrentView("profile");
    } else {
      setCurrentView(currentViewFromUrl);
    }
  }, [currentViewFromUrl, isAddAddressRoute, isEditAddressRoute]);

  useEffect(() => {
    const state = location.state as CustomQuoteSuccessLocationState | null;
    if (!state?.showCustomQuoteSuccess) return;
    setCustomQuoteSuccessModalOpen(true);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.state, location.pathname, location.search, navigate]);

  // Fetch addresses from API
  useEffect(() => {
    const loadAddresses = async () => {
      const token = getApiToken();
      if (!token) {
        customerUserIdForAddressesRef.current = null;
        return;
      }

      setIsLoadingAddresses(true);
      try {
        const response = await fetchAddresses(token);
        if (response.status === "success" && response.data) {
          setAddresses(await scopeAddressesIfNeeded(response.data, token));
        } else {
          console.error("Failed to fetch addresses:", response.message || response.error);
          // Set empty array on error to show empty state
          setAddresses([]);
        }
      } catch (error: any) {
        console.error("Error fetching addresses:", error);
        toast.error(error?.message || "Failed to load addresses. Please try again.");
        // Set empty array on error to show empty state
        setAddresses([]);
      } finally {
        setIsLoadingAddresses(false);
      }
    };

    // Fetch addresses when profile view is active or when component mounts
    loadAddresses();
  }, [currentView, isAddAddressRoute, isEditAddressRoute]); // Refetch when view changes or after adding/editing address

  // Load address data when on edit route
  useEffect(() => {
    const loadAddressForEdit = async () => {
      if (!isEditAddressRoute || !addressIdToEdit) {
        return;
      }

      const token = getApiToken();
      if (!token) {
        toast.error("Please log in to edit address.");
        startTransition(() => {
          navigate("/customer/dashboard/profile");
        });
        return;
      }

      setIsLoadingEditAddress(true);
      try {
        // Always fetch from API to ensure we have the latest data
        const response = await fetchAddresses(token);
        
        if (response.status === "success" && response.data) {
          const scoped = await scopeAddressesIfNeeded(response.data, token);
          setAddresses(scoped);
          
          // Validate address ID type matching (ensure both are numbers for comparison)
          const addressToEdit = scoped.find(addr => {
            const addrId = typeof addr.id === 'string' ? parseInt(addr.id, 10) : addr.id;
            const editId = addressIdToEdit;
            return addrId === editId && !isNaN(addrId) && !isNaN(editId);
          });
          
          if (addressToEdit) {
            setEditAddressForm({
              tag: addressToEdit.tag,
              adress_line: addressToEdit.adress_line,
              city: addressToEdit.city,
              postal_code: addressToEdit.postal_code,
              country: addressToEdit.country,
              is_default_address: addressToEdit.is_default_address === 1,
              is_favourite_address: addressToEdit.is_favourite_address === 1
            });
          } else {
            toast.error("Address not found. It may have been deleted.");
            startTransition(() => {
              navigate("/customer/dashboard/profile");
            });
          }
        } else {
          toast.error(response.message || response.error || "Failed to load address data");
          startTransition(() => {
            navigate("/customer/dashboard/profile");
          });
        }
      } catch (error: any) {
        console.error("Error loading address for edit:", error);
        
        // Handle 404 specifically
        if (error?.status === 404 || error?.response?.status === 404) {
          toast.error("Address not found. It may have been deleted.");
        } else if (error?.message?.includes("404") || error?.error?.includes("404")) {
          toast.error("Address not found. It may have been deleted.");
        } else if (error?.message?.toLowerCase().includes("not found")) {
          toast.error("Address not found. It may have been deleted.");
        } else {
          toast.error(error?.message || error?.error || "Failed to load address. Please try again.");
        }
        startTransition(() => {
          navigate("/customer/dashboard/profile");
        });
      } finally {
        setIsLoadingEditAddress(false);
      }
    };

    loadAddressForEdit();
  }, [isEditAddressRoute, addressIdToEdit, navigate]);
  
  // Handler to update both state and URL
  const handleViewChange = (view: CustomerView) => {
    setCurrentView(view);
    startTransition(() => {
      if (view === "overview") {
        navigate("/customer/dashboard", { replace: true });
      } else {
        navigate(`/customer/dashboard/${view}`, { replace: true });
      }
    });
  };
  
  // Address management state (continued)
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [addressForm, setAddressForm] = useState({
    label: "",
    street: "",
    city: "",
    postcode: "",
    country: "United Kingdom"
  });
  
  // Add Address form state
  const [addAddressForm, setAddAddressForm] = useState({
    tag: "",
    adress_line: "",
    city: "",
    postal_code: "",
    country: "United Kingdom",
    is_default_address: false,
    is_favourite_address: false
  });
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);

  // Edit Address form state
  const [editAddressForm, setEditAddressForm] = useState({
    tag: "",
    adress_line: "",
    city: "",
    postal_code: "",
    country: "United Kingdom",
    is_default_address: false,
    is_favourite_address: false
  });
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
  const [isLoadingEditAddress, setIsLoadingEditAddress] = useState(false);

  // Delete Address confirmation modal state
  const [isDeleteAddressModalOpen, setIsDeleteAddressModalOpen] = useState(false);
  const [addressIdToDelete, setAddressIdToDelete] = useState<number | null>(null);
  const [isDeletingAddress, setIsDeletingAddress] = useState(false);
  /** Address id currently being promoted to default (star click) */
  const [settingDefaultAddressId, setSettingDefaultAddressId] = useState<number | null>(null);
  /** Single row that shows the Star "make default" control; others use Bookmark */
  const [starredAddressId, setStarredAddressId] = useState<number | null>(null);

  // Exactly one Star among non-default rows; repair when list changes (load/delete/add)
  // Must run after `addresses` / `starredAddressId` are declared (dependency array reads `addresses` during render).
  useEffect(() => {
    setStarredAddressId((prev) => {
      if (addresses.length === 0) return null;
      const nonDefaults = addresses.filter((a) => !isStoredAddressDefault(a.is_default_address));
      if (nonDefaults.length === 0) return null;
      if (prev !== null) {
        const prevRow = addresses.find((a) => normalizeAddressId(a.id) === prev);
        if (prevRow && !isStoredAddressDefault(prevRow.is_default_address)) {
          return prev;
        }
      }
      return normalizeAddressId(nonDefaults[0].id);
    });
  }, [addresses]);

  // Password change state
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<CustomerNotificationItem[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [adminContactMessages, setAdminContactMessages] = useState<CustomerAdminContactMessageItem[]>([]);
  const [isLoadingAdminContactMessages, setIsLoadingAdminContactMessages] = useState(false);
  const [seenNotificationKeys, setSeenNotificationKeys] = useState<Set<string>>(loadCustomerNotificationSeenKeys);

  const unreadNotificationCount = useMemo(() => {
    return notifications.reduce((acc, n) => acc + (isNotificationUnread(n, seenNotificationKeys) ? 1 : 0), 0);
  }, [notifications, seenNotificationKeys]);

  // Delete account state
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Recent activity state
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [isLoadingRecentActivity, setIsLoadingRecentActivity] = useState(false);

  // Notification preferences state
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferencesData | null>(null);
  const [isLoadingNotificationPreferences, setIsLoadingNotificationPreferences] = useState(false);
  const [updatingNotification, setUpdatingNotification] = useState<string | null>(null);

  // Quote requests state
  const [quoteRequests, setQuoteRequests] = useState<MyQuoteRequestItem[]>([]);
  const [isLoadingQuoteRequests, setIsLoadingQuoteRequests] = useState(false);
  /** FRA duration_id → label (GET /fra-durations); used to show wording instead of raw id on quote cards. */
  const [fraDurationLabels, setFraDurationLabels] = useState<ReadonlyMap<number, string>>(() => new Map());
  const [payingQuoteRequestId, setPayingQuoteRequestId] = useState<number | null>(null);
  const [approvingQuoteRequestId, setApprovingQuoteRequestId] = useState<number | null>(null);
  const [selectedQuoteRequest, setSelectedQuoteRequest] = useState<MyQuoteRequestItem | null>(null);

  const handleApproveAssignedQuoteRequest = useCallback(async (req: MyQuoteRequestItem) => {
    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to approve this quote.");
      return;
    }
    if (!isQuoteRequestStatusAssigned(req)) {
      toast.info("This quote is no longer awaiting approval.");
      return;
    }

    setApprovingQuoteRequestId(req.id);
    try {
      const response = await updateQuoteRequestStatus(token, req.id, "accept");
      const updated = response.data;
      const nextStatus = updated?.status ?? "accept";
      setQuoteRequests((prev) =>
        prev.map((r) =>
          r.id === req.id
            ? {
                ...r,
                ...updated,
                id: r.id,
                status: nextStatus,
                quoted_price: updated?.quoted_price ?? r.quoted_price,
                professional: updated?.professional ?? r.professional,
              }
            : r
        )
      );
      setSelectedQuoteRequest((prev) =>
        prev?.id === req.id
          ? {
              ...prev,
              ...updated,
              id: prev.id,
              status: nextStatus,
              quoted_price: updated?.quoted_price ?? prev.quoted_price,
              professional: updated?.professional ?? prev.professional,
            }
          : prev
      );
      toast.success(response.message || "Quote approved. You can now proceed to payment.");
    } catch (error: unknown) {
      console.error("Approve quote request error:", error);
      toast.error(error instanceof Error ? error.message : "Could not approve quote. Please try again.");
    } finally {
      setApprovingQuoteRequestId(null);
    }
  }, []);

  const handlePayAssignedQuoteRequest = useCallback(async (req: MyQuoteRequestItem) => {
    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to complete payment.");
      return;
    }
    const price = getQuoteRequestQuotedPriceNumber(req);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Could not read the quoted amount. Please contact support.");
      return;
    }
    const reqStatusLower = normalizeQuoteRequestStatus(req.status);
    if (reqStatusLower === "completed") {
      toast.info("This quote request is already completed.");
      return;
    }
    if (!isQuoteRequestStatusAccept(req) && !isQuoteRequestStatusAssigned(req)) {
      toast.info("Payment is available after you approve the assigned quote.");
      return;
    }
    if (isQuoteRequestStatusAssigned(req)) {
      toast.info("Please approve this quote before paying.");
      return;
    }
    if (isQuoteRequestPaid(req)) {
      toast.info("This quote is already paid.");
      return;
    }

    setPayingQuoteRequestId(req.id);
    try {
      const response = await storePaymentInvoiceQuoteCustomer({
        api_token: token,
        price,
        custom_quote_id: req.id
      });

      const checkoutUrl = extractStripeCheckoutUrl(response);
      const txRef = extractTxRefFromInvoiceResponse(response);
      const returnCtx: PaymentReturnContext = {
        amountPaid: price,
        totalAmount: price,
        paidIncentives: 0,
        paidBalance: 0,
        paidOnline: price,
        orderIds: [`Quote #${req.id}`],
        transactionId: txRef ?? "",
        quoteRequestId: req.id,
      };
      try {
        sessionStorage.setItem(PAYMENT_RETURN_STORAGE_KEY, JSON.stringify(returnCtx));
      } catch {
        /* ignore */
      }

      if (isPaymentInvoiceStoreSuccess(response) && checkoutUrl) {
        toast.success("Redirecting to secure payment…");
        window.location.assign(checkoutUrl);
        return;
      }
      // Do not mark quote paid locally unless user completes Stripe — that happens after return + webhook (server truth).
      if (isPaymentInvoiceStoreSuccess(response) && !checkoutUrl) {
        throw {
          message:
            (response as { message?: string })?.message ||
            "Could not start checkout: no Stripe link from server. Your quote has not been recorded as paid.",
        };
      }
      throw { message: (response as { message?: string })?.message || "Failed to start payment" };
    } catch (error: unknown) {
      console.error("Pay assigned quote error:", error);
      const err = error as { message?: string; status?: number };
      toast.error(err.message || "Could not start payment. Please try again.");
      if (typeof err.status === "number" && err.status !== 401) {
        window.location.assign(getPaymentFailedPageUrl());
      }
    } finally {
      setPayingQuoteRequestId(null);
    }
  }, []);

  // Load user data from localStorage or use defaults
  const getUserData = () => {
    const userInfo = getUserInfo();
    return {
      name: userInfo?.name || "John Smith",
      email: "john.smith@example.com", // Email should come from API in real implementation
      phone: "07123 456789" // Phone should come from API in real implementation
    };
  };

  const initialUserData = getUserData();
  const [customerName, setCustomerName] = useState(initialUserData.name);
  const [customerEmail, setCustomerEmail] = useState(initialUserData.email); // Email now updates dynamically
  
  // Profile image state
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(() => {
    // Load from localStorage on mount
    const storedImage = localStorage.getItem('customer_profile_image');
    return storedImage || null;
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null); // Preview before upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Profile form state - initialize with current user data
  const [profileForm, setProfileForm] = useState(() => {
    const userData = getUserData();
    return {
      full_name: userData?.name || "",
      email: userData?.email || "",
      phone: userData?.phone || "",
      property_type: "Residential", // Default value
      property_type_id: 18 // Default ID (will be updated from API)
    };
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isLoadingCustomerData, setIsLoadingCustomerData] = useState(false);
  
  // Fetch customer data from API when profile view is shown
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (currentView !== 'profile') return;
      
      const token = getApiToken();
      if (!token) {
        console.log('No API token available for customer data');
        setIsLoadingCustomerData(false);
        return;
      }

      setIsLoadingCustomerData(true);
      try {
        const response = await getCustomerData(token);
        if (response.status === true && response.data) {
          const customerData = response.data;
          
          // Update profile form with API data
          setProfileForm({
            full_name: customerData.full_name || initialUserData.name,
            email: customerData.email || initialUserData.email,
            phone: customerData.phone || initialUserData.phone,
            property_type: customerData.property_type?.name || "Residential",
            property_type_id: customerData.property_type?.id || 18
          });
          
          // Update customer name and email if different
          if (customerData.full_name && customerData.full_name !== customerName) {
            setCustomerName(customerData.full_name);
          }
          
          if (customerData.email && customerData.email !== customerEmail) {
            setCustomerEmail(customerData.email);
          }
          
          // Update profile image from API if available
          if (customerData.image) {
            setProfileImageUrl(customerData.image);
            localStorage.setItem('customer_profile_image', customerData.image);
          }
          
          console.log('Customer data loaded from API:', customerData);
        } else {
          console.error('Failed to fetch customer data:', response.message || response.error);
        }
      } catch (error: any) {
        console.error('Error fetching customer data:', error);
      } finally {
        setIsLoadingCustomerData(false);
      }
    };

    fetchCustomerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  // Dashboard summary state for API data
  const [dashboardSummary, setDashboardSummary] = useState<CustomerDashboardSummaryData | null>(null);
  const [isLoadingDashboardSummary, setIsLoadingDashboardSummary] = useState(true); // Start with loading true

  // Upcoming bookings state for API data
  const [upcomingBookingsList, setUpcomingBookingsList] = useState<CustomerUpcomingBookingItem[]>([]);
  const [isLoadingUpcomingBookings, setIsLoadingUpcomingBookings] = useState(true);

  // Fetch dashboard summary from API
  useEffect(() => {
    const fetchDashboardSummary = async () => {
      const token = getApiToken();
      if (!token) {
        console.log('No API token available for dashboard summary');
        setIsLoadingDashboardSummary(false);
        return;
      }

      setIsLoadingDashboardSummary(true);
      try {
        const response = await getCustomerDashboardSummary(token);
        if (response.status === 'success' && response.data) {
          setDashboardSummary(response.data);
        } else {
          console.error('Failed to fetch dashboard summary:', response.message || response.error);
        }
      } catch (error: any) {
        console.error('Error fetching dashboard summary:', error);
      } finally {
        setIsLoadingDashboardSummary(false);
      }
    };

    // Fetch on mount and when view changes to overview
    if (currentView === 'overview') {
      fetchDashboardSummary();
    }
  }, [currentView]);

  // Fetch upcoming bookings from API
  useEffect(() => {
    const fetchUpcomingBookings = async () => {
      const token = getApiToken();
      if (!token) {
        console.log('No API token available for upcoming bookings');
        setIsLoadingUpcomingBookings(false);
        return;
      }

      setIsLoadingUpcomingBookings(true);
      try {
        const response = await getCustomerUpcomingBookings(token);
        if (response.status === 'success' && response.data?.bookings) {
          setUpcomingBookingsList(response.data.bookings);
        } else {
          console.error('Failed to fetch upcoming bookings:', response.message || response.error);
          setUpcomingBookingsList([]);
        }
      } catch (error: any) {
        console.error('Error fetching upcoming bookings:', error);
        setUpcomingBookingsList([]);
      } finally {
        setIsLoadingUpcomingBookings(false);
      }
    };

    // Fetch on mount and when view changes to overview
    if (currentView === 'overview') {
      fetchUpcomingBookings();
    }
  }, [currentView]);

  // Fetch notifications: POST /notifications — refresh on view change, tab focus, and interval while logged in
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const token = getApiToken();
      if (!token) {
        setNotifications([]);
        setIsLoadingNotifications(false);
        return;
      }

      const showLoading = currentViewRef.current === "notifications";
      if (showLoading) {
        setIsLoadingNotifications(true);
      }

      try {
        const response = await getCustomerNotifications({ api_token: token });
        if (cancelled) return;
        const list = Array.isArray(response.data) ? response.data : [];
        setNotifications(list);
        if (currentViewRef.current === "notifications" && list.length > 0) {
          setSeenNotificationKeys((prev) => {
            const next = new Set(prev);
            list.forEach((n) => next.add(getCustomerNotificationDedupeKey(n)));
            persistCustomerNotificationSeenKeys(next);
            return next;
          });
        }
      } catch (error: unknown) {
        if (!cancelled) {
          console.error("Error fetching notifications:", error);
          setNotifications([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingNotifications(false);
        }
      }
    };

    run();

    const token = getApiToken();
    if (!token) {
      return () => {
        cancelled = true;
      };
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      run();
    }, 90_000);

    const onFocus = () => run();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [currentView]);

  // Admin messages — POST /contact-customer/get when this section is open
  useEffect(() => {
    if (currentView !== "admin-messages") return;

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
        const response = await getCustomerContactAdminMessages({ api_token: token });
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
  }, [currentView]);

  // Fetch quote requests when quote-requests view is shown
  useEffect(() => {
    const fetchQuoteRequests = async () => {
      const token = getApiToken();
      if (!token) {
        setQuoteRequests([]);
        setIsLoadingQuoteRequests(false);
        return;
      }

      setIsLoadingQuoteRequests(true);
      try {
        const response = await getMyQuoteRequests(token);
        if (response.status && response.data) {
          setQuoteRequests(Array.isArray(response.data) ? response.data : []);
        } else {
          setQuoteRequests([]);
        }
      } catch (error: unknown) {
        console.error("Error fetching quote requests:", error);
        toast.error(error instanceof Error ? error.message : "Failed to load quote requests");
        setQuoteRequests([]);
      } finally {
        setIsLoadingQuoteRequests(false);
      }
    };

    if (currentView === "quote-requests") {
      fetchQuoteRequests();
    }
  }, [currentView]);

  useEffect(() => {
    if (currentView !== "quote-requests") return;
    let cancelled = false;
    loadQuoteRequestDurationLabelMap().then((m) => {
      if (!cancelled) setFraDurationLabels(m);
    });
    return () => {
      cancelled = true;
    };
  }, [currentView]);

  // Fetch recent activity from API when overview is shown
  useEffect(() => {
    const fetchRecentActivity = async () => {
      if (currentView !== 'overview') return;
      
      const token = getApiToken();
      if (!token) {
        console.log('No API token available for recent activity');
        setIsLoadingRecentActivity(false);
        return;
      }

      setIsLoadingRecentActivity(true);
      try {
        const response = await getRecentActivity({ api_token: token });
        if (response.status === 'success' && response.data) {
          setRecentActivity(Array.isArray(response.data) ? response.data : []);
          console.log('Recent activity loaded from API:', response.data);
        } else {
          console.log('No recent activity found');
          setRecentActivity([]);
        }
      } catch (error: any) {
        console.error('Error fetching recent activity:', error);
        setRecentActivity([]);
      } finally {
        setIsLoadingRecentActivity(false);
      }
    };

    fetchRecentActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  // Fetch notification preferences from API when settings view is shown
  // POST /user_dashboard/get_all_notification with { api_token } — response data drives toggle ON/OFF
  useEffect(() => {
    const fetchNotificationPreferences = async () => {
      if (currentView !== 'settings') {
        return;
      }

      const token = getApiToken();
      if (!token) {
        setIsLoadingNotificationPreferences(false);
        return;
      }

      setIsLoadingNotificationPreferences(true);
      try {
        const response = await getNotificationPreferences({ api_token: token });
        const isSuccess = response?.success === true || (response as { status?: boolean })?.status === true;

        // Support response.data or response.data.data (nested)
        const rawData = response?.data;
        const d =
          rawData &&
          typeof rawData === 'object' &&
          'is_booking_confirmation' in rawData
            ? rawData
            : (rawData as { data?: typeof rawData })?.['data'];

        if (isSuccess && d && typeof d === 'object') {
          // Map API booleans to 1/0: true -> ON (1), false -> OFF (0)
          const toOnOff = (v: unknown): number =>
            v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true' ? 1 : 0;

          const preferencesData: NotificationPreferencesData = {
            id: 0,
            is_booking_confirmation: toOnOff(d.is_booking_confirmation),
            is_service_reminders: toOnOff(d.is_service_reminders),
            report_uploads: toOnOff(d.report_uploads),
            marketing_emails: toOnOff(d.marketing_emails),
            user_id: 0,
            created_at: '',
            updated_at: '',
          };
          setNotificationPreferences(preferencesData);
        } else {
          setNotificationPreferences(null);
        }
      } catch (error: unknown) {
        console.error('Error fetching notification preferences:', error);
        setNotificationPreferences(null);
      } finally {
        setIsLoadingNotificationPreferences(false);
      }
    };

    fetchNotificationPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  // Use API data for stats - show 0 while loading, then API data
  const upcomingBookings = isLoadingDashboardSummary ? 0 : (dashboardSummary?.jobs?.upcoming ?? 0);
  const completedBookings = isLoadingDashboardSummary ? 0 : (dashboardSummary?.jobs?.completed ?? 0);
  const totalSpent = isLoadingDashboardSummary
    ? 0
    : parseApiMoneyAmount(dashboardSummary?.spending?.total_spent);

  // Profile image upload handlers
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB.");
      return;
    }

    // Create preview URL immediately for better UX
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to upload profile image.");
      URL.revokeObjectURL(previewUrl); // Clean up preview
      setImagePreview(null);
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploadData: UploadProfileImageRequest = {
        api_token: token,
        file: file
      };

      const response = await uploadProfileImage(uploadData);

      // Clean up preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      if (response.status === true || response.image_url) {
        const imageUrl = response.image_url || "";
        setProfileImageUrl(imageUrl);
        setImagePreview(null); // Clear preview after successful upload
        // Store in localStorage to persist across sessions
        localStorage.setItem('customer_profile_image', imageUrl);
        toast.success(response.message || "Profile image updated successfully!");
      } else {
        setImagePreview(null); // Clear preview on error
        toast.error(response.message || response.error || "Failed to upload profile image. Please try again.");
      }
    } catch (error: any) {
      console.error("Error uploading profile image:", error);
      // Clean up preview URL on error
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setImagePreview(null);
      const errorMessage = error?.message || error?.error || "An error occurred while uploading the image. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Profile update handler
  const handleSaveProfile = async () => {
    if (!profileForm?.full_name?.trim()) {
      toast.error("Please enter your full name.");
      return;
    }

    if (!profileForm?.email?.trim()) {
      toast.error("Please enter your email address.");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileForm.email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (!profileForm?.phone?.trim()) {
      toast.error("Please enter your phone number.");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to update profile.");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      // Map property type name to ID (you may need to adjust these mappings based on your API)
      const propertyTypeMap: Record<string, number> = {
        "Residential": 18,
        "Commercial": 19,
        "Industrial": 20
      };
      
      const propertyTypeId = profileForm.property_type_id || propertyTypeMap[profileForm.property_type || "Residential"] || 18;

      const updateData: UpdateCustomerDataRequest = {
        api_token: token,
        full_name: profileForm.full_name.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
        property_type_id: propertyTypeId
      };

      const response = await updateCustomerData(updateData);

      if (response.status === true) {
        // Update local state
        setCustomerName(profileForm.full_name.trim());
        setCustomerEmail(profileForm.email.trim());
        // Update localStorage if needed
        const userInfo = getUserInfo();
        if (userInfo) {
          setUserInfo(profileForm.full_name.trim(), userInfo.role);
        }
        
        // Update property_type_id from response
        if (response.data?.property_type_id) {
          setProfileForm(prev => ({
            ...prev,
            property_type_id: response.data.property_type_id
          }));
        }
        
        toast.success(response.message || "Profile updated successfully!");
      } else {
        toast.error(response.message || response.error || "Failed to update profile. Please try again.");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      const errorMessage = error?.message || error?.error || "An error occurred while updating the profile. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Password change handler
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
        // Clear password fields on success
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setIsChangePasswordDialogOpen(false);
      } else {
        toast.error(response.message || "Failed to change password");
      }
    } catch (error: any) {
      console.error("Error changing password:", error);
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          error?.error || 
                          "An error occurred while changing the password. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Address management handlers
  const handleAddAddress = () => {
    startTransition(() => {
      navigate("/customer/dashboard/profile/addresses/add");
    });
  };

  const handleAddAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!addAddressForm.tag.trim() || !addAddressForm.adress_line.trim() || 
        !addAddressForm.city.trim() || !addAddressForm.postal_code.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to add an address.");
      return;
    }

    setIsSubmittingAddress(true);
    try {
      const addressData: StoreAddressRequest = {
        api_token: token,
        tag: addAddressForm.tag.trim(),
        adress_line: addAddressForm.adress_line.trim(),
        city: addAddressForm.city.trim(),
        postal_code: addAddressForm.postal_code.trim(),
        country: addAddressForm.country,
        is_default_address: addAddressForm.is_default_address,
        is_favourite_address: addAddressForm.is_favourite_address
      };

      const response = await storeAddress(addressData);

      if (response.status === "success" || response.success || (response.message && !response.error)) {
        toast.success(response.message || "Address added successfully!");
        // Reset form
        setAddAddressForm({
          tag: "",
          adress_line: "",
          city: "",
          postal_code: "",
          country: "United Kingdom",
          is_default_address: false,
          is_favourite_address: false
        });
        // Fetch updated addresses list
        const token = getApiToken();
        if (token) {
          try {
            const addressesResponse = await fetchAddresses(token);
            if (addressesResponse.status === "success" && addressesResponse.data) {
              setAddresses(await scopeAddressesIfNeeded(addressesResponse.data, token));
            }
          } catch (error) {
            console.error("Error refreshing addresses:", error);
          }
        }
        // Navigate back to profile
        startTransition(() => {
          navigate("/customer/dashboard/profile");
        });
      } else {
        toast.error(response.message || response.error || "Failed to add address. Please try again.");
      }
    } catch (error: any) {
      console.error("Error adding address:", error);
      const errorMessage = error?.message || error?.error || "An error occurred while adding the address. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmittingAddress(false);
    }
  };

  const handleBackToProfile = () => {
    startTransition(() => {
      navigate("/customer/dashboard/profile");
    });
  };

  const handleEditAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editAddressForm.tag.trim() || !editAddressForm.adress_line.trim() || 
        !editAddressForm.city.trim() || !editAddressForm.postal_code.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Get the address ID from the route parameter or state
    const currentAddressId = addressIdToEdit;
    
    if (!currentAddressId || isNaN(currentAddressId)) {
      toast.error("Invalid address ID. Please try again.");
      console.error("Invalid address ID:", currentAddressId);
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to update address.");
      return;
    }

      setIsUpdatingAddress(true);
    try {
      // Ensure ID is a number for the API
      const addressIdForApi = typeof currentAddressId === 'string' ? parseInt(currentAddressId, 10) : currentAddressId;
      
      // Validate address ID is valid
      if (!addressIdForApi || isNaN(addressIdForApi) || addressIdForApi <= 0) {
        toast.error("Invalid address ID. Please try again.");
        console.error("Invalid address ID:", currentAddressId);
        return;
      }
      
      console.log("Updating address with ID:", addressIdForApi);
      console.log("Update data:", {
        id: addressIdForApi,
        tag: editAddressForm.tag.trim(),
        adress_line: editAddressForm.adress_line.trim(),
        city: editAddressForm.city.trim(),
        postal_code: editAddressForm.postal_code.trim(),
        country: editAddressForm.country,
        is_default_address: editAddressForm.is_default_address,
        is_favourite_address: editAddressForm.is_favourite_address
      });

      const response = await updateAddress({
        api_token: token,
        id: addressIdForApi,
        tag: editAddressForm.tag.trim(),
        adress_line: editAddressForm.adress_line.trim(),
        city: editAddressForm.city.trim(),
        postal_code: editAddressForm.postal_code.trim(),
        country: editAddressForm.country,
        is_default_address: editAddressForm.is_default_address,
        is_favourite_address: editAddressForm.is_favourite_address
      });

      console.log("Update response:", response);

      // Check for successful response - handle various response formats
      // API returns status: true (boolean) on success, status: false on error, or status: "success" (string)
      const status = response.status as any; // Can be boolean or string
      const successFlag = response.success;
      
      // Handle error response from API (status is false or success is false)
      if (status === false || status === "false" || successFlag === false) {
        const errorMsg = response.message || response.error || "Failed to update address. Please try again.";
        console.error("Address update failed:", errorMsg, "Response:", response);
        toast.error(errorMsg);
        return;
      }

      // Check for success - API returns status: true (boolean) or status: "success" (string)
      const isSuccess = status === true || 
                       status === "success" ||
                       status === "true" ||
                       successFlag === true || 
                       (response.message && !response.error && status !== false && status !== "false");

      if (isSuccess) {
        // Use response data if available, otherwise use form data
        const updatedAddressData = response.data || {
          id: currentAddressId,
          tag: editAddressForm.tag.trim(),
          adress_line: editAddressForm.adress_line.trim(),
          city: editAddressForm.city.trim(),
          postal_code: editAddressForm.postal_code.trim(),
          country: editAddressForm.country,
          is_default_address: editAddressForm.is_default_address ? 1 : 0,
          is_favourite_address: editAddressForm.is_favourite_address ? 1 : 0,
          updated_at: new Date().toISOString()
        };

        // Immediately update local state for instant UI update (handle both string and number IDs)
        setAddresses(prevAddresses => 
          prevAddresses.map(addr => {
            const addrId = typeof addr.id === 'string' ? parseInt(addr.id, 10) : addr.id;
            return addrId === currentAddressId 
              ? {
                  ...addr,
                  ...updatedAddressData,
                  // Ensure numeric format for boolean fields
                  is_default_address: typeof updatedAddressData.is_default_address === 'boolean' 
                    ? (updatedAddressData.is_default_address ? 1 : 0)
                    : updatedAddressData.is_default_address,
                  is_favourite_address: typeof updatedAddressData.is_favourite_address === 'boolean'
                    ? (updatedAddressData.is_favourite_address ? 1 : 0)
                    : updatedAddressData.is_favourite_address,
                }
              : addr;
          })
        );

        toast.success(response.message || "Address updated successfully!");
        
        // Navigate back to profile - the UI is already updated above
        startTransition(() => {
          navigate("/customer/dashboard/profile");
        });
        
        // Refresh addresses from API in the background to ensure consistency with server
        // Use a small delay to let navigation complete, then refresh
        const refreshAddresses = async () => {
          try {
            const addressesResponse = await fetchAddresses(token);
            if (addressesResponse.status === "success" && addressesResponse.data) {
              setAddresses(await scopeAddressesIfNeeded(addressesResponse.data, token));
            }
          } catch (refreshError) {
            console.error("Error refreshing addresses after update:", refreshError);
            // Don't show error to user since update was successful and UI is already updated
          }
        };
        
        // Refresh immediately after a brief delay to let navigation settle
        setTimeout(refreshAddresses, 200);
      } else {
        // Handle case where response doesn't indicate success
        const errorMsg = response.message || response.error || "Failed to update address. Please try again.";
        console.error("Update failed. Response:", response);
        toast.error(errorMsg);
      }
    } catch (error: any) {
      console.error("Error updating address:", error);
      console.error("Attempted to update address ID:", currentAddressId);
      
      // Handle 404 specifically
      if (error?.status === 404 || error?.response?.status === 404) {
        toast.error("Address not found. It may have been deleted.");
        startTransition(() => {
          navigate("/customer/dashboard/profile");
        });
      } else if (error?.message?.includes("404") || error?.error?.includes("404")) {
        toast.error("Address not found. It may have been deleted.");
        startTransition(() => {
          navigate("/customer/dashboard/profile");
        });
      } else if (error?.message?.toLowerCase().includes("not found")) {
        toast.error("Address not found. It may have been deleted.");
        startTransition(() => {
          navigate("/customer/dashboard/profile");
        });
      } else {
        const errorMessage = error?.message || error?.error || "An error occurred while updating the address. Please try again.";
        toast.error(errorMessage);
      }
    } finally {
      setIsUpdatingAddress(false);
    }
  };

  const handleEditAddress = (address: AddressResponse) => {
    // Validate address ID before navigating
    if (!address || address.id === null || address.id === undefined) {
      toast.error("Invalid address data. Cannot edit this address.");
      console.error("Invalid address:", address);
      return;
    }
    
    const addressId = typeof address.id === 'string' ? parseInt(address.id, 10) : address.id;
    if (isNaN(addressId) || addressId <= 0) {
      toast.error("Invalid address ID. Cannot edit this address.");
      console.error("Invalid address ID:", address.id);
      return;
    }
    
    startTransition(() => {
      navigate(`/customer/dashboard/profile/addresses/edit/${addressId}`);
    });
  };

  const handleDeleteAddress = (id: number) => {
    setAddressIdToDelete(id);
    setIsDeleteAddressModalOpen(true);
  };

  const handleDeleteCancel = () => {
    if (!isDeletingAddress) {
      setIsDeleteAddressModalOpen(false);
      setAddressIdToDelete(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!addressIdToDelete) {
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to delete address.");
      setIsDeleteAddressModalOpen(false);
      setAddressIdToDelete(null);
      return;
    }

    setIsDeletingAddress(true);
    try {
      const response = await deleteAddress({ api_token: token, id: addressIdToDelete });
      
      const deleteStatus = response.status as any; // Can be boolean or string
      if ((deleteStatus === true || deleteStatus === "success" || deleteStatus === "true") || response.success === true) {
        // Save the deleted ID before clearing state
        const deletedAddressId = addressIdToDelete;
        
        // Immediately remove from local state for instant UI update (handle both string and number IDs)
        setAddresses(prevAddresses => prevAddresses.filter(addr => {
          const addrId = typeof addr.id === 'string' ? parseInt(addr.id, 10) : addr.id;
          return addrId !== deletedAddressId;
        }));
        
        // Close modal immediately
        setIsDeleteAddressModalOpen(false);
        setAddressIdToDelete(null);
        
        // Show success message
        toast.success(response.message || "Address deleted successfully");
        
        // Refresh addresses from API in the background to ensure consistency
        try {
          const addressesResponse = await fetchAddresses(token);
          if (addressesResponse.status === "success" && addressesResponse.data) {
            setAddresses(await scopeAddressesIfNeeded(addressesResponse.data, token));
          }
        } catch (refreshError) {
          console.error("Error refreshing addresses after delete:", refreshError);
          // Don't show error to user since deletion was successful
        }
        
        // If we're on the edit page for the deleted address, navigate back to profile
        if (isEditAddressRoute && deletedAddressId === addressIdToEdit) {
          startTransition(() => {
            navigate("/customer/dashboard/profile");
          });
        }
      } else {
        toast.error(response.message || response.error || "Failed to delete address");
      }
    } catch (error: any) {
      console.error("Error deleting address:", error);
      
      // Handle 404 specifically
      if (error?.status === 404 || error?.response?.status === 404) {
        // Address might already be deleted, remove from local state anyway (handle both string and number IDs)
        setAddresses(prevAddresses => prevAddresses.filter(addr => {
          const addrId = typeof addr.id === 'string' ? parseInt(addr.id, 10) : addr.id;
          return addrId !== addressIdToDelete;
        }));
        setIsDeleteAddressModalOpen(false);
        setAddressIdToDelete(null);
        toast.error("Address not found. It may have already been deleted.");
        
        // If we're on the edit page, navigate back
        if (isEditAddressRoute && addressIdToDelete === addressIdToEdit) {
          startTransition(() => {
            navigate("/customer/dashboard/profile");
          });
        }
      } else {
        toast.error(error?.message || error?.error || "Failed to delete address. Please try again.");
      }
    } finally {
      setIsDeletingAddress(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to update address.");
      return;
    }

    const addressToUpdate = addresses.find(addr => {
      const addrId = typeof addr.id === 'string' ? parseInt(addr.id, 10) : addr.id;
      return addrId === id;
    });

    if (!addressToUpdate) {
      toast.error("Address not found. Please refresh the page.");
      return;
    }

    // Only clear "default" on rows that belong to this customer. If GET /addresses ever mixes
    // other users' rows, a previous default could be someone else's id — the API then returns "Address not found".
    const ownerId = normalizeAddressOwnerId(addressToUpdate.user_id);
    const previousDefault = addresses.find((addr) => {
      const addrId = typeof addr.id === "string" ? parseInt(addr.id, 10) : addr.id;
      const sameOwner = normalizeAddressOwnerId(addr.user_id) === ownerId;
      return addrId !== id && sameOwner && isStoredAddressDefault(addr.is_default_address);
    });

    setSettingDefaultAddressId(id);
    try {
      // Clear the old default on the server so only one row is default and the former default can show the star again
      if (previousDefault) {
        const prevId =
          typeof previousDefault.id === "string"
            ? parseInt(previousDefault.id, 10)
            : previousDefault.id;
        const clearRes = await updateAddress({
          api_token: token,
          id: prevId,
          tag: previousDefault.tag,
          adress_line: previousDefault.adress_line,
          city: previousDefault.city,
          postal_code: previousDefault.postal_code,
          country: previousDefault.country,
          is_default_address: false,
          is_favourite_address: Number(previousDefault.is_favourite_address) === 1,
        });
        if (!isAddressUpdateSuccess(clearRes)) {
          toast.error(
            clearRes.message || clearRes.error || "Failed to clear the previous default address"
          );
          return;
        }
      }

      const response = await updateAddress({
        api_token: token,
        id,
        tag: addressToUpdate.tag,
        adress_line: addressToUpdate.adress_line,
        city: addressToUpdate.city,
        postal_code: addressToUpdate.postal_code,
        country: addressToUpdate.country,
        is_default_address: true,
        is_favourite_address: Number(addressToUpdate.is_favourite_address) === 1,
      });

      if (!isAddressUpdateSuccess(response)) {
        toast.error(response.message || response.error || "Failed to set default address");
        return;
      }

      // Exactly one default locally: chosen card is default (no star); former default loses badge and gains the Star
      setAddresses((prev) =>
        prev.map((addr) => {
          const addrId = typeof addr.id === "string" ? parseInt(addr.id, 10) : addr.id;
          return { ...addr, is_default_address: addrId === id ? 1 : 0 };
        })
      );

      const nextStarredId =
        previousDefault != null
          ? normalizeAddressId(previousDefault.id)
          : (() => {
              const other = addresses.find((a) => normalizeAddressId(a.id) !== id);
              return other ? normalizeAddressId(other.id) : null;
            })();
      setStarredAddressId(nextStarredId);

      try {
        const addressesResponse = await fetchAddresses(token);
        const listStatus = addressesResponse.status as boolean | string | undefined;
        if (
          (listStatus === "success" || listStatus === true || listStatus === "true") &&
          Array.isArray(addressesResponse.data)
        ) {
          const scoped = await scopeAddressesIfNeeded(addressesResponse.data, token);
          setAddresses(
            scoped.map((addr) => ({
              ...addr,
              is_default_address: isStoredAddressDefault(addr.is_default_address) ? 1 : 0,
            }))
          );
        }
      } catch (refreshErr) {
        console.error("Error refreshing addresses after set default:", refreshErr);
      }
      toast.success(response.message || "Default address updated");
    } catch (error: unknown) {
      console.error("Error updating address:", error);
      const err = error as { message?: string };
      toast.error(err?.message || "Failed to update address. Please try again.");
    } finally {
      setSettingDefaultAddressId(null);
    }
  };

  const handleSaveAddress = async () => {
    if (!addressForm.label || !addressForm.street || !addressForm.city || !addressForm.postcode) {
      toast.error("Please fill in all required fields");
      return;
    }

    const token = getApiToken();
    if (!token) {
      toast.error("Please log in to save address.");
      return;
    }

    if (editingAddress) {
      // Update existing address using API
      try {
        const response = await updateAddress({
          api_token: token,
          id: editingAddress.id,
          tag: addressForm.label,
          adress_line: addressForm.street,
          city: addressForm.city,
          postal_code: addressForm.postcode,
          country: addressForm.country,
          is_default_address: editingAddress.is_default_address === 1,
          is_favourite_address: editingAddress.is_favourite_address === 1
        });

        const saveAddressStatus = response.status as any; // Can be boolean or string
        if ((saveAddressStatus === true || saveAddressStatus === "success" || saveAddressStatus === "true") || response.success === true) {
          // Refresh addresses from API
          const addressesResponse = await fetchAddresses(token);
          if (addressesResponse.status === "success" && addressesResponse.data) {
            setAddresses(await scopeAddressesIfNeeded(addressesResponse.data, token));
          }
          toast.success(response.message || "Address updated successfully");
        } else {
          toast.error(response.message || response.error || "Failed to update address");
        }
      } catch (error: any) {
        console.error("Error updating address:", error);
        toast.error(error?.message || "Failed to update address. Please try again.");
      }
    } else {
      // Add new address - this shouldn't happen via modal anymore, but handle it
      toast.error("Please use the 'Add New Address' button to add addresses");
    }

    setAddressModalOpen(false);
    setEditingAddress(null);
    setAddressForm({
      label: "",
      street: "",
      city: "",
      postcode: "",
      country: "United Kingdom"
    });
  };

  const menuItems = [
    { id: "overview" as CustomerView, label: "Overview", icon: LayoutDashboard },
    { id: "bookings" as CustomerView, label: "My Bookings", icon: Calendar },
    { id: "payments" as CustomerView, label: "Payments", icon: CreditCard },
    { id: "quote-requests" as CustomerView, label: "My Quote Request", icon: FileText },
    { id: "profile" as CustomerView, label: "My Profile", icon: User },
    { id: "admin-messages" as CustomerView, label: "Admin-Message", icon: MessageSquare },
    { id: "notifications" as CustomerView, label: "Notifications", icon: Bell },
    { id: "settings" as CustomerView, label: "Settings", icon: Settings },
  ];

  const renderOverview = () => (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl text-[#0A1A2F] mb-2">Welcome back, {customerName}!</h1>
          <p className="text-gray-600 text-sm md:text-base">Here's an overview of your fire safety services.</p>
        </div>
        <Button 
          onClick={onBookNewService}
          className="bg-red-600 hover:bg-red-700 w-full md:w-auto h-12 md:h-10"
        >
          <Plus className="w-4 h-4 mr-2" />
          Book New Service
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 min-w-0">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
          onClick={() => handleViewChange("bookings")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Bookings</p>
                {isLoadingDashboardSummary ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  </div>
                ) : (
                  <p className="text-3xl text-[#0A1A2F]">{upcomingBookings}</p>
                )}
                <p className="text-sm text-blue-600 mt-2 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Upcoming services
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
          onClick={() => handleViewChange("bookings")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                {isLoadingDashboardSummary ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
                  </div>
                ) : (
                  <p className="text-3xl text-[#0A1A2F]">{completedBookings}</p>
                )}
                <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Services completed
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
          onClick={() => handleViewChange("payments")}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Spent</p>
                {isLoadingDashboardSummary ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                  </div>
                ) : (
                  <p className="text-3xl text-[#0A1A2F]">{formatGbp(totalSpent)}</p>
                )}
                <p className="text-sm text-purple-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  All time
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Bookings & Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6 min-w-0">
        <Card className="overflow-hidden min-w-0">
          <CardContent className="p-4 sm:p-6 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-4 min-w-0">
              <h3 className="text-[#0A1A2F] min-w-0 truncate">Upcoming Bookings</h3>
              <Button 
                variant="link" 
                className="text-red-600 p-0 h-auto shrink-0 whitespace-nowrap text-sm"
                onClick={() => handleViewChange("bookings")}
              >
                View All →
              </Button>
            </div>
            {isLoadingUpcomingBookings ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-3 animate-spin" />
                <p className="text-gray-600">Loading bookings...</p>
              </div>
            ) : upcomingBookingsList.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No upcoming bookings</p>
                <Button 
                  onClick={onBookNewService}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Book Your First Service
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookingsList
                  .slice(0, 3)
                  .map((booking) => {
                    // Format the date for display
                    const formattedDate = new Date(booking.selected_date).toLocaleDateString('en-GB', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    });
                    // Get service name from API, fallback to default
                    const serviceName = booking.service?.service_name || 'Fire Safety Service';
                    
                    // Get professional name - check both full_name and name fields
                    const professionalName = booking.professional?.full_name || booking.professional?.name || 'Professional';
                    
                    return (
                      <div 
                        key={booking.id} 
                        className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer min-w-0"
                        onClick={() => handleViewChange("bookings")}
                      >
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                          <Shield className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 break-words">{serviceName}</p>
                          <p className="text-sm text-gray-600 break-words">{professionalName}</p>
                          <p className="text-xs text-gray-500 mt-1 flex items-start gap-1 min-w-0">
                            <Clock className="w-3 h-3 shrink-0 mt-0.5" />
                            <span className="break-words">
                              {formattedDate} at {booking.selected_time}
                            </span>
                          </p>
                        </div>
                        <Badge
                          variant="custom"
                          className="w-fit shrink-0 whitespace-nowrap bg-blue-100 text-blue-700 border border-blue-200"
                        >
                          Upcoming
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden min-w-0">
          <CardContent className="p-4 sm:p-6 min-w-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 mb-4 min-w-0">
              <div className="min-w-0 flex-1">
                <h3 className="text-[#0A1A2F]">Recent Activity</h3>
                {!isLoadingRecentActivity && recentActivity.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1 break-words">
                    {recentActivity.length} update{recentActivity.length === 1 ? "" : "s"}
                    {recentActivity.length > 10 ? " — scroll the list for older items" : ""}
                  </p>
                )}
              </div>
              {!isLoadingRecentActivity && recentActivity.length > 0 && (
                <Button
                  variant="link"
                  className="text-red-600 p-0 h-auto shrink-0 whitespace-nowrap text-sm self-start"
                  onClick={() => handleViewChange("notifications")}
                >
                  Notifications →
                </Button>
              )}
            </div>
            <div>
              {isLoadingRecentActivity ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-3 animate-spin" />
                  <p className="text-gray-600">Loading activity...</p>
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">No activity yet</p>
                </div>
              ) : (
                <div
                  className={
                    recentActivity.length > 10
                      ? "max-h-96 overflow-y-auto overscroll-y-contain pr-1 min-w-0"
                      : "min-w-0"
                  }
                >
                  <div className="space-y-2 pb-0.5">
                    {recentActivity.map((activity, index) => {
                      const titleLower = activity.title.toLowerCase();
                      const isPayment =
                        titleLower.includes("payment") ||
                        titleLower.includes("paid") ||
                        titleLower.includes("processed");

                      return (
                        <div
                          key={`${activity.date}-${activity.title}-${index}`}
                          className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/80 p-3 hover:bg-gray-100/90 transition-colors min-w-0"
                        >
                          <div
                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                              isPayment ? "bg-emerald-100" : "bg-red-100"
                            }`}
                          >
                            {isPayment ? (
                              <CreditCard className="h-5 w-5 text-emerald-700" />
                            ) : (
                              <Activity className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 leading-snug">
                              {activity.title}
                            </p>
                            {activity.service_name ? (
                              <p className="text-xs text-gray-600 mt-0.5 truncate">
                                {activity.service_name}
                              </p>
                            ) : null}
                            <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-1">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              <span>{formatActivityDateDisplay(activity.date)}</span>
                              {activity.amount ? (
                                <span className="text-gray-600">• {activity.amount}</span>
                              ) : null}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-[#0A1A2F] mb-2">My Profile</h1>
        <p className="text-gray-600">Manage your account information and preferences.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6 mb-6">
            <div className="relative">
              {(profileImageUrl || imagePreview) ? (
                <img
                  src={imagePreview || profileImageUrl || ""}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
                  <User className="w-12 h-12 text-red-600" />
                </div>
              )}
              {isUploadingImage && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-2xl text-[#0A1A2F] mb-1">{profileForm?.full_name || customerName}</h2>
              <p className="text-gray-600">{profileForm?.email || customerEmail}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <Button
                variant="outline"
                className="mt-3"
                onClick={handleImageClick}
                disabled={isUploadingImage}
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Change Photo
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Full Name</label>
                <input 
                  type="text" 
                  value={profileForm?.full_name || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  disabled={isUpdatingProfile}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Email Address</label>
                <input 
                  type="email" 
                  value={profileForm?.email || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter your email address"
                  disabled={isUpdatingProfile}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Phone Number</label>
                <input 
                  type="tel" 
                  value={profileForm?.phone || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter your phone number"
                  disabled={isUpdatingProfile}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Property Type</label>
                <select 
                  value={profileForm?.property_type || "Residential"}
                  onChange={(e) => setProfileForm({ ...profileForm, property_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent" 
                  disabled={isUpdatingProfile}
                >
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Industrial">Industrial</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button 
                className="bg-red-600 hover:bg-red-700"
                onClick={handleSaveProfile}
                disabled={isUpdatingProfile}
              >
                {isUpdatingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  // Reset form to current saved values from API
                  const token = getApiToken();
                  if (token) {
                    // Re-fetch customer data to reset form
                    getCustomerData(token).then(response => {
                      if (response.status === true && response.data) {
                        const customerData = response.data;
                        setProfileForm({
                          full_name: customerData.full_name || initialUserData.name,
                          email: customerData.email || initialUserData.email,
                          phone: customerData.phone || initialUserData.phone,
                          property_type: customerData.property_type?.name || "Residential",
                          property_type_id: customerData.property_type?.id || 18
                        });
                      }
                    }).catch(error => {
                      console.error('Error resetting form:', error);
                      // Fallback to initial values
                      const userData = getUserData();
                      setProfileForm({
                        full_name: customerName,
                        email: customerEmail,
                        phone: userData.phone,
                        property_type: "Residential",
                        property_type_id: 18
                      });
                    });
                  } else {
                    // Fallback to initial values
                    const userData = getUserData();
                    setProfileForm({
                      full_name: customerName,
                      email: customerEmail,
                      phone: userData.phone,
                      property_type: "Residential",
                      property_type_id: 18
                    });
                  }
                }}
                disabled={isUpdatingProfile}
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saved Addresses Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl text-[#0A1A2F]">Saved Addresses</h3>
            <Button 
              onClick={handleAddAddress}
              className="bg-red-600 hover:bg-red-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Address 
            </Button>
          </div>

          {isLoadingAddresses ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-3 animate-spin" />
              <p className="text-gray-600">Loading addresses...</p>
            </div>
          ) : addresses.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No saved addresses yet</p>
              <Button 
                variant="outline"
                onClick={handleAddAddress}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Address
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {addresses.map((address) => {
                const addrId = normalizeAddressId(address.id);
                const showStarForDefault = starredAddressId !== null && addrId === starredAddressId;
                return (
                <div 
                  key={address.id} 
                  className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-red-300 transition-colors"
                >
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{address.tag}</p>
                      {isStoredAddressDefault(address.is_default_address) && (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" aria-hidden />
                          Default
                        </Badge>
                      )}
                      {Number(address.is_favourite_address) === 1 && (
                        <Badge className="bg-yellow-100 text-yellow-700">
                          <Heart className="w-3 h-3 mr-1" aria-hidden />
                          Favourite
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{address.adress_line}</p>
                    <p className="text-sm text-gray-600">
                      {address.city}, {address.postal_code}
                    </p>
                    <p className="text-sm text-gray-500">{address.country}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditAddress(address)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {!isStoredAddressDefault(address.is_default_address) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={settingDefaultAddressId !== null}
                        onClick={() => {
                          if (!isNaN(addrId) && addrId > 0) {
                            handleSetDefault(addrId);
                          } else {
                            toast.error("Invalid address ID");
                          }
                        }}
                        title="Set as default"
                        aria-label="Set as default address"
                      >
                        {settingDefaultAddressId === addrId ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-500" aria-hidden />
                        ) : showStarForDefault ? (
                          <Star className="h-4 w-4" aria-hidden />
                        ) : (
                          <Bookmark className="h-4 w-4 text-gray-600" aria-hidden />
                        )}
                      </Button>
                    )}
                    {!isStoredAddressDefault(address.is_default_address) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!isNaN(addrId) && addrId > 0) {
                            handleDeleteAddress(addrId);
                          } else {
                            toast.error("Invalid address ID");
                          }
                        }}
                        className="text-red-600 hover:text-red-700"
                        title="Delete address"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Address Modal */}
      <Dialog open={addressModalOpen} onOpenChange={setAddressModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#0A1A2F]">
              {editingAddress ? "Edit Address" : "Add New Address"}
            </DialogTitle>
            <DialogDescription>
              {editingAddress ? "Update your address details" : "Add a new address to your profile"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="address-label">Address Label *</Label>
              <Input
                id="address-label"
                value={addressForm.label}
                onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                placeholder="e.g., Home, Office, Warehouse"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="address-street">Street Address *</Label>
              <Input
                id="address-street"
                value={addressForm.street}
                onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                placeholder="123 Main Street"
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address-city">City *</Label>
                <Input
                  id="address-city"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  placeholder="London"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="address-postcode">Postcode *</Label>
                <Input
                  id="address-postcode"
                  value={addressForm.postcode}
                  onChange={(e) => setAddressForm({ ...addressForm, postcode: e.target.value })}
                  placeholder="SW1A 1AA"
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address-country">Country *</Label>
              <select
                id="address-country"
                value={addressForm.country}
                onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mt-2"
              >
                <option>United Kingdom</option>
                <option>Ireland</option>
                <option>Scotland</option>
                <option>Wales</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setAddressModalOpen(false);
                setEditingAddress(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={handleSaveAddress}
            >
              {editingAddress ? "Update Address" : "Save Address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Address Confirmation Modal */}
      <Dialog open={isDeleteAddressModalOpen} onOpenChange={(open) => {
        if (!open && !isDeletingAddress) {
          handleDeleteCancel();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl text-[#0A1A2F]">Delete Address</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 px-4">
            <DialogDescription className="text-base">
              Are you sure you want to delete this address?
            </DialogDescription>
          </div>

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={isDeletingAddress}
              className="h-10"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={isDeletingAddress}
              className="bg-red-600 hover:bg-red-700 h-10"
            >
              {isDeletingAddress ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Sure"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-[#0A1A2F] mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-[#0A1A2F] mb-4">Notification Preferences</h3>
          {isLoadingNotificationPreferences ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-3 animate-spin" />
              <p className="text-gray-600">Loading preferences...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { id: "booking", label: "Booking Confirmations", description: "Get notified when bookings are confirmed" },
                { id: "reminder", label: "Service Reminders", description: "Receive reminders before scheduled services" },
                { id: "report", label: "Report Uploads", description: "Notification when reports are available" },
                // { id: "marketing", label: "Marketing Emails", description: "Receive updates and special offers" },
              ].map((pref) => {
                const isChecked = getNotificationValue(pref.id);
                const isUpdating = updatingNotification === pref.id;

                return (
                  <div key={pref.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{pref.label}</p>
                      <p className="text-sm text-gray-600">{pref.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleNotificationToggle(pref.id, e.target.checked)}
                        disabled={isUpdating}
                        className="sr-only peer"
                      />
                      <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600 ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {isUpdating && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-3 h-3 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-[#0A1A2F] mb-4">Account Security</h3>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setIsChangePasswordDialogOpen(true)}
            >
              Change Password
            </Button>
            {/* <Button variant="outline" className="w-full justify-start">Enable Two-Factor Authentication</Button> */}
            <Button 
              variant="outline" 
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setIsDeleteAccountDialogOpen(true)}
            >
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Dialog */}
      {renderDeleteAccountDialog()}

      {/* Change Password Dialog */}
      <Dialog open={isChangePasswordDialogOpen} onOpenChange={setIsChangePasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#0A1A2F]">Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative mt-2 overflow-visible">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pl-10 pr-10"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => { e.preventDefault(); setShowCurrentPassword((p) => !p); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative mt-2 overflow-visible">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => { e.preventDefault(); setShowNewPassword((p) => !p); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">Must be at least 8 characters</p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative mt-2 overflow-visible">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => { e.preventDefault(); setShowConfirmPassword((p) => !p); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsChangePasswordDialogOpen(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setShowCurrentPassword(false);
                  setShowNewPassword(false);
                  setShowConfirmPassword(false);
                }}
                disabled={isChangingPassword}
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangePassword}
                className="bg-red-600 hover:bg-red-700"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Changing...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Change Password
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Handle notification preference toggle
  const handleNotificationToggle = async (prefId: string, newCheckedState: boolean) => {
    const token = getApiToken();
    if (!token) {
      toast.error("Authentication required. Please log in again.");
      return;
    }

    // Map preference ID to API column name
    const columnMap: Record<string, 'is_booking_confirmation' | 'is_service_reminders' | 'report_uploads' | 'marketing_emails'> = {
      'booking': 'is_booking_confirmation',
      'reminder': 'is_service_reminders',
      'report': 'report_uploads',
      'marketing': 'marketing_emails',
    };

    const column = columnMap[prefId];
    if (!column) {
      console.error('Invalid preference ID:', prefId);
      return;
    }

    setUpdatingNotification(prefId);
    try {
      // Store current state before making API call
      const currentState = notificationPreferences ? { ...notificationPreferences } : null;
      console.log(`Toggling ${prefId} (${column}) to ${newCheckedState ? 'ON' : 'OFF'}. Current state:`, currentState);
      
      let response;
      if (newCheckedState) {
        // Toggle is being turned ON - call enable API
        response = await enableNotification({
          api_token: token,
          column: column,
        });
      } else {
        // Toggle is being turned OFF - call disable API
        response = await disableNotification({
          api_token: token,
          column: column,
        });
      }

      console.log(`API response for ${column}:`, response);

      if (response.success && response.data) {
        // Use functional update to only update the specific field that changed
        setNotificationPreferences((prevState) => {
          // Start with previous state or defaults
          const baseState: NotificationPreferencesData = prevState || {
            id: 0,
            is_booking_confirmation: 0,
            is_service_reminders: 0,
            report_uploads: 0,
            marketing_emails: 0,
            user_id: 0,
            created_at: '',
            updated_at: '',
          };

          // Helper function to normalize a single value
          const normalizeValue = (value: number | boolean | undefined, defaultValue: number): number => {
            if (value === undefined || value === null) return defaultValue;
            if (typeof value === 'boolean') return value ? 1 : 0;
            if (typeof value === 'number') return value;
            return defaultValue;
          };
          const toNum = (v: number | boolean): number => (v === 1 || v === true ? 1 : 0);

          // Only update the specific field that was toggled, preserve all others from previous state
          const updatedState: NotificationPreferencesData = {
            ...baseState,
            id: response.data.id ?? baseState.id,
            user_id: response.data.user_id ?? baseState.user_id,
            created_at: response.data.created_at || baseState.created_at,
            updated_at: response.data.updated_at || baseState.updated_at,
            // Update only the field that was changed, use API response if available, otherwise keep previous state
            is_booking_confirmation: column === 'is_booking_confirmation'
              ? normalizeValue(response.data.is_booking_confirmation, newCheckedState ? 1 : 0)
              : normalizeValue(response.data.is_booking_confirmation, toNum(baseState.is_booking_confirmation)),
            is_service_reminders: column === 'is_service_reminders'
              ? normalizeValue(response.data.is_service_reminders, newCheckedState ? 1 : 0)
              : normalizeValue(response.data.is_service_reminders, toNum(baseState.is_service_reminders)),
            report_uploads: column === 'report_uploads'
              ? normalizeValue(response.data.report_uploads, newCheckedState ? 1 : 0)
              : normalizeValue(response.data.report_uploads, toNum(baseState.report_uploads)),
            marketing_emails: column === 'marketing_emails'
              ? normalizeValue(response.data.marketing_emails, newCheckedState ? 1 : 0)
              : normalizeValue(response.data.marketing_emails, toNum(baseState.marketing_emails)),
          };

          console.log(`Updated ${column} to ${newCheckedState ? 'ON' : 'OFF'}`);
          console.log('Updated state:', {
            booking: updatedState.is_booking_confirmation,
            reminder: updatedState.is_service_reminders,
            report: updatedState.report_uploads,
            marketing: updatedState.marketing_emails,
          });

          return updatedState;
        });
        toast.success(response.message || "Notification preference updated successfully");
      } else {
        toast.error(response.message || "Failed to update notification preference");
      }
    } catch (error: any) {
      console.error("Error updating notification preference:", error);
      toast.error(error.message || "Failed to update notification preference. Please try again.");
    } finally {
      setUpdatingNotification(null);
    }
  };

  // Get notification preference value — must match stored 0/1 and API true/false
  const getNotificationValue = (prefId: string): boolean => {
    if (!notificationPreferences) {
      return false;
    }

    const valueMap: Record<string, keyof NotificationPreferencesData> = {
      'booking': 'is_booking_confirmation',
      'reminder': 'is_service_reminders',
      'report': 'report_uploads',
      'marketing': 'marketing_emails',
    };

    const key = valueMap[prefId];
    if (!key) {
      return false;
    }

    const value = notificationPreferences[key];
    // Handle number (0/1) - most common case after conversion
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'boolean') return value;
    // Fallback for string or other (e.g. "true" / "1")
    if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
    return false;
  };

  // Handle delete account
  const handleDeleteAccount = async () => {
    const token = getApiToken();
    if (!token) {
      toast.error("Authentication required. Please log in again.");
      return;
    }

    setIsDeletingAccount(true);
    try {
      const response = await deleteAccount({ api_token: token });
      if ((response as { status?: boolean }).status === true) {
        toast.success(response.message || "Account deleted successfully");
        // Clear local storage and logout
        localStorage.clear();
        setTimeout(() => {
          onLogout();
        }, 1500);
      } else {
        toast.error(response.message || "Failed to delete account");
      }
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error(error.message || "Failed to delete account. Please try again.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

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

  const adminMessageRowKey = (item: CustomerAdminContactMessageItem, index: number): string => {
    if (typeof item.id === "number" && item.id > 0) return `id:${item.id}`;
    const stamp = item.created_at || "";
    const head = (item.message || "").slice(0, 80);
    return `h:${stamp}|${head}|${index}`;
  };

  const renderAdminMessages = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-[#0A1A2F] mb-2">Admin-Message</h1>
        <p className="text-gray-600">Messages from the Fire Guide team about your account or bookings.</p>
      </div>

      {isLoadingAdminContactMessages ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-3 animate-spin" />
          <p className="text-gray-600">Loading messages...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {adminContactMessages.length > 0 ? (
            [...adminContactMessages]
              .sort((a, b) => {
                const ta = new Date(a.created_at || 0).getTime();
                const tb = new Date(b.created_at || 0).getTime();
                return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
              })
              .map((row, index) => (
                <Card key={adminMessageRowKey(row, index)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{row.title || "Admin message"}</p>
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap break-words">
                          {row.message || ""}
                        </p>
                        {row.created_at ? (
                          <p className="text-xs text-gray-500 mt-2">{formatTimestamp(row.created_at)}</p>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No admin messages yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-[#0A1A2F] mb-2">Notifications</h1>
        <p className="text-gray-600">Stay updated with your bookings and services.</p>
      </div>

      {isLoadingNotifications ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-3 animate-spin" />
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.length > 0 ? (
            [...notifications]
              .sort((a, b) => {
                const ta = new Date(a.created_at || 0).getTime();
                const tb = new Date(b.created_at || 0).getTime();
                return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
              })
              .map((notification) => (
              <Card key={getCustomerNotificationDedupeKey(notification)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bell className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {notification.title || "Notification"}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message || ""}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {notification.created_at ? formatTimestamp(notification.created_at) : ""}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No notifications yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );

  // Delete Account Confirmation Dialog
  const renderDeleteAccountDialog = () => (
    <Dialog open={isDeleteAccountDialogOpen} onOpenChange={setIsDeleteAccountDialogOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-red-600">Delete Account</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete your account? This action cannot be undone. All your data, bookings, and payment history will be permanently deleted.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-600">
            This will permanently delete your account and all associated data. You will be logged out immediately after deletion.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsDeleteAccountDialogOpen(false)}
            disabled={isDeletingAccount}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAccount}
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={isDeletingAccount}
          >
            {isDeletingAccount ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderContent = () => {
    // If on edit address route, show the edit address form
    if (isEditAddressRoute && addressIdToEdit) {
      if (isLoadingEditAddress) {
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-3 animate-spin" />
              <p className="text-gray-600">Loading address...</p>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-6">
          <Button
            variant="ghost"
            onClick={handleBackToProfile}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-[#0A1A2F]">Edit Address</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEditAddressSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="edit-tag" className="text-sm font-medium">
                    Address Name (Tag) <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="edit-tag"
                    value={editAddressForm.tag}
                    onChange={(e) => setEditAddressForm({ ...editAddressForm, tag: e.target.value })}
                    className="mt-2 h-11"
                    placeholder="e.g., Home, Office, Warehouse"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="edit-adress_line" className="text-sm font-medium">
                    Address Line <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="edit-adress_line"
                    value={editAddressForm.adress_line}
                    onChange={(e) => setEditAddressForm({ ...editAddressForm, adress_line: e.target.value })}
                    className="mt-2 h-11"
                    placeholder="e.g., 123 Main Street, Rampura"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-city" className="text-sm font-medium">
                      City <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="edit-city"
                      value={editAddressForm.city}
                      onChange={(e) => setEditAddressForm({ ...editAddressForm, city: e.target.value })}
                      className="mt-2 h-11"
                      placeholder="e.g., Dhaka, London"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-postal_code" className="text-sm font-medium">
                      Postal Code <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="edit-postal_code"
                      value={editAddressForm.postal_code}
                      onChange={(e) => setEditAddressForm({ ...editAddressForm, postal_code: e.target.value })}
                      className="mt-2 h-11"
                      placeholder="e.g., 1205, SW1A 1AA"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-country" className="text-sm font-medium">
                    Country <span className="text-red-600">*</span>
                  </Label>
                  <select
                    id="edit-country"
                    value={editAddressForm.country}
                    onChange={(e) => setEditAddressForm({ ...editAddressForm, country: e.target.value })}
                    className="mt-2 w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    required
                  >
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Bangladesh">Bangladesh</option>
                    <option value="Ireland">Ireland</option>
                    <option value="Scotland">Scotland</option>
                    <option value="Wales">Wales</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editAddressForm.is_default_address}
                      onChange={(e) => setEditAddressForm({ ...editAddressForm, is_default_address: e.target.checked })}
                      className="w-4 h-4 border-gray-300 rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">Set as default address</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editAddressForm.is_favourite_address}
                      onChange={(e) => setEditAddressForm({ ...editAddressForm, is_favourite_address: e.target.checked })}
                      className="w-4 h-4 border-gray-300 rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">Mark as favourite address</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackToProfile}
                    disabled={isUpdatingAddress}
                    className="h-10"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 h-10"
                    disabled={isUpdatingAddress}
                  >
                    {isUpdatingAddress ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Update Address
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      );
    }

    // If on add address route, show the add address form
    if (isAddAddressRoute) {
      return (
        <div className="space-y-6">
          <Button
            variant="ghost"
            onClick={handleBackToProfile}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-[#0A1A2F]">Add New Address</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddAddressSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="tag" className="text-sm font-medium">
                    Address Name (Tag) <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="tag"
                    value={addAddressForm.tag}
                    onChange={(e) => setAddAddressForm({ ...addAddressForm, tag: e.target.value })}
                    className="mt-2 h-11"
                    placeholder="e.g., Home, Office, Warehouse"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="adress_line" className="text-sm font-medium">
                    Address Line <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="adress_line"
                    value={addAddressForm.adress_line}
                    onChange={(e) => setAddAddressForm({ ...addAddressForm, adress_line: e.target.value })}
                    className="mt-2 h-11"
                    placeholder="e.g., 123 Main Street, Rampura"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city" className="text-sm font-medium">
                      City <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="city"
                      value={addAddressForm.city}
                      onChange={(e) => setAddAddressForm({ ...addAddressForm, city: e.target.value })}
                      className="mt-2 h-11"
                      placeholder="e.g., Dhaka, London"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="postal_code" className="text-sm font-medium">
                      Postal Code <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="postal_code"
                      value={addAddressForm.postal_code}
                      onChange={(e) => setAddAddressForm({ ...addAddressForm, postal_code: e.target.value })}
                      className="mt-2 h-11"
                      placeholder="e.g., 1205, SW1A 1AA"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="country" className="text-sm font-medium">
                    Country <span className="text-red-600">*</span>
                  </Label>
                  <select
                    id="country"
                    value={addAddressForm.country}
                    onChange={(e) => setAddAddressForm({ ...addAddressForm, country: e.target.value })}
                    className="mt-2 w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    required
                  >
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Bangladesh">Bangladesh</option>
                    <option value="Ireland">Ireland</option>
                    <option value="Scotland">Scotland</option>
                    <option value="Wales">Wales</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addAddressForm.is_default_address}
                      onChange={(e) => setAddAddressForm({ ...addAddressForm, is_default_address: e.target.checked })}
                      className="w-4 h-4 border-gray-300 rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">Set as default address</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addAddressForm.is_favourite_address}
                      onChange={(e) => setAddAddressForm({ ...addAddressForm, is_favourite_address: e.target.checked })}
                      className="w-4 h-4 border-gray-300 rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">Mark as favourite address</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackToProfile}
                    disabled={isSubmittingAddress}
                    className="h-10"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 h-10"
                    disabled={isSubmittingAddress}
                  >
                    {isSubmittingAddress ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Add Address
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      );
    }

    switch (currentView) {
      case "overview":
        return renderOverview();
      case "bookings":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl text-[#0A1A2F] mb-2">My Bookings</h1>
              <p className="text-gray-600">View and manage all your fire safety service bookings.</p>
            </div>
            <CustomerBookings 
              bookings={bookings}
              onUpdateBooking={onUpdateBooking}
              onDeleteBooking={onDeleteBooking}
            />
          </div>
        );
      case "payments":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl text-[#0A1A2F] mb-2">Payment History</h1>
              <p className="text-gray-600">View your transaction history and download invoices.</p>
            </div>
            <CustomerPayments payments={payments} />
          </div>
        );
      case "quote-requests": {
        const quoteStatusStyleModal = (status: string): CSSProperties => {
          switch (status?.toLowerCase()) {
            case "pending":
              return { backgroundColor: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" };
            case "reviewed":
              return { backgroundColor: "#e0f2fe", color: "#0369a1", border: "1px solid #7dd3fc" };
            case "quoted":
              return { backgroundColor: "#d1fae5", color: "#047857", border: "1px solid #6ee7b7" };
            case "assigned":
              return { backgroundColor: "#ede9fe", color: "#5b21b6", border: "1px solid #c4b5fd" };
            case "accept":
            case "accepted":
              return { backgroundColor: "#dbeafe", color: "#1d4ed8", border: "1px solid #93c5fd" };
            case "completed":
              return { backgroundColor: "#e0f2fe", color: "#0c4a6e", border: "1px solid #7dd3fc" };
            case "paid":
              return { backgroundColor: "#dcfce7", color: "#166534", border: "1px solid #86efac" };
            default:
              return { backgroundColor: "#f1f5f9", color: "#334155", border: "1px solid #e2e8f0" };
          }
        };
        const formatQuoteStatusModal = (s: string) => {
          const lower = String(s ?? "").trim().toLowerCase();
          if (lower === "accept" || lower === "accepted") return "Accepted";
          if (!s) return "";
          return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        };

        const modalReq = selectedQuoteRequest;
        const modalRd =
          modalReq == null
            ? ""
            : typeof modalReq.request_data === "string"
              ? modalReq.request_data
              : JSON.stringify(modalReq.request_data ?? {});
        const modalDetailRows =
          modalReq == null ? [] : getCustomQuoteRequestDisplayRows(modalRd, fraDurationLabels);
        let modalNotes = "";
        let modalPreferredDateRaw = "";
        if (modalReq != null) {
          try {
            const parsed =
              typeof modalReq.request_data === "string"
                ? JSON.parse(modalReq.request_data)
                : modalReq.request_data;
            if (parsed && typeof parsed === "object" && parsed !== null) {
              const rec = parsed as Record<string, unknown>;
              const n = rec.notes;
              modalNotes = typeof n === "string" ? n.trim() : "";
              const pd = rec.preferred_date;
              modalPreferredDateRaw = typeof pd === "string" ? pd.trim() : "";
            }
          } catch {
            modalNotes = "";
          }
        }
        const modalStatusLower = normalizeQuoteRequestStatus(modalReq?.status);
        const modalIsAssigned = modalStatusLower === "assigned";
        const modalIsAccept = modalStatusLower === "accept" || modalStatusLower === "accepted";
        const modalIsCompleted = modalStatusLower === "completed";
        const modalQuoted = modalReq == null ? NaN : getQuoteRequestQuotedPriceNumber(modalReq);
        const modalHasPrice = Number.isFinite(modalQuoted) && modalQuoted > 0;
        const modalProName =
          modalReq?.professional?.name?.trim() || modalReq?.professional?.full_name?.trim() || "";
        const modalProEmail = modalReq?.professional?.email?.trim() || "";
        const modalProPhone =
          modalReq?.professional?.phone?.trim() ||
          modalReq?.professional?.mobile?.trim() ||
          modalReq?.professional?.phone_number?.trim() ||
          (typeof modalReq?.professional?.number === "string" && modalReq.professional.number.trim()) ||
          (modalReq?.professional?.number != null && String(modalReq.professional.number).trim()) ||
          "";
        const modalPaid = modalReq == null ? false : isQuoteRequestPaid(modalReq);
        const modalIsPaidField = modalReq != null && isQuoteRequestIsPaidFieldTrue(modalReq);
        const modalBadgeStatus = modalIsCompleted
          ? "completed"
          : modalPaid
            ? "paid"
            : modalReq?.status ?? "";
        const modalPriceDisplay =
          modalHasPrice && modalReq != null
            ? `£${modalQuoted.toLocaleString("en-GB", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            : null;
        const modalPreferredLabel =
          modalPreferredDateRaw && !Number.isNaN(Date.parse(modalPreferredDateRaw))
            ? new Date(modalPreferredDateRaw).toLocaleDateString("en-GB")
            : null;

        return (
          <>
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl text-[#0A1A2F] mb-2">My Quote Request</h1>
                <p className="text-gray-600">View your custom quote requests and their status.</p>
              </div>
              {isLoadingQuoteRequests ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
                    <p className="text-gray-600">Loading quote requests...</p>
                  </CardContent>
                </Card>
              ) : quoteRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No quote requests yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {(() => {
                    const quoteStatusStyle = (status: string): CSSProperties => quoteStatusStyleModal(status);
                    const formatQuoteStatus = (s: string) => formatQuoteStatusModal(s);
                    return quoteRequests.map((req) => {
                      let preferredDateRaw = "";
                      try {
                        const parsed =
                          typeof req.request_data === "string"
                            ? JSON.parse(req.request_data)
                            : req.request_data;
                        if (parsed && typeof parsed === "object" && parsed !== null) {
                          const pd = (parsed as Record<string, unknown>).preferred_date;
                          preferredDateRaw = typeof pd === "string" ? pd.trim() : "";
                        }
                      } catch {
                        preferredDateRaw = "";
                      }
                      const statusLower = normalizeQuoteRequestStatus(req.status);
                      const isAssignedQuote = statusLower === "assigned";
                      const isAcceptQuote = statusLower === "accept" || statusLower === "accepted";
                      const isCompletedQuote = statusLower === "completed";
                      const quotedAmount = getQuoteRequestQuotedPriceNumber(req);
                      const hasQuotedPrice = Number.isFinite(quotedAmount) && quotedAmount > 0;
                      const professionalName =
                        req.professional?.name?.trim() || req.professional?.full_name?.trim() || "";
                      const quotePaid = isQuoteRequestPaid(req);
                      const badgeStatus = isCompletedQuote
                        ? "completed"
                        : quotePaid
                          ? "paid"
                          : req.status;
                      const showQuoteApproveButton = isAssignedQuote && !isCompletedQuote && !quotePaid;
                      const showQuotePayButton =
                        isAcceptQuote &&
                        !isQuoteRequestIsPaidFieldTrue(req) &&
                        !quotePaid &&
                        !isCompletedQuote;
                      const priceDisplay = hasQuotedPrice
                        ? `£${quotedAmount.toLocaleString("en-GB", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : null;
                      const preferredDateLabel =
                        preferredDateRaw && !Number.isNaN(Date.parse(preferredDateRaw))
                          ? new Date(preferredDateRaw).toLocaleDateString("en-GB")
                          : null;

                      return (
                        <Card key={req.id} className="hover:shadow-lg transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                              <div className="flex-1 min-w-0 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h3 className="text-[#0A1A2F] mb-1">
                                      {req.service?.service_name || `Service #${req.service_id}`}
                                    </h3>
                                    <p className="text-sm text-gray-600">Ref: Quote #{req.id}</p>
                                  </div>
                                  <Badge variant="custom" style={quoteStatusStyle(badgeStatus)} className="shrink-0">
                                    {formatQuoteStatus(badgeStatus)}
                                  </Badge>
                                </div>

                                <p className="text-sm text-gray-500">
                                  Submitted{" "}
                                  {new Date(req.created_at).toLocaleString("en-GB", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>

                                {(isAssignedQuote || isAcceptQuote || isCompletedQuote) &&
                                  (professionalName || preferredDateLabel) && (
                                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                                    {professionalName ? (
                                      <div className="flex items-center gap-2 text-gray-600">
                                        <User className="w-4 h-4 shrink-0" />
                                        <span>{professionalName}</span>
                                      </div>
                                    ) : null}
                                    {preferredDateLabel ? (
                                      <div className="flex items-center gap-2 text-gray-600">
                                        <Calendar className="w-4 h-4 shrink-0" />
                                        <span>{preferredDateLabel}</span>
                                      </div>
                                    ) : null}
                                  </div>
                                )}

                                {(isAssignedQuote || isAcceptQuote || isCompletedQuote) && hasQuotedPrice && (
                                  <div className="pt-2 border-t border-gray-200">
                                    <p className="text-gray-900">
                                      Total: <span className="font-semibold">{priceDisplay}</span>
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="flex md:flex-col gap-2 shrink-0">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full md:w-auto md:min-w-[140px]"
                                  onClick={() => setSelectedQuoteRequest(req)}
                                >
                                  View Details
                                </Button>
                                {showQuoteApproveButton && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="w-full md:w-auto md:min-w-[140px] !bg-green-600 hover:!bg-green-700 text-white"
                                    disabled={approvingQuoteRequestId === req.id}
                                    onClick={() => void handleApproveAssignedQuoteRequest(req)}
                                  >
                                    {approvingQuoteRequestId === req.id ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Approving…
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Approve
                                      </>
                                    )}
                                  </Button>
                                )}
                                {showQuotePayButton && (
                                  <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    className="w-full md:w-auto md:min-w-[140px] bg-red-600 hover:bg-red-700"
                                    disabled={payingQuoteRequestId === req.id}
                                    onClick={() => void handlePayAssignedQuoteRequest(req)}
                                  >
                                    {payingQuoteRequestId === req.id ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Redirecting…
                                      </>
                                    ) : (
                                      <>
                                        <CreditCard className="w-4 h-4 mr-2" />
                                        Pay
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            <Dialog
              open={selectedQuoteRequest != null}
              onOpenChange={(open) => {
                if (!open) setSelectedQuoteRequest(null);
              }}
            >
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                {modalReq != null && (
                  <>
                    <DialogHeader>
                      <DialogTitle>Quote request details</DialogTitle>
                      <DialogDescription>
                        Reference: Quote #{modalReq.id} · Submitted{" "}
                        {new Date(modalReq.created_at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-lg font-semibold text-[#0A1A2F]">
                          {modalReq.service?.service_name || `Service #${modalReq.service_id}`}
                        </h4>
                        <Badge variant="custom" style={quoteStatusStyleModal(modalBadgeStatus)}>
                          {formatQuoteStatusModal(modalBadgeStatus)}
                        </Badge>
                      </div>

                      {(modalPaid || modalIsPaidField) && (
                        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                          <CheckCircle className="w-4 h-4 shrink-0 text-green-600" aria-hidden />
                          <span className="font-medium">Paid</span>
                        </div>
                      )}

                      <div className="grid gap-4 text-sm border rounded-lg p-4 bg-gray-50/80 sm:grid-cols-1">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                            Professional
                          </p>
                          {modalProName || modalProEmail || modalProPhone ? (
                            <>
                              <div className="flex items-center gap-2 text-gray-900">
                                <User className="w-4 h-4 shrink-0 text-gray-500" />
                                <span>{modalProName || "—"}</span>
                              </div>
                              {modalProEmail && (
                                <div className="flex items-start gap-2 text-gray-600 mt-1 min-w-0">
                                  <Mail className="w-4 h-4 shrink-0 text-gray-500 mt-0.5" aria-hidden />
                                  <span className="break-all">{modalProEmail}</span>
                                </div>
                              )}
                              {modalProPhone && (
                                <div className="flex items-center gap-2 text-gray-600 mt-1 min-w-0">
                                  <Phone className="w-4 h-4 shrink-0 text-gray-500" aria-hidden />
                                  <span className="break-words">{modalProPhone}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-gray-600 leading-relaxed">
                              No professional is assigned to this request yet. When one is assigned, their name
                              and contact details will appear here.
                            </p>
                          )}
                          {modalHasPrice && (
                            <>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-3 mb-1">
                                Total price
                              </p>
                              <p className="text-xl font-semibold text-[#0A1A2F]">{modalPriceDisplay}</p>
                            </>
                          )}
                        </div>
                      </div>

                      {modalPreferredLabel && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span>Preferred date: {modalPreferredLabel}</span>
                        </div>
                      )}

                      {modalDetailRows.length > 0 ? (
                        <div>
                          <p className="text-sm font-semibold text-[#0A1A2F] mb-3">Request details</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                            {modalDetailRows.map((row) => (
                              <div key={row.id} className="min-w-0">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  {row.label}
                                </p>
                                <p className="text-gray-900 font-medium mt-0.5 leading-snug break-words">
                                  {row.value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No structured request fields to display.</p>
                      )}

                      {modalNotes ? (
                        <div className="rounded-lg border p-3 bg-white">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{modalNotes}</p>
                        </div>
                      ) : null}

                      {(modalIsAssigned || modalIsAccept) &&
                        !modalPaid &&
                        !modalIsCompleted && (
                        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
                          {modalIsAssigned && (
                            <Button
                              type="button"
                              className="!bg-green-600 hover:!bg-green-700 text-white"
                              disabled={approvingQuoteRequestId === modalReq.id}
                              onClick={() => void handleApproveAssignedQuoteRequest(modalReq)}
                            >
                              {approvingQuoteRequestId === modalReq.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Approving…
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </>
                              )}
                            </Button>
                          )}
                          {modalIsAccept && !isQuoteRequestIsPaidFieldTrue(modalReq) && !modalPaid && (
                            <Button
                              type="button"
                              className="bg-red-600 hover:bg-red-700"
                              disabled={payingQuoteRequestId === modalReq.id}
                              onClick={() => void handlePayAssignedQuoteRequest(modalReq)}
                            >
                              {payingQuoteRequestId === modalReq.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Redirecting…
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-4 h-4 mr-2" />
                                  Pay now
                                </>
                              )}
                            </Button>
                          )}
                        </DialogFooter>
                      )}
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </>
        );
      }
      case "profile":
        return renderProfile();
      case "admin-messages":
        return renderAdminMessages();
      case "settings":
        return renderSettings();
      case "notifications":
        return renderNotifications();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden w-full">
      {/* Top Header - Fixed height like admin dashboard */}
      <header className="bg-[#0A1A2F] text-white px-4 md:px-6 fixed top-0 left-0 right-0 z-50 w-full h-14 flex items-center">
        <div className="flex items-center justify-between w-full max-w-full">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-shrink">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-white hover:text-red-500 hover:bg-transparent p-1.5"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => {
                  startTransition(() => {
                    navigate("/");
                  });
                }}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                aria-label="Go to home"
              >
                <img src={logoImage} alt="Fire Guide" className="h-10 w-auto flex-shrink-0" />
              </button>
              <Badge variant="secondary" className="bg-red-600 text-white border-0 text-sm px-2 py-0.5 hidden md:inline-flex">
                Customer
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:text-red-500 hover:bg-transparent relative overflow-visible p-1.5 shrink-0"
              onClick={() => handleViewChange("notifications")}
              aria-label={`Notifications${unreadNotificationCount > 0 ? `, ${unreadNotificationCount} unread` : ""}`}
            >
              <span className="relative inline-flex h-9 w-9 items-center justify-center">
                <Bell className="h-5 w-5" aria-hidden />
                {unreadNotificationCount > 0 && (
                  <span
                    className="absolute -right-0.5 -top-0.5 z-10 flex h-[1.375rem] min-w-[1.375rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white shadow-sm ring-2 ring-white tabular-nums sm:h-6 sm:min-w-6 sm:text-xs"
                    aria-hidden
                  >
                    {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                  </span>
                )}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:text-red-500 hover:bg-transparent hidden md:flex p-1.5"
              onClick={() => handleViewChange("settings")}
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              className="text-white hover:text-red-500 hover:bg-transparent p-1.5 md:px-3"
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex pt-14 w-full overflow-x-hidden">
        {/* Sidebar - Fixed below header, full height like admin dashboard */}
        <aside
          className={`fixed top-14 left-0 h-[calc(100vh-56px)] bg-white border-r w-64 z-30 transition-transform ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="p-6 h-full flex flex-col overflow-y-auto">
            {/* Close button for mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden absolute top-4 right-4 z-50"
            >
              <X className="w-5 h-5" />
            </button>

            <nav className="space-y-2 flex-1 mt-6 lg:mt-0">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleViewChange(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? "bg-red-50 text-red-600 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                    {item.id === "notifications" && unreadNotificationCount > 0 && (
                      <Badge className="ml-auto bg-red-600 text-white min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full text-xs tabular-nums">
                        {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                      </Badge>
                    )}
                  </button> 
                );
              })}
            </nav>

            <div className="space-y-2 pt-4 border-t">
              <Button
                variant="ghost"
                onClick={onLogout}
                className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        {/* Spacer for fixed sidebar on large screens */}
        <div className="hidden lg:block w-64 flex-shrink-0"></div>

        {/* Main Content — full width beside sidebar */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 w-full min-w-0 overflow-x-hidden">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <CustomQuoteSubmittedModal
        open={customQuoteSuccessModalOpen}
        onOpenChange={setCustomQuoteSuccessModalOpen}
        variant="dashboard"
      />
    </div>
  );
}