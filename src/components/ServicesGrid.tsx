import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { ServiceCard, Service } from "./ServiceCard";
import { fetchServices, ServiceResponse, formatServiceFromPrice } from "../api/servicesService";
import { getLucideIconForService } from "../lib/serviceIcons";
import { toast } from "sonner";
import "./ServicesGrid.css";

interface ServicesGridProps {
  onSelectService: () => void;
}

const colorOptions = ["red", "blue", "green", "purple", "orange"] as const;

const serviceDescriptionMap: Record<string, string> = {
  "Fire Risk Assessment":
    "A suitable and sufficient assessment of fire hazards and fire safety measures within your premises, tailored to its use and occupancy.",
  "Fire Alarm Service":
    "Installation, inspection, testing, and maintenance of fire alarm systems to confirm they operate as intended and provide effective warning.",
  "Fire Extinguisher Service":
    "Supply, inspection, and maintenance of fire extinguishers appropriate to the risks and layout of your premises.",
  "Fire Door Inspection":
    "Inspection of fire doors to assess condition, functionality, and suitability in supporting fire compartmentation and safe escape.",
  "Emergency Lighting Test":
    "Inspection and testing of emergency lighting systems to support visibility of escape routes in the event of power failure.",
  "Emergency Lighting":
    "Inspection and testing of emergency lighting systems to support visibility of escape routes in the event of power failure.",
  "Emergency Lighting Testing":
    "Inspection and testing of emergency lighting systems to support visibility of escape routes in the event of power failure.",
  "Fire Safety Consultation":
    "Professional fire safety advice to help dutyholders understand requirements, review concerns, and plan appropriate fire safety measures for their premises.",
};

const mapApiServiceToService = (apiService: ServiceResponse, index: number): Service => {
  const isActive = apiService.status?.toUpperCase() === "ACTIVE";
  const formattedPrice = formatServiceFromPrice(apiService);
  const serviceName = apiService.service_name || "Service";
  const iconComponent = getLucideIconForService(serviceName, apiService.type);
  const colorIndex = index % colorOptions.length;
  const color = colorOptions[colorIndex];
  const mappedDescription =
    serviceDescriptionMap[serviceName] || apiService.description || "No description available";

  return {
    id: apiService.id,
    name: serviceName,
    icon: apiService.icon || undefined,
    iconComponent,
    description: mappedDescription,
    basePrice: formattedPrice,
    active: isActive,
    popular: false,
    color,
  };
};

export function ServicesGrid({ onSelectService }: ServicesGridProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadServices = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const apiServices = await fetchServices();
        const mappedServices = apiServices.map((apiService, index) =>
          mapApiServiceToService(apiService, index)
        );
        setServices(mappedServices);
      } catch (err: any) {
        console.error("Error loading services:", err);
        setError(err?.message || "Failed to load services");
        toast.error("Failed to load services. Please try again later.");
        setServices([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadServices();
  }, []);

  useEffect(() => {
    if (!showSwipeHint) return;
    const timer = window.setTimeout(() => setShowSwipeHint(false), 8000);
    return () => window.clearTimeout(timer);
  }, [showSwipeHint]);

  const updateActiveIndex = useCallback(() => {
    const container = scrollRef.current;
    if (!container || container.children.length === 0) return;

    const firstCard = container.children[0] as HTMLElement;
    const cardWidth = firstCard.offsetWidth;
    const gap = Number.parseFloat(getComputedStyle(container).columnGap || getComputedStyle(container).gap || "14");
    const index = Math.round(container.scrollLeft / (cardWidth + gap));
    setActiveIndex(Math.min(Math.max(index, 0), container.children.length - 1));
  }, []);

  const handleScroll = () => {
    setShowSwipeHint(false);
    updateActiveIndex();
  };

  const scrollToIndex = (index: number) => {
    const container = scrollRef.current;
    if (!container) return;

    const card = container.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    setActiveIndex(index);
    setShowSwipeHint(false);
  };

  return (
    <section id="services" className="services-grid-section">
      <div className="services-grid-container">
        <div className="services-grid-header">
          <h2 className="services-grid-title">Our Fire Safety Services</h2>
          <p className="services-grid-subtitle">
            Everything you need to stay safe and compliant.
          </p>
        </div>

        {isLoading ? (
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            <p className="mt-4 text-gray-600">Loading services...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="mb-4 text-red-600">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700">
              Retry
            </Button>
          </div>
        ) : services.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-600">No services available at the moment.</p>
          </div>
        ) : (
          <div className="services-grid-carousel">
            <div className="services-grid-carousel-fade" aria-hidden />

            <div ref={scrollRef} className="services-grid-row" onScroll={handleScroll}>
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  variant="landing"
                  onClick={onSelectService}
                />
              ))}
            </div>

            {services.length > 1 && (
              <div className="services-grid-mobile-nav">
                {showSwipeHint && activeIndex === 0 && (
                  <p className="services-grid-swipe-hint">
                    <span className="services-grid-swipe-hint-icon" aria-hidden>
                      <ChevronRight strokeWidth={2.5} />
                      <ChevronRight strokeWidth={2.5} />
                    </span>
                    Swipe to browse more services
                  </p>
                )}

                <div className="services-grid-dots" role="tablist" aria-label="Service cards">
                  {services.map((service, index) => (
                    <button
                      key={service.id}
                      type="button"
                      role="tab"
                      aria-selected={index === activeIndex}
                      aria-label={`Go to ${service.name}`}
                      className={`services-grid-dot${index === activeIndex ? " is-active" : ""}`}
                      onClick={() => scrollToIndex(index)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="services-grid-footer">
          <button type="button" onClick={onSelectService} className="services-grid-footer-link">
            View all services
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
