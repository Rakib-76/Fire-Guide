import React, { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgePoundSterling,
  Calendar,
  Check,
  Clock,
  ClipboardList,
  FileText,
  Info,
  ListChecks,
  Loader2,
  ShieldCheck,
  Tag,
  Users,
  Zap,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "./ui/button";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { fetchServices, formatServiceFromPrice, type ServiceResponse } from "../api/servicesService";
import {
  buildGenericServiceDetailContent,
  getServiceDetailContent,
  type ServiceDetailContent,
  type ServiceDetailSection,
} from "../lib/serviceDetailContent";
import { getLucideIconForService } from "../lib/serviceIcons";
import { getServiceColorForName, type NavServiceColor } from "../lib/serviceNav";
import { serviceNameToSlug } from "../lib/serviceSlugs";
import { usePageMeta } from "../lib/usePageMeta";
import "./ServiceDetailPage.css";
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

type SectionAccent = NavServiceColor;

const SECTION_META: Record<
  string,
  { icon: LucideIcon; accent: SectionAccent }
> = {
  includes: { icon: ListChecks, accent: "blue" },
  whoNeeds: { icon: Users, accent: "purple" },
  pricing: { icon: BadgePoundSterling, accent: "red" },
  duration: { icon: Clock, accent: "orange" },
  customerReceives: { icon: FileText, accent: "green" },
  beforeBooking: { icon: ClipboardList, accent: "blue" },
};

function DetailSectionTitle({
  icon: Icon,
  title,
  accent,
}: {
  icon: LucideIcon;
  title: string;
  accent: SectionAccent;
}) {
  return (
    <h2 className="service-detail-section__title">
      <span
        className={`service-detail-section__title-icon service-detail-section__title-icon--${accent}`}
        aria-hidden
      >
        <Icon strokeWidth={2.25} />
      </span>
      <span>{title}</span>
    </h2>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
};

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

function useMotionProps(reduceMotion: boolean | null) {
  const off = reduceMotion === true;
  return {
    initial: off ? false : ("hidden" as const),
    animate: off ? undefined : ("visible" as const),
    transition: off ? { duration: 0 } : { duration: 0.55, ease: EASE_OUT },
    viewport: { once: true, margin: "-60px 0px -40px 0px" as const },
  };
}

interface ServiceDetailPageProps {
  slug: string;
  onNavigateHome: () => void;
  onNavigateServices: () => void;
  onNavigateProfessionals: () => void;
  onNavigateAbout: () => void;
  onNavigateContact: () => void;
  onCustomerLogin?: () => void;
  onBookService: (serviceId: number, serviceName: string) => void;
  onGetInstantPrice: (serviceId: number, serviceName: string) => void;
  currentUser?: { name: string; role: "customer" | "professional" | "admin" } | null;
  onLogout?: () => void;
  onNavigateToDashboard?: () => void;
}

function ServiceDetailCtaButtons({
  disabled,
  onInstantPrice,
  onBook,
  variant = "hero",
  reduceMotion,
}: {
  disabled?: boolean;
  onInstantPrice: () => void;
  onBook: () => void;
  variant?: "hero" | "footer";
  reduceMotion: boolean | null;
}) {
  const instantClass =
    variant === "hero"
      ? "service-detail-btn service-detail-btn--white"
      : "service-detail-btn service-detail-btn--outline-red";

  const containerProps =
    variant === "hero"
      ? {
          initial: reduceMotion ? false : ("hidden" as const),
          animate: reduceMotion ? undefined : ("visible" as const),
        }
      : {
          initial: reduceMotion ? false : ("hidden" as const),
          whileInView: reduceMotion ? undefined : ("visible" as const),
          viewport: { once: true, margin: "-20px" as const },
        };

  return (
    <motion.div
      className={variant === "hero" ? "service-detail-hero__actions" : "service-detail-cta__actions"}
      variants={stagger}
      {...containerProps}
    >
      <motion.button
        type="button"
        className={instantClass}
        disabled={disabled}
        onClick={onInstantPrice}
        variants={fadeUp}
        whileHover={disabled ? undefined : { scale: 1.03, y: -1 }}
        whileTap={disabled ? undefined : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
      >
        <Zap className="service-detail-btn__icon" strokeWidth={2.25} aria-hidden />
        Get Instant Price
      </motion.button>
      <motion.button
        type="button"
        className="service-detail-btn service-detail-btn--primary"
        disabled={disabled}
        onClick={onBook}
        variants={fadeUp}
        whileHover={disabled ? undefined : { scale: 1.03, y: -1 }}
        whileTap={disabled ? undefined : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
      >
        <Calendar className="service-detail-btn__icon" strokeWidth={2.25} aria-hidden />
        Book Now
      </motion.button>
    </motion.div>
  );
}

function DetailList({
  items,
  split = false,
}: {
  items: string[];
  split?: boolean;
}) {
  const useSplit = split || items.length >= 6;

  return (
    <ul className={`service-detail-list${useSplit ? " service-detail-list--split" : ""}`}>
      {items.map((item) => (
        <li key={item} className="service-detail-list__item">
          <span className="service-detail-list__icon" aria-hidden>
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function DetailSectionBlock({
  section,
  sectionKey,
  index = 0,
  reduceMotion,
  inGrid = false,
  splitList = false,
}: {
  section: ServiceDetailSection;
  sectionKey: keyof typeof SECTION_META;
  index?: number;
  reduceMotion: boolean | null;
  inGrid?: boolean;
  splitList?: boolean;
}) {
  const off = reduceMotion === true;
  const meta = SECTION_META[sectionKey];

  return (
    <motion.section
      className={`service-detail-section${inGrid ? " service-detail-section--in-grid" : ""}`}
      initial={off ? false : { opacity: 0, y: 24 }}
      whileInView={off ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12, margin: "0px 0px -40px 0px" }}
      transition={{
        duration: off ? 0 : 0.5,
        ease: EASE_OUT,
        delay: off ? 0 : index * 0.05,
      }}
    >
      <DetailSectionTitle icon={meta.icon} title={section.title} accent={meta.accent} />
      <div className="service-detail-card">
        <DetailList items={section.items} split={splitList} />
        {section.note ? (
          <p className="service-detail-section__note">
            <Info className="service-detail-section__note-icon" strokeWidth={2.25} aria-hidden />
            <span>{section.note}</span>
          </p>
        ) : null}
      </div>
    </motion.section>
  );
}

function DetailPricingBlock({
  pricing,
  reduceMotion,
  index = 0,
  inGrid = false,
}: {
  pricing: ServiceDetailContent["pricing"];
  reduceMotion: boolean | null;
  index?: number;
  inGrid?: boolean;
}) {
  const off = reduceMotion === true;

  return (
    <motion.section
      className={`service-detail-section${inGrid ? " service-detail-section--in-grid" : ""}`}
      initial={off ? false : { opacity: 0, y: 24 }}
      whileInView={off ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12, margin: "0px 0px -40px 0px" }}
      transition={{
        duration: off ? 0 : 0.5,
        ease: EASE_OUT,
        delay: off ? 0 : index * 0.05,
      }}
    >
      <DetailSectionTitle
        icon={SECTION_META.pricing.icon}
        title="Typical price / from-price"
        accent={SECTION_META.pricing.accent}
      />
      <div className="service-detail-card service-detail-card--pricing">
        <p className="service-detail-pricing__from">
          <Tag className="service-detail-pricing__from-icon" strokeWidth={2.25} aria-hidden />
          {pricing.fromPrice}
        </p>
        {pricing.paragraphs.map((paragraph) => (
          <p key={paragraph} className="service-detail-pricing__text">
            {paragraph}
          </p>
        ))}
      </div>
    </motion.section>
  );
}

function resolveServiceForSlug(
  slug: string,
  services: ServiceResponse[]
): ServiceResponse | undefined {
  return services.find((service) => serviceNameToSlug(service.service_name) === slug);
}

export function ServiceDetailPage({
  slug,
  onNavigateHome,
  onNavigateServices,
  onNavigateProfessionals,
  onNavigateAbout,
  onNavigateContact,
  onCustomerLogin,
  onBookService,
  onGetInstantPrice,
  currentUser,
  onLogout,
  onNavigateToDashboard,
}: ServiceDetailPageProps) {
  const [services, setServices] = useState<ServiceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchServices();
        if (!cancelled) setServices(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load service");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const apiService = useMemo(
    () => resolveServiceForSlug(slug, services),
    [slug, services]
  );

  const content: ServiceDetailContent | null = useMemo(() => {
    const bespoke = getServiceDetailContent(slug);
    if (bespoke) return bespoke;
    if (!apiService) return null;
    return buildGenericServiceDetailContent(
      slug,
      apiService.service_name,
      formatServiceFromPrice(apiService)
    );
  }, [slug, apiService]);

  usePageMeta(
    content?.seoTitle ?? "Service | Fire Guide",
    content?.metaDescription
  );

  const handleBook = () => {
    if (!apiService) return;
    onBookService(apiService.id, apiService.service_name);
  };

  const handleInstantPrice = () => {
    if (!apiService) return;
    onGetInstantPrice(apiService.id, apiService.service_name);
  };

  const displayFromPrice =
    content?.pricing.fromPrice ??
    (apiService ? `From ${formatServiceFromPrice(apiService).replace(/\.00$/, "")}` : "");

  const buttonsDisabled = !apiService;
  const reduceMotion = useReducedMotion();
  const heroMotion = useMotionProps(reduceMotion);

  const serviceName = apiService?.service_name ?? content?.h1 ?? "";
  const serviceType = apiService?.type;
  const ServiceIcon = getLucideIconForService(serviceName, serviceType);
  const serviceColor = getServiceColorForName(serviceName);

  return (
    <div className="service-detail-page min-h-screen">
      <Header
        onGetStarted={onNavigateServices}
        onProfessionalLogin={onNavigateProfessionals}
        onCustomerLogin={onCustomerLogin}
        currentUser={currentUser}
        onLogout={onLogout}
        onNavigateHome={onNavigateHome}
        onNavigateServices={onNavigateServices}
        onNavigateAbout={onNavigateAbout}
        onNavigateContact={onNavigateContact}
        onNavigateToDashboard={onNavigateToDashboard}
      />

      {loading ? (
        <div className="service-detail-loading">
          <div className="text-center text-gray-600">
            <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto mb-3" />
            Loading service…
          </div>
        </div>
      ) : error || !content ? (
        <div className="service-detail-error">
          <div className="text-center max-w-md">
            <p className="text-gray-900 font-semibold mb-2">Service not found</p>
            <p className="text-gray-600 mb-6">{error ?? "We couldn't find that service page."}</p>
            <Button onClick={onNavigateServices} className="bg-red-600 hover:bg-red-700">
              View all services
            </Button>
          </div>
        </div>
      ) : (
        <>
          <motion.section
            className="service-detail-hero"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
          >
            <motion.div
              className="service-detail-hero__inner"
              variants={stagger}
              initial={heroMotion.initial}
              animate={heroMotion.animate}
            >
              <motion.div
                className={`service-detail-hero__icon service-detail-hero__icon--${serviceColor}`}
                variants={scaleIn}
                aria-hidden
              >
                <ServiceIcon strokeWidth={2} />
              </motion.div>
              <motion.h1 className="service-detail-hero__title" variants={fadeUp}>
                {content.h1}
              </motion.h1>

              {content.heroParagraphs.map((paragraph) => (
                <motion.p key={paragraph} className="service-detail-hero__text" variants={fadeUp}>
                  {paragraph}
                </motion.p>
              ))}

              {displayFromPrice ? (
                <motion.p
                  className="service-detail-hero__price"
                  variants={scaleIn}
                  whileHover={reduceMotion ? undefined : { scale: 1.04 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  {displayFromPrice}
                </motion.p>
              ) : null}

              <ServiceDetailCtaButtons
                disabled={buttonsDisabled}
                onInstantPrice={handleInstantPrice}
                onBook={handleBook}
                variant="hero"
                reduceMotion={reduceMotion}
              />
            </motion.div>
          </motion.section>

          <div className="service-detail-body">
            <div className="service-detail-grid">
              <DetailSectionBlock
                section={content.includes}
                sectionKey="includes"
                index={0}
                reduceMotion={reduceMotion}
                inGrid
                splitList
              />
              <DetailSectionBlock
                section={content.whoNeeds}
                sectionKey="whoNeeds"
                index={1}
                reduceMotion={reduceMotion}
                inGrid
                splitList
              />
            </div>

            <div className="service-detail-grid">
              <DetailPricingBlock
                pricing={content.pricing}
                reduceMotion={reduceMotion}
                index={2}
                inGrid
              />
              <DetailSectionBlock
                section={content.duration}
                sectionKey="duration"
                index={3}
                reduceMotion={reduceMotion}
                inGrid
              />
            </div>

            <div className="service-detail-grid">
              <DetailSectionBlock
                section={content.customerReceives}
                sectionKey="customerReceives"
                index={4}
                reduceMotion={reduceMotion}
                inGrid
                splitList
              />
              <DetailSectionBlock
                section={content.beforeBooking}
                sectionKey="beforeBooking"
                index={5}
                reduceMotion={reduceMotion}
                inGrid
                splitList
              />
            </div>

            <motion.section
              className="service-detail-cta"
              initial={reduceMotion ? false : { opacity: 0, y: 32 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
            >
              <div className="service-detail-cta__icon-wrap" aria-hidden>
                <ShieldCheck className="service-detail-cta__icon" strokeWidth={2} />
              </div>
              <motion.h2
                className="service-detail-cta__title"
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.1 }}
              >
                {content.cta.title}
              </motion.h2>
              <motion.p
                className="service-detail-cta__subtitle"
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.18 }}
              >
                {content.cta.subtitle}
              </motion.p>
              <ServiceDetailCtaButtons
                disabled={buttonsDisabled}
                onInstantPrice={handleInstantPrice}
                onBook={handleBook}
                variant="footer"
                reduceMotion={reduceMotion}
              />
            </motion.section>
          </div>
        </>
      )}

      <Footer />
    </div>
  );
}
