import React from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { SmartQuestionnaire } from "../SmartQuestionnaire";

export default function QuestionnairePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedService, setQuestionnaireData } = useApp();
  const { serviceId } = useParams<{ serviceId: string }>();
  const service = serviceId || selectedService;
  const serviceName = (location.state as { serviceName?: string } | null)?.serviceName;

  return (
    <SmartQuestionnaire
      service={service}
      serviceId={serviceId && /^\d+$/.test(serviceId) ? parseInt(serviceId, 10) : undefined}
      serviceName={serviceName}
      onComplete={(data) => {
        const sid = service && /^\d+$/.test(String(service)) ? parseInt(String(service), 10) : undefined;
        setQuestionnaireData({
          ...data,
          ...(sid != null && !Number.isNaN(sid) ? { service_id: sid } : {}),
          ...(serviceName?.trim() ? { service_name: serviceName.trim() } : {}),
        });
        navigate(`/services/${service}/location`);
      }}
      onBack={() => navigate("/services")}
    />
  );
}

