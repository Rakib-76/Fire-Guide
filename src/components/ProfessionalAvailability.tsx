import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Flame, 
  Calendar as CalendarIcon, 
  Save,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Info,
  Menu,
  Bell,
  Settings,
  LogOut,
  X,
  User,
  FileText,
  Shield,
  CreditCard,
  DollarSign,
  Clock,
  ShieldCheck,
  Calendar
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import logoImage from "figma:asset/629703c093c2f72bf409676369fecdf03c462cd2.png";

interface ProfessionalAvailabilityProps {
  onSave: () => void;
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToPricing?: () => void;
}

export function ProfessionalAvailability({ onSave, onBack, onNavigateToProfile, onNavigateToPricing }: ProfessionalAvailabilityProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Mock data - in real app this would come from backend
  const [dayStatuses, setDayStatuses] = useState<DayStatus[]>([
    { date: "2025-11-20", status: "booked" },
    { date: "2025-11-21", status: "booked" },
    { date: "2025-11-23", status: "unavailable" },
    { date: "2025-11-24", status: "unavailable" },
    { date: "2025-11-28", status: "booked" },
    { date: "2025-12-01", status: "unavailable" },
    { date: "2025-12-05", status: "booked" },
    { date: "2025-12-15", status: "unavailable" },
    { date: "2025-12-25", status: "unavailable" },
    { date: "2025-12-26", status: "unavailable" }
  ]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getDayStatus = (dateStr: string): "available" | "unavailable" | "booked" => {
    const status = dayStatuses.find(d => d.date === dateStr);
    return status ? status.status : "available";
  };

  const toggleDayStatus = (dateStr: string, currentStatus: "available" | "unavailable" | "booked") => {
    // Can't toggle booked days
    if (currentStatus === "booked") return;

    const newStatus = currentStatus === "available" ? "unavailable" : "available";
    
    setDayStatuses(prev => {
      const existing = prev.find(d => d.date === dateStr);
      if (existing) {
        return prev.map(d => 
          d.date === dateStr ? { ...d, status: newStatus } : d
        );
      } else {
        return [...prev, { date: dateStr, status: newStatus }];
      }
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      onSave();
    }, 1500);
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calculate stats
  const currentMonthDates = Array.from({ length: daysInMonth }, (_, i) => 
    formatDate(year, month, i + 1)
  );
  const unavailableDays = currentMonthDates.filter(d => getDayStatus(d) === "unavailable").length;
  const bookedDays = currentMonthDates.filter(d => getDayStatus(d) === "booked").length;
  const availableDays = daysInMonth - unavailableDays - bookedDays;

  // Check if day is in the past
  const isPastDay = (day: number) => {
    const today = new Date();
    const checkDate = new Date(year, month, day);
    today.setHours(0, 0, 0, 0);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - MATCHES PROFESSIONAL DASHBOARD HEADER EXACTLY */}
      <header className="fixed top-0 left-0 right-0 bg-[#1a2942] border-b border-white/10 z-50">
        <div className="flex items-center justify-between px-4 md:px-6 h-14">
          {/* Left - Hamburger + Logo + Pro Badge */}
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden text-white hover:text-red-500 transition-colors p-1"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="cursor-pointer hover:opacity-80 transition-opacity" aria-label="Go to home">
              <img src={logoImage} alt="Fire Guide" className="h-10" />
            </Link>
            <Badge variant="secondary" className="bg-red-600 text-white border-0 text-sm px-2 py-0.5">
              Pro
            </Badge>
          </div>
          
          {/* Right - Action Icons */}
          <div className="flex items-center gap-3">
            <button
              className="relative text-white hover:text-red-500 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button
              className="text-white hover:text-red-500 transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              className="text-white hover:text-red-500 transition-colors"
              onClick={onBack}
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Menu - MATCHES DASHBOARD EXACTLY */}
      <aside
        className={`fixed lg:sticky lg:translate-x-0 top-[56px] left-0 h-[calc(100vh-56px)] w-64 bg-white border-r shadow-lg lg:shadow-none transition-all duration-300 ease-in-out z-40 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 h-full flex flex-col">
          {/* Close button for mobile */}
          <button
            onClick={() => setMenuOpen(false)}
            className="lg:hidden absolute top-4 right-4"
          >
            <X className="w-5 h-5" />
          </button>

          <nav className="space-y-2 flex-1">
            <button
              onClick={() => {
                setMenuOpen(false);
                onBack();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-gray-50"
            >
              <Flame className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                if (onNavigateToProfile) onNavigateToProfile();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-gray-50"
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                if (onNavigateToPricing) onNavigateToPricing();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-gray-50"
            >
              <DollarSign className="w-5 h-5" />
              <span>Pricing</span>
            </button>
            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all bg-red-50 text-red-600 font-medium"
            >
              <Clock className="w-5 h-5" />
              <span>Availability</span>
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-gray-50"
            >
              <Calendar className="w-5 h-5" />
              <span>Bookings</span>
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-gray-50"
            >
              <CreditCard className="w-5 h-5" />
              <span>Payments</span>
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-gray-50"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Verification Status</span>
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-gray-50"
            >
              <Bell className="w-5 h-5" />
              <span>Notifications</span>
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-gray-50"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>
          </nav>

          <div className="space-y-2 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => {
                setMenuOpen(false);
                onBack();
              }}
              className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="pt-14 py-8 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8 mt-5 md:mt-0">
            <h1 className="text-[#0A1A2F] mb-2">
              Manage Your Availability
            </h1>
            <p className="text-gray-600">
              Block days when you're unavailable and view your booked appointments
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Stats Sidebar */}
            <div className="lg:col-span-1">
              <div className="space-y-4 sticky top-24">
                {/* Month Stats */}
                <Card className="border-0 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">This Month</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-400 rounded"></div>
                        <span className="text-sm font-medium text-gray-700">Available</span>
                      </div>
                      <span className="text-lg font-semibold text-gray-900">{availableDays}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-100 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-600 rounded"></div>
                        <span className="text-sm font-medium text-green-700">Booked</span>
                      </div>
                      <span className="text-lg font-semibold text-green-700">{bookedDays}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-100 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-600 rounded"></div>
                        <span className="text-sm font-medium text-red-700">Unavailable</span>
                      </div>
                      <span className="text-lg font-semibold text-red-700">{unavailableDays}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Legend */}
                <Card className="border-0 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">Color Guide</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gray-400 rounded-lg flex-shrink-0"></div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">Free</p>
                        <p className="text-xs text-gray-600">Open for bookings</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-600 rounded-lg flex-shrink-0"></div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">Booked</p>
                        <p className="text-xs text-gray-600">Customer booking confirmed</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-red-600 rounded-lg flex-shrink-0"></div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">Unavailable</p>
                        <p className="text-xs text-gray-600">Blocked by you</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Help */}
                <Card className="border-0 shadow-md bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-gray-700">
                        <p className="font-semibold text-gray-900 mb-1">How it works</p>
                        <p className="text-xs">Click on any <strong>grey</strong> or <strong>red</strong> day to toggle availability. Green days are customer bookings and cannot be changed.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Calendar */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <CalendarIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle>{monthNames[month]} {year}</CardTitle>
                        <CardDescription>Click to block/unblock days</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={previousMonth}
                        className="border-2"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={nextMonth}
                        className="border-2"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Day names header */}
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {dayNames.map(day => (
                      <div
                        key={day}
                        className="text-center font-semibold text-sm text-gray-600 py-2"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {/* Empty cells for days before month starts */}
                    {Array.from({ length: startingDayOfWeek }, (_, i) => (
                      <div key={`empty-${i}`} className="aspect-square"></div>
                    ))}

                    {/* Days of the month */}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const dateStr = formatDate(year, month, day);
                      const status = getDayStatus(dateStr);
                      const isPast = isPastDay(day);
                      
                      let bgColor = "bg-gray-400 hover:bg-gray-500"; // available
                      let textColor = "text-white";
                      let cursor = "cursor-pointer";
                      
                      if (isPast) {
                        bgColor = "bg-gray-200";
                        textColor = "text-gray-400";
                        cursor = "cursor-not-allowed";
                      } else if (status === "booked") {
                        bgColor = "bg-green-600";
                        textColor = "text-white";
                        cursor = "cursor-not-allowed";
                      } else if (status === "unavailable") {
                        bgColor = "bg-red-600 hover:bg-red-700";
                        textColor = "text-white";
                        cursor = "cursor-pointer";
                      }

                      return (
                        <button
                          key={day}
                          onClick={() => !isPast && toggleDayStatus(dateStr, status)}
                          disabled={isPast}
                          className={`aspect-square rounded-lg font-semibold text-sm transition-all ${bgColor} ${textColor} ${cursor} flex items-center justify-center relative`}
                        >
                          {day}
                          {status === "booked" && !isPast && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-green-600"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Mobile legend */}
                  <div className="lg:hidden mt-6 pt-6 border-t">
                    <h3 className="font-semibold text-sm mb-3">Color Guide</h3>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-400 rounded"></div>
                        <span>Free</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-600 rounded"></div>
                        <span>Booked</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-600 rounded"></div>
                        <span>Blocked</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <Card className="border-0 shadow-md bg-gradient-to-r from-red-50 to-orange-50 mt-6">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Ready to save changes?</h3>
                      <p className="text-sm text-gray-600">
                        Your availability will be updated and customers will see the changes immediately.
                      </p>
                    </div>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-red-600 hover:bg-red-700 px-8 h-12 whitespace-nowrap"
                    >
                      {isSaving ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Save className="w-5 h-5" />
                          Save Availability
                        </span>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}