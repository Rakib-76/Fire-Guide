import { useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { AdminDashboard } from "../AdminDashboard";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { logout } = useApp();

  return (
    <AdminDashboard
      onLogout={() => {
        logout();
        navigate("/");
      }}
    />
  );
}

