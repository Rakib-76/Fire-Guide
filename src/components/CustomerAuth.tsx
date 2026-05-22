import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { professionalBenefitsJoinTo } from "../lib/professionalBenefitsNavigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Flame, ArrowRight, User, Shield, Heart, Clock, Star, Menu, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import logoImage from "figma:asset/629703c093c2f72bf409676369fecdf03c462cd2.png";
import { registerUser, loginUser, sendOtp, verifyOtp, resetPassword } from "../api/authService";
import { setAuthToken, setUserEmail, setUserInfo, setUserPhone, setUserRole, setProfessionalId } from "../lib/auth";
import { getFacebookOAuthStartUrl, getGoogleOAuthStartUrl } from "../lib/socialAuthCallback";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";

interface CustomerAuthProps {
  /** Pass `{ isNewProfessionalSignup: true }` when a new account was created with the Professional role. */
  onAuthSuccess: (name: string, options?: { isNewProfessionalSignup?: boolean }) => void;
  onBack: () => void;
}

export function CustomerAuth({ onAuthSuccess, onBack }: CustomerAuthProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sign In State
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign Up State
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPhone, setSignUpPhone] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [signUpRole, setSignUpRole] = useState<string>("USER");

  // Forgot Password State
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<"email" | "otp" | "reset">("email");
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    if (!signInEmail || !signInPassword) {
      toast.error("Please enter your email and password.");
      setIsLoading(false);
      return;
    }

    // API call
    try {
      const response = await loginUser({
        email: signInEmail.trim(),
        password: signInPassword,
      });

      // Check if login was successful
      if (response.success || response.status === "success" || response.status === true || (response.data && !response.error)) {
        // Extract token from response (check multiple possible locations)
        const token = response.data?.token || 
                     response.data?.api_token || 
                     response.token || 
                     response.api_token ||
                     response.data?.data?.token ||
                     response.data?.data?.api_token;

        if (token && typeof token === 'string' && token.trim().length > 0) {
          // Store token securely
          setAuthToken(token.trim());
          // Store email for reference
          setUserEmail(signInEmail.trim().toLowerCase());
          // Store user info - extract first name from full_name
          const fullName = response.data?.full_name || response.data?.user_name || response.data?.name || "User";
          // API response structure: { status: "success", data: { role: "USER"|"PROFESSIONAL"|"ADMIN", ... } }
          const roleRaw = response.data?.role || response.data?.data?.role || response.role;
          const roleUpper = roleRaw ? String(roleRaw).toUpperCase() : "";
          if (roleUpper) {
            setUserRole(roleUpper);
          }
          const appRole =
            roleUpper === "PROFESSIONAL" ? "professional" : roleUpper === "ADMIN" ? "admin" : "customer";
          setUserInfo(fullName, appRole);
          // Store phone number if available in response
          if (response.data?.phone) {
            setUserPhone(response.data.phone);
          }
          // Store professional_id if available in response (for PROFESSIONAL role)
          const professionalId = response.data?.professional?.id;
          if (professionalId) {
            setProfessionalId(professionalId);
          }
          console.log('Token stored successfully after login');
        } else {
          console.error('No valid token found in login response:', response);
          toast.error("Login successful but no authentication token received. Please try again.");
          setIsLoading(false);
          return;
        }

        toast.success("Welcome back! Signed in successfully.");
        const fullName = response.data?.full_name || response.data?.user_name || response.data?.name || "User";
        const firstName = fullName.trim().split(' ')[0]; // Extract first name for callback
        onAuthSuccess(firstName);
      } else {
        // Handle specific error messages
        const errorMessage = response.message || response.error || "Login failed. Please try again.";
        if (errorMessage.toLowerCase().includes("verify your email") || errorMessage.toLowerCase().includes("email verification")) {
          toast.error("Please verify your email first. Check your inbox for the verification link.");
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred during login. Please try again.";
      if (errorMessage.toLowerCase().includes("verify your email") || errorMessage.toLowerCase().includes("email verification")) {
        toast.error("Please verify your email first. Check your inbox for the verification link.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    if (!signUpName || !signUpEmail || !signUpPhone || !signUpPassword || !signUpRole) {
      toast.error("Please fill in all fields.");
      setIsLoading(false);
      return;
    }

    // API call
    try {
      const response = await registerUser({
        full_name: signUpName,
        email: signUpEmail,
        phone: signUpPhone,
        password: signUpPassword,
        role: signUpRole, // Already in correct format: "USER" or "PROFESSIONAL"
      });

      // Check if registration was successful
      if (response.success || response.status === "success" || response.status === true || (response.data && !response.error)) {
        // Extract token from response (check multiple possible locations)
        const token = response.data?.token || 
                     response.data?.api_token || 
                     response.token || 
                     response.api_token ||
                     response.data?.data?.token ||
                     response.data?.data?.api_token;

        if (token && typeof token === 'string' && token.trim().length > 0) {
          // Store token securely
          setAuthToken(token.trim());
          // Store email for reference
          setUserEmail(signUpEmail.trim().toLowerCase());
          // Store user info - extract first name from full_name
          const fullName = response.data?.full_name || signUpName;
          // Store role from backend response, or the role chosen on the form
          const role = response.data?.role || response.data?.data?.role || response.role || signUpRole;
          const roleUpper = String(role ?? "USER").toUpperCase();
          setUserRole(roleUpper);
          const appRole =
            roleUpper === "PROFESSIONAL" ? "professional" : roleUpper === "ADMIN" ? "admin" : "customer";
          setUserInfo(fullName, appRole);
          // Store phone number from response or signup form
          const phone = response.data?.phone || signUpPhone;
          if (phone) {
            setUserPhone(phone);
          }
          // Store professional_id if available in response (for PROFESSIONAL role)
          const professionalId = response.data?.professional?.id;
          if (professionalId) {
            setProfessionalId(professionalId);
          }
          console.log('Token stored successfully after registration');
        } else {
          console.error('No valid token found in registration response:', response);
          toast.error("Registration successful but no authentication token received. Please log in.");
          setIsLoading(false);
          return;
        }

        toast.success("Account created successfully! Welcome to Fire Guide.");
        const fullName = response.data?.full_name || signUpName;
        const firstName = fullName.trim().split(' ')[0]; // Extract first name for callback
        const registeredAsProfessional =
          String(
            response.data?.role ||
              response.data?.data?.role ||
              response.role ||
              signUpRole ||
              ""
          ).toUpperCase() === "PROFESSIONAL";
        onAuthSuccess(firstName, { isNewProfessionalSignup: registeredAsProfessional });
      } else {
        toast.error(response.message || response.error || "Registration failed. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred during registration. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    setIsGoogleLoading(true);
    window.location.assign(getGoogleOAuthStartUrl());
  };

  const handleFacebookAuth = () => {
    setIsSocialLoading("Facebook");
    window.location.assign(getFacebookOAuthStartUrl());
  };

  const handleAppleAuth = () => {
    const redirectUrl = import.meta.env.VITE_CUSTOMER_SOCIAL_AUTH_APPLE_URL?.trim();
    if (redirectUrl) {
      setIsSocialLoading("Apple");
      window.location.assign(redirectUrl);
      return;
    }
    toast.message("Apple sign-in is not available yet", {
      description: "Please use Google, Facebook, or the email and password fields below.",
      duration: 7000,
    });
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    // Validation
    if (!forgotPasswordEmail || !forgotPasswordEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSendingOtp(true);

    try {
      const response = await sendOtp({
        email: forgotPasswordEmail.trim().toLowerCase(),
      });

      // Check if OTP was sent successfully
      if (response.success || response.status === "success" || response.status === true || (response.data && !response.error)) {
        toast.success("OTP sent successfully! Please check your email.");
        setForgotPasswordStep("otp");
        setOtpCode("");
      } else {
        toast.error(response.message || response.error || "Failed to send OTP. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while sending OTP. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!otpCode || otpCode.trim().length === 0) {
      toast.error("Please enter the OTP code.");
      return;
    }

    setIsVerifyingOtp(true);

    try {
      const response = await verifyOtp({
        email: forgotPasswordEmail.trim().toLowerCase(),
        otp: otpCode.trim(),
      });

      // Check if OTP was verified successfully
      if (response.success || response.status === "success" || response.status === true || (response.data && !response.error)) {
        toast.success("OTP verified successfully! Please set your new password.");
        setForgotPasswordStep("reset");
        setOtpCode("");
      } else {
        toast.error(response.message || response.error || "Invalid OTP. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while verifying OTP. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match. Please try again.");
      return;
    }

    setIsResettingPassword(true);

    try {
      const response = await resetPassword({
        email: forgotPasswordEmail.trim().toLowerCase(),
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      // Check if password was reset successfully
      if (response.success || response.status === "success" || response.status === true || (response.data && !response.error)) {
        toast.success("Password reset successfully! You can now login with your new password.");
        handleCloseForgotPassword();
        // Optionally switch to sign in form
        setIsSignUp(false);
      } else {
        toast.error(response.message || response.error || "Failed to reset password. Please try again.");
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred while resetting password. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleCloseForgotPassword = () => {
    setForgotPasswordOpen(false);
    setForgotPasswordStep("email");
    setForgotPasswordEmail("");
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
    setShowForgotPassword(false);
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleNavigateHome = () => {
    closeMobileMenu();
    navigate("/");
  };

  const handleNavigateServices = () => {
    closeMobileMenu();
    navigate("/services");
  };

  const handleNavigateProfessionals = () => {
    closeMobileMenu();
    navigate(professionalBenefitsJoinTo());
  };

  const handleNavigateAbout = () => {
    closeMobileMenu();
    navigate("/about");
  };

  const handleNavigateContact = () => {
    closeMobileMenu();
    navigate("/about#contact");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0A1A2F] via-[#0d2238] to-[#0A1A2F] overflow-x-hidden w-full">
      <header className="sticky top-0 z-[60] w-full shrink-0 bg-transparent text-white py-3 md:py-4 px-4 md:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between w-full">
          <Link to="/" className="flex items-center cursor-pointer hover:opacity-90 transition-opacity" aria-label="Go to home">
            <img src={logoImage} alt="Fire Guide" className="h-7 md:h-12 w-auto flex-shrink-0" />
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-lg">
            <button type="button" onClick={handleNavigateHome} className="relative py-2 text-white hover:text-red-600 transition-colors group cursor-pointer">
              Home
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button type="button" onClick={handleNavigateServices} className="relative py-2 text-white hover:text-red-600 transition-colors group cursor-pointer">
              Services
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button type="button" onClick={handleNavigateProfessionals} className="relative py-2 text-white hover:text-red-600 transition-colors group cursor-pointer">
              For Professionals
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button type="button" onClick={handleNavigateAbout} className="relative py-2 text-white hover:text-red-600 transition-colors group cursor-pointer">
              About
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button type="button" onClick={handleNavigateContact} className="relative py-2 text-white hover:text-red-600 transition-colors group cursor-pointer">
              Contact
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full"></span>
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={onBack}
              className="text-lg text-white hover:text-red-600 hover:bg-transparent h-auto py-2 cursor-pointer group relative"
            >
              <User className="w-5 h-5 mr-2 shrink-0" />
              Login/Register
            </Button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-transparent border-t border-white/10 mt-4 py-6">
            <nav className="flex flex-col gap-1 px-4">
              <button 
                type="button"
                onClick={handleNavigateHome} 
                className="text-left py-3 px-4 rounded-lg text-white hover:bg-white/10 hover:text-red-400 transition-all cursor-pointer"
              >
                Home
              </button>
              <button 
                type="button"
                onClick={handleNavigateServices} 
                className="text-left py-3 px-4 rounded-lg text-white hover:bg-white/10 hover:text-red-400 transition-all cursor-pointer"
              >
                Services
              </button>
              <button 
                type="button"
                onClick={handleNavigateProfessionals}
                className="text-left py-3 px-4 rounded-lg text-white hover:bg-white/10 hover:text-red-400 transition-all cursor-pointer"
              >
                For Professionals
              </button>
              <button 
                type="button"
                onClick={handleNavigateAbout} 
                className="text-left py-3 px-4 rounded-lg text-white hover:bg-white/10 hover:text-red-400 transition-all cursor-pointer"
              >
                About
              </button>
              <button 
                type="button"
                onClick={handleNavigateContact} 
                className="text-left py-3 px-4 rounded-lg text-white hover:bg-white/10 hover:text-red-400 transition-all cursor-pointer"
              >
                Contact
              </button>
              <div className="pt-4 mt-2 border-t border-white/10">
                <Button 
                  variant="ghost" 
                  onClick={onBack}
                  className="w-full text-white hover:text-red-400 hover:bg-white/10 justify-start py-3 px-4 h-auto cursor-pointer transition-all"
                >
                  <User className="w-4 h-4 mr-2" />
                  Login/Register
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 flex items-center justify-center px-4 md:px-6 py-6 md:py-12 min-h-0">
        <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Side - Branding */}
            <div className="text-white space-y-6 md:space-y-8 order-2 lg:order-1">
              <div>
                <div className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full mb-4 md:mb-6">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">Customer Portal</span>
                </div>
                <h1 className="mb-3 md:mb-4 text-2xl md:text-4xl">
                  Book Fire Safety Services Instantly
                </h1>
                <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
                  Compare verified fire safety professionals, book services instantly, and manage everything from your dashboard.
                </p>
              </div>

              {/* Benefits */}
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-start gap-3 md:gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 md:p-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-red-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 md:w-6 md:h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-sm md:text-base">Verified Professionals</h3>
                    <p className="text-gray-300 text-xs md:text-sm">
                      All professionals are certified and background-checked
                    </p>
                  </div>
                </div>
        
                <div className="flex items-start gap-3 md:gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 md:p-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-red-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 md:w-6 md:h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-sm md:text-base">Instant Booking</h3>
                    <p className="text-gray-300 text-xs md:text-sm">
                      Book services in minutes with instant confirmation
                    </p>
                  </div>
                </div>
      
                <div className="flex items-start gap-3 md:gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 md:p-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-red-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Heart className="w-5 h-5 md:w-6 md:h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-sm md:text-base">Peace of Mind</h3>
                    <p className="text-gray-300 text-xs md:text-sm">
                      Track bookings, view reports, and stay compliant
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 md:gap-4">
                <div className="text-center">
                  <p className="text-2xl md:text-3xl text-red-500 mb-1">10,000+</p>
                  <p className="text-xs md:text-sm text-gray-300">Happy Customers</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl md:text-3xl text-red-500 mb-1">50,000+</p>
                  <p className="text-xs md:text-sm text-gray-300">Bookings Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl md:text-3xl text-red-500 mb-1">4.9/5</p>
                  <p className="text-xs md:text-sm text-gray-300">Average Rating</p>
                </div>
              </div>
            </div>

            {/* Right Side - Auth Form */}
            <div className="order-1 lg:order-2">
              <Card className="border-0 shadow-2xl overflow-visible">
                <CardHeader className="text-center pb-4">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                    <User className="w-7 h-7 md:w-8 md:h-8 text-red-600" />
                  </div>
                  <CardTitle className="text-xl md:text-2xl text-[#0A1A2F]">
                    {isSignUp ? "Create Your Account" : "Welcome Back"}
                  </CardTitle>
                  <CardDescription className="text-sm md:text-base">
                    {isSignUp 
                      ? "Sign up to book fire safety services instantly"
                      : "Sign in to access your bookings and dashboard"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 md:space-y-6 p-4 md:p-6 overflow-visible">
                  {/* Social login — Google /auth/google, Facebook /auth/facebook; Apple via env when configured */}
                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12"
                      onClick={handleGoogleAuth}
                      disabled={isGoogleLoading || isSocialLoading !== null}
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      {isGoogleLoading ? "Connecting..." : "Continue with Google"}
                    </Button>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-12"
                        onClick={handleAppleAuth}
                        disabled={isGoogleLoading || isSocialLoading !== null}
                      >
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                        </svg>
                        {isSocialLoading === "Apple" ? "..." : "Apple"}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-12"
                        onClick={handleFacebookAuth}
                        disabled={isGoogleLoading || isSocialLoading !== null}
                      >
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="#1877F2">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        {isSocialLoading === "Facebook" ? "Connecting..." : "Continue with Facebook"}
                      </Button>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">Or continue with email</span>
                    </div>
                  </div>

                  {/* Email/Password Form */}
                  {!isSignUp ? (
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email" className="text-base">
                          Email Address
                        </Label>
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="your.email@example.com"
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          className="h-12 text-base"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signin-password" className="text-base">
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="signin-password"
                            type={showSignInPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={signInPassword}
                            onChange={(e) => setSignInPassword(e.target.value)}
                            className="h-12 text-base pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignInPassword(!showSignInPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <button
                          type="button"
                          onClick={() => setForgotPasswordOpen(true)}
                          className="text-red-600 hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>

                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-red-600 hover:bg-red-700 h-12 text-base disabled:opacity-50"
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Signing in...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Sign In
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name" className="text-base">
                          Full Name
                        </Label>
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="John Smith"
                          value={signUpName}
                          onChange={(e) => setSignUpName(e.target.value)}
                          className="h-12 text-base"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-base">
                          Email Address
                        </Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="your.email@example.com"
                          value={signUpEmail}
                          onChange={(e) => setSignUpEmail(e.target.value)}
                          className="h-12 text-base"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-phone" className="text-base">
                          Phone Number
                        </Label>
                        <Input
                          id="signup-phone"
                          type="tel"
                          placeholder="07123 456789"
                          value={signUpPhone}
                          onChange={(e) => setSignUpPhone(e.target.value)}
                          className="h-12 text-base"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-role" className="text-base">
                          Role
                        </Label>
                        <Select value={signUpRole} onValueChange={setSignUpRole}>
                          <SelectTrigger id="signup-role" className="h-12 text-base">
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USER">User</SelectItem>
                            <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-base">
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="signup-password"
                            type={showSignUpPassword ? "text" : "password"}
                            placeholder="Create a strong password"
                            value={signUpPassword}
                            onChange={(e) => setSignUpPassword(e.target.value)}
                            className="h-12 text-base pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showSignUpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-red-600 hover:bg-red-700 h-12 text-base disabled:opacity-50"
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Creating account...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Create Account
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </Button>
                    </form>
                  )}

                  {/* Toggle Sign In/Sign Up */}
                  <div className="text-center text-sm">
                    {!isSignUp ? (
                      <p className="text-gray-600">
                        Don't have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setIsSignUp(true)}
                          className="text-red-600 hover:underline font-medium"
                        >
                          Sign up
                        </button>
                      </p>
                    ) : (
                      <p className="text-gray-600">
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setIsSignUp(false)}
                          className="text-red-600 hover:underline font-medium"
                        >
                          Sign in
                        </button>
                      </p>
                    )}
                  </div>

                  <div className="text-center text-sm text-gray-500">
                    By continuing, you agree to Fire Guide's{" "}
                    <a href="#" className="text-red-600 hover:underline">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-red-600 hover:underline">
                      Privacy Policy
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Support */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-300">
                  Need help?{" "}
                  <a href="#" className="text-red-400 hover:text-red-300 hover:underline">
                    Contact Support
                  </a>
                </p>
              </div>
            </div>
        </div>
      </main>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={handleCloseForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {forgotPasswordStep === "email" 
                ? "Reset Password" 
                : forgotPasswordStep === "otp"
                ? "Verify OTP"
                : "Set New Password"}
            </DialogTitle>
            <DialogDescription>
              {forgotPasswordStep === "email" 
                ? "Enter your email address and we'll send you an OTP to reset your password."
                : forgotPasswordStep === "otp"
                ? `Enter the OTP code sent to ${forgotPasswordEmail}`
                : "Please enter your new password"
              }
            </DialogDescription>
          </DialogHeader>
          
          {forgotPasswordStep === "email" ? (
            <form onSubmit={handleSendOtp} className="px-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-base">
                  Email Address
                </Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  className="h-12 text-base"
                  required
                  disabled={isSendingOtp}
                />
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseForgotPassword}
                  disabled={isSendingOtp}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSendingOtp}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                >
                  {isSendingOtp ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending OTP...
                    </span>
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </DialogFooter>
            </form>
          ) : forgotPasswordStep === "otp" ? (
            <form onSubmit={handleVerifyOtp} className="px-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp-code" className="text-base">
                  OTP Code
                </Label>
                <Input
                  id="otp-code"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-12 text-base text-center text-2xl tracking-widest"
                  required
                  disabled={isVerifyingOtp}
                  maxLength={6}
                />
                <p className="text-sm text-gray-500">
                  Didn't receive the code?{" "}
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={isSendingOtp || isVerifyingOtp}
                    className="text-red-600 hover:underline"
                  >
                    Resend OTP
                  </button>
                </p>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForgotPasswordStep("email");
                    setOtpCode("");
                  }}
                  disabled={isVerifyingOtp}
                  className="w-full sm:w-auto"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isVerifyingOtp || otpCode.length < 4}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                >
                  {isVerifyingOtp ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    "Verify OTP"
                  )}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="px-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-base">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showForgotPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-12 text-base pr-10"
                    required
                    disabled={isResettingPassword}
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(!showForgotPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showForgotPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Password must be at least 8 characters long
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-base">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showForgotPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 text-base pr-10"
                    required
                    disabled={isResettingPassword}
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(!showForgotPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showForgotPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForgotPasswordStep("otp");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  disabled={isResettingPassword}
                  className="w-full sm:w-auto"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isResettingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                >
                  {isResettingPassword ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Resetting Password...
                    </span>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}