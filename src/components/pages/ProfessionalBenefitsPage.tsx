import React, { startTransition } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { useScrollToProfessionalBenefitsJoin } from "../../hooks/useScrollToProfessionalBenefitsJoin";
import { ProfessionalBenefits } from "../ProfessionalBenefits";

export default function ProfessionalBenefitsPage() {
  useScrollToProfessionalBenefitsJoin();
  const navigate = useNavigate();
  const { currentUser } = useApp();

  const go = (to: string) => {
    startTransition(() => {
      navigate(to);
    });
  };

  return (
    <ProfessionalBenefits
      onRegister={() => go("/professional/auth")}
      onLogin={() => go("/professional/auth")}
      onBack={() => go("/")}
      onNavigateHome={() => go("/")}
      onNavigateServices={() => go("/services")}
      onNavigateAbout={() => go("/about")}
      onNavigateContact={() => go("/about")}
      currentUser={currentUser}
      onNavigateToDashboard={() => {
        if (!currentUser) return;
        if (currentUser.role === "admin") {
          go("/admin/dashboard");
        } else if (currentUser.role === "professional") {
          go("/professional/dashboard");
        } else {
          go("/customer/dashboard");
        }
      }}
    />
  );
}

