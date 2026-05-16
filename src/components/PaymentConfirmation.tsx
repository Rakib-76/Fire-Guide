import { Button } from "./ui/button";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { 
  CheckCircle, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  CreditCard,
  Download,
  Printer,
  Share2,
  ArrowRight,
  Home,
  Eye
} from "lucide-react";
import logoImage from "figma:asset/69744b74419586d01801e7417ef517136baf5cfb.png";

interface PaymentConfirmationProps {
  onBackToHome: () => void;
  onViewAppointment: () => void;
}

export function PaymentConfirmation({ onBackToHome, onViewAppointment }: PaymentConfirmationProps) {
  const booking = {
    reference: "FG-2025-00847",
    date: "Thursday, 21 November 2025",
    time: "10:00 AM",
    service: "Fire Risk Assessment",
    professional: {
      name: "Sarah Mitchell",
      photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop"
    },
    customer: {
      name: "John Smith",
      email: "john.smith@example.com",
      phone: "07123 456789"
    },
    property: {
      address: "123 High Street",
      city: "London",
      postcode: "SW1A 1AA"
    },
    payment: {
      servicePrice: 285,
      platformFee: 15,
      total: 300,
      method: "Card ending in 4242",
      date: "18 Nov 2025, 14:32"
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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

      {/* Main Content */}
      <main className="py-12 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Success Icon & Message */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6 relative">
              <CheckCircle className="w-16 h-16 text-green-600" fill="currentColor" />
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
            </div>
            <h1 className="text-[#0A1A2F] mb-3">Your booking is confirmed!</h1>
            <p className="text-lg text-gray-600 mb-2">
              Thank you for your booking. We've sent a confirmation email to
            </p>
            <p className="text-lg font-semibold text-gray-900">{booking.customer.email}</p>
          </div>

          {/* Booking Reference */}
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-gray-600 mb-1">Booking Reference</p>
              <p className="text-2xl font-semibold text-[#0A1A2F] tracking-wide">
                {booking.reference}
              </p>
            </CardContent>
          </Card>

          {/* Appointment Details */}
          <Card className="mb-6">
            <CardContent className="p-8">
              <h2 className="text-[#0A1A2F] mb-6">Appointment Details</h2>

              {/* Date & Time */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Date & Time</p>
                    <p className="font-semibold text-gray-900 text-lg">{booking.date}</p>
                    <p className="text-gray-600">{booking.time}</p>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Service */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Service</p>
                    <p className="font-semibold text-gray-900 text-lg">{booking.service}</p>
                  </div>
                </div>
              </div>

              {/* Professional */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-3">Your Professional</p>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <img
                    src={booking.professional.photo}
                    alt={booking.professional.name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{booking.professional.name}</p>
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Verified Professional
                    </p>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <p className="text-sm text-gray-600 mb-3">Property Address</p>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-gray-900">{booking.property.address}</p>
                    <p className="text-gray-900">{booking.property.city}</p>
                    <p className="text-gray-900">{booking.property.postcode}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Details */}
          <Card className="mb-6">
            <CardContent className="p-8">
              <h2 className="text-[#0A1A2F] mb-6">Contact Details</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="text-gray-900">{booking.customer.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-gray-900">{booking.customer.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="text-gray-900">{booking.customer.phone}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card className="mb-6">
            <CardContent className="p-8">
              <h2 className="text-[#0A1A2F] mb-6">Payment Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service fee</span>
                  <span className="text-gray-900">£{booking.payment.servicePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Platform fee</span>
                  <span className="text-gray-900">£{booking.payment.platformFee.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between pt-2">
                  <span className="font-semibold text-gray-900">Total Paid</span>
                  <span className="text-2xl font-semibold text-green-600">
                    £{booking.payment.total.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment method</span>
                  <span className="text-gray-900">{booking.payment.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment date</span>
                  <span className="text-gray-900">{booking.payment.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className="text-green-600 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Paid
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <Button variant="outline" size="lg" className="w-full">
              <Download className="w-5 h-5 mr-2" />
              Download Receipt
            </Button>
            <Button size="lg" className="w-full bg-red-600 hover:bg-red-700" onClick={onViewAppointment}>
              <Eye className="w-5 h-5 mr-2" />
              View Appointment
            </Button>
          </div>

          {/* What's Next */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-[#0A1A2F] mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                What happens next?
              </h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                    1
                  </div>
                  <p>You'll receive a confirmation email with all booking details</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                    2
                  </div>
                  <p>The professional will contact you 24 hours before your appointment</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                    3
                  </div>
                  <p>After the service, you'll receive your fire risk assessment report</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Return to Homepage */}
          <div className="text-center mt-8">
            <Button variant="ghost" className="text-gray-600 hover:text-red-600" onClick={onBackToHome}>
              Return to Homepage
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </main>

      {/* Need Help Section */}
      <div className="bg-white border-t py-8 px-4 md:px-6 mt-8">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-[#0A1A2F] mb-3">Need help with your booking?</h3>
          <p className="text-gray-600 mb-4">
            Our customer support team is here to assist you
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="outline">
              <Phone className="w-4 h-4 mr-2" />
              Call Support
            </Button>
            <Button variant="outline">
              <Mail className="w-4 h-4 mr-2" />
              Email Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}