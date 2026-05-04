import React, { startTransition } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { ProfessionalAuth } from "../ProfessionalAuth";
import { setUserInfo, getUserRole } from "../../lib/auth";
import { setCompleteProfileReminderFlag } from "../../lib/professionalProfileReminder";
import { professionalBenefitsJoinTo } from "../../lib/professionalBenefitsNavigation";

export default function ProfessionalAuthPage() {
  const navigate = useNavigate();
  const { setCurrentUser } = useApp();

  return (
    <ProfessionalAuth
      onAuthSuccess={(name: string, options) => {
        // Get user role from backend FIRST (stored during auth)
        const userRole = getUserRole();

        // First-time registration on this page is always a professional — send to profile even if
        // `user_role` is not written yet or the API shape omits it (otherwise users land on /dashboard).
        if (options?.isNewProfessionalSignup) {
          setCurrentUser({ name, role: "professional" });
          setUserInfo(name, "professional");
          setCompleteProfileReminderFlag();
          toast.info("Please complete your profile.");
          startTransition(() => {
            navigate("/professional/dashboard/profile", {
              replace: true,
              state: { showCompleteProfileReminder: true },
            });
          });
          return;
        }

        // Returning login: set context from role and redirect as before
        if (userRole === "USER") {
          setCurrentUser({ name, role: "customer" });
          setUserInfo(name, "customer");
        } else if (userRole === "PROFESSIONAL") {
          setCurrentUser({ name, role: "professional" });
          setUserInfo(name, "professional");
        } else if (userRole === "ADMIN") {
          setCurrentUser({ name, role: "admin" });
          setUserInfo(name, "admin");
        } else {
          setCurrentUser({ name, role: "professional" });
          setUserInfo(name, "professional");
        }

        startTransition(() => {
          if (userRole === "USER") {
            navigate("/customer/dashboard", { replace: true });
          } else if (userRole === "PROFESSIONAL") {
            navigate("/professional/dashboard", { replace: true });
          } else if (userRole === "ADMIN") {
            navigate("/admin/dashboard", { replace: true });
          } else {
            navigate("/professional/dashboard", { replace: true });
          }
        });
      }}
      onBack={() => {
        startTransition(() => {
          navigate("/");
        });
      }}
      onNavigateHome={() => {
        startTransition(() => {
          navigate("/");
        });
      }}
      onNavigateServices={() => {
        startTransition(() => {
          navigate("/services");
        });
      }}
      onNavigateProfessionals={() => {
        startTransition(() => {
          navigate(professionalBenefitsJoinTo());
        });
      }}
      onNavigateAbout={() => {
        startTransition(() => {
          navigate("/about");
        });
      }}
      onNavigateContact={() => {
        startTransition(() => {
          navigate("/about");
        });
      }}
    />
  );
}

