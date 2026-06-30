import React, { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, ChevronRight, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import heroImage1 from "figma:asset/189ec7e3689608dad914f59dd7c02d25da91583d.png";
import heroImage2 from "figma:asset/06f1b3e41c2783f18bdafecd74ab9e64333871d6.png";
import heroImage3 from "figma:asset/e0dbc899d99d79876818127d318a196dc1afa811.png";
import heroImage4 from "figma:asset/2a524831d9c08eec0e10c448c5848452698dd089.png";
import heroImage5 from "figma:asset/4a602fcb2197368c8ba48f35530a0c308f2262bb.png";
import heroImage6 from "figma:asset/6d3b45bdbd70d604c743717e8996da118e1d2ab9.png";
import heroImage7 from "figma:asset/480b0c0a77e9ab632fe90d62f30d6330c18adff5.png";
import heroImage8 from "figma:asset/dcc0d6fdc32b7d65870a8a7a4cf0cb3e7dad77d5.png";
import heroImage9 from "figma:asset/9f9a1b825f2bba8823c5d3f17dd17fcac7ef3c43.png";
import heroImage10 from "figma:asset/593ecc8734544a291a2372ea93c0cbd9fb50c3ce.png";
import heroImage11 from "figma:asset/564386e01b260c73d9917c802efdd6b9fae211c2.png";
import { fetchServices, formatServiceFromPrice, type ServiceResponse } from "../api/servicesService";
import { getLucideIconForService } from "../lib/serviceIcons";
import { sortActiveServices } from "../lib/serviceNav";
import "./Hero.css";

interface HeroProps {
  onGetStarted: () => void;
}

type HeroServiceColor = "red" | "blue" | "green" | "purple" | "orange";

type HeroServiceOption = {
  id: number;
  name: string;
  price: string;
  icon: LucideIcon;
  color: HeroServiceColor;
};

const COLOR_OPTIONS: HeroServiceColor[] = ["red", "blue", "green", "purple", "orange"];

const HERO_IMAGES = [
  heroImage11,
  heroImage1,
  heroImage2,
  heroImage3,
  heroImage4,
  heroImage5,
  heroImage6,
  heroImage7,
  heroImage8,
  heroImage9,
  heroImage10,
];

const HERO_SLIDE_INTERVAL_MS = 5000;

const FALLBACK_SERVICES: HeroServiceOption[] = [
  { id: 1, name: "Fire Risk Assessment", price: "£220.00", icon: getLucideIconForService("Fire Risk Assessment", "ASSESSMENT"), color: "red" },
  { id: 42, name: "Fire Alarm Service", price: "£150.00", icon: getLucideIconForService("Fire Alarm Service", "ALARM"), color: "blue" },
  { id: 41, name: "Fire Extinguisher Service", price: "£120.00", icon: getLucideIconForService("Fire Extinguisher Service", "EXTINGUISHER"), color: "green" },
  { id: 39, name: "Emergency Lighting Test", price: "£95.00", icon: getLucideIconForService("Emergency Lighting Test", "LIGHTING"), color: "purple" },
  { id: 46, name: "Fire Safety Consultation", price: "£85.00", icon: getLucideIconForService("Fire Safety Consultation", "CONSULTATION"), color: "orange" },
];

const HERO_BULLETS = [
  "Compare prices from verified professionals",
  "Fast, easy booking in under 2 minutes",
  "Fully compliant with UK fire safety regulations",
];

function HeroBadgeShield() {
  return (
    <svg
      className="hero__badge-icon"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M10 2.25 4.25 4.625v4.375c0 3.875 2.75 7.5 5.75 8.375 3-.875 5.75-4.5 5.75-8.375V4.625L10 2.25Z"
        fill="#e63306"
      />
      <path
        d="M7.125 10.125 9 12l3.875-4"
        stroke="#fff"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function mapService(apiService: ServiceResponse, index: number): HeroServiceOption {
  return {
    id: apiService.id,
    name: apiService.service_name || "Service",
    price: formatServiceFromPrice(apiService),
    icon: getLucideIconForService(apiService.service_name, apiService.type),
    color: COLOR_OPTIONS[index % COLOR_OPTIONS.length],
  };
}

export const Hero = React.memo(function Hero({ onGetStarted }: HeroProps) {
  const navigate = useNavigate();
  const { setSelectedService, setSelectedServiceId } = useApp();
  const [services, setServices] = useState<HeroServiceOption[]>([]);
  const [pickedServiceId, setPickedServiceId] = useState<number | null>(null);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(() => new Set([0]));

  useEffect(() => {
    const preload = (index: number) => {
      const img = new Image();
      img.src = HERO_IMAGES[index];
      img.onload = () => {
        setLoadedImages((prev) => {
          if (prev.has(index)) return prev;
          const next = new Set(prev);
          next.add(index);
          return next;
        });
      };
    };

    preload(currentImageIndex);
    preload((currentImageIndex + 1) % HERO_IMAGES.length);
  }, [currentImageIndex]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, HERO_SLIDE_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, []);

  const loadServices = useCallback(async () => {
    setIsLoadingServices(true);
    setServicesError(null);
    try {
      const apiServices = await fetchServices();
      const active = sortActiveServices(apiServices).map(mapService);
      if (active.length > 0) {
        setServices(active);
        setPickedServiceId((prev) =>
          prev != null && active.some((service) => service.id === prev) ? prev : active[0].id
        );
      } else {
        setServices(FALLBACK_SERVICES);
        setPickedServiceId(FALLBACK_SERVICES[0].id);
        setServicesError("No active services available.");
      }
    } catch {
      setServices(FALLBACK_SERVICES);
      setPickedServiceId(FALLBACK_SERVICES[0].id);
      setServicesError("Could not load services. Showing defaults.");
    } finally {
      setIsLoadingServices(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === pickedServiceId) ?? services[0],
    [services, pickedServiceId]
  );

  const handleNextStep = () => {
    if (!selectedService) return;
    setSelectedService(String(selectedService.id));
    setSelectedServiceId(selectedService.id);
    startTransition(() => {
      navigate(`/services/${selectedService.id}/questionnaire`, {
        state: { serviceName: selectedService.name },
      });
    });
  };

  const scrollToPricing = () => {
    document.getElementById("pricing-preview")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="home" className="hero">
      <div className="hero__backdrop" aria-hidden>
        <div className="hero__photo-slider">
          {HERO_IMAGES.map((image, index) => {
            const isActive = currentImageIndex === index;
            const shouldLoad = loadedImages.has(index) || isActive;

            return (
              <img
                key={index}
                src={shouldLoad ? image : undefined}
                alt=""
                className={`hero__photo${isActive ? " hero__photo--active" : ""}`}
                decoding="async"
              />
            );
          })}
        </div>
        <div className="hero__fade-left" />
        <div className="hero__fade-bottom" />
      </div>

      <div className="hero__layout">
        <div className="hero__left">
          <div className="hero__left-inner">
            <div className="hero__badge">
              <HeroBadgeShield />
              <span className="hero__badge-text">UK&apos;s Trusted Fire Safety Marketplace</span>
            </div>

            <h1 className="hero__title">
              <span className="hero__title-line">Fire Safety</span>
              <span className="hero__title-line">
                Made <span className="hero__title-accent">Simple.</span>
              </span>
            </h1>

            <p className="hero__subtitle">
              Book trusted fire safety professionals for assessments, alarms, extinguisher services,
              training, and more — all in one place.
            </p>

            <ul className="hero__bullets">
              {HERO_BULLETS.map((text) => (
                <li key={text} className="hero__bullet">
                  <span className="hero__bullet-icon-wrap" aria-hidden>
                    <Check className="hero__bullet-icon" strokeWidth={3} />
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            <div className="hero__actions">
              <button type="button" className="hero__btn-primary" onClick={scrollToPricing}>
                Get Prices in 30 Seconds
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
              <button type="button" className="hero__btn-secondary" onClick={onGetStarted}>
                Explore Services
              </button>
            </div>
          </div>
        </div>

        <aside className="hero__picker-wrap" aria-label="Select a service">
          <div className="hero__picker">
            <h2 className="hero__picker-title">What do you need help with?</h2>
            <p className="hero__picker-subtitle">Get started by selecting a service</p>

            {isLoadingServices ? (
              <div className="hero__picker-loading">
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" aria-hidden />
                Loading services…
              </div>
            ) : services.length === 0 ? (
              <div className="hero__picker-loading">
                <p>No services available right now.</p>
                <button type="button" className="hero__picker-retry" onClick={() => void loadServices()}>
                  Try again
                </button>
              </div>
            ) : (
              <>
                {servicesError ? <p className="hero__picker-error">{servicesError}</p> : null}
                <ul className="hero__picker-list">
                  {services.map((service) => {
                    const Icon = service.icon;
                    const isSelected = service.id === pickedServiceId;
                    return (
                      <li key={service.id}>
                        <button
                          type="button"
                          className={`hero__picker-item${isSelected ? " hero__picker-item--selected" : ""}`}
                          onClick={() => setPickedServiceId(service.id)}
                          aria-pressed={isSelected}
                        >
                          <span className={`hero__picker-icon hero__picker-icon--${service.color}`}>
                            <Icon strokeWidth={2} aria-hidden />
                          </span>
                          <span className="hero__picker-copy">
                            <p className="hero__picker-name">{service.name}</p>
                            <p className="hero__picker-price">
                              From {service.price.replace(/\.00$/, "")}
                            </p>
                          </span>
                          <ChevronRight className="hero__picker-chevron" aria-hidden />
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <button
                  type="button"
                  className="hero__picker-next"
                  onClick={handleNextStep}
                  disabled={!selectedService}
                >
                  Next Step
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
});
