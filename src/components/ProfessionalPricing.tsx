import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Flame, 
  DollarSign, 
  Save,
  ArrowLeft,
  Info,
  TrendingUp,
  CheckCircle2,
  Menu,
  Bell,
  Settings,
  LogOut,
  X,
  User,
  FileText,
  Shield,
  CreditCard,
  Clock,
  Calendar,
  ShieldCheck,
  LayoutDashboard
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import logoImage from "figma:asset/629703c093c2f72bf409676369fecdf03c462cd2.png";

interface ProfessionalPricingProps {
  onSave: () => void;
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToAvailability?: () => void;
}

interface ServicePrice {
  id: string;
  name: string;
  description: string;
  price: string;
  suggested: string;
}

export function ProfessionalPricing({ onSave, onBack, onNavigateToProfile, onNavigateToAvailability }: ProfessionalPricingProps) {
  const [services, setServices] = useState<ServicePrice[]>([
    {
      id: "fire-risk-assessment",
      name: "Fire Risk Assessment",
      description: "Comprehensive property fire safety evaluation",
      price: "250",
      suggested: "£200-350"
    },
    {
      id: "fire-alarm-service",
      name: "Fire Alarm Service",
      description: "Installation, testing, and maintenance",
      price: "150",
      suggested: "£100-200"
    },
    {
      id: "fire-extinguisher",
      name: "Fire Extinguisher Service",
      description: "Inspection, testing, and servicing",
      price: "80",
      suggested: "£50-120"
    },
    {
      id: "fire-door",
      name: "Fire Door Inspection",
      description: "Inspection and compliance certification",
      price: "120",
      suggested: "£80-150"
    },
    {
      id: "fire-marshal-training",
      name: "Fire Marshal Training",
      description: "Staff training and certification",
      price: "180",
      suggested: "£150-250"
    },
    {
      id: "emergency-lighting",
      name: "Emergency Lighting Testing",
      description: "Full testing and certification",
      price: "100",
      suggested: "£80-130"
    },
    {
      id: "evacuation-plan",
      name: "Evacuation Plan Development",
      description: "Custom evacuation planning and signage",
      price: "200",
      suggested: "£150-300"
    },
    {
      id: "fire-suppression",
      name: "Fire Suppression Systems",
      description: "Installation and maintenance",
      price: "500",
      suggested: "£400-700"
    }
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const updatePrice = (id: string, value: string) => {
    // Only allow numbers
    if (value && !/^\d*$/.test(value)) return;
    
    setServices(services.map(service => 
      service.id === id ? { ...service, price: value } : service
    ));
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      onSave();
    }, 1500);
  };

  const isFormValid = services.every(service => service.price && parseInt(service.price) > 0);
  const totalServices = services.filter(s => s.price && parseInt(s.price) > 0).length;
  const averagePrice = services.reduce((sum, s) => sum + (parseInt(s.price) || 0), 0) / services.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - MATCHES PROFESSIONAL DASHBOARD HEADER EXACTLY */}
      <header className="fixed top-0 left-0 right-0 bg-[#1a2942] border-b border-white/10 z-50">
        <div className="flex items-center justify-between px-4 md:px-6 h-14">
          {/* Left - Hamburger + Logo + Pro Badge */}
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden text-white hover:text-red-500 transition-colors p-1"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="cursor-pointer hover:opacity-80 transition-opacity" aria-label="Go to home">
              <img src={logoImage} alt="Fire Guide" className="h-10" />
            </Link>
            <Badge variant="secondary" className="bg-red-600 text-white border-0 text-sm px-2 py-0.5">
              Pro
            </Badge>
          </div>
          
          {/* Right - Action Icons */}
          <div className="flex items-center gap-3">
            <button
              className="relative text-white hover:text-red-500 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button
              className="text-white hover:text-red-500 transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              className="text-white hover:text-red-500 transition-colors"
              onClick={onBack}
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Menu - MATCHES DASHBOARD EXACTLY */}
      <aside
        className={`fixed lg:sticky lg:translate-x-0 top-[56px] left-0 h-[calc(100vh-56px)] w-64 bg-white border-r shadow-lg lg:shadow-none transition-all duration-300 ease-in-out z-40 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 h-full flex flex-col">
          {/* Close button for mobile */}
          <button
            onClick={() => setMenuOpen(false)}
            className="lg:hidden absolute top-4 right-4"
          >
            <X className="w-5 h-5" />
          </button>

          <nav className="space-y-2 flex-1">
            <button
              onClick={() => {
                setMenuOpen(false);
                onBack();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-gray-50"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                onNavigateToProfile && onNavigateToProfile();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-gray-50"
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </button>
            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all bg-red-50 text-red-600 font-medium"
            >
              <DollarSign className="w-5 h-5" />
              <span>Pricing</span>
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                onNavigateToAvailability && onNavigateToAvailability();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-gray-50"
            >
              <Clock className="w-5 h-5" />
              <span>Availability</span>
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-gray-50"
            >
              <Calendar className="w-5 h-5" />
              <span>Bookings</span>
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-gray-50"
            >
              <CreditCard className="w-5 h-5" />
              <span>Payments</span>
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-gray-50"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Verification Status</span>
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-gray-50"
            >
              <Bell className="w-5 h-5" />
              <span>Notifications</span>
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-gray-600 hover:bg-gray-50"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>
          </nav>

          <div className="space-y-2 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => {
                setMenuOpen(false);
                onBack();
              }}
              className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="pt-14 py-8 px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Page Header */}
          <div className="mb-8 mt-5 md:mt-0">
            <h1 className="text-[#0A1A2F] mb-2">
              Set Your Service Pricing
            </h1>
            <p className="text-gray-600">
              Configure your prices for each service you offer
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Stats Sidebar */}
            <div className="lg:col-span-1">
              <div className="space-y-4 sticky top-24">
                <Card className="border-0 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">Pricing Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-2xl text-blue-600">{totalServices}</p>
                          <p className="text-sm text-gray-600">Services Priced</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-2xl text-green-600">£{averagePrice.toFixed(0)}</p>
                          <p className="text-sm text-gray-600">Average Price</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-5 h-5 text-orange-600" />
                        <p className="font-semibold text-sm text-orange-900">Pricing Tips</p>
                      </div>
                      <ul className="text-xs text-gray-700 space-y-1">
                        <li>• Research competitor rates</li>
                        <li>• Consider your experience level</li>
                        <li>• Factor in travel costs</li>
                        <li>• Include VAT if applicable</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Pricing Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Services List */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <CardTitle>Service Pricing</CardTitle>
                      <CardDescription>Set your base price for each service</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {services.map((service, index) => (
                      <div 
                        key={service.id}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          service.price && parseInt(service.price) > 0
                            ? "border-green-200 bg-green-50/50"
                            : "border-gray-200 hover:border-red-200 hover:bg-red-50/30"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div>
                                <Label className="text-base font-semibold text-gray-900">
                                  {service.name}
                                </Label>
                                <p className="text-sm text-gray-600 mt-1">
                                  {service.description}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Market range: <span className="font-medium">{service.suggested}</span>
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="w-full sm:w-40">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-semibold">
                                £
                              </span>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={service.price}
                                onChange={(e) => updatePrice(service.id, e.target.value)}
                                placeholder="0"
                                className="pl-7 h-12 text-lg font-semibold"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Additional Pricing Info */}
              <Card className="border-0 shadow-md bg-blue-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-700">
                      <p className="font-semibold text-gray-900 mb-2">About Your Pricing</p>
                      <ul className="space-y-1">
                        <li>• These are your <strong>base prices</strong> - you can adjust for specific jobs</li>
                        <li>• Customers will see these prices when comparing professionals</li>
                        <li> You can update your pricing anytime from your dashboard</li>
                        <li>• Consider offering package deals for multiple services</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <Card className="border-0 shadow-md bg-gradient-to-r from-red-50 to-orange-50">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Ready to save your pricing?</h3>
                      <p className="text-sm text-gray-600">
                        {isFormValid 
                          ? "All services have been priced. Click save to update."
                          : "Please set prices for all services to continue."
                        }
                      </p>
                    </div>
                    <Button
                      onClick={handleSave}
                      disabled={!isFormValid || isSaving}
                      className="bg-red-600 hover:bg-red-700 px-8 h-12 disabled:opacity-50 whitespace-nowrap"
                    >
                      {isSaving ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Save className="w-5 h-5" />
                          Save Pricing
                        </span>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}