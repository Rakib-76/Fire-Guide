import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import Routes from "./components/Routes";
import { Toaster } from "./components/ui/sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ScrollToTop } from "./components/ScrollToTop";
import { PaymentReturnRedirect } from "./components/PaymentReturnRedirect";


export interface Booking {
  id: string;
  service: string;
  professional: string;
  date: string;
  time: string;
  status: "upcoming" | "completed" | "cancelled";
  displayStatus?: string; // Original status from API for display (e.g., "Confirmed", "Pending")
  /** From API `is_paid`; when true, hide Pay / show as paid in dashboard. */
  isPaid?: boolean;
  /** Raw booking status from API (e.g. pending, me, confirmed). */
  apiStatus?: string;
  /** From API `updated_by.id` — used to distinguish new `me` bookings vs submitted reschedules. */
  updatedById?: number | null;
  location: string;
  price: string;
  professionalEmail: string;
  professionalPhone: string;
  bookingRef: string;
  hasReport?: boolean;
  professionalImage?: string;
  professionalType?: "individual" | "company";
  /** From API — used for reschedule calendar (available-date / booking-days-list). */
  professionalId?: number;
}

export interface Payment {
  id: string;
  date: string;
  service: string;
  professional: string;
  amount: string;
  status: "paid" | "refunded" | "pending" | "unpaid";
  paymentMethod: string;
  invoiceNumber: string;
  bookingRef: string;
}

export interface User {
  name: string;
  role: "customer" | "professional" | "admin";
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <PaymentReturnRedirect />
        <ScrollToTop />
        <AppProvider>
          <div className="min-h-screen bg-white">
            <Routes />
            <Toaster />
          </div>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
