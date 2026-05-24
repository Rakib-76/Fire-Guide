import { useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { professionalBenefitsJoinTo } from "../../lib/professionalBenefitsNavigation";
import { AboutContact } from "../AboutContact";

export default function AboutContactPage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useApp();

  return (
    <AboutContact
      onBack={() => navigate("/")}
      onAdminLogin={() => navigate("/admin/login")}
      currentUserName={currentUser?.name}
      onLogout={() => {
        logout();
        navigate("/");
      }}
      onNavigateServices={() => navigate("/services")}
      onNavigateProfessionals={() => navigate(professionalBenefitsJoinTo())}
      onCustomerLogin={() => navigate("/customer/auth")}
      onStartBooking={() => navigate("/services")}
    />
  );
}

