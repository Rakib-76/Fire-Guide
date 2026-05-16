import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Header } from "./Header";
import { fetchServices, ServiceResponse } from "../api/servicesService";
import { getLucideIconForService } from "../lib/serviceIcons";

interface ServiceSelectionProps {
  onSelectService: (serviceId: string, serviceName?: string) => void;
  onBack: () => void;
  onNavigateHome?: () => void;
  onNavigateServices?: () => void;
  onNavigateProfessionals?: () => void;
  onNavigateAbout?: () => void;
  onNavigateContact?: () => void;
  onCustomerLogin?: () => void;
  currentUser?: { name: string; role: "customer" | "professional" | "admin" } | null;
  onLogout?: () => void;
  onNavigateToDashboard?: () => void;
}

export function ServiceSelection({ 
  onSelectService, 
  onBack,
  onNavigateHome,
  onNavigateServices,
  onNavigateProfessionals,
  onNavigateAbout,
  onNavigateContact,
  onCustomerLogin,
  currentUser,
  onLogout,
  onNavigateToDashboard
}: ServiceSelectionProps) {
  /* Previously: select a card, then press Next. Replaced by goToQuestionnaire on card click.
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const handleNext = () => {
    if (selectedService) {
      const serviceName = services.find((s) => s.id.toString() === selectedService)?.service_name;
      onSelectService(selectedService, serviceName);
    }
  };
  */
  const [services, setServices] = useState<ServiceResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fallback descriptions when API returns none
  const serviceDescriptionMap: Record<string, string> = {
    "Fire Safety Consultation": "Professional fire safety advice to help dutyholders understand requirements, review concerns, and plan appropriate fire safety measures for their premises.",
    "Fire Marshal / Warden Training": "Training for designated fire marshals and wardens on evacuation procedures, fire prevention, and emergency response.",
    "Fire Risk Assessment": "A suitable and sufficient assessment of fire hazards and fire safety measures within your premises, tailored to its use and occupancy.",
    "Fire Alarm Service": "Installation, inspection, testing, and maintenance of fire alarm systems to confirm they operate as intended and provide effective warning.",
    "Fire Extinguisher Service": "Supply, inspection, and maintenance of fire extinguishers appropriate to the risks and layout of your premises.",
    "Emergency Lighting Test": "Inspection and testing of emergency lighting systems to support visibility of escape routes in the event of power failure.",
  };

  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchServices();
        // Order: 1 Fire Risk Assessment, 2 Fire Alarm, 3 Fire Extinguisher, 4 Emergency Lighting, 5 Fire Marshal / Warden Training, 6 Fire Safety Consultation
        const order: Record<string, number> = {
          "fire risk assessment": 1,
          "fire alarm": 2,
          "fire extinguisher": 3,
          "emergency lighting": 4,
          "warden": 5,
          "marshal": 5,
          "fire safety consultation": 6,
        };
        const getOrder = (name: string | undefined) => {
          const lower = name?.toLowerCase() ?? "";
          for (const [key, val] of Object.entries(order)) {
            if (lower.includes(key)) return val;
          }
          return 99;
        };
        const sorted = [...data].sort((a, b) => getOrder(a.service_name) - getOrder(b.service_name));
        setServices(sorted);
      } catch (err: any) {
        setError(err.message || "Failed to fetch services");
        console.error("Error loading services:", err);
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, []);

  const goToQuestionnaire = (serviceId: string, serviceName: string | undefined) => {
    onSelectService(serviceId, serviceName);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header - EXACT CLONE OF PUBLIC WEBSITE HEADER */}
      <Header
        onGetStarted={onNavigateServices || (() => {})}
        onProfessionalLogin={onNavigateProfessionals || (() => {})}
        onCustomerLogin={onCustomerLogin}
        currentUser={currentUser}
        onLogout={onLogout}
        onNavigateHome={onNavigateHome}
        onNavigateServices={onNavigateServices}
        onNavigateAbout={onNavigateAbout}
        onNavigateContact={onNavigateContact}
        onNavigateToDashboard={onNavigateToDashboard}
      />

      <main className="py-12 px-4 md:px-6 ">
        <div className="max-w-5xl mx-auto mt-12">
          <div className="text-center mb-12 mt-12">
            <h1 className="text-[#0A1A2F] md:text-md lg:text-md py-3 ">
              Select Your Service
            </h1>
            <p className="md:text-lg lg:text-lg text-gray-600 md:text-base py-2">
              Choose the fire safety service you need
            </p>
          </div>

          {/* Service Cards */}
          {loading ? (
            <div className="flex items-center justify-center py-12 mb-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading services...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 mb-12">
              <div className="text-center">
                <p className="text-red-600 text-lg mb-4">Error: {error}</p>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="px-4 py-2"
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12 mb-12">
              <p className="text-gray-500 text-lg">No services available at the moment.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              {services.map((service) => {
                const ServiceIcon = getLucideIconForService(service.service_name, service.type);
                const serviceId = service.id.toString();
                return (
                  /* Old card UX: setSelectedService(serviceId) on click; border/icon reflected selectedService. */
                  <Card
                    key={service.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      goToQuestionnaire(serviceId, service.service_name);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        goToQuestionnaire(serviceId, service.service_name);
                      }
                    }}
                    className="group cursor-pointer transition-all hover:shadow-lg border-2 border-transparent hover:border-red-300"
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-100 transition-colors group-hover:bg-red-600">
                          <ServiceIcon className="w-8 h-8 text-red-600 transition-colors group-hover:text-white" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="mb-2">{service.service_name}</CardTitle>
                          <CardDescription className="text-base">
                            {serviceDescriptionMap[service.service_name] || service.description || "Professional fire safety support tailored to your needs."}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="flex justify-start items-center">
            <Button
              variant="outline"
              onClick={onBack}
              className="px-6 py-6 text-base"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            {/*
            <Button
              disabled={!selectedService}
              onClick={handleNext}
              className="bg-red-600 hover:bg-red-700 px-12 py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </Button>
            Previously paired with: <div className="flex justify-between items-center">
            */}
          </div>
        </div>
      </main>
    </div>
  );
}