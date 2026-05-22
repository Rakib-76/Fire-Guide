import React, { useState, useEffect } from "react";
import { Search, Filter, MoreVertical, Mail, Phone, MapPin, Calendar, Eye, Ban, CheckCircle, XCircle, FileText, Circle, Loader2 } from "lucide-react";
import { getApiToken } from "../lib/auth";
import { getAdminCustomerSummary, AdminCustomerSummaryData, getAdminCustomers, AdminCustomerItem, adminCustomerTakeAction, AdminCustomerStatus } from "../api/adminService";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { toast } from "sonner";

function formatCustomerStatusLabel(status: string): string {
  const s = String(status ?? "").trim().toLowerCase();
  if (s === "suspend") return "Suspended";
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const CUSTOMER_FILTER_LABELS: Record<string, string> = {
  all: "All Status",
  active: "Active",
  inactive: "Inactive",
  suspend: "Suspended",
};

function getCustomerStatusBadgeClass(status: string): string {
  const base =
    "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-sm font-medium leading-none";
  switch (String(status ?? "").trim().toLowerCase()) {
    case "active":
      return `${base} bg-green-100 text-green-800 border-green-200`;
    case "suspend":
      return `${base} bg-red-50 text-red-800 border-red-200`;
    case "inactive":
      return `${base} bg-gray-100 text-gray-700 border-gray-200`;
    default:
      return `${base} bg-gray-50 text-gray-700 border-gray-200`;
  }
}

export function AdminCustomers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPlaceholder, setSearchPlaceholder] = useState("Search customers by name or email...");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSummary, setCustomerSummary] = useState<AdminCustomerSummaryData | null>(null);
  const [customerSummaryLoading, setCustomerSummaryLoading] = useState(false);
  const [customersList, setCustomersList] = useState<AdminCustomerItem[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [statusPending, setStatusPending] = useState<{
    customerId: number;
    status: AdminCustomerStatus;
  } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const updatePlaceholder = () => {
      setSearchPlaceholder(mq.matches ? "Search" : "Search customers by name or email...");
    };
    updatePlaceholder();
    mq.addEventListener("change", updatePlaceholder);
    return () => mq.removeEventListener("change", updatePlaceholder);
  }, []);

  useEffect(() => {
    const token = getApiToken();
    if (!token) return;
    let cancelled = false;
    setCustomerSummaryLoading(true);
    getAdminCustomerSummary({ api_token: token })
      .then((res) => {
        if (!cancelled && res.success && res.data) setCustomerSummary(res.data);
      })
      .catch(() => {
        if (!cancelled) setCustomerSummary(null);
      })
      .finally(() => {
        if (!cancelled) setCustomerSummaryLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const token = getApiToken();
    if (!token) return;
    let cancelled = false;
    setCustomersLoading(true);
    getAdminCustomers({ api_token: token })
      .then((res) => {
        if (!cancelled && res.success && Array.isArray(res.data)) setCustomersList(res.data);
        else if (!cancelled) setCustomersList([]);
      })
      .catch(() => {
        if (!cancelled) setCustomersList([]);
      })
      .finally(() => {
        if (!cancelled) setCustomersLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const formatDisplayDate = (iso: string | null | undefined) => {
    if (!iso?.trim()) return "—";
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "—";
    }
  };

  type CustomerDisplay = {
    id: number;
    name: string;
    email: string;
    phone: string;
    location: string;
    totalBookings: number;
    totalSpent: number;
    joinDate: string;
    status: string;
    lastBooking: string;
    raw?: AdminCustomerItem;
  };

  const customers: CustomerDisplay[] = customersList.map((c) => ({
    id: c.id,
    name: c.full_name ?? "—",
    email: c.email ?? "—",
    phone: c.phone ?? "—",
    location: c.property_address ?? "—",
    totalBookings: c.total_bookings ?? 0,
    totalSpent: Number(c.total_price) ?? 0,
    joinDate: formatDisplayDate(c.created_at),
    status: String(c.soft_delete ?? "active").trim().toLowerCase(),
    lastBooking: formatDisplayDate(c.last_booking),
    raw: c,
  }));

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = !searchTerm.trim() ||
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || customer.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleViewDetails = (customer: any) => {
    setSelectedCustomer(customer);
    setViewModalOpen(true);
  };

  const handleUpdateCustomerStatus = async (customer: CustomerDisplay, status: AdminCustomerStatus) => {
    const token = getApiToken();
    if (!token) {
      toast.error("Authentication required.");
      return;
    }
    setStatusPending({ customerId: customer.id, status });
    try {
      const res = await adminCustomerTakeAction({
        api_token: token,
        user_id: customer.id,
        status,
      });
      if (res.success) {
        setCustomersList((prev) =>
          prev.map((c) => (c.id === customer.id ? { ...c, soft_delete: status } : c))
        );
        const label = status === "suspend" ? "suspended" : status;
        toast.success(res.message || `Customer status set to ${label}.`);
      } else {
        toast.error(res.message || "Failed to update status.");
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message || "Failed to update customer status.");
    } finally {
      setStatusPending(null);
    }
  };

  const handleSuspendAccount = (customer: any) => {
    handleUpdateCustomerStatus(customer, "suspend");
  };

  const handleSetActive = (customer: any) => {
    handleUpdateCustomerStatus(customer, "active");
  };

  const handleSetInactive = (customer: any) => {
    handleUpdateCustomerStatus(customer, "inactive");
  };

  const mobileStatusBtnClass =
    "inline-flex h-10 w-full items-center justify-center gap-2 rounded-md text-sm font-medium shadow-sm transition-all duration-200 disabled:cursor-not-allowed";

  const renderMobileCustomerActions = (customer: CustomerDisplay) => {
    const status = customer.status;
    const isActive = status === "active";
    const isInactive = status === "inactive";
    const isSuspended = status === "suspend";
    const isPending = (target: AdminCustomerStatus) =>
      statusPending?.customerId === customer.id && statusPending.status === target;
    const isOtherPending = (target: AdminCustomerStatus) =>
      statusPending?.customerId === customer.id && statusPending.status !== target;

    const statusBtnClass = (target: AdminCustomerStatus, extra?: string) =>
      [
        mobileStatusBtnClass,
        isOtherPending(target) ? "pointer-events-none" : "",
        isPending(target) ? "opacity-90" : "",
        extra ?? "",
      ]
        .filter(Boolean)
        .join(" ");

    return (
      <div className="pt-3 border-t border-gray-100 space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full h-10"
          onClick={() => handleViewDetails(customer)}
        >
          <Eye className="w-4 h-4 mr-2 shrink-0" />
          View Details
        </Button>
        <p className="text-xs font-medium text-gray-500 pt-0.5">Change account status</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`${statusBtnClass("active")} ${isActive ? "cursor-not-allowed" : ""}`}
            style={{
              backgroundColor: "#16a34a",
              border: "1px solid #16a34a",
              color: "#ffffff",
              opacity: isPending("active") ? 0.85 : isActive ? 0.55 : 1,
              cursor: isActive || isPending("active") ? "not-allowed" : "pointer",
              boxShadow: isActive ? "inset 0 0 0 2px rgba(22, 101, 52, 0.4)" : undefined,
            }}
            disabled={isActive || isPending("active")}
            aria-disabled={isActive || isPending("active")}
            tabIndex={isActive ? -1 : 0}
            onClick={() => {
              if (isActive || isPending("active")) return;
              handleSetActive(customer);
            }}
          >
            {isPending("active") ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-1.5 shrink-0" />
            )}
            {isPending("active") ? "Updating…" : "Active"}
          </button>
          <button
            type="button"
            className={`${statusBtnClass("inactive")} ${isInactive ? "cursor-not-allowed" : ""}`}
            style={{
              backgroundColor: isInactive ? "#e5e7eb" : "#6b7280",
              border: `1px solid ${isInactive ? "#d1d5db" : "#6b7280"}`,
              color: isInactive ? "#6b7280" : "#ffffff",
              opacity: isPending("inactive") ? 0.85 : isInactive ? 0.55 : 1,
              cursor: isInactive || isPending("inactive") ? "not-allowed" : "pointer",
            }}
            disabled={isInactive || isPending("inactive")}
            aria-disabled={isInactive || isPending("inactive")}
            tabIndex={isInactive ? -1 : 0}
            onClick={() => {
              if (isInactive || isPending("inactive")) return;
              handleSetInactive(customer);
            }}
          >
            {isPending("inactive") ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <Circle className="w-4 h-4 mr-1.5 shrink-0" />
            )}
            {isPending("inactive") ? "Updating…" : "Inactive"}
          </button>
        </div>
        <button
          type="button"
          className={`${statusBtnClass("suspend")} ${isSuspended ? "cursor-not-allowed" : ""}`}
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            opacity: isPending("suspend") ? 0.85 : isSuspended ? 0.55 : 1,
            cursor: isSuspended || isPending("suspend") ? "not-allowed" : "pointer",
          }}
          disabled={isSuspended || isPending("suspend")}
          aria-disabled={isSuspended || isPending("suspend")}
          tabIndex={isSuspended ? -1 : 0}
          onClick={() => {
            if (isSuspended || isPending("suspend")) return;
            handleSuspendAccount(customer);
          }}
        >
          {isPending("suspend") ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          ) : (
            <Ban className="w-4 h-4 mr-1.5 shrink-0" />
          )}
          {isPending("suspend") ? "Updating…" : "Suspend account"}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-[#0A1A2F] mb-2">Customer Management</h1>
        <p className="text-gray-600">View and manage all platform customers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total Customers</p>
            <p className="text-2xl text-[#0A1A2F] mt-1">
              {customerSummaryLoading ? "—" : customerSummary != null ? customerSummary.total_customers.toLocaleString() : "1,547"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Active This Month</p>
            <p className="text-2xl text-[#0A1A2F] mt-1">
              {customerSummaryLoading ? "—" : customerSummary != null ? customerSummary.active_this_month.toLocaleString() : "892"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">New This Month</p>
            <p className="text-2xl text-green-600 mt-1">
              {customerSummaryLoading ? "—" : customerSummary != null ? `+${customerSummary.new_this_month}` : "+89"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-2xl text-[#0A1A2F] mt-1">
              {customerSummaryLoading ? "—" : customerSummary != null ? `£${Number(customerSummary.total_revenue).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : "£45,280"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters — match AdminBookings; only use utilities present in index.css */}
      <Card>
        <CardContent className="p-4">
          <div className="flex w-full items-center gap-4">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 w-full pl-10"
              />
            </div>

            <div className="w-[180px] shrink-0">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-11 w-full px-4">
                  <SelectValue
                    placeholder="All Status"
                    label={CUSTOMER_FILTER_LABELS[filterStatus] ?? "All Status"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspend">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <Card>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Customer</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Contact</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Stats</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Last Booking</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customersLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      Loading customers...
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-gray-900">{customer.name}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            Joined {customer.joinDate}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {customer.email}
                          </p>
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {customer.phone}
                          </p>
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {customer.location}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-900">
                            <span className="font-semibold">{customer.totalBookings}</span> bookings
                          </p>
                          <p className="text-sm text-gray-900">
                            <span className="font-semibold">£{Number(customer.totalSpent).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span> spent
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-900">{customer.lastBooking}</p>
                      </td>
                      <td className="p-4">
                        <Badge variant="custom" className={getCustomerStatusBadgeClass(customer.status)}>
                          {formatCustomerStatusLabel(customer.status)}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              disabled={statusPending?.customerId === customer.id}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" hideBackdrop className="z-[110]">
                            <DropdownMenuItem onClick={() => handleViewDetails(customer)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-green-600" onClick={() => handleSetActive(customer)}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Active Account
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-gray-700" onClick={() => handleSetInactive(customer)}>
                              <Circle className="w-4 h-4 mr-2" />
                              Inactive Account
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-yellow-600" onClick={() => handleSuspendAccount(customer)}>
                              <Ban className="w-4 h-4 mr-2" />
                              Suspend Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y">
            {customersLoading ? (
              <div className="p-8 text-center text-gray-500">Loading customers...</div>
            ) : (
              filteredCustomers.map((customer) => (
                <div key={customer.id} className="p-4 space-y-3">
                  {/* Customer Name & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{customer.name}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span>Joined {customer.joinDate}</span>
                      </p>
                    </div>
                    <Badge variant="custom" className={getCustomerStatusBadgeClass(customer.status)}>
                      {formatCustomerStatusLabel(customer.status)}
                    </Badge>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Mail className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-600 break-all">{customer.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <p className="text-sm text-gray-600">{customer.phone}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-600">{customer.location}</p>
                    </div>
                  </div>

                  {/* Stats & Last Booking */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Bookings & Spend</p>
                      <p className="text-sm text-gray-900">
                        <span className="font-semibold">{customer.totalBookings}</span> bookings • <span className="font-semibold">£{Number(customer.totalSpent).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Last Booking</p>
                      <p className="text-sm text-gray-900">{customer.lastBooking}</p>
                    </div>
                  </div>

                  {renderMobileCustomerActions(customer)}
                </div>
              ))
            )}
          </div>

          {!customersLoading && filteredCustomers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No customers found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Details Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              View detailed information about the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Customer Name</Label>
              <Input
                id="customer-name"
                value={selectedCustomer?.name || ""}
                readOnly
                className="bg-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-email">Customer Email</Label>
              <Input
                id="customer-email"
                value={selectedCustomer?.email || ""}
                readOnly
                className="bg-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Customer Phone</Label>
              <Input
                id="customer-phone"
                value={selectedCustomer?.phone || ""}
                readOnly
                className="bg-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-location">Customer Location</Label>
              <Input
                id="customer-location"
                value={selectedCustomer?.location || ""}
                readOnly
                className="bg-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-stats">Customer Stats</Label>
              <div className="space-y-2">
                <p className="text-sm text-gray-900">
                  <span className="font-semibold">{selectedCustomer?.totalBookings}</span> bookings
                </p>
                <p className="text-sm text-gray-900">
                  <span className="font-semibold">£{selectedCustomer?.totalSpent}</span> spent
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}