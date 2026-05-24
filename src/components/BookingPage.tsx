import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  Home,
  CreditCard,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  ChevronRight,
  CheckCircle,
  Lock
} from "lucide-react";
import logoImage from "figma:asset/69744b74419586d01801e7417ef517136baf5cfb.png";

interface BookingPageProps {
  onConfirm: () => void;
  onBack: () => void;
}

export function BookingPage({ onConfirm, onBack }: BookingPageProps) {
  const [selectedDate, setSelectedDate] = useState("2025-11-21");
  const [selectedTime, setSelectedTime] = useState("10:00 AM");
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postcode: "",
    notes: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const service = {
    name: "Fire Risk Assessment",
    propertyType: "Office Building",
    floors: 3,
    people: "26-50"
  };

  const professional = {
    name: "Sarah Mitchell",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    verified: true,
    rating: 4.9
  };

  const pricing = {
    servicePrice: 285,
    platformFee: 15,
    total: 300
  };

  const availableDates = [
    { date: "2025-11-20", day: "Wed", dayNum: "20" },
    { date: "2025-11-21", day: "Thu", dayNum: "21" },
    { date: "2025-11-22", day: "Fri", dayNum: "22" },
    { date: "2025-11-25", day: "Mon", dayNum: "25" },
    { date: "2025-11-26", day: "Tue", dayNum: "26" }
  ];

  const timeSlots = ["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM"];

  const updateFormData = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[\d\s+()-]+$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.postcode.trim()) newErrors.postcode = "Postcode is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // Proceed to payment
      console.log("Form valid, proceeding to payment...");
      onConfirm();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm text-[#0A1A2F] py-3 px-4 md:px-6">
        <div className="max-w-7xl mx-auto flex items-center">
          <Link
            to="/"
            className="flex items-center cursor-pointer hover:opacity-90 transition-opacity"
            aria-label="Go to home"
          >
            <img src={logoImage} alt="Fire Guide" className="h-12 w-auto" />
          </Link>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-white py-4 px-4 md:px-6 border-b">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <a href="#" className="hover:text-red-600 transition-colors">Home</a>
            <ChevronRight className="w-4 h-4" />
            <a href="#" className="hover:text-red-600 transition-colors">Compare Professionals</a>
            <ChevronRight className="w-4 h-4" />
            <a href="#" className="hover:text-red-600 transition-colors">Profile</a>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">Book & Pay</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="py-8 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-[#0A1A2F] mb-8">Complete Your Booking</h1>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Booking Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Service Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#0A1A2F]">Service Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">{service.name}</h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Property Type: <span className="text-gray-900">{service.propertyType}</span></p>
                        <p>Number of Floors: <span className="text-gray-900">{service.floors}</span></p>
                        <p>Number of People: <span className="text-gray-900">{service.people}</span></p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Confirmed
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Professional Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#0A1A2F]">Your Professional</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <img
                      src={professional.photo}
                      alt={professional.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{professional.name}</h3>
                        {professional.verified && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">Rating: {professional.rating} ⭐ • Verified Professional</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Date & Time Selector */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#0A1A2F] flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Select Date & Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Date Selector */}
                  <div className="mb-6">
                    <Label className="mb-3 block">Choose a date</Label>
                    <div className="grid grid-cols-5 gap-3">
                      {availableDates.map((dateInfo) => (
                        <button
                          key={dateInfo.date}
                          onClick={() => setSelectedDate(dateInfo.date)}
                          className={`p-3 text-center rounded-lg border-2 transition-all ${
                            selectedDate === dateInfo.date
                              ? "border-red-600 bg-red-50"
                              : "border-gray-200 hover:border-red-300"
                          }`}
                        >
                          <div className="text-xs text-gray-500 mb-1">{dateInfo.day}</div>
                          <div className="font-semibold text-gray-900">{dateInfo.dayNum}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Selector */}
                  <div>
                    <Label className="mb-3 block">Choose a time</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setSelectedTime(slot)}
                          className={`p-3 text-center rounded-lg border-2 transition-all ${
                            selectedTime === slot
                              ? "border-red-600 bg-red-50 text-red-600 font-semibold"
                              : "border-gray-200 hover:border-red-300"
                          }`}
                        >
                          <Clock className="w-4 h-4 inline mr-2" />
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#0A1A2F] flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Your Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Name */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => updateFormData("firstName", e.target.value)}
                          className={errors.firstName ? "border-red-500" : ""}
                        />
                        {errors.firstName && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.firstName}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => updateFormData("lastName", e.target.value)}
                          className={errors.lastName ? "border-red-500" : ""}
                        />
                        {errors.lastName && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.lastName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={formData.email}
                          onChange={(e) => updateFormData("email", e.target.value)}
                          className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.email}
                        </p>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="07123 456789"
                          value={formData.phone}
                          onChange={(e) => updateFormData("phone", e.target.value)}
                          className={`pl-10 ${errors.phone ? "border-red-500" : ""}`}
                        />
                      </div>
                      {errors.phone && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.phone}
                        </p>
                      )}
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                      <Label htmlFor="address">Property Address *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="address"
                          placeholder="Street address"
                          value={formData.address}
                          onChange={(e) => updateFormData("address", e.target.value)}
                          className={`pl-10 ${errors.address ? "border-red-500" : ""}`}
                        />
                      </div>
                      {errors.address && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.address}
                        </p>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => updateFormData("city", e.target.value)}
                          className={errors.city ? "border-red-500" : ""}
                        />
                        {errors.city && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.city}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postcode">Postcode *</Label>
                        <Input
                          id="postcode"
                          placeholder="SW1A 1AA"
                          value={formData.postcode}
                          onChange={(e) => updateFormData("postcode", e.target.value.toUpperCase())}
                          className={errors.postcode ? "border-red-500" : ""}
                        />
                        {errors.postcode && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.postcode}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Additional Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any special requirements or access instructions..."
                        value={formData.notes}
                        onChange={(e) => updateFormData("notes", e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Payment Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-6">
                {/* Booking Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-[#0A1A2F]">Booking Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Selected Date & Time */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <Calendar className="w-4 h-4" />
                          <span>Date & Time</span>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {new Date(selectedDate).toLocaleDateString('en-GB', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-gray-600">{selectedTime}</p>
                      </div>

                      {/* Price Breakdown */}
                      <div className="space-y-3 pt-4 border-t">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Service fee</span>
                          <span className="text-gray-900">£{pricing.servicePrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Platform fee</span>
                          <span className="text-gray-900">£{pricing.platformFee.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-3 border-t">
                          <span className="font-semibold text-gray-900">Total</span>
                          <span className="text-2xl font-semibold text-gray-900">£{pricing.total.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Security Note */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                        <Lock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-900">
                          Your payment is secure and encrypted. We use industry-standard security measures.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Button */}
                <Button
                  onClick={handleSubmit}
                  className="w-full bg-red-600 hover:bg-red-700 py-6 text-lg"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pay & Confirm Booking
                </Button>

                {/* Terms */}
                <p className="text-xs text-center text-gray-500">
                  By proceeding, you agree to our{" "}
                  <a href="#" className="text-red-600 hover:underline">Terms of Service</a>
                  {" "}and{" "}
                  <a href="#" className="text-red-600 hover:underline">Privacy Policy</a>
                </p>

                {/* Money Back Guarantee */}
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-green-900 text-sm mb-1">Money-back guarantee</p>
                        <p className="text-xs text-green-700">
                          If you're not satisfied with the service, we'll refund you in full.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}