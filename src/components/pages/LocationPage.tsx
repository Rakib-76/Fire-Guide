import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { LocationPage as LocationPageComponent } from "../LocationPage";

export default function LocationPage() {
  const navigate = useNavigate();
  const { selectedService, questionnaireData, setSelectedServiceId, setLocationSearchData } = useApp();
  const { serviceId } = useParams<{ serviceId: string }>();
  const serviceIdNum = parseInt(serviceId || selectedService) || 0;

  return (
    <LocationPageComponent
      serviceId={serviceIdNum}
      questionnaireData={questionnaireData}
      onContinue={() => {
        // Navigate to Compare Professionals page (professional list)
        navigate("/professionals/compare", { replace: false });
      }}
      onBack={() => navigate(`/services/${serviceId || selectedService}/questionnaire`)}
      onStoreSuccess={(createdId, locationData) => {
        if (createdId != null && createdId > 0) setSelectedServiceId(createdId);
        setLocationSearchData(locationData);
        // Navigate to professional list immediately after persisting; ensures correct screen opens
        navigate("/professionals/compare", { replace: false });
      }}
    />
  );
}

