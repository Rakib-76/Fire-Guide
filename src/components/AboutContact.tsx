import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  Shield, 
  Users, 
  Target, 
  Award,
  Clock,
  CheckCircle2,
  Building2,
  Heart,
  Flame,
  Menu,
  User
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Footer } from "./Footer";
import { toast } from "sonner";
import { sendContactUsMail } from "../api/contactUsService";
import logoImage from "figma:asset/69744b74419586d01801e7417ef517136baf5cfb.png";

interface AboutContactProps {
  onBack: () => void;
  onAdminLogin?: () => void;
  currentUserName?: string;
  onLogout?: () => void;
  onNavigateServices?: () => void;
  onNavigateProfessionals?: () => void;
  onCustomerLogin?: () => void;
  /** e.g. navigate to /services to start booking */
  onStartBooking?: () => void;
}

export function AboutContact({
  onBack,
  onAdminLogin,
  currentUserName,
  onLogout,
  onNavigateServices,
  onNavigateProfessionals,
  onCustomerLogin,
  onStartBooking,
}: AboutContactProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isContactNavActive = location.hash === "#contact";

  useEffect(() => {
    if (location.hash !== "#contact") return;
    const timer = window.setTimeout(() => {
      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash]);

  const navBtnClass = (active: boolean) =>
    `relative py-2 transition-colors group cursor-pointer ${
      active ? "text-red-600" : "hover:text-red-600"
    }`;
  const navUnderlineClass = (active: boolean) =>
    `absolute bottom-0 left-0 h-0.5 bg-red-600 transition-all duration-300 ${
      active ? "w-full" : "w-0 group-hover:w-full"
    }`;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await sendContactUsMail({
        full_name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      });

      const ok =
        res.status === true ||
        res.status === "success" ||
        res.success === true;

      if (ok) {
        toast.success(res.message || "Thank you! We'll get back to you within 24 hours.");
        setFormData({
          name: "",
          email: "",
          phone: "",
          subject: "",
          message: "",
        });
      } else {
        toast.error(res.message || res.error || "Failed to send message. Please try again.");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as
          | { message?: string; error?: string; errors?: Record<string, string[]> }
          | undefined;
        const msg =
          (typeof data?.message === "string" && data.message) ||
          (typeof data?.error === "string" && data.error) ||
          err.message;
        if (data?.errors && typeof data.errors === "object") {
          const first = Object.values(data.errors).flat()[0];
          toast.error(typeof first === "string" ? first : msg || "Validation failed.");
        } else {
          toast.error(msg || "Failed to send message. Please try again.");
        }
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const values = [
    {
      icon: Shield,
      title: "Safety First",
      description: "We prioritize the safety and security of every customer by thoroughly vetting all professionals on our platform."
    },
    {
      icon: CheckCircle2,
      title: "Quality Assurance",
      description: "Every professional is certified, insured, and experienced. We maintain the highest standards in fire safety services."
    },
    {
      icon: Heart,
      title: "Customer Care",
      description: "Your satisfaction is our mission. We provide 24/7 support and ensure every booking meets your expectations."
    },
    {
      icon: Target,
      title: "Transparency",
      description: "Clear pricing, honest reviews, and no hidden fees. We believe in complete transparency throughout your journey."
    }
  ];

  const stats = [
    { number: "10,000+", label: "Customers Served" },
    { number: "500+", label: "Certified Professionals" },
    { number: "50+", label: "UK Cities Covered" },
    { number: "4.9/5", label: "Average Rating" }
  ];

  const team = [
    {
      role: "Our Mission",
      icon: Target,
      description: "To make fire safety simple, accessible, and affordable for every home and business across the UK. We connect customers with certified professionals instantly, ensuring peace of mind and regulatory compliance."
    },
    {
      role: "Our Vision",
      icon: Award,
      description: "To become the UK's most trusted fire safety platform, setting new standards for quality, transparency, and customer service in the industry. We envision a future where fire safety is accessible to all."
    },
    {
      role: "Our Promise",
      icon: Shield,
      description: "We promise verified professionals, transparent pricing, instant booking, secure payments, and exceptional support. Your safety is our responsibility, and we take it seriously every single day."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white/95 backdrop-blur-sm text-[#0A1A2F] py-4 px-4 md:px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center cursor-pointer hover:opacity-90 transition-opacity" aria-label="Go to home">
            <img src={logoImage} alt="Fire Guide" className="h-12" />
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-lg">
            <button type="button" onClick={onBack} className="relative py-2 hover:text-red-600 transition-colors group cursor-pointer">
              Home
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button type="button" onClick={onNavigateServices || onBack} className="relative py-2 hover:text-red-600 transition-colors group cursor-pointer">
              Services
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button type="button" onClick={onNavigateProfessionals || onBack} className="relative py-2 hover:text-red-600 transition-colors group cursor-pointer">
              For Professionals
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigate("/about");
                window.setTimeout(() => {
                  document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
                }, 0);
              }}
              className={navBtnClass(!isContactNavActive)}
            >
              About
              <span className={navUnderlineClass(!isContactNavActive)} />
            </button>
            <button
              type="button"
              onClick={() => {
                navigate("/about#contact");
                window.setTimeout(() => {
                  document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
                }, 0);
              }}
              className={navBtnClass(isContactNavActive)}
            >
              Contact
              <span className={navUnderlineClass(isContactNavActive)} />
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {currentUserName ? (
              <Button 
                variant="ghost" 
                onClick={onLogout} 
                className="text-lg text-[#0A1A2F] hover:text-red-600 hover:bg-transparent cursor-pointer h-auto py-2"
              >
                <User className="w-5 h-5 mr-2 shrink-0" />
                {currentUserName}
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                onClick={onCustomerLogin || onBack} 
                className="text-lg text-[#0A1A2F] hover:text-red-600 hover:bg-transparent cursor-pointer h-auto py-2"
              >
                <User className="w-5 h-5 mr-2 shrink-0" />
                Login/Register
              </Button>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 mt-4 py-6">
            <nav className="flex flex-col gap-1 px-4 md:px-6 text-lg">
              <button 
                type="button"
                onClick={onBack} 
                className="text-left py-3 px-4 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
              >
                Home
              </button>
              <button 
                type="button"
                onClick={onNavigateServices || onBack}
                className="text-left py-3 px-4 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
              >
                Services
              </button>
              <button 
                type="button"
                onClick={onNavigateProfessionals || onBack}
                className="text-left py-3 px-4 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
              >
                For Professionals
              </button>
              <button 
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/about");
                  window.setTimeout(() => {
                    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
                  }, 0);
                }}
                className={`text-left py-3 px-4 rounded-lg cursor-pointer ${
                  !isContactNavActive ? "bg-red-50 text-red-600" : "hover:bg-red-50 hover:text-red-600"
                }`}
              >
                About
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/about#contact");
                  window.setTimeout(() => {
                    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
                  }, 0);
                }}
                className={`text-left py-3 px-4 rounded-lg cursor-pointer w-full ${
                  isContactNavActive ? "bg-red-50 text-red-600" : "hover:bg-red-50 hover:text-red-600"
                }`}
              >
                Contact
              </button>
              <div className="pt-4 mt-2 border-t border-gray-200">
                {currentUserName ? (
                  <Button 
                    variant="ghost" 
                    onClick={onLogout} 
                    className="w-full text-lg text-[#0A1A2F] hover:text-red-600 hover:bg-red-50 justify-start py-3 px-4 h-auto cursor-pointer"
                  >
                    <User className="w-5 h-5 mr-2 shrink-0" />
                    {currentUserName}
                  </Button>
                ) : (
                  <Button 
                    variant="ghost" 
                    onClick={onCustomerLogin || onBack} 
                    className="w-full text-lg text-[#0A1A2F] hover:text-red-600 hover:bg-red-50 justify-start py-3 px-4 h-auto cursor-pointer"
                  >
                    <User className="w-5 h-5 mr-2 shrink-0" />
                    Login/Register
                  </Button>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <section id="about-us" className="bg-gradient-to-br from-[#0A1A2F] via-[#0A1A2F] to-[#1a2f4f] text-white py-16 px-6 pt-[6.25rem] md:pt-[7.5rem] lg:pt-32 pb-14 md:pb-16 lg:pb-20">
        <div className="max-w-7xl mx-auto text-center py-24">
          <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 rounded-full px-4 py-2 mb-6">
            <Flame className="w-4 h-4 text-red-500" />
            <span className="text-sm">Trusted by 10,000+ Customers</span>
          </div>
          <h1 className="text-[48px] md:text-[64px] leading-[110%] mb-6">
            About Fire Guide
          </h1>
          <p className="text-[18px] md:text-[24px] leading-[150%] text-gray-300 max-w-3xl mx-auto">
            We're on a mission to revolutionize fire safety services in the UK by connecting customers with certified professionals through an innovative, transparent platform.
          </p>
        </div>
      </section>

      <section className="pt-0 pb-14 md:pb-16 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto py-12 md:py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-[40px] md:text-[56px] text-red-600 mb-2">
                  {stat.number}
                </div>
                <div className="text-[14px] md:text-[16px] text-gray-600">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[40px] md:text-[48px] leading-[110%] mb-6">
              Who We Are
            </h2>
            <p className="text-[16px] md:text-[20px] leading-[150%] text-gray-600 max-w-3xl mx-auto">
              Fire Guide is the UK's leading platform for fire safety services. We bridge the gap between customers seeking professional fire safety solutions and certified experts ready to help.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h3 className="text-[32px] md:text-[40px] leading-[120%] mb-6">
                Making Fire Safety Accessible
              </h3>
              <p className="text-[16px] leading-[160%] text-gray-600 mb-4">
                Founded with a vision to simplify fire safety compliance, Fire Guide has grown into a trusted platform serving thousands of homes and businesses across the UK.
              </p>
              <p className="text-[16px] leading-[160%] text-gray-600 mb-4">
                We understand that fire safety can be complex and overwhelming. That's why we've created a platform that makes it easy to find, compare, and book qualified professionals in just a few clicks.
              </p>
              <p className="text-[16px] leading-[160%] text-gray-600">
                Our rigorous vetting process ensures that every professional on our platform meets the highest standards of certification, insurance, and expertise. Your safety is our priority.
              </p>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-8 text-white">
                <Building2 className="w-16 h-16 mb-6" />
                <h4 className="text-[24px] mb-4">Established 2020</h4>
                <p className="text-[16px] leading-[160%] text-gray-100">
                  Since our launch, we've completed over 25,000 fire safety bookings, helping businesses achieve compliance and homeowners gain peace of mind.
                </p>
              </div>
            </div>
          </div>

          {/* Mission, Vision, Promise */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {team.map((item, index) => (
              <Card key={index} className="border-2 hover:border-red-600 transition-all hover:shadow-xl">
                <CardHeader>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-red-600" />
                  </div>
                  <CardTitle>{item.role}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-[160%]">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Values */}
          <div className="text-center mb-12">
            <h2 className="text-[40px] md:text-[48px] leading-[110%] mb-6">
              Our Core Values
            </h2>
            <p className="text-[16px] md:text-[20px] leading-[150%] text-gray-600 max-w-3xl mx-auto">
              These principles guide everything we do at Fire Guide
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center p-6 rounded-xl bg-gray-50 hover:bg-red-50 transition-all">
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-[20px] mb-3">{value.title}</h3>
                <p className="text-gray-600 leading-[160%]">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[40px] md:text-[48px] leading-[110%] mb-6">
              Get In Touch
            </h2>
            <p className="text-[16px] md:text-[20px] leading-[150%] text-gray-600 max-w-3xl mx-auto">
              Have questions? We're here to help. Reach out to our team and we'll respond within 24 hours.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div>
              <h3 className="text-[28px] mb-8">Contact Information</h3>
              
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Mail className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h4 className="text-[18px] mb-2">Email Us</h4>
                        <p className="text-gray-600">support@fireguide.co.uk</p>
                        <p className="text-sm text-gray-500 mt-1">We reply within 24 hours</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Phone className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h4 className="text-[18px] mb-2">Call Us</h4>
                        <p className="text-gray-600">0800 123 4567</p>
                        <p className="text-sm text-gray-500 mt-1">Mon-Fri, 9am-6pm GMT</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h4 className="text-[18px] mb-2">Visit Us</h4>
                        <p className="text-gray-600">
                          123 Fire Safety House<br />
                          London, EC1A 1BB<br />
                          United Kingdom
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Clock className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h4 className="text-[18px] mb-2">Business Hours</h4>
                        <p className="text-gray-600">
                          Monday - Friday: 9:00 AM - 6:00 PM<br />
                          Saturday: 10:00 AM - 4:00 PM<br />
                          Sunday: Closed
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-[28px]">Send Us a Message</CardTitle>
                  <CardDescription>
                    Fill out the form below and we'll get back to you as soon as possible.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John Smith"
                        required
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="john@example.com"
                        required
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="07123 456789"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="How can we help?"
                        required
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Tell us more about your inquiry..."
                        required
                        rows={6}
                        className="mt-2"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        "Sending..."
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>

                    <p className="text-sm text-gray-500 text-center">
                      We typically respond within 24 hours during business days
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-[40px] md:text-[48px] leading-[110%] mb-6">
              Common Questions
            </h2>
            <p className="text-[16px] md:text-[20px] leading-[150%] text-gray-600">
              Quick answers to questions you may have
            </p>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-[20px]">What is Fire Guide?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 leading-[160%]">
                  Fire Guide is the UK's leading platform for connecting customers with certified fire safety professionals. We offer instant booking, transparent pricing, and verified experts for all your fire safety needs.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[20px]">How do you verify professionals?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 leading-[160%]">
                  Every professional undergoes rigorous verification including certification checks (BAFE, FIA, NEBOSH), DBS background screening, insurance verification (£5M+ public liability), and qualification reviews before joining our platform.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[20px]">What areas do you cover?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 leading-[160%]">
                  We cover over 50 major cities across the UK, including London, Manchester, Birmingham, Glasgow, Edinburgh, and many more. Enter your postcode to see available professionals in your area.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[20px]">Is there a booking fee?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 leading-[160%]">
                  No, there are no booking fees for customers. You only pay the service price quoted by the professional. Our platform is free to use for finding and booking fire safety services.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-[#0A1A2F] to-[#1a2f4f] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-[40px] md:text-[48px] leading-[110%] mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-[18px] md:text-[24px] leading-[150%] text-gray-300 mb-8">
            Book a certified fire safety professional in minutes
          </p>
          <Button
            type="button"
            onClick={() => (onStartBooking ? onStartBooking() : onBack())}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-lg"
          >
            Start Your Booking
          </Button>
        </div>
      </section>

      {/* Footer */}
      <Footer onAdminLogin={onAdminLogin} />
    </div>
  );
}