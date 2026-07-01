import React, { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { fetchServices } from "../api/servicesService";
import { getLucideIconForService } from "../lib/serviceIcons";
import {
  formatNavServicePrice,
  mapApiServiceToNavService,
  sortActiveServices,
  type NavService,
} from "../lib/serviceNav";
import { serviceNameToSlug } from "../lib/serviceSlugs";
import "./ServicesNavMenu.css";

interface ServicesNavMenuProps {
  onMenuClose?: () => void;
}

function useNavServices() {
  const navigate = useNavigate();
  const [services, setServices] = useState<NavService[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadServices = useCallback(async () => {
    if (hasLoaded || isLoading) return;
    setIsLoading(true);
    try {
      const apiServices = await fetchServices();
      setServices(
        sortActiveServices(apiServices).map((service, index) =>
          mapApiServiceToNavService(service, index)
        )
      );
    } catch {
      setServices([]);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [hasLoaded, isLoading]);

  const goToServicePage = useCallback(
    (service: NavService, onComplete?: () => void) => {
      onComplete?.();
      startTransition(() => {
        navigate(`/services/${serviceNameToSlug(service.name)}`);
      });
    },
    [navigate]
  );

  return { services, isLoading, hasLoaded, loadServices, goToServicePage };
}

function ServiceNavItems({
  services,
  isLoading,
  onSelect,
}: {
  services: NavService[];
  isLoading: boolean;
  onSelect: (service: NavService) => void;
}) {
  if (isLoading) {
    return (
      <div className="services-nav-menu__status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading services…
      </div>
    );
  }

  if (services.length === 0) {
    return <div className="services-nav-menu__status">No services available.</div>;
  }

  return (
    <>
      <ul className="services-nav-menu__list">
        {services.map((service) => {
          const Icon = getLucideIconForService(service.name, service.type);
          return (
            <li key={service.id}>
              <button
                type="button"
                className="services-nav-menu__item"
                role="menuitem"
                onClick={() => onSelect(service)}
              >
                <span className={`services-nav-menu__icon services-nav-menu__icon--${service.color}`}>
                  <Icon strokeWidth={2} aria-hidden />
                </span>
                <span className="services-nav-menu__copy">
                  <span className="services-nav-menu__item-name">{service.name}</span>
                  <span className="services-nav-menu__item-price">
                    From {formatNavServicePrice(service.price)}
                  </span>
                </span>
                <ChevronRight className="services-nav-menu__item-chevron" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function ServicesNavPanel({
  open,
  services,
  isLoading,
  onSelect,
  onClose,
  onPointerEnter,
  onPointerLeave,
}: {
  open: boolean;
  services: NavService[];
  isLoading: boolean;
  onSelect: (service: NavService) => void;
  onClose: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="services-nav-menu__panel"
      role="menu"
      aria-label="Services"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div className="services-nav-menu__panel-surface">
        <div className="services-nav-menu__panel-header">
          <p className="services-nav-menu__panel-title">What do you need help with?</p>
          <p className="services-nav-menu__panel-subtitle">Get started by selecting a service</p>
        </div>
        <div className="services-nav-menu__panel-body">
          <ServiceNavItems
            services={services}
            isLoading={isLoading}
            onSelect={(service) => {
              onSelect(service);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function ServicesNavDropdown() {
  const { services, isLoading, loadServices, goToServicePage } = useNavServices();
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openMenu = () => {
    clearCloseTimer();
    setOpen(true);
    void loadServices();
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), 280);
  };

  const handleServicesClick = () => {
    clearCloseTimer();
    setOpen(false);
  };

  useEffect(() => () => clearCloseTimer(), []);

  return (
    <div
      className="services-nav-menu__wrap"
      onPointerEnter={openMenu}
      onPointerLeave={scheduleClose}
      onFocus={openMenu}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          scheduleClose();
        }
      }}
    >
      <Link
        to="/services"
        className="services-nav-menu__trigger relative inline-flex items-center gap-1 py-2 hover:text-red-600 transition-colors group cursor-pointer"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={handleServicesClick}
      >
        Services
        <ChevronDown
          className={`services-nav-menu__chevron h-4 w-4 shrink-0 opacity-80 transition-transform duration-200${open ? " services-nav-menu__chevron--open" : ""}`}
          strokeWidth={2.25}
          aria-hidden
        />
        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 group-hover:w-full" />
      </Link>

      <ServicesNavPanel
        open={open}
        services={services}
        isLoading={isLoading}
        onSelect={goToServicePage}
        onClose={() => setOpen(false)}
        onPointerEnter={openMenu}
        onPointerLeave={scheduleClose}
      />
    </div>
  );
}

export function ServicesNavMobileSection({ onMenuClose }: ServicesNavMenuProps) {
  const { services, isLoading, hasLoaded, loadServices, goToServicePage } = useNavServices();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded && !hasLoaded) void loadServices();
  }, [expanded, hasLoaded, loadServices]);

  return (
    <div className="services-nav-menu__mobile">
      <button
        type="button"
        className="services-nav-menu__mobile-trigger"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <span className="inline-flex items-center gap-1">
          Services
          <ChevronDown
            className={`services-nav-menu__chevron h-4 w-4 shrink-0 opacity-80 transition-transform duration-200${expanded ? " services-nav-menu__chevron--open" : ""}`}
            strokeWidth={2.25}
            aria-hidden
          />
        </span>
      </button>
      {expanded ? (
        <div className="services-nav-menu__mobile-panel">
          <p className="services-nav-menu__panel-title">What do you need help with?</p>
          <p className="services-nav-menu__panel-subtitle">Get started by selecting a service</p>
          <ServiceNavItems
            services={services}
            isLoading={isLoading}
            onSelect={(service) => goToServicePage(service, onMenuClose)}
          />
        </div>
      ) : null}
    </div>
  );
}
