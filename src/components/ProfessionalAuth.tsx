import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowRight, Shield, Briefcase, CheckCircle, Calendar, TrendingUp, Menu, User, Eye, EyeOff } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { sendOtp, verifyOtp, registerProfessional } from "../api/authService";
import { fetchServices, ServiceResponse } from "../api/servicesService";
import { setAuthToken, setUserEmail, setUserInfo, setUserPhone, setUserRole, setProfessionalId } from "../lib/auth";
import { resolveAndStoreProfessionalId } from "../lib/resolveProfessionalId";
import { formatApiErrorMessage } from "../lib/apiValidationMessage";
import logoImage from "figma:asset/629703c093c2f72bf409676369fecdf03c462cd2.png";

function extractAuthToken(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const data = root.data;
  const dataObj =
    data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  const nestedData =
    dataObj?.data && typeof dataObj.data === "object"
      ? (dataObj.data as Record<string, unknown>)
      : null;
  const user =
    dataObj?.user && typeof dataObj.user === "object"
      ? (dataObj.user as Record<string, unknown>)
      : null;
  const professional =
    dataObj?.professional && typeof dataObj.professional === "object"
      ? (dataObj.professional as Record<string, unknown>)
      : null;

  const candidates = [
    root.api_token,
    root.token,
    dataObj?.api_token,
    dataObj?.token,
    nestedData?.api_token,
    nestedData?.token,
    user?.api_token,
    user?.token,
    professional?.api_token,
    professional?.token,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function persistProfessionalSession(
  token: string,
  email: string,
  contactName: string,
  phone: string,
  responseData?: Record<string, unknown> | null
) {
  setAuthToken(token);
  setUserEmail(email.trim().toLowerCase());
  setUserRole("PROFESSIONAL");
  setUserInfo(contactName.trim(), "professional");
  setUserPhone(phone.trim());

  const professionalId =
    responseData?.professional_id ??
    (responseData?.professional &&
    typeof responseData.professional === "object" &&
    (responseData.professional as Record<string, unknown>).id != null
      ? (responseData.professional as Record<string, unknown>).id
      : null);

  if (professionalId != null && String(professionalId).trim() !== "") {
    setProfessionalId(professionalId);
  }
}

interface ProfessionalAuthProps {
  /** When true, show “Join as a Professional” (from /professional/auth?mode=signup). */
  initialSignUp?: boolean;
  /** `isNewProfessionalSignup` is true after first-time registration + OTP (not returning login). */
  onAuthSuccess: (name: string, options?: { isNewProfessionalSignup?: boolean }) => void;
  onBack: () => void;
  onNavigateHome: () => void;
  onNavigateServices: () => void;
  onNavigateProfessionals: () => void;
  onNavigateAbout: () => void;
  onNavigateContact: () => void;
}

export function ProfessionalAuth({
  initialSignUp = false,
  onAuthSuccess,
  onBack,
  onNavigateHome,
  onNavigateServices,
  onNavigateProfessionals,
  onNavigateAbout,
  onNavigateContact,
}: ProfessionalAuthProps) {
  const [isSignUp, setIsSignUp] = useState(initialSignUp);
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  
  // Sign Up fields
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [companyNumber, setCompanyNumber] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [services, setServices] = useState<ServiceResponse[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  
  const otpInputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  useEffect(() => {
    if (!isSignUp) return;
    let cancelled = false;
    setServicesLoading(true);
    fetchServices()
      .then((list) => {
        if (!cancelled) setServices(list);
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load service types.");
      })
      .finally(() => {
        if (!cancelled) setServicesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSignUp]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await sendOtp({
        email: email.trim().toLowerCase(),
      });

      // Check if OTP was sent successfully
      if (response.success || response.status === "success" || response.status === true || (response.data && !response.error)) {
        toast.success("OTP sent to your email!");
        setStep("otp");
        setTimer(60);
        setTimeout(() => otpInputs.current[0]?.focus(), 100);
      } else {
        toast.error(response.message || response.error || "Failed to send OTP. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while sending OTP. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessName || !contactName || !email || !password || !phone || !serviceType) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    const serviceId = Number(serviceType);
    if (!Number.isFinite(serviceId) || serviceId <= 0) {
      toast.error("Please select a valid service type");
      return;
    }

    setIsLoading(true);
    try {
      const response = await registerProfessional({
        business_name: businessName.trim(),
        contact_name: contactName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        company_reg_number: companyNumber.trim() || undefined,
        service_id: serviceId,
      });

      const isSuccess =
        response.status === true ||
        response.success === true ||
        response.status === "success" ||
        Boolean(response.data);

      if (!isSuccess) {
        toast.error(
          formatApiErrorMessage(response, "Registration failed. Please try again.")
        );
        return;
      }

      // Step 2: backend registers the account and emails an OTP — verify before finishing signup
      toast.success(
        response.message || "Account registered! Check your email for the verification code."
      );
      setOtp(["", "", "", "", "", ""]);
      setStep("otp");
      setTimer(60);
      setTimeout(() => otpInputs.current[0]?.focus(), 100);
    } catch (error: unknown) {
      const err = error as { message?: string; error?: string };
      toast.error(
        err?.message ||
          formatApiErrorMessage(err, "Registration failed. Please try again.")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    const digits = pastedData.match(/\d/g);
    
    if (digits) {
      const newOtp = [...otp];
      digits.forEach((digit, index) => {
        if (index < 6) newOtp[index] = digit;
      });
      setOtp(newOtp);
      
      const nextIndex = Math.min(digits.length, 5);
      otpInputs.current[nextIndex]?.focus();
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.some(digit => !digit)) {
      toast.error("Please enter the complete OTP");
      return;
    }

    setIsLoading(true);
    try {
      const otpCode = otp.join("");
      const response = await verifyOtp({
        email: email.trim().toLowerCase(),
        otp: otpCode,
      });

      // Check if OTP was verified successfully
      if (response.success || response.status === "success" || response.status === true || (response.data && !response.error)) {
        // Extract token from response (check multiple possible locations)
        const responseAny = response as any;
        const token = 
          response.data?.api_token ||
          response.data?.token ||
          responseAny.token ||
          responseAny.api_token ||
          response.data?.data?.token ||
          response.data?.data?.api_token;

        if (token && typeof token === 'string' && token.trim().length > 0) {
          // Store token securely
          setAuthToken(token.trim());
          // Store email for reference
          setUserEmail(email.trim().toLowerCase());
          
          // Extract user name from response or use form data
          const fullName = 
            response.data?.full_name || 
            response.data?.user_name || 
            response.data?.name || 
            (isSignUp ? (contactName || businessName) : contactName) ||
            "Professional User";
          
          const role = response.data?.role || response.data?.data?.role;
          if (role) {
            setUserRole(role.toUpperCase());
          } else {
            setUserRole("PROFESSIONAL");
          }

          setUserInfo(fullName, "professional");
          
          // Store phone number if available
          if (response.data?.phone) {
            setUserPhone(response.data.phone);
          } else if (isSignUp && phone) {
            setUserPhone(phone);
          }
          
          // Store professional_id if available in response
          const professionalId = response.data?.professional?.id || response.data?.professional_id;
          if (professionalId) {
            setProfessionalId(professionalId);
          }

          // Returning login: OTP often omits professional_id; restore from list before navigation
          if (!isSignUp) {
            await resolveAndStoreProfessionalId({
              responseData:
                response.data && typeof response.data === "object"
                  ? (response.data as Record<string, unknown>)
                  : null,
              email: email.trim().toLowerCase(),
            });
          }

          // Success message and navigation
          if (isSignUp) {
            toast.success("Welcome to Fire Guide! Your account is pending approval.");
          } else {
            toast.success("Welcome back!");
          }
          
          // Call onAuthSuccess which will navigate to dashboard (or profile for new signups)
          onAuthSuccess(fullName, { isNewProfessionalSignup: isSignUp });
        } else {
          // OTP verified but no token returned - still proceed
          const fullName = 
            response.data?.full_name || 
            response.data?.user_name || 
            response.data?.name || 
            (isSignUp ? (contactName || businessName) : contactName) ||
            "Professional User";
          
          setUserEmail(email.trim().toLowerCase());

          const role = response.data?.role || response.data?.data?.role;
          if (role) {
            setUserRole(role.toUpperCase());
          } else {
            setUserRole("PROFESSIONAL");
          }

          setUserInfo(fullName, "professional");
          
          // Store professional_id if available in response
          const professionalId = response.data?.professional?.id || response.data?.professional_id;
          if (professionalId) {
            setProfessionalId(professionalId);
          }

          if (!isSignUp) {
            await resolveAndStoreProfessionalId({
              responseData:
                response.data && typeof response.data === "object"
                  ? (response.data as Record<string, unknown>)
                  : null,
              email: email.trim().toLowerCase(),
            });
          }
          
          if (isSignUp) {
            toast.success("Welcome to Fire Guide! Your account is pending approval.");
          } else {
            toast.success("Welcome back!");
          }
          
          onAuthSuccess(fullName, { isNewProfessionalSignup: isSignUp });
        }
      } else {
        toast.error(response.message || response.error || "Invalid OTP. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while verifying OTP. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (timer > 0) return;
    
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      const response = await sendOtp({
        email: email.trim().toLowerCase(),
      });

      // Check if OTP was sent successfully
      if (response.success || response.status === "success" || response.status === true || (response.data && !response.error)) {
        setOtp(["", "", "", "", "", ""]);
        setTimer(60);
        toast.success("OTP resent to your email!");
        otpInputs.current[0]?.focus();
      } else {
        toast.error(response.message || response.error || "Failed to resend OTP. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while resending OTP. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const isOtpComplete = otp.every(digit => digit !== "");

  const resetForm = () => {
    setStep("form");
    setOtp(["", "", "", "", "", ""]);
    setEmail("");
    setBusinessName("");
    setContactName("");
    setPhone("");
    setPassword("");
    setShowSignUpPassword(false);
    setCompanyNumber("");
    setServiceType("");
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Premium Background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A1A2F] via-[#0d2238] to-[#0A1A2F]">
        {/* Radial glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-red-600/5 rounded-full blur-3xl" />
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px'
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Header - Exact Same Structure as Home Page */}
        <header className="bg-transparent backdrop-blur-sm text-white py-4 px-4 md:px-6 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center cursor-pointer hover:opacity-90 transition-opacity" aria-label="Go to home">
              <img src={logoImage} alt="Fire Guide" className="h-12" />
            </Link>
            
            <nav className="hidden md:flex items-center gap-8 text-lg">
              <button type="button" onClick={onNavigateHome} className="relative py-2 text-white hover:text-red-600 transition-colors group cursor-pointer">
                Home
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full"></span>
              </button>
              <button type="button" onClick={onNavigateServices} className="relative py-2 text-white hover:text-red-600 transition-colors group cursor-pointer">
                Services
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full"></span>
              </button>
              <button type="button" onClick={onNavigateProfessionals} className="relative py-2 text-red-400 transition-colors group cursor-pointer">
                For Professionals
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></span>
              </button>
              <button type="button" onClick={onNavigateAbout} className="relative py-2 text-white hover:text-red-600 transition-colors group cursor-pointer">
                About
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full"></span>
              </button>
              <button type="button" onClick={onNavigateContact} className="relative py-2 text-white hover:text-red-600 transition-colors group cursor-pointer">
                Contact
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full"></span>
              </button>
            </nav>

            <div className="hidden md:flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={onBack}
                className="text-lg text-white hover:text-red-600 hover:bg-transparent cursor-pointer h-auto py-2 group relative"
              >
                <User className="w-5 h-5 mr-2 shrink-0" />
                Login/Register
              </Button>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-white/5 backdrop-blur-md border-t border-white/10 mt-4 py-6">
              <nav className="flex flex-col gap-1 px-4 md:px-6 text-lg">
                <button 
                  type="button"
                  onClick={onNavigateHome} 
                  className="text-left py-3 px-4 rounded-lg text-white hover:bg-white/10 hover:text-red-400 transition-all cursor-pointer"
                >
                  Home
                </button>
                <button 
                  type="button"
                  onClick={onNavigateServices} 
                  className="text-left py-3 px-4 rounded-lg text-white hover:bg-white/10 hover:text-red-400 transition-all cursor-pointer"
                >
                  Services
                </button>
                <button 
                  type="button"
                  onClick={onNavigateProfessionals}
                  className="text-left py-3 px-4 rounded-lg bg-white/10 text-red-400 cursor-pointer"
                >
                  For Professionals
                </button>
                <button 
                  type="button"
                  onClick={onNavigateAbout} 
                  className="text-left py-3 px-4 rounded-lg text-white hover:bg-white/10 hover:text-red-400 transition-all cursor-pointer"
                >
                  About
                </button>
                <button 
                  type="button"
                  onClick={onNavigateContact} 
                  className="text-left py-3 px-4 rounded-lg text-white hover:bg-white/10 hover:text-red-400 transition-all cursor-pointer"
                >
                  Contact
                </button>
                <div className="pt-4 mt-2 border-t border-white/10">
                  <Button 
                    variant="ghost" 
                    onClick={onBack}
                    className="w-full text-lg text-white hover:text-red-400 hover:bg-white/10 justify-start py-3 px-4 h-auto cursor-pointer transition-all"
                  >
                    <User className="w-5 h-5 mr-2 shrink-0" />
                    Login/Register
                  </Button>
                </div>
              </nav>
            </div>
          )}
        </header>

        {/* Main Two-Column Content */}
        <main className="flex-1 flex items-center justify-center px-6 md:px-8 py-12 md:py-16">
          <div className="w-full max-w-[1280px] grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            {/* LEFT SIDE - Marketing Content */}
            <div className="space-y-8 hidden md:block">
              {/* Red Badge */}
              <div className="inline-block">
                <span className="inline-flex items-center px-4 py-2 rounded-full bg-red-600 text-white text-sm">
                  Professional Partner Portal
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="text-white text-5xl leading-[1.2]">
                Join Fire Guide's<br />Professional Network
              </h1>

              {/* Description */}
              <p className="text-white/70 text-lg leading-relaxed max-w-lg">
                Connect with customers who need fire safety services. Grow your business with instant bookings and verified listings.
              </p>

              {/* Feature Cards */}
              <div className="space-y-4">
                {/* Feature 1 */}
                <div className="bg-white/[0.08] backdrop-blur-sm border border-white/[0.1] rounded-2xl p-5 flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-white text-lg mb-1">Verified Listings</h3>
                    <p className="text-white/60 text-sm leading-relaxed">
                      Build trust with customers through our verification process
                    </p>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="bg-white/[0.08] backdrop-blur-sm border border-white/[0.1] rounded-2xl p-5 flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-white text-lg mb-1">Instant Bookings</h3>
                    <p className="text-white/60 text-sm leading-relaxed">
                      Receive booking requests instantly and manage your schedule
                    </p>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="bg-white/[0.08] backdrop-blur-sm border border-white/[0.1] rounded-2xl p-5 flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-white text-lg mb-1">Grow Your Business</h3>
                    <p className="text-white/60 text-sm leading-relaxed">
                      Access detailed analytics and insights to expand your reach
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-8 pt-4">
                <div>
                  <div className="text-red-400 text-3xl">2,500+</div>
                  <div className="text-white/60 text-sm mt-1">Professionals</div>
                </div>
                <div>
                  <div className="text-red-400 text-3xl">50,000+</div>
                  <div className="text-white/60 text-sm mt-1">Bookings/year</div>
                </div>
                <div>
                  <div className="text-red-400 text-3xl">98%</div>
                  <div className="text-white/60 text-sm mt-1">Satisfaction</div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE - Login Card */}
            <div className="w-full max-w-[500px] mx-auto md:mx-0 md:ml-auto">
              <div className="bg-white rounded-[23px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] px-8 pt-8 pb-7">
                {step === "form" ? (
                  <>
                    {/* Top Icon */}
                    <div className="flex justify-center mb-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-pink-50 to-pink-100 rounded-[18px] flex items-center justify-center shadow-inner">
                        {isSignUp ? (
                          <Briefcase className="w-7 h-7 text-red-600" />
                        ) : (
                          <Mail className="w-7 h-7 text-red-600" />
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-[27px] leading-[1.2] text-center text-[#0A1A2F] mb-2.5">
                      {isSignUp ? "Join as a Professional" : "Professional Login"}
                    </h2>

                    {/* Subtitle */}
                    <p className="text-[15px] leading-[1.5] text-center text-gray-600 mb-5">
                      {isSignUp 
                        ? "Register your business to start receiving bookings"
                        : "Enter your email to receive a one-time password"
                      }
                    </p>

                    {/* Form Section */}
                    {!isSignUp ? (
                      // Login Form
                      <form onSubmit={handleLogin} className="space-y-0">
                        <div className="space-y-0">
                          <Label htmlFor="email" className="text-[14px] text-gray-700 block mb-2">
                            Email Address
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="your.email@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-12 px-4 text-[15px] border-gray-200 focus:border-red-500 focus:ring-red-500/20 rounded-xl"
                            required
                            autoFocus
                          />
                          <p className="text-[13px] text-gray-500 leading-[1.5] mt-3">
                            We'll send a 6-digit code to verify your account
                          </p>
                        </div>

                        {/* Primary Button */}
                        <Button
                          type="submit"
                          disabled={!email || isLoading}
                          className="w-full h-[52px] bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white text-[15px] rounded-full shadow-lg shadow-red-600/25 disabled:opacity-50 disabled:shadow-none transition-all hover:scale-[1.02] mt-6"
                        >
                          {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Sending OTP...
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              Send OTP
                              <ArrowRight className="w-4 h-4" />
                            </span>
                          )}
                        </Button>
                      </form>
                    ) : (
                      // Sign Up Form
                      <form onSubmit={handleSignUp} className="space-y-4">
                        <div className="space-y-0">
                          <Label htmlFor="businessName" className="text-[14px] text-gray-700 block mb-2">
                            Business Name *
                          </Label>
                          <Input
                            id="businessName"
                            type="text"
                            placeholder="Fire Safety Solutions Ltd"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            className="h-12 px-4 text-[15px] border-gray-200 focus:border-red-500 focus:ring-red-500/20 rounded-xl"
                            required
                            autoFocus
                          />
                        </div>

                        <div className="space-y-0">
                          <Label htmlFor="contactName" className="text-[14px] text-gray-700 block mb-2">
                            Contact Name *
                          </Label>
                          <Input
                            id="contactName"
                            type="text"
                            placeholder="John Smith"
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            className="h-12 px-4 text-[15px] border-gray-200 focus:border-red-500 focus:ring-red-500/20 rounded-xl"
                            required
                          />
                        </div>

                        <div className="space-y-0">
                          <Label htmlFor="signup-email" className="text-[14px] text-gray-700 block mb-2">
                            Business Email *
                          </Label>
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="contact@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-12 px-4 text-[15px] border-gray-200 focus:border-red-500 focus:ring-red-500/20 rounded-xl"
                            required
                          />
                        </div>

                        <div className="space-y-0">
                          <Label htmlFor="signup-password" className="text-[14px] text-gray-700 block mb-2">
                            Password *
                          </Label>
                          <div className="relative">
                            <Input
                              id="signup-password"
                              type={showSignUpPassword ? "text" : "password"}
                              placeholder="Create a password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="h-12 px-4 pr-11 text-[15px] border-gray-200 focus:border-red-500 focus:ring-red-500/20 rounded-xl"
                              required
                              minLength={6}
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowSignUpPassword((prev) => !prev)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                            >
                              {showSignUpPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-0">
                          <Label htmlFor="phone" className="text-[14px] text-gray-700 block mb-2">
                            Phone Number *
                          </Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="07123 456789"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="h-12 px-4 text-[15px] border-gray-200 focus:border-red-500 focus:ring-red-500/20 rounded-xl"
                            required
                          />
                        </div>

                        <div className="space-y-0">
                          <Label htmlFor="serviceType" className="text-[14px] text-gray-700 block mb-2">
                            Service Type *
                          </Label>
                          <select
                            id="serviceType"
                            value={serviceType}
                            onChange={(e) => setServiceType(e.target.value)}
                            className="w-full h-12 px-4 text-[15px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white disabled:opacity-60"
                            required
                            disabled={servicesLoading}
                          >
                            <option value="">
                              {servicesLoading ? "Loading services..." : "Select a service type"}
                            </option>
                            {services.map((service) => (
                              <option key={service.id} value={String(service.id)}>
                                {service.service_name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-0">
                          <Label htmlFor="companyNumber" className="text-[14px] text-gray-700 block mb-2">
                            Company Registration Number (Optional)
                          </Label>
                          <Input
                            id="companyNumber"
                            type="text"
                            placeholder="12345678"
                            value={companyNumber}
                            onChange={(e) => setCompanyNumber(e.target.value)}
                            className="h-12 px-4 text-[15px] border-gray-200 focus:border-red-500 focus:ring-red-500/20 rounded-xl"
                          />
                        </div>

                        {/* Primary Button */}
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="w-full h-[52px] bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white text-[15px] rounded-full shadow-lg shadow-red-600/25 disabled:opacity-50 disabled:shadow-none transition-all hover:scale-[1.02] mt-6"
                        >
                          {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Creating Account...
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              Create Account
                              <ArrowRight className="w-4 h-4" />
                            </span>
                          )}
                        </Button>
                      </form>
                    )}

                    {/* Secondary Text Links */}
                    <div className="text-center text-[14px] mt-5">
                      {!isSignUp ? (
                        <p className="text-gray-600">
                          New to Fire Guide?{" "}
                          <button
                            type="button"
                            onClick={() => {
                              setIsSignUp(true);
                              resetForm();
                            }}
                            className="text-red-600 hover:text-red-700 transition-colors"
                          >
                            Register your business
                          </button>
                        </p>
                      ) : (
                        <p className="text-gray-600">
                          Already registered?{" "}
                          <button
                            type="button"
                            onClick={() => {
                              setIsSignUp(false);
                              resetForm();
                            }}
                            className="text-red-600 hover:text-red-700 transition-colors"
                          >
                            Sign in
                          </button>
                        </p>
                      )}
                    </div>

                    {/* Legal Text */}
                    <div className="text-center text-[12px] text-gray-500 mt-3.5 leading-[1.5]">
                      By continuing, you agree to Fire Guide's{" "}
                      <a href="#" className="text-red-600 hover:text-red-700 underline">
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a href="#" className="text-red-600 hover:text-red-700 underline">
                        Privacy Policy
                      </a>
                    </div>
                  </>
                ) : (
                  // OTP Verification
                  <form onSubmit={handleVerifyOTP}>
                    {/* Top Icon */}
                    <div className="flex justify-center mb-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-[18px] flex items-center justify-center shadow-inner">
                        <Shield className="w-7 h-7 text-emerald-600" />
                      </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-[27px] leading-[1.2] text-center text-[#0A1A2F] mb-2.5">
                      Verify Your Email
                    </h2>

                    {/* Subtitle */}
                    <p className="text-[15px] leading-[1.5] text-center text-gray-600 mb-1">
                      Enter the 6-digit code sent to
                    </p>
                    <p className="text-[15px] text-center text-gray-900 mb-5">
                      {email}
                    </p>

                    {/* OTP Input */}
                    <div className="space-y-0">
                      <div className="space-y-0">
                        <Label className="text-[14px] text-gray-700 text-center block mb-3">
                          One-Time Password
                        </Label>
                        <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                          {otp.map((digit, index) => (
                            <Input
                              key={index}
                              ref={(el) => { otpInputs.current[index] = el; return; }}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={digit}
                              onChange={(e) => handleOtpChange(index, e.target.value)}
                              onKeyDown={(e) => handleOtpKeyDown(index, e)}
                              className="w-12 h-14 text-center text-[20px] border-gray-200 focus:border-red-500 focus:ring-red-500/20 rounded-xl"
                            />
                          ))}
                        </div>
                        {timer > 0 ? (
                          <p className="text-[13px] text-gray-500 text-center mt-3">
                            Code expires in {timer}s
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendOTP}
                            className="text-[13px] text-red-600 hover:text-red-700 block mx-auto transition-colors mt-3"
                          >
                            Resend OTP
                          </button>
                        )}
                      </div>

                      {/* Primary Button */}
                      <Button
                        type="submit"
                        disabled={!isOtpComplete || isLoading}
                        className="w-full h-[52px] bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white text-[15px] rounded-full shadow-lg shadow-red-600/25 disabled:opacity-50 disabled:shadow-none transition-all hover:scale-[1.02] mt-6"
                      >
                        {isLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Verifying...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            Continue
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </Button>

                      <button
                        type="button"
                        onClick={() => {
                          setStep("form");
                          setOtp(["", "", "", "", "", ""]);
                        }}
                        className="text-[14px] text-gray-600 hover:text-gray-900 block mx-auto transition-colors mt-5"
                      >
                        Change email address
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}