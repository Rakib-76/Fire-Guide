import { startTransition } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { professionalBenefitsJoinTo } from "../../lib/professionalBenefitsNavigation";
import { navigateToProfessionalHome } from "../../lib/professionalDashboardNavigation";
import { isNumericServiceIdSegment } from "../../lib/serviceSlugs";
import { ServiceDetailPage } from "../ServiceDetailPage";
import type { ServiceDetailInstantPriceResult } from "../ServiceDetailInstantPriceForm";

export default function ServiceDetailRoutePage() {
  const navigate = useNavigate();
  const { serviceSlug } = useParams<{ serviceSlug: string }>();
  const { currentUser, logout, setSelectedService, setSelectedServiceId, setQuestionnaireData, setLocationSearchData, setFilteredProfessionalsFromFra } = useApp();

  if (!serviceSlug) {
    return <Navigate to="/services" replace />;
  }

  if (isNumericServiceIdSegment(serviceSlug)) {
    return <Navigate to={`/services/${serviceSlug}/questionnaire`} replace />;
  }

  if (serviceSlug === "fire-marshal-warden-training") {
    return <Navigate to="/services/fire-marshal-training" replace />;
  }

  const goToQuestionnaire = (serviceId: number, serviceName: string) => {
    setSelectedService(String(serviceId));
    setSelectedServiceId(serviceId);
    startTransition(() => {
      navigate(`/services/${serviceId}/questionnaire`, { state: { serviceName } });
    });
  };

  const handleInstantPriceSubmit = (result: ServiceDetailInstantPriceResult) => {
    const { questionnaireData, locationData, professionals } = result;
    setSelectedService(String(locationData.service_id));
    setSelectedServiceId(locationData.service_id);
    setQuestionnaireData(questionnaireData);
    setLocationSearchData(locationData);
    setFilteredProfessionalsFromFra(professionals);
    startTransition(() => {
      navigate("/professionals/compare");
    });
  };

  return (
    <ServiceDetailPage
      slug={serviceSlug}
      onNavigateHome={() => startTransition(() => navigate("/"))}
      onNavigateServices={() => startTransition(() => navigate("/services"))}
      onNavigateProfessionals={() => startTransition(() => navigate(professionalBenefitsJoinTo()))}
      onNavigateAbout={() => startTransition(() => navigate("/about"))}
      onNavigateContact={() => startTransition(() => navigate("/about#contact"))}
      onCustomerLogin={() => startTransition(() => navigate("/customer/auth"))}
      onBookService={goToQuestionnaire}
      onGetInstantPrice={goToQuestionnaire}
      onInstantPriceSubmit={handleInstantPriceSubmit}
      currentUser={currentUser}
      onLogout={() => {
        logout();
        startTransition(() => navigate("/"));
      }}
      onNavigateToDashboard={() => {
        const user = currentUser;
        if (!user) return;
        startTransition(() => {
          if (user.role === "admin") navigate("/admin/dashboard");
          else if (user.role === "professional") navigateToProfessionalHome(navigate);
          else navigate("/customer/dashboard");
        });
      }}
    />
  );
}
