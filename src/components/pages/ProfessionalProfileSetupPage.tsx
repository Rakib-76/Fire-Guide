import React from "react";
import { useNavigate } from "react-router-dom";
import { ProfessionalProfileSetup } from "../ProfessionalProfileSetup";

export default function ProfessionalProfileSetupPage() {
  const navigate = useNavigate();

  return (
    <ProfessionalProfileSetup
      onSave={() => navigate("/professional/dashboard")}
      onBack={() => navigate("/professional/dashboard")}
    />
  );
}

