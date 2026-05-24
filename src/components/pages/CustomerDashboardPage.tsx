import React, { startTransition } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { CustomerDashboard } from "../CustomerDashboard";

export default function CustomerDashboardPage() {
  const navigate = useNavigate();
  const { logout, customerBookings, customerPayments, updateBooking, deleteBooking } = useApp();

  return (
    <CustomerDashboard
      onLogout={() => {
        logout();
        startTransition(() => {
          navigate("/");
        });
      }}
      onBookNewService={() => {
        startTransition(() => {
          navigate("/services");
        });
      }}
      bookings={customerBookings || []}
      payments={customerPayments || []}
      onUpdateBooking={updateBooking}
      onDeleteBooking={deleteBooking}
      onNavigateHome={() => {
        startTransition(() => {
          navigate("/");
        });
      }}
    />
  );
}

