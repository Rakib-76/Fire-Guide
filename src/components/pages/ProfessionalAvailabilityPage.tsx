import { useNavigate } from "react-router-dom";
import { ProfessionalAvailability } from "../ProfessionalAvailability";

export default function ProfessionalAvailabilityPage() {
  const navigate = useNavigate();

  return (
    <ProfessionalAvailability
      onSave={() => navigate("/professional/dashboard")}
      onBack={() => navigate("/professional/dashboard")}
    />
  );
}

