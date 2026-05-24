import { useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { ProfessionalDashboard } from "../ProfessionalDashboard";

export default function ProfessionalDashboardPage() {
  const navigate = useNavigate();
  const { logout } = useApp();

  return (
    <ProfessionalDashboard
      onLogout={() => {
        logout();
        navigate("/");
      }}
      onNavigateToReports={() => navigate("/professional/reports")}
    />
  );
}

