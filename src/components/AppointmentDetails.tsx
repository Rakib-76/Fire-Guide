import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Calendar } from "./ui/calendar";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  CheckCircle,
  Download,
  FileText,
  MessageCircle,
  AlertCircle,
  ArrowLeft,
  MapPinned,
  CreditCard,
  Send,
  X
} from "lucide-react";
import logoImage from "figma:asset/69744b74419586d01801e7417ef517136baf5cfb.png";

interface AppointmentDetailsProps {
  onBack: () => void;
  onBackToHome: () => void;
}

export function AppointmentDetails({ onBack, onBackToHome }: AppointmentDetailsProps) {
  const [activeTab, setActiveTab] = useState<"details" | "messages">("details");
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [message, setMessage] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("");

  const handleSendMessage = () => {
    // In a real app, this would send the message to the professional
    alert(`Message sent to ${appointment.professional.name}:\n\n${message}`);
    setMessage("");
    setShowMessageDialog(false);
  };

  const handleCancelBooking = () => {
    // In a real app, this would cancel the booking in the backend
    alert(`Booking ${appointment.reference} has been cancelled.\n\nReason: ${cancelReason}\n\nA refund will be processed within 5-7 business days.`);
    setCancelReason("");
    setShowCancelDialog(false);
    // Optionally redirect to home or bookings list
    setTimeout(() => onBackToHome(), 2000);
  };

  const handleReschedule = () => {
    if (!selectedDate || !selectedTime) {
      alert("Please select both date and time");
      return;
    }
    // In a real app, this would update the booking in the backend
    const formattedDate = selectedDate.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    alert(`Appointment rescheduled to:\n${formattedDate} at ${selectedTime}\n\nYou'll receive a confirmation email shortly.`);
    setShowRescheduleDialog(false);
  };

  const appointment = {
    reference: "FG-2025-00847",
    status: "confirmed",
    date: "Thursday, 21 November 2025",
    time: "10:00 AM",
    service: "Fire Risk Assessment",
    professional: {
      name: "Sarah Mitchell",
      photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
      phone: "07123 987654",
      email: "sarah.mitchell@fireguide.co.uk",
      rating: 4.9,
      verified: true
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
    },
    timeline: [
      { date: "18 Nov 2025, 14:32", event: "Booking confirmed", completed: true },
      { date: "20 Nov 2025, 10:00", event: "Professional will contact you", completed: false },
      { date: "21 Nov 2025, 10:00", event: "Appointment scheduled", completed: false },
      { date: "22 Nov 2025", event: "Report delivered", completed: false }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm text-[#0A1A2F] py-3 px-4 md:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center cursor-pointer hover:opacity-90 transition-opacity"
            aria-label="Go to home"
          >
            <img src={logoImage} alt="Fire Guide" className="h-12 w-auto" />
          </Link>
          <Button variant="ghost" className="text-[#0A1A2F] hover:text-red-600 hover:bg-gray-100" onClick={onBackToHome}>
            Back to Home
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            className="mb-6 text-gray-600 hover:text-red-600"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {/* Header Section */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-[#0A1A2F] mb-2">Appointment Details</h1>
                <p className="text-gray-600">Reference: {appointment.reference}</p>
              </div>
              <Badge className="bg-green-100 text-green-800 px-4 py-2 text-sm w-fit">
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmed
              </Badge>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Main Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Appointment Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#0A1A2F]">Appointment Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Date & Time */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CalendarIcon className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-1">Date & Time</p>
                        <p className="font-semibold text-gray-900">{appointment.date}</p>
                        <p className="text-gray-600">{appointment.time}</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Service */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-1">Service</p>
                        <p className="font-semibold text-gray-900">{appointment.service}</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Location */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-1">Property Address</p>
                        <p className="text-gray-900">{appointment.property.address}</p>
                        <p className="text-gray-900">{appointment.property.city}</p>
                        <p className="text-gray-900">{appointment.property.postcode}</p>
                        <Button variant="link" className="p-0 h-auto text-red-600 mt-2">
                          <MapPinned className="w-4 h-4 mr-1" />
                          View on Map
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Professional Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#0A1A2F]">Your Professional</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4 mb-6">
                    <img
                      src={appointment.professional.photo}
                      alt={appointment.professional.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">{appointment.professional.name}</p>
                        {appointment.professional.verified && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <span className="text-yellow-500">★</span>
                        <span>{appointment.professional.rating} rating</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.location.href = `tel:${appointment.professional.phone}`}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Call Professional
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowMessageDialog(true)}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#0A1A2F]">Appointment Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {appointment.timeline.map((item, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            item.completed 
                              ? "bg-green-100" 
                              : "bg-gray-100"
                          }`}>
                            {item.completed ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <Clock className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          {index < appointment.timeline.length - 1 && (
                            <div className={`w-0.5 h-12 ${
                              item.completed ? "bg-green-200" : "bg-gray-200"
                            }`} />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className={`font-medium ${
                            item.completed ? "text-gray-900" : "text-gray-600"
                          }`}>
                            {item.event}
                          </p>
                          <p className="text-sm text-gray-500">{item.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Actions & Payment */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#0A1A2F]">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Download Confirmation
                  </Button>
                  <Button variant="outline" className="w-full justify-start" disabled>
                    <FileText className="w-4 h-4 mr-2" />
                    View Report
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Available after appointment
                    </Badge>
                  </Button>
                  <Separator />
                  <Button variant="outline" className="w-full justify-start text-yellow-700 hover:text-yellow-800 hover:bg-yellow-50" onClick={() => setShowRescheduleDialog(true)}>
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Reschedule
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setShowCancelDialog(true)}>
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Cancel Booking
                  </Button>
                </CardContent>
              </Card>

              {/* Payment Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[#0A1A2F]">Payment Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Service fee</span>
                      <span className="text-gray-900">£{appointment.payment.servicePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Platform fee</span>
                      <span className="text-gray-900">£{appointment.payment.platformFee.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Total Paid</span>
                      <span className="font-semibold text-green-600">
                        £{appointment.payment.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Payment method</span>
                      <span className="text-gray-900 flex items-center gap-1">
                        <CreditCard className="w-4 h-4" />
                        {appointment.payment.method}
                      </span>
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

              {/* Need Help */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-[#0A1A2F] mb-3">Need Help?</h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Our support team is available 24/7 to assist you
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full bg-white">
                      <Phone className="w-4 h-4 mr-2" />
                      Call Support
                    </Button>
                    <Button variant="outline" size="sm" className="w-full bg-white">
                      <Mail className="w-4 h-4 mr-2" />
                      Email Support
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
            <DialogDescription>
              Send a message to {appointment.professional.name}
            </DialogDescription>
          </DialogHeader>
          <CardContent>
            <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Message
            </Label>
            <Textarea
              className="mt-2"
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </CardContent>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="mr-2"
              onClick={() => setShowMessageDialog(false)}
            >
              Cancel
            </Button>
            <Button type="button" className="bg-blue-500 text-white" onClick={handleSendMessage}>
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking?
            </DialogDescription>
          </DialogHeader>
          <CardContent>
            <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Reason for cancellation
            </Label>
            <Textarea
              className="mt-2"
              placeholder="Type your reason here..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </CardContent>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="mr-2"
              onClick={() => setShowCancelDialog(false)}
            >
              Cancel
            </Button>
            <Button type="button" className="bg-red-500 text-white" onClick={handleCancelBooking}>
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Choose a new date and time for your appointment
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Select New Date
              </Label>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                  disabled={(date) => date < new Date()}
                />
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Select New Time
              </Label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {selectedDate && selectedTime && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>New appointment:</strong>
                  <br />
                  {selectedDate.toLocaleDateString('en-GB', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })} at {selectedTime}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRescheduleDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              className="bg-yellow-600 hover:bg-yellow-700 text-white" 
              onClick={handleReschedule}
              disabled={!selectedDate || !selectedTime}
            >
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}