import { useNavigate } from "react-router-dom";
import { ProfessionalPricing } from "../ProfessionalPricing";

export default function ProfessionalPricingPage() {
  const navigate = useNavigate();

  return (
    <ProfessionalPricing
      onSave={() => navigate("/professional/dashboard")}
      onBack={() => navigate("/professional/dashboard")}
    />
  );
}

