import React, { createContext, useContext, useState, useEffect, ReactNode, startTransition } from "react";
import { isAuthenticated, getSessionUserDisplay, setUserInfo, removeAuthToken } from "../lib/auth";

export interface Booking {
  id: string;
  service: string;
  professional: string;
  date: string;
  time: string;
  status: "upcoming" | "completed" | "cancelled";
  displayStatus?: string;
  isPaid?: boolean;
  location: string;
  price: string;
  professionalEmail: string;
  professionalPhone: string;
  bookingRef: string;
  hasReport?: boolean;
  professionalImage?: string;
  professionalType?: "individual" | "company";
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

const SELECTED_SERVICE_ID_KEY = "fireguide_selected_service_id";
const LOCATION_SEARCH_DATA_KEY = "fireguide_location_search_data";
const FILTERED_PROFESSIONALS_KEY = "fireguide_filtered_professionals";

interface LocationSearchData {
  post_code: string;
  search_radius: string;
  service_id: number;
}

interface AppContextType {
  selectedService: string;
  setSelectedService: (service: string) => void;
  selectedServiceId: number | null;
  setSelectedServiceId: (id: number | null) => void;
  locationSearchData: LocationSearchData | null;
  setLocationSearchData: (data: LocationSearchData | null) => void;
  questionnaireData: {
    property_type_id: number;
    approximate_people_id: number;
    number_of_floors: string;
    number_of_floors_id?: number;
    duration_id?: number;
    preferred_date: string;
    access_note: string;
  } | null;
  setQuestionnaireData: (data: any) => void;
  selectedProfessional: any;
  setSelectedProfessional: (professional: any) => void;
  selectedProfessionalId: number | null;
  setSelectedProfessionalId: (id: number | null) => void;
  bookingProfessional: any;
  setBookingProfessional: (professional: any) => void;
  /** Professionals from filter-professional/for-fra (set when user clicks Find Professionals). Persisted to sessionStorage so same cards show after reload. */
  filteredProfessionalsFromFra: Array<{
    id: number;
    name: string;
    initials: string;
    profile_image: string;
    verified: boolean;
    rating: number;
    total_reviews: number;
    location?: string;
    response_time?: string;
    service_price?: number;
    price?: number;
    price_label: string;
  }> | null;
  setFilteredProfessionalsFromFra: (list: Array<{
    id: number;
    name: string;
    initials: string;
    profile_image: string;
    verified: boolean;
    rating: number;
    total_reviews: number;
    location?: string;
    response_time?: string;
    service_price?: number;
    price?: number;
    price_label: string;
  }> | null) => void;
  isCustomerLoggedIn: boolean;
  setIsCustomerLoggedIn: (value: boolean) => void;
  customerBookings: Booking[];
  setCustomerBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  customerPayments: Payment[];
  setCustomerPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
  bookingData: any;
  setBookingData: (data: any) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  addBooking: (booking: Booking) => void;
  addPayment: (payment: Payment) => void;
  updateBooking: (bookingId: string, updates: Partial<Booking>) => void;
  deleteBooking: (bookingId: string) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const QUESTIONNAIRE_STORAGE_KEY = "fireguide_questionnaire_data";

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedServiceId, setSelectedServiceIdInternal] = useState<number | null>(() => {
    try {
      const stored = sessionStorage.getItem(SELECTED_SERVICE_ID_KEY);
      return stored ? parseInt(stored, 10) : null;
    } catch { return null; }
  });
  const setSelectedServiceId = (id: number | null) => {
    setSelectedServiceIdInternal(id);
    try {
      if (id != null) sessionStorage.setItem(SELECTED_SERVICE_ID_KEY, String(id));
      else sessionStorage.removeItem(SELECTED_SERVICE_ID_KEY);
    } catch (_) {}
  };
  const [locationSearchData, setLocationSearchDataInternal] = useState<LocationSearchData | null>(() => {
    try {
      const stored = sessionStorage.getItem(LOCATION_SEARCH_DATA_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const setLocationSearchData = (data: LocationSearchData | null) => {
    setLocationSearchDataInternal(data);
    try {
      if (data != null) sessionStorage.setItem(LOCATION_SEARCH_DATA_KEY, JSON.stringify(data));
      else sessionStorage.removeItem(LOCATION_SEARCH_DATA_KEY);
    } catch (_) {}
  };
  const [questionnaireData, setQuestionnaireDataInternal] = useState<any>(() => {
    try {
      const stored = sessionStorage.getItem(QUESTIONNAIRE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const setQuestionnaireData = (data: any) => {
    setQuestionnaireDataInternal(data);
    try {
      if (data != null) {
        sessionStorage.setItem(QUESTIONNAIRE_STORAGE_KEY, JSON.stringify(data));
      } else {
        sessionStorage.removeItem(QUESTIONNAIRE_STORAGE_KEY);
      }
    } catch (_) {}
  };
  const [selectedProfessional, setSelectedProfessional] = useState<any>(null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | null>(null);
  const [bookingProfessional, setBookingProfessional] = useState<any>(null);
  const [filteredProfessionalsFromFra, setFilteredProfessionalsFromFraInternal] = useState<Array<{
    id: number;
    name: string;
    initials: string;
    profile_image: string;
    verified: boolean;
    rating: number;
    total_reviews: number;
    location?: string;
    response_time?: string;
    service_price?: number;
    price?: number;
    price_label: string;
    platform_fee_percent?: string;
    platform_fee_amount?: number;
    total_price?: number;
  }> | null>(() => {
    try {
      const s = sessionStorage.getItem(FILTERED_PROFESSIONALS_KEY);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
  const setFilteredProfessionalsFromFra = (list: Array<{
    id: number;
    name: string;
    initials: string;
    profile_image: string;
    verified: boolean;
    rating: number;
    total_reviews: number;
    location?: string;
    response_time?: string;
    service_price?: number;
    price?: number;
    price_label: string;
    platform_fee_percent?: string;
    platform_fee_amount?: number;
    total_price?: number;
  }> | null) => {
    setFilteredProfessionalsFromFraInternal(list);
    try {
      if (list != null && list.length > 0) {
        sessionStorage.setItem(FILTERED_PROFESSIONALS_KEY, JSON.stringify(list));
      } else {
        sessionStorage.removeItem(FILTERED_PROFESSIONALS_KEY);
      }
    } catch (_) {}
  };
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(false);
  
  // Load bookings and payments from localStorage on mount
  const loadBookingsFromStorage = (): Booking[] => {
    try {
      const stored = localStorage.getItem('customer_bookings');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading bookings from localStorage:', error);
    }
    return [];
  };

  const loadPaymentsFromStorage = (): Payment[] => {
    try {
      const stored = localStorage.getItem('customer_payments');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading payments from localStorage:', error);
    }
    return [];
  };

  const [customerBookings, setCustomerBookings] = useState<Booking[]>(loadBookingsFromStorage);
  const [customerPayments, setCustomerPayments] = useState<Payment[]>(loadPaymentsFromStorage);
  const [bookingData, setBookingData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      if (typeof window === "undefined") return null;
      const u = getSessionUserDisplay();
      return u ? { name: u.name, role: u.role } : null;
    } catch {
      return null;
    }
  });

  // Save bookings to localStorage whenever they change (debounced to avoid excessive writes)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('customer_bookings', JSON.stringify(customerBookings));
      } catch (error) {
        console.error('Error saving bookings to localStorage:', error);
      }
    }, 300); // Debounce by 300ms

    return () => clearTimeout(timeoutId);
  }, [customerBookings]);

  // Save payments to localStorage whenever they change (debounced to avoid excessive writes)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('customer_payments', JSON.stringify(customerPayments));
      } catch (error) {
        console.error('Error saving payments to localStorage:', error);
      }
    }, 300); // Debounce by 300ms

    return () => clearTimeout(timeoutId);
  }, [customerPayments]);

  // Sync auth display from storage on mount (keeps role/name aligned with token after reload)
  useEffect(() => {
    if (isAuthenticated()) {
      const userInfo = getSessionUserDisplay();
      if (userInfo) {
        startTransition(() => {
          setCurrentUser({ name: userInfo.name, role: userInfo.role });
          setIsCustomerLoggedIn(userInfo.role === "customer");
        });
      } else {
        removeAuthToken();
      }
    }
  }, []);

  const addBooking = (booking: Booking) => {
    setCustomerBookings(prev => [booking, ...prev]);
  };

  const addPayment = (payment: Payment) => {
    setCustomerPayments(prev => [payment, ...prev]);
  };

  const updateBooking = (bookingId: string, updates: Partial<Booking>) => {
    setCustomerBookings(prev =>
      prev.map(booking =>
        booking.id === bookingId ? { ...booking, ...updates } : booking
      )
    );
  };

  const deleteBooking = (bookingId: string) => {
    setCustomerBookings(prev => prev.filter(booking => booking.id !== bookingId));
  };

  const logout = () => {
    setCurrentUser(null);
    setIsCustomerLoggedIn(false);
    setCustomerBookings([]);
    setCustomerPayments([]);
    // Clear localStorage on logout
    try {
      localStorage.removeItem('customer_bookings');
      localStorage.removeItem('customer_payments');
    } catch (error) {
      console.error('Error clearing localStorage on logout:', error);
    }
    removeAuthToken();
  };

  const value: AppContextType = {
    selectedService,
    setSelectedService,
    selectedServiceId,
    setSelectedServiceId,
    locationSearchData,
    setLocationSearchData,
    questionnaireData,
    setQuestionnaireData,
    selectedProfessional,
    setSelectedProfessional,
    selectedProfessionalId,
    setSelectedProfessionalId,
    bookingProfessional,
    setBookingProfessional,
    filteredProfessionalsFromFra,
    setFilteredProfessionalsFromFra,
    isCustomerLoggedIn,
    setIsCustomerLoggedIn,
    customerBookings,
    setCustomerBookings,
    customerPayments,
    setCustomerPayments,
    bookingData,
    setBookingData,
    currentUser,
    setCurrentUser,
    addBooking,
    addPayment,
    updateBooking,
    deleteBooking,
    logout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

