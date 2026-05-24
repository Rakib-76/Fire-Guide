import { useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { AppointmentDetails } from "../AppointmentDetails";

export default function AppointmentDetailsPage() {
  const navigate = useNavigate();
  const { isCustomerLoggedIn, bookingData } = useApp();

  return (
    <AppointmentDetails
      onBack={() => navigate("/booking/confirmation")}
      onBackToHome={() => {
        if (isCustomerLoggedIn) {
          navigate("/customer/dashboard");
        } else {
          navigate("/");
        }
      }}
      bookingData={bookingData}
    />
  );
}

