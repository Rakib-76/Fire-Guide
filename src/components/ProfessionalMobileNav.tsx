import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Menu,
  Bell,
  Settings,
  LogOut,
  X,
  LayoutDashboard,
  User,
  DollarSign,
  Clock,
  Calendar,
  CreditCard,
  ShieldCheck
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import logoImage from "figma:asset/629703c093c2f72bf409676369fecdf03c462cd2.png";

type ProfessionalPage = 
  | "dashboard" 
  | "profile" 
  | "pricing" 
  | "availability" 
  | "bookings" 
  | "payments" 
  | "verification" 
  | "notifications" 
  | "settings";

interface ProfessionalMobileNavProps {
  currentPage: ProfessionalPage;
  onNavigateToDashboard: () => void;
  onNavigateToProfile: () => void;
  onNavigateToPricing: () => void;
  onNavigateToAvailability: () => void;
  onNavigateToBookings: () => void;
  onNavigateToPayments: () => void;
  onNavigateToVerification: () => void;
  onNavigateToNotifications: () => void;
  onNavigateToSettings: () => void;
  onLogout: () => void;
}

export function ProfessionalMobileNav({
  currentPage,
  onNavigateToDashboard,
  onNavigateToProfile,
  onNavigateToPricing,
  onNavigateToAvailability,
  onNavigateToBookings,
  onNavigateToPayments,
  onNavigateToVerification,
  onNavigateToNotifications,
  onNavigateToSettings,
  onLogout
}: ProfessionalMobileNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    { 
      id: "dashboard" as ProfessionalPage, 
      label: "Dashboard", 
      icon: LayoutDashboard,
      onClick: () => {
        setMenuOpen(false);
        onNavigateToDashboard();
      }
    },
    { 
      id: "profile" as ProfessionalPage, 
      label: "Profile", 
      icon: User,
      onClick: () => {
        setMenuOpen(false);
        onNavigateToProfile();
      }
    },
    { 
      id: "pricing" as ProfessionalPage, 
      label: "Pricing", 
      icon: DollarSign,
      onClick: () => {
        setMenuOpen(false);
        onNavigateToPricing();
      }
    },
    { 
      id: "availability" as ProfessionalPage, 
      label: "Availability", 
      icon: Clock,
      onClick: () => {
        setMenuOpen(false);
        onNavigateToAvailability();
      }
    },
    { 
      id: "bookings" as ProfessionalPage, 
      label: "Bookings", 
      icon: Calendar,
      onClick: () => {
        setMenuOpen(false);
        onNavigateToBookings();
      }
    },
    { 
      id: "payments" as ProfessionalPage, 
      label: "Payments", 
      icon: CreditCard,
      onClick: () => {
        setMenuOpen(false);
        onNavigateToPayments();
      }
    },
    { 
      id: "verification" as ProfessionalPage, 
      label: "Verification Status", 
      icon: ShieldCheck,
      onClick: () => {
        setMenuOpen(false);
        onNavigateToVerification();
      }
    },
    { 
      id: "notifications" as ProfessionalPage, 
      label: "Notifications", 
      icon: Bell,
      onClick: () => {
        setMenuOpen(false);
        onNavigateToNotifications();
      }
    },
    { 
      id: "settings" as ProfessionalPage, 
      label: "Settings", 
      icon: Settings,
      onClick: () => {
        setMenuOpen(false);
        onNavigateToSettings();
      }
    }
  ];

  return (
    <>
      {/* Header - MASTER COMPONENT */}
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
              onClick={() => {
                setMenuOpen(false);
                onNavigateToNotifications();
              }}
              className="relative text-white hover:text-red-500 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                onNavigateToSettings();
              }}
              className="text-white hover:text-red-500 transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                onLogout();
              }}
              className="text-white hover:text-red-500 transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Menu - MASTER COMPONENT */}
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
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-red-50 text-red-600 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="space-y-2 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => {
                setMenuOpen(false);
                onLogout();
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
    </>
  );
}
