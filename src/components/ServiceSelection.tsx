import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRight, Shield } from "lucide-react";
import { Button } from "./ui/button";
import { Header } from "./Header";
import { fetchServices, ServiceResponse } from "../api/servicesService";
import { getServiceCardTheme, FRA_ICON_FALLBACK } from "../lib/serviceCardTheme";
import "../styles/serviceSelection.css";

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
  onNavigateToDashboard,
}: ServiceSelectionProps) {
  const [services, setServices] = useState<ServiceResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const serviceDescriptionMap: Record<string, string> = {
    "Fire Safety Consultation":
      "Professional fire safety advice to help dutyholders understand requirements, review concerns, and plan appropriate fire safety measures for their premises.",
    "Fire Marshal / Warden Training":
      "Training for designated fire marshals and wardens on evacuation procedures, fire prevention, and emergency response.",
    "Fire Risk Assessment":
      "A suitable and sufficient assessment of fire hazards and fire safety measures within your premises, tailored to its use and occupancy.",
    "Fire Alarm Service":
      "Installation, inspection, testing, and maintenance of fire alarm systems to confirm they operate as intended and provide effective warning.",
    "Fire Extinguisher Service":
      "Supply, inspection, and maintenance of fire extinguishers appropriate to the risks and layout of your premises.",
    "Emergency Lighting Test":
      "Inspection and testing of emergency lighting systems to support visibility of escape routes in the event of power failure.",
  };

  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchServices();
        const order: Record<string, number> = {
          "fire risk assessment": 1,
          "fire alarm": 2,
          "fire extinguisher": 3,
          "emergency lighting": 4,
          warden: 5,
          marshal: 5,
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
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch services";
        setError(message);
        console.error("Error loading services:", err);
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, []);

  const guidedService = useMemo(
    () =>
      services.find((s) => s.service_name.toLowerCase().includes("risk assessment")) ?? services[0] ?? null,
    [services]
  );

  const goToQuestionnaire = (serviceId: string, serviceName: string | undefined) => {
    onSelectService(serviceId, serviceName);
  };

  return (
    <div className="service-selection-page min-h-screen relative overflow-hidden">
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

      <main className="relative py-16 px-4 md:px-6">
        <div className="max-w-7xl mx-auto mt-8">
          <header className="service-selection-header">
            <h1 className="service-selection-header__title">
              Select Your <span className="service-selection-header__title-accent">Service</span>
            </h1>
            <p className="service-selection-header__subtitle">Choose the fire safety service you need</p>
          </header>

          {loading ? (
            <div className="service-selection-loading">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading services...</p>
              </div>
            </div>
          ) : error ? (
            <div className="service-selection-error">
              <div className="text-center">
                <p className="text-red-600 text-lg mb-4">Error: {error}</p>
                <Button onClick={() => window.location.reload()} variant="outline" className="px-4 py-2">
                  Retry
                </Button>
              </div>
            </div>
          ) : services.length === 0 ? (
            <div className="service-selection-empty">
              <p className="text-gray-500 text-lg">No services available at the moment.</p>
            </div>
          ) : (
            <>
              <div className="service-selection-grid">
                {services.map((service) => {
                  const theme = getServiceCardTheme(service.service_name);
                  const serviceId = service.id.toString();
                  const description =
                    serviceDescriptionMap[service.service_name] ||
                    service.description ||
                    "Professional fire safety support tailored to your needs.";

                  return (
                    <article
                      key={service.id}
                      className={`service-card service-card--${theme.key}`}
                      style={
                        {
                          "--service-hover-border": theme.hoverBorder,
                        } as React.CSSProperties
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        goToQuestionnaire(serviceId, service.service_name);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          goToQuestionnaire(serviceId, service.service_name);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div
                        className="service-card__media"
                        style={{ background: theme.panelGradient }}
                      >
                        <img
                          src={theme.imageSrc}
                          alt={service.service_name}
                          className="service-card__image"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            const img = e.currentTarget;
                            if (theme.key === "fra" && !img.dataset.fallbackTried) {
                              img.dataset.fallbackTried = "true";
                              img.src = FRA_ICON_FALLBACK;
                            }
                          }}
                        />
                      </div>

                      <div className="service-card__body">
                        <h2 className="service-card__title">{service.service_name}</h2>
                        <span className="service-card__accent" style={{ backgroundColor: theme.accent }} />
                        <p className="service-card__description">{description}</p>
                      </div>

                      <span className="service-card__arrow" aria-hidden>
                        <ArrowRight style={{ color: theme.arrowColor }} strokeWidth={2.25} />
                      </span>
                    </article>
                  );
                })}
              </div>

              <aside className="service-selection-cta">
                <div className="service-selection-cta__icon-wrap" aria-hidden>
                  <Shield className="h-6 w-6" />
                </div>
                <div className="service-selection-cta__text">
                  <p className="service-selection-cta__title">Not sure which service you need?</p>
                  <p className="service-selection-cta__subtitle">
                    Answer a few quick questions and we&apos;ll guide you to the right service.
                  </p>
                </div>
                <Button
                  type="button"
                  className="service-selection-cta__button bg-red-600 hover:bg-red-700"
                  disabled={!guidedService}
                  onClick={() => {
                    if (!guidedService) return;
                    goToQuestionnaire(String(guidedService.id), guidedService.service_name);
                  }}
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </aside>
            </>
          )}

          <div className="service-selection-footer">
            <Button variant="outline" onClick={onBack} className="px-6 py-6 text-base">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
