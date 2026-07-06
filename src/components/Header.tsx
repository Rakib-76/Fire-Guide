import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Phone, User } from "lucide-react";
import { Button } from "./ui/button";
import { getSessionUserDisplay, isAuthenticated } from "../lib/auth";
import { navigateToProfessionalHome } from "../lib/professionalDashboardNavigation";
import { SITE_PHONE_DISPLAY, SITE_PHONE_HREF } from "../lib/siteContact";
import { ServicesNavDropdown, ServicesNavMobileSection } from "./ServicesNavMenu";
import logoImage from "figma:asset/69744b74419586d01801e7417ef517136baf5cfb.png";

export interface UserInfo {
  name: string;
  role: "customer" | "professional" | "admin";
}

interface HeaderProps {
  onGetStarted: () => void;
  onProfessionalLogin: () => void;
  onCustomerLogin?: () => void;
  onLogin?: () => void;
  currentUser?: UserInfo | null;
  onLogout?: () => void;
  onAboutContact?: () => void;
  onNavigateHome?: () => void;
  onNavigateServices?: () => void;
  onNavigateAbout?: () => void;
  onNavigateContact?: () => void;
  onNavigateToDashboard?: () => void;
}

export function Header({ 
  onGetStarted, 
  onProfessionalLogin, 
  onCustomerLogin, 
  onLogin, 
  currentUser, 
  onLogout, 
  onAboutContact,
  onNavigateHome,
  onNavigateServices,
  onNavigateAbout,
  onNavigateContact,
  onNavigateToDashboard
}: HeaderProps) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Explicit handler for Login/Register button
  const handleLoginClick = () => {
    if (onCustomerLogin) {
      onCustomerLogin();
    } else if (onLogin) {
      onLogin();
    }
  };

  // Handler for user icon/name click - navigate to dashboard (or sign-in if session expired)
  const handleUserClick = () => {
    setMobileMenuOpen(false);
    const user = currentUser ?? getSessionUserDisplay();
    if (!user) return;

    if (!isAuthenticated()) {
      if (user.role === "admin") {
        navigate("/admin/login");
      } else if (user.role === "professional") {
        navigate("/professional/auth");
      } else {
        navigate("/customer/auth");
      }
      return;
    }

    if (user.role === "admin") {
      navigate("/admin/dashboard");
    } else if (user.role === "professional") {
      navigateToProfessionalHome(navigate);
    } else {
      navigate("/customer/dashboard");
    }
  };

  const handleNavigateHome = () => {
    setMobileMenuOpen(false);
    onNavigateHome?.();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white/95 backdrop-blur-sm text-[#0A1A2F] py-4 px-4 md:px-6 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => { if (window.location.pathname === "/") onNavigateHome?.(); }}
          aria-label="Go to home"
        >
          <img src={logoImage} alt="Fire Guide" className="h-12" />
        </Link>
        
        <nav className="hidden lg:block overflow-visible">
          <div className="flex items-center gap-8 text-lg">
          <button type="button" onClick={handleNavigateHome} className="relative py-2 hover:text-red-600 transition-colors group cursor-pointer">
            Home
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full"></span>
          </button>
          <ServicesNavDropdown />
          <button onClick={onProfessionalLogin} className="relative py-2 hover:text-red-600 transition-colors group cursor-pointer">
            For Professionals
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full"></span>
          </button>
          <button onClick={onNavigateAbout || onAboutContact} className="relative py-2 hover:text-red-600 transition-colors group cursor-pointer">
            About
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full"></span>
          </button>
          <button onClick={onNavigateContact || onAboutContact} className="relative py-2 hover:text-red-600 transition-colors group cursor-pointer">
            Contact
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full"></span>
          </button>
          </div>
        </nav>

        <div className="hidden lg:block">
          <div className="flex items-center gap-4">
          <a
            href={SITE_PHONE_HREF}
            className="inline-flex items-center gap-2 text-lg text-[#0A1A2F] hover:text-red-600 transition-colors whitespace-nowrap"
          >
            <Phone className="w-5 h-5 shrink-0" aria-hidden />
            {SITE_PHONE_DISPLAY}
          </a>
          {currentUser ? (
            <Button 
              variant="ghost" 
              onClick={handleUserClick} 
              className="text-lg text-[#0A1A2F] hover:text-red-600 hover:bg-transparent cursor-pointer h-auto py-2"
            >
              <User className="w-5 h-5 mr-2 shrink-0" />
              {currentUser.name}
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              onClick={handleLoginClick} 
              className="text-lg text-[#0A1A2F] hover:text-red-600 hover:bg-transparent cursor-pointer h-auto py-2"
            >
              <User className="w-5 h-5 mr-2 shrink-0" />
              Login/Register
            </Button>
          )}
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 mt-4 py-6">
          <nav className="flex flex-col gap-1 px-4 md:px-6 text-lg">
            <button
              type="button"
              onClick={handleNavigateHome}
              className="text-left py-3 px-4 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
            >
              Home
            </button>
            <ServicesNavMobileSection onMenuClose={() => setMobileMenuOpen(false)} />
            <button 
              onClick={onProfessionalLogin} 
              className="text-left py-3 px-4 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
            >
              For Professionals
            </button>
            <button 
              onClick={onNavigateAbout || onAboutContact} 
              className="text-left py-3 px-4 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
            >
              About
            </button>
            <button 
              onClick={onNavigateContact || onAboutContact} 
              className="text-left py-3 px-4 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
            >
              Contact
            </button>
            <div className="pt-4 mt-2 border-t border-gray-200 space-y-1">
              <a
                href={SITE_PHONE_HREF}
                className="flex items-center gap-2 py-3 px-4 text-lg text-[#0A1A2F] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <Phone className="w-5 h-5 shrink-0" aria-hidden />
                {SITE_PHONE_DISPLAY}
              </a>
              {currentUser ? (
                <Button 
                  variant="ghost" 
                  onClick={handleUserClick} 
                  className="w-full text-lg text-[#0A1A2F] hover:text-red-600 hover:bg-red-50 justify-start py-3 px-4 h-auto cursor-pointer"
                >
                  <User className="w-5 h-5 mr-2 shrink-0" />
                  {currentUser.name}
                </Button>
              ) : (
                <Button 
                  variant="ghost" 
                  onClick={handleLoginClick} 
                  className="w-full text-lg text-[#0A1A2F] hover:text-red-600 hover:bg-red-50 justify-start py-3 px-4 h-auto cursor-pointer"
                >
                  <User className="w-5 h-5 mr-2 shrink-0" />
                  Login/Register
                </Button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}