import { useNavigate } from "react-router-dom";
import { startTransition } from "react";
import { toast } from "sonner";
import { useApp } from "../../contexts/AppContext";
import { CustomerAuth } from "../CustomerAuth";
import { setUserInfo, getUserRole } from "../../lib/auth";
import { navigateToProfessionalHome } from "../../lib/professionalDashboardNavigation";
import { submitPendingCustomQuoteIfAny } from "../../lib/submitPendingCustomQuote";
import { customQuoteSuccessNavigateState } from "../../lib/customQuoteSuccessNavigation";

export default function CustomerAuthPage() {
  const navigate = useNavigate();
  const {
    setCurrentUser,
    setIsCustomerLoggedIn,
    setCustomerBookings,
    setCustomerPayments,
    customerBookings,
  } = useApp();

  const finishAuthNavigation = async (userRole: string | null) => {
    if (userRole === "USER") {
      const pendingResult = await submitPendingCustomQuoteIfAny();
      startTransition(() => {
        if (pendingResult.submitted) {
          navigate("/customer/dashboard/quote-requests", {
            replace: true,
            state: customQuoteSuccessNavigateState(),
          });
          return;
        }
        if (pendingResult.hadPending && pendingResult.error) {
          toast.error(pendingResult.error);
          if (pendingResult.returnPath) {
            navigate(pendingResult.returnPath, {
              replace: true,
              state: pendingResult.pending?.serviceName
                ? { serviceName: pendingResult.pending.serviceName }
                : undefined,
            });
            return;
          }
        }
        navigate("/customer/dashboard", { replace: true });
      });
      return;
    }

    startTransition(() => {
      if (userRole === "PROFESSIONAL") {
        navigate("/professional/dashboard", { replace: true });
      } else if (userRole === "ADMIN") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/customer/dashboard", { replace: true });
      }
    });
  };

  return (
    <CustomerAuth
      onAuthSuccess={(name: string, options) => {
        // Get user role from backend FIRST (stored during auth)
        const userRole = getUserRole();

        // New account created as Professional from this page → profile + reminder (same as /professional/auth signup)
        if (options?.isNewProfessionalSignup) {
          setCurrentUser({ name, role: "professional" });
          setUserInfo(name, "professional");
          startTransition(() => {
            navigateToProfessionalHome(navigate, {
              replace: true,
              forceProfileOnboarding: true,
            });
          });
          return;
        }

        // Set user info based on actual role from backend
        if (userRole === "USER") {
          setIsCustomerLoggedIn(true);
          setCurrentUser({ name, role: "customer" });
          setUserInfo(name, "customer");
        } else if (userRole === "PROFESSIONAL") {
          setCurrentUser({ name, role: "professional" });
          setUserInfo(name, "professional");
        } else if (userRole === "ADMIN") {
          setCurrentUser({ name, role: "admin" });
          setUserInfo(name, "admin");
        } else {
          // Fallback to customer if role not found
          setIsCustomerLoggedIn(true);
          setCurrentUser({ name, role: "customer" });
          setUserInfo(name, "customer");
        }

        // Add demo bookings and payments for testing (only for USER role)
        if (userRole === "USER" && customerBookings.length === 0) {
          const demoBookings = [
            {
              id: "demo-1",
              service: "Fire Risk Assessment",
              professional: "SafeGuard Fire Ltd",
              date: "2024-12-15",
              time: "10:00 AM",
              status: "upcoming" as const,
              location: "123 Business Park, London, SW1A 1AA",
              price: "£450.00",
              professionalEmail: "contact@safeguardfire.co.uk",
              professionalPhone: "020 7946 0958",
              bookingRef: "FG-2024-001",
              hasReport: false,
              professionalImage: "https://images.unsplash.com/photo-1654527288084-bce1ee2ccfdd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXJlJTIwc2FmZXR5JTIwY29tcGFueSUyMGxvZ298ZW58MXx8fHwxNzY1MTc5MjU4fDA&ixlib=rb-4.1.0&q=80&w=400",
              professionalType: "company" as const,
            },
            {
              id: "demo-2",
              service: "Fire Extinguisher Service",
              professional: "Fire Safety Experts",
              date: "2024-11-20",
              time: "2:00 PM",
              status: "completed" as const,
              location: "456 Office Plaza, Manchester, M1 1AE",
              price: "£180.00",
              professionalEmail: "info@firesafetyexperts.co.uk",
              professionalPhone: "0161 123 4567",
              bookingRef: "FG-2024-002",
              hasReport: true,
              professionalImage: "https://images.unsplash.com/photo-1655249493799-9cee4fe983bb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMHBlcnNvbnxlbnwxfHx8fDE3NjUxMDA5Njd8MA&ixlib=rb-4.1.0&q=80&w=400",
              professionalType: "individual" as const,
            },
            {
              id: "demo-3",
              service: "Fire Alarm Service",
              professional: "Alert Fire Systems",
              date: "2024-10-05",
              time: "11:00 AM",
              status: "completed" as const,
              location: "789 Industrial Estate, Birmingham, B1 1BB",
              price: "£320.00",
              professionalEmail: "service@alertfire.co.uk",
              professionalPhone: "0121 456 7890",
              bookingRef: "FG-2024-003",
              hasReport: true,
              professionalImage: "https://images.unsplash.com/photo-1652471943570-f3590a4e52ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHByb2Zlc3Npb25hbCUyMGhlYWRzaG90fGVufDF8fHx8MTc2NTE3MDg5Mnww&ixlib=rb-4.1.0&q=80&w=400",
              professionalType: "individual" as const,
            },
          ];

          const demoPayments = [
            {
              id: "pay-1",
              date: "2024-12-01",
              service: "Fire Risk Assessment",
              professional: "SafeGuard Fire Ltd",
              amount: "£450.00",
              status: "paid" as const,
              paymentMethod: "Visa ending 4242",
              invoiceNumber: "INV-2024-001",
              bookingRef: "FG-2024-001",
            },
            {
              id: "pay-2",
              date: "2024-11-20",
              service: "Fire Extinguisher Service",
              professional: "Fire Safety Experts",
              amount: "£180.00",
              status: "paid" as const,
              paymentMethod: "Mastercard ending 5555",
              invoiceNumber: "INV-2024-002",
              bookingRef: "FG-2024-002",
            },
            {
              id: "pay-3",
              date: "2024-10-05",
              service: "Fire Alarm Service",
              professional: "Alert Fire Systems",
              amount: "£320.00",
              status: "paid" as const,
              paymentMethod: "Visa ending 4242",
              invoiceNumber: "INV-2024-003",
              bookingRef: "FG-2024-003",
            },
          ];

          setCustomerBookings(demoBookings);
          setCustomerPayments(demoPayments);
        }
        
        void finishAuthNavigation(userRole ?? null);
      }}
      onBack={() => {
        startTransition(() => {
          navigate("/");
        });
      }}
    />
  );
}

