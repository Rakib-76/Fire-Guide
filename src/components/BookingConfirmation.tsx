import { Button } from "./ui/button";
import { Link } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { 
  CheckCircle, 
  Calendar,
  MapPin,
  User,
  Mail,
  Phone,
  Download,
  Home,
  CreditCard
} from "lucide-react";
import logoImage from "figma:asset/69744b74419586d01801e7417ef517136baf5cfb.png";
import { BookingServiceDetailsLines } from "./BookingServiceDetailsLines";
import type { BookingData } from "./BookingFlow";

interface BookingConfirmationProps {
  bookingData: BookingData;
  onDone: () => void;
}

export function BookingConfirmation({ bookingData, onDone }: BookingConfirmationProps) {
  const { service, professional, selectedDate, selectedTime, customer, pricing, bookingReference } = bookingData;

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
      <main className="py-12 px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Success Message */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-[#0A1A2F] mb-2">Booking Confirmed!</h1>
            <p className="text-xl text-gray-600 mb-4">
              Your fire safety appointment has been successfully booked
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm text-gray-600">Booking Reference:</span>
              <span className="text-lg font-bold text-blue-600">{bookingReference}</span>
            </div>
          </div>

          {/* Confirmation Email Notice */}
          <Card className="bg-blue-50 border-blue-200 mb-6">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 mb-1">Confirmation email sent</p>
                  <p className="text-sm text-blue-800">
                    We've sent a confirmation email to <strong>{customer.email}</strong> with all the booking details.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Details */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl text-[#0A1A2F] mb-6">Booking Details</h2>
              
              <div className="space-y-6">
                {/* Service */}
                <div>
                  <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Service
                  </p>
                  <p className="font-semibold text-gray-900 text-lg">{service.name}</p>
                  <div className="mt-2">
                    <BookingServiceDetailsLines service={service} />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Professional
                  </p>
                  <div className="flex items-center gap-4">
                    <img
                      src={professional.photo}
                      alt={professional.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{professional.name}</h3>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </div>
                      <p className="text-sm text-gray-600">Rating: {professional.rating} ⭐ • Verified Professional</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date & Time
                  </p>
                  <p className="font-semibold text-gray-900 text-lg">
                    {new Date(selectedDate).toLocaleDateString('en-GB', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-gray-700 mt-1">{selectedTime}</p>
                </div>

                <div className="border-t pt-6">
                  <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Property Address
                  </p>
                  <p className="text-gray-900">{customer.address}</p>
                  <p className="text-gray-900">{customer.city}, {customer.postcode}</p>
                </div>

                <div className="border-t pt-6">
                  <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Contact Information
                  </p>
                  <div className="space-y-2">
                    <p className="text-gray-900">{customer.firstName} {customer.lastName}</p>
                    <p className="text-sm text-gray-700 flex items-center gap-2">
                      <Mail className="w-3 h-3" />
                      {customer.email}
                    </p>
                    <p className="text-sm text-gray-700 flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      {customer.phone}
                    </p>
                  </div>
                </div>

                {customer.notes && (
                  <div className="border-t pt-6">
                    <p className="text-sm text-gray-600 mb-2">Additional Notes</p>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{customer.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl text-[#0A1A2F] mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Summary
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service fee</span>
                  <span className="text-gray-900">£{pricing.servicePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform fee</span>
                  <span className="text-gray-900">£{pricing.platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="font-semibold text-gray-900">Total Paid</span>
                  <span className="text-2xl font-semibold text-green-600">£{pricing.total.toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-900">Payment successful</span>
              </div>
            </CardContent>
          </Card>

          {/* What's Next */}
          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200 mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl text-[#0A1A2F] mb-4">What happens next?</h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Professional Notification</p>
                    <p className="text-sm text-gray-600">
                      {professional.name} has been notified and will prepare for your appointment.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Reminder Notification</p>
                    <p className="text-sm text-gray-600">
                      You'll receive a reminder email 24 hours before your appointment.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Service Completion</p>
                    <p className="text-sm text-gray-600">
                      After the service, you'll receive a comprehensive fire safety report.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              className="flex-1 py-6"
              onClick={() => window.print()}
            >
              <Download className="w-5 h-5 mr-2" />
              Download Receipt
            </Button>
            <Button
              onClick={onDone}
              className="flex-1 bg-red-600 hover:bg-red-700 py-6"
            >
              <Home className="w-5 h-5 mr-2" />
              Back to Home
            </Button>
          </div>

          {/* Support */}
          <Card className="mt-6 bg-gray-50">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">
                Need help? Contact our support team at{" "}
                <a href="mailto:support@fireguide.com" className="text-red-600 hover:underline">
                  support@fireguide.com
                </a>
                {" "}or call{" "}
                <a href="tel:08001234567" className="text-red-600 hover:underline">
                  0800 123 4567
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
