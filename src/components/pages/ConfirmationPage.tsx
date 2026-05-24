import { useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { PaymentConfirmation } from "../PaymentConfirmation";

const BOOKING_PROFESSIONAL_KEY = 'fireguide_booking_professional';
const BOOKING_PROFESSIONAL_ID_KEY = 'fireguide_booking_professional_id';

export default function ConfirmationPage() {
  const navigate = useNavigate();
  const { isCustomerLoggedIn, bookingData, addBooking, addPayment, setBookingProfessional, setSelectedProfessionalId } = useApp();

  const clearBookingData = () => {
    // Clear sessionStorage
    try {
      sessionStorage.removeItem(BOOKING_PROFESSIONAL_KEY);
      sessionStorage.removeItem(BOOKING_PROFESSIONAL_ID_KEY);
    } catch (error) {
      console.error('Failed to clear booking data from sessionStorage:', error);
    }
    // Clear context
    setBookingProfessional(null);
    setSelectedProfessionalId(null);
  };

  return (
    <PaymentConfirmation
      onBackToHome={() => {
        clearBookingData();
        if (isCustomerLoggedIn) {
          navigate("/customer/dashboard");
        } else {
          navigate("/");
        }
      }}
      onViewAppointment={() => navigate("/booking/appointment-details")}
      bookingData={bookingData}
      onBookingComplete={(booking, payment) => {
        if (isCustomerLoggedIn) {
          addBooking(booking);
          addPayment(payment);
        }
        clearBookingData();
      }}
    />
  );
}

