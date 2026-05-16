import { startTransition } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { professionalBenefitsJoinTo } from "../../lib/professionalBenefitsNavigation";
import { navigateToProfessionalHome } from "../../lib/professionalDashboardNavigation";
import { ServiceSelection } from "../ServiceSelection";

export default function ServiceSelectionPage() {
  const navigate = useNavigate();
  const { currentUser, logout, setSelectedService } = useApp();

  return (
    <ServiceSelection
      onSelectService={(serviceId, serviceName) => {
        setSelectedService(serviceId);
        startTransition(() => {
          navigate(`/services/${serviceId}/questionnaire`, { state: { serviceName } });
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
      onCustomerLogin={() => {
        startTransition(() => {
          navigate("/customer/auth");
        });
      }}
      currentUser={currentUser}
      onLogout={() => {
        logout();
        startTransition(() => {
          navigate("/");
        });
      }}
      onNavigateToDashboard={() => {
        const user = currentUser;
        if (!user) return;
        startTransition(() => {
          if (user.role === "admin") {
            navigate("/admin/dashboard");
          } else if (user.role === "professional") {
            navigateToProfessionalHome(navigate);
          } else {
            navigate("/customer/dashboard");
          }
        });
      }}
    />
  );
}

