import React, { startTransition } from "react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { ProfessionalAuth } from "../ProfessionalAuth";
import { setUserInfo, getUserRole, setUserRole } from "../../lib/auth";
import { professionalBenefitsJoinTo } from "../../lib/professionalBenefitsNavigation";
import { navigateToProfessionalHome } from "../../lib/professionalDashboardNavigation";

export default function ProfessionalAuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setCurrentUser } = useApp();
  const initialSignUp = searchParams.get("mode") === "signup";

  return (
    <ProfessionalAuth
      initialSignUp={initialSignUp}
      onAuthSuccess={(name: string, options) => {
        // Get user role from backend FIRST (stored during auth)
        const userRole = getUserRole();

        // First-time registration on this page is always a professional — send to profile even if
        // `user_role` is not written yet or the API shape omits it (otherwise users land on /dashboard).
        if (options?.isNewProfessionalSignup) {
          setUserRole("PROFESSIONAL");
          setCurrentUser({ name, role: "professional" });
          setUserInfo(name, "professional");
          startTransition(() => {
            navigateToProfessionalHome(navigate, {
              replace: true,
              forceProfileOnboarding: true,
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
          setUserRole("PROFESSIONAL");
          setCurrentUser({ name, role: "professional" });
          setUserInfo(name, "professional");
        }

        startTransition(() => {
          if (userRole === "USER") {
            navigate("/customer/dashboard", { replace: true });
          } else if (userRole === "PROFESSIONAL") {
            navigateToProfessionalHome(navigate, { replace: true });
          } else if (userRole === "ADMIN") {
            navigate("/admin/dashboard", { replace: true });
          } else {
            navigateToProfessionalHome(navigate, { replace: true });
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

