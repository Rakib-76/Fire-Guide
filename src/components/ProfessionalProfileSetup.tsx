import React, { useState } from "react";
import { 
  Flame, 
  User, 
  Save,
  ArrowLeft,
  CheckCircle2,
  Circle,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  FileText,
  Award,
  Shield,
  Info,
  Upload,
  CheckSquare
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Slider } from "./ui/slider";
import { Badge } from "./ui/badge";
import { ProfessionalMobileNav } from "./ProfessionalMobileNav";

interface ProfessionalProfileSetupProps {
  onSave: () => void;
  onBack: () => void;
  onNavigateToPricing?: () => void;
  onNavigateToAvailability?: () => void;
  onNavigateToBookings?: () => void;
  onNavigateToPayments?: () => void;
  onNavigateToVerification?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function ProfessionalProfileSetup({ 
  onSave, 
  onBack, 
  onNavigateToPricing, 
  onNavigateToAvailability,
  onNavigateToBookings,
  onNavigateToPayments,
  onNavigateToVerification,
  onNavigateToNotifications,
  onNavigateToSettings
}: ProfessionalProfileSetupProps) {
  const [formData, setFormData] = useState({
    name: "John Smith",
    description: "",
    serviceRadius: [25],
    selectedServices: [] as string[]
  });

  const [qualifications, setQualifications] = useState<File[]>([]);
  const [insurance, setInsurance] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const services = [
    { id: "fire-risk-assessment", label: "Fire Risk Assessment" },
    { id: "fire-extinguisher", label: "Fire Extinguisher Service" },
    { id: "fire-alarm", label: "Fire Alarm Installation & Testing" },
    { id: "emergency-lighting", label: "Emergency Lighting Testing" },
    { id: "fire-door", label: "Fire Door Inspection" },
    { id: "fire-training", label: "Fire Safety Training" },
    { id: "evacuation-plan", label: "Evacuation Plan Development" },
    { id: "fire-suppression", label: "Fire Suppression Systems" }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "qualifications" | "insurance") => {
    const files = Array.from(e.target.files || []);
    if (type === "qualifications") {
      setQualifications([...qualifications, ...files]);
    } else {
      setInsurance([...insurance, ...files]);
    }
  };

  const removeFile = (index: number, type: "qualifications" | "insurance") => {
    if (type === "qualifications") {
      setQualifications(qualifications.filter((_, i) => i !== index));
    } else {
      setInsurance(insurance.filter((_, i) => i !== index));
    }
  };

  const toggleService = (serviceId: string) => {
    setFormData({
      ...formData,
      selectedServices: formData.selectedServices.includes(serviceId)
        ? formData.selectedServices.filter(id => id !== serviceId)
        : [...formData.selectedServices, serviceId]
    });
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      onSave();
    }, 1500);
  };

  const isFormValid = formData.name && formData.description && formData.selectedServices.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Master Navigation Component */}
      <ProfessionalMobileNav
        currentPage="profile"
        onNavigateToDashboard={onBack}
        onNavigateToProfile={() => {}}
        onNavigateToPricing={onNavigateToPricing || (() => {})}
        onNavigateToAvailability={onNavigateToAvailability || (() => {})}
        onNavigateToBookings={onNavigateToBookings || (() => {})}
        onNavigateToPayments={onNavigateToPayments || (() => {})}
        onNavigateToVerification={onNavigateToVerification || (() => {})}
        onNavigateToNotifications={onNavigateToNotifications || (() => {})}
        onNavigateToSettings={onNavigateToSettings || (() => {})}
        onLogout={onBack}
      />

      {/* Main Content */}
      <main className="pt-14 py-8 px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Page Header */}
          <div className="mb-8 mt-5 md:mt-0">
            <h1 className="text-[#0A1A2F] mb-2">
              Complete Your Profile
            </h1>
            <p className="text-gray-600">
              Tell customers about your services and expertise
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Progress Sidebar */}
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-md sticky top-24">
                <CardHeader>
                  <CardTitle className="text-lg">Profile Completion</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      formData.name ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                    }`}>
                      {formData.name ? "✓" : "1"}
                    </div>
                    <span className={formData.name ? "text-gray-900 font-medium" : "text-gray-600"}>
                      Basic Information
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      qualifications.length > 0 ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                    }`}>
                      {qualifications.length > 0 ? "✓" : "2"}
                    </div>
                    <span className={qualifications.length > 0 ? "text-gray-900 font-medium" : "text-gray-600"}>
                      Qualifications
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      insurance.length > 0 ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                    }`}>
                      {insurance.length > 0 ? "✓" : "3"}
                    </div>
                    <span className={insurance.length > 0 ? "text-gray-900 font-medium" : "text-gray-600"}>
                      Insurance Details
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      formData.serviceRadius[0] > 0 ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                    }`}>
                      {formData.serviceRadius[0] > 0 ? "✓" : "4"}
                    </div>
                    <span className={formData.serviceRadius[0] > 0 ? "text-gray-900 font-medium" : "text-gray-600"}>
                      Service Area
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      formData.selectedServices.length > 0 ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                    }`}>
                      {formData.selectedServices.length > 0 ? "✓" : "5"}
                    </div>
                    <span className={formData.selectedServices.length > 0 ? "text-gray-900 font-medium" : "text-gray-600"}>
                      Services Offered
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Form Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>Basic Information</CardTitle>
                      <CardDescription>Tell us about yourself</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-base">
                      Full Name / Business Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Smith Fire Safety Services"
                      className="mt-2 h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-base">
                      Description <span className="text-red-500">*</span>
                    </Label>
                    <p className="text-sm text-gray-500 mt-1 mb-2">
                      Describe your expertise, experience, and what makes you stand out
                    </p>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="With over 10 years of experience in fire safety, I specialize in comprehensive fire risk assessments for commercial and residential properties..."
                      className="min-h-32 resize-none"
                      rows={6}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      {formData.description.length} characters
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Qualifications */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle>Qualifications & Certifications</CardTitle>
                      <CardDescription>Upload your certificates and qualifications</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-300 hover:bg-purple-50/50 transition-colors">
                    <input
                      type="file"
                      id="qualifications"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, "qualifications")}
                      className="hidden"
                    />
                    <label htmlFor="qualifications" className="cursor-pointer">
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="font-medium text-gray-700 mb-1">
                        Click to upload qualifications
                      </p>
                      <p className="text-sm text-gray-500">
                        PDF, JPG, PNG up to 10MB each
                      </p>
                    </label>
                  </div>

                  {qualifications.length > 0 && (
                    <div className="space-y-2">
                      {qualifications.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-purple-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024).toFixed(0)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index, "qualifications")}
                            className="text-gray-500 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Insurance */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle>Insurance Details</CardTitle>
                      <CardDescription>Upload proof of insurance and liability coverage</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-300 hover:bg-green-50/50 transition-colors">
                    <input
                      type="file"
                      id="insurance"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, "insurance")}
                      className="hidden"
                    />
                    <label htmlFor="insurance" className="cursor-pointer">
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="font-medium text-gray-700 mb-1">
                        Click to upload insurance documents
                      </p>
                      <p className="text-sm text-gray-500">
                        PDF, JPG, PNG up to 10MB each
                      </p>
                    </label>
                  </div>

                  {insurance.length > 0 && (
                    <div className="space-y-2">
                      {insurance.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024).toFixed(0)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index, "insurance")}
                            className="text-gray-500 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Service Radius */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle>Service Radius</CardTitle>
                      <CardDescription>How far are you willing to travel?</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Label className="text-base">Service Area</Label>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-0 text-lg px-4 py-1">
                        {formData.serviceRadius[0]} miles
                      </Badge>
                    </div>
                    <Slider
                      value={formData.serviceRadius}
                      onValueChange={(value) => setFormData({ ...formData, serviceRadius: value })}
                      min={0}
                      max={100}
                      step={5}
                      className="py-4"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>0 miles</span>
                      <span>50 miles</span>
                      <span>100 miles</span>
                    </div>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      <strong>Current range:</strong> You'll be shown to customers within {formData.serviceRadius[0]} miles of your location.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Services Offered */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <CheckSquare className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <CardTitle>Services Offered <span className="text-red-500">*</span></CardTitle>
                      <CardDescription>Select all services you provide</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        onClick={() => toggleService(service.id)}
                        className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          formData.selectedServices.includes(service.id)
                            ? "border-red-500 bg-red-50"
                            : "border-gray-200 hover:border-red-200 hover:bg-red-50/30"
                        }`}
                      >
                        <Checkbox
                          checked={formData.selectedServices.includes(service.id)}
                          onCheckedChange={() => toggleService(service.id)}
                          className="mt-0.5"
                        />
                        <Label className="cursor-pointer font-normal">
                          {service.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {formData.selectedServices.length > 0 && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700">
                        <strong>{formData.selectedServices.length}</strong> service{formData.selectedServices.length !== 1 ? "s" : ""} selected
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Save Button */}
              <Card className="border-0 shadow-md bg-gradient-to-r from-red-50 to-orange-50">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Ready to save your profile?</h3>
                      <p className="text-sm text-gray-600">
                        {isFormValid 
                          ? "Your profile looks great! Save to start receiving bookings."
                          : "Please complete all required fields marked with *"
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
                          Save Profile
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