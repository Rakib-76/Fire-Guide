import React, { startTransition, useEffect, useLayoutEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { isLiveBookingHash } from "../../lib/liveBookingNav";
import { professionalBenefitsJoinTo } from "../../lib/professionalBenefitsNavigation";
import { getSessionUserDisplay, isAuthenticated } from "../../lib/auth";
import { navigateToProfessionalHome } from "../../lib/professionalDashboardNavigation";
import { LandingPage as LandingPageComponent } from "../LandingPage";

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useApp();

  useLayoutEffect(() => {
    if (!isLiveBookingHash(location.hash)) return;
    if (location.hash === "#live-booking") return;
    navigate(
      { pathname: location.pathname, search: location.search, hash: "#live-booking" },
      { replace: true }
    );
  }, [location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    const hash = location.hash || (typeof window !== "undefined" ? window.location.hash : "");
    if (!isLiveBookingHash(hash)) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 120;

    const scrollToSection = () => {
      if (cancelled) return;
      const el = document.getElementById("live-booking");
      if (el) {
        el.scrollIntoView({ block: "start", behavior: "auto" });
        return;
      }
      attempts += 1;
      if (attempts < maxAttempts) {
        window.setTimeout(scrollToSection, 50);
      }
    };

    window.setTimeout(scrollToSection, 0);
    return () => {
      cancelled = true;
    };
  }, [location.hash, location.pathname, location.key]);

  return (
    <LandingPageComponent
      onGetStarted={() => {
        startTransition(() => {
          navigate("/services");
        });
      }}
      onProfessionalLogin={() => {
        startTransition(() => {
          navigate(professionalBenefitsJoinTo());
        });
      }}
      onAdminLogin={() => {
        startTransition(() => {
          navigate("/admin/login");
        });
      }}
      onCustomerLogin={() => {
        startTransition(() => {
          navigate("/customer/auth");
        });
      }}
      currentUser={currentUser || null}
      onLogout={() => {
        logout();
        startTransition(() => {
          navigate("/");
        });
      }}
      onAboutContact={() => {
        startTransition(() => {
          navigate("/about");
        });
      }}
      onNavigateAboutPage={() => {
        startTransition(() => navigate("/about"));
      }}
      onNavigateToContactPage={() => {
        startTransition(() => navigate("/about#contact"));
      }}
      onNavigateToDashboard={() => {
        const user = currentUser ?? getSessionUserDisplay();
        if (!user) return;

        startTransition(() => {
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
        });
      }}
      onNavigateHome={() => {
        startTransition(() => {
          navigate({ pathname: "/", hash: "" }, { replace: true });
        });
        window.setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 0);
      }}
    />
  );
}

