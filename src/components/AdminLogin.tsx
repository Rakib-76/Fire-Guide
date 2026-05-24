import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, ArrowRight, Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import logoImage from "figma:asset/629703c093c2f72bf409676369fecdf03c462cd2.png";
import { loginUser } from "../api/authService";
import { setAuthToken, setUserEmail, setUserInfo, setUserPhone, setUserRole } from "../lib/auth";
import { toast } from "sonner";

interface AdminLoginProps {
  onLoginSuccess: (name: string) => void;
  onBack: () => void;
}

export function AdminLogin({ onLoginSuccess, onBack }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email || !password) {
      setError("Please enter both email and password");
      setIsLoading(false);
      return;
    }

    try {
      const response = await loginUser({
        email: email.trim(),
        password: password,
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
          setUserEmail(email.trim().toLowerCase());

          // Store user info - extract first name from full_name
          const fullName = response.data?.full_name || response.data?.user_name || response.data?.name || "Admin";
          setUserInfo(fullName, "admin");

          // Store phone number if available in response
          if (response.data?.phone) {
            setUserPhone(response.data.phone);
          }

          // Store role from backend response - check multiple possible locations
          // API response structure: { status: "success", data: { role: "USER"|"PROFESSIONAL"|"ADMIN", ... } }
          const role = response.data?.role || response.data?.data?.role || response.role;
          if (role) {
            setUserRole(role.toUpperCase()); // Ensure role is uppercase (USER, PROFESSIONAL, ADMIN)
          }

          toast.success("Welcome back! Signed in successfully.");
          const firstName = fullName.trim().split(' ')[0]; // Extract first name for callback
          onLoginSuccess(firstName);
        } else {
          console.error('No valid token found in login response:', response);
          setError("Login successful but no authentication token received. Please try again.");
          setIsLoading(false);
          return;
        }
      } else {
        // Handle specific error messages
        const errorMessage = response.message || response.error || "Login failed. Please try again.";
        setError(errorMessage);
        setIsLoading(false);
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || "An error occurred during login. Please try again.";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Premium Background with gradient - EXACT MATCH to Professional Page */}
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
        {/* Header - EXACT SAME STRUCTURE as Professional Page */}
        <header className="bg-transparent backdrop-blur-sm text-white py-4 px-6 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center cursor-pointer hover:opacity-90 transition-opacity" aria-label="Go to home">
              <img src={logoImage} alt="Fire Guide" className="h-12" />
            </Link>

            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={onBack}
                className="relative py-2 text-white hover:text-red-600 transition-colors group cursor-pointer"
              >
                Back to Home
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex items-center justify-center px-6 py-16 flex-1">
          <div className="w-full max-w-md">
            {/* Admin Badge */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-white mb-2">
                Admin Portal
              </h1>
              <p className="text-gray-300">
                Sign in to access the admin dashboard
              </p>
            </div>

            {/* Login Card */}
            <Card className="border-2 shadow-lg">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl text-[#0A1A2F]">
                  Administrator Login
                </CardTitle>
                <CardDescription className="text-base">
                  Enter your credentials to continue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-6">
                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-base">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@fireguide.com"
                        className="pl-11 h-12 text-base"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-base">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-11 pr-11 h-12 text-base"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me / Forgot Password */}
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 border-gray-300 rounded text-red-600 focus:ring-red-500"
                      />
                      <span className="text-gray-600">Remember me</span>
                    </label>
                    <a href="#" className="text-red-600 hover:text-red-700 hover:underline">
                      Forgot password?
                    </a>
                  </div>

                  {/* Login Button */}
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
              </CardContent>
            </Card>

            {/* Security Notice */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                🔒 Secure admin access • All actions are logged
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}