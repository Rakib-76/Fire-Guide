import React, { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Award,
  BadgePoundSterling,
  Check,
  ChevronRight,
  ClipboardList,
  Clock,
  Calendar,
  FileCheck,
  FileText,
  Gift,
  Handshake,
  Info,
  ListChecks,
  Loader2,
  Lock,
  MessagesSquare,
  Plus,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
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
import {
  getHeroBullets,
  getOverviewSummary,
  getServiceDetailFaqs,
  SERVICE_DETAIL_HOW_IT_WORKS,
  SERVICE_DETAIL_TRUST_BADGES,
  SERVICE_DETAIL_WHY_BOOK,
} from "../lib/serviceDetailLayout";
import type { NavServiceColor } from "../lib/serviceNav";
import { serviceNameToSlug } from "../lib/serviceSlugs";
import { getServiceDetailHeroBackdrop } from "../lib/serviceDetailHeroBackdrop";
import { usePageMeta } from "../lib/usePageMeta";
import {
  ServiceDetailInstantPriceForm,
  type ServiceDetailInstantPriceResult,
} from "./ServiceDetailInstantPriceForm";
import "./ServiceDetailPage.css";

type SectionAccent = NavServiceColor;

const SECTION_META: Record<
  string,
  { icon: LucideIcon; accent: SectionAccent; anchorId: string }
> = {
  includes: { icon: ListChecks, accent: "blue", anchorId: "section-includes" },
  whoNeeds: { icon: Users, accent: "green", anchorId: "section-who-needs" },
  pricing: { icon: BadgePoundSterling, accent: "red", anchorId: "section-pricing" },
  duration: { icon: Clock, accent: "orange", anchorId: "section-duration" },
  customerReceives: { icon: Gift, accent: "green", anchorId: "section-customer-receives" },
  beforeBooking: { icon: ClipboardList, accent: "blue", anchorId: "section-before-booking" },
};

const HOW_IT_WORKS_ICONS = [FileText, Calendar, ShieldCheck, FileCheck] as const;
const WHY_BOOK_ICONS = [ShieldCheck, Tag, MessagesSquare, Handshake] as const;
const TRUST_BADGE_ICONS = [Award, Sparkles, ShieldCheck, Lock] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

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
  onInstantPriceSubmit: (result: ServiceDetailInstantPriceResult) => void;
  currentUser?: { name: string; role: "customer" | "professional" | "admin" } | null;
  onLogout?: () => void;
  onNavigateToDashboard?: () => void;
}

function ServiceDetailCtaButtons({
  disabled,
  onInstantPrice,
  onBook,
  variant = "hero",
}: {
  disabled?: boolean;
  onInstantPrice: () => void;
  onBook: () => void;
  variant?: "hero" | "footer";
}) {
  const instantClass =
    variant === "hero"
      ? "service-detail-btn service-detail-btn--white"
      : "service-detail-btn service-detail-btn--white";

  return (
    <div className={variant === "hero" ? "service-detail-hero__actions" : "service-detail-cta-bar__actions"}>
      <button type="button" className={instantClass} disabled={disabled} onClick={onInstantPrice}>
        Get Instant Price
      </button>
      <button
        type="button"
        className="service-detail-btn service-detail-btn--primary"
        disabled={disabled}
        onClick={onBook}
      >
        Book Now
      </button>
    </div>
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

function OverviewCard({
  icon: Icon,
  accent,
  title,
  summary,
  linkLabel,
  onViewDetails,
}: {
  icon: LucideIcon;
  accent: "blue" | "green" | "red" | "orange";
  title: string;
  summary: string;
  linkLabel: string;
  onViewDetails: () => void;
}) {
  return (
    <article className="service-detail-overview-card">
      <div className={`service-detail-overview-card__icon service-detail-overview-card__icon--${accent}`}>
        <Icon strokeWidth={2.25} />
      </div>
      <h3 className="service-detail-overview-card__title">{title}</h3>
      <p className="service-detail-overview-card__text">{summary}</p>
      <button type="button" className="service-detail-overview-card__link" onClick={onViewDetails}>
        {linkLabel}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </button>
    </article>
  );
}

function DetailSectionBlock({
  section,
  sectionKey,
  inGrid = false,
  splitList = false,
}: {
  section: ServiceDetailSection;
  sectionKey: keyof typeof SECTION_META;
  inGrid?: boolean;
  splitList?: boolean;
}) {
  const meta = SECTION_META[sectionKey];

  return (
    <section
      id={meta.anchorId}
      className={`service-detail-section${inGrid ? " service-detail-section--in-grid" : ""}`}
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
    </section>
  );
}

function DetailPricingBlock({
  pricing,
  inGrid = false,
}: {
  pricing: ServiceDetailContent["pricing"];
  inGrid?: boolean;
}) {
  const meta = SECTION_META.pricing;

  return (
    <section
      id={meta.anchorId}
      className={`service-detail-section${inGrid ? " service-detail-section--in-grid" : ""}`}
    >
      <DetailSectionTitle icon={meta.icon} title="Typical price / from-price" accent={meta.accent} />
      <div className="service-detail-card">
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
    </section>
  );
}

function ServiceDetailFaq({
  faqs,
  onViewAll,
}: {
  faqs: { question: string; answer: string }[];
  onViewAll: () => void;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="service-detail-block">
      <div className="service-detail-faq-header">
        <h2 className="service-detail-faq-header__title">Frequently asked questions</h2>
        <button type="button" className="service-detail-faq-header__link" onClick={onViewAll}>
          View all FAQs
          <ArrowRight className="inline h-3.5 w-3.5 ml-0.5" aria-hidden />
        </button>
      </div>

      <div className="service-detail-faq-list">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <article key={faq.question} className="service-detail-faq-item">
              <button
                type="button"
                className="service-detail-faq-item__trigger"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                <span>{faq.question}</span>
                <Plus
                  className={`service-detail-faq-item__icon${isOpen ? " service-detail-faq-item__icon--open" : ""}`}
                  aria-hidden
                />
              </button>
              {isOpen ? <p className="service-detail-faq-item__answer">{faq.answer}</p> : null}
            </article>
          );
        })}
      </div>
    </section>
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
  onInstantPriceSubmit,
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
  const heroBullets = content ? getHeroBullets(content) : [];
  const faqs = content ? getServiceDetailFaqs(content) : [];
  const heroBackdrop = useMemo(
    () => (content ? getServiceDetailHeroBackdrop(content.h1) : null),
    [content]
  );

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
          <section
            className="service-detail-hero"
            style={
              heroBackdrop
                ? ({
                    "--service-detail-hero-accent-glow": heroBackdrop.accentGlow,
                  } as React.CSSProperties)
                : undefined
            }
          >
            {heroBackdrop ? (
              <div className="service-detail-hero__media" aria-hidden>
                <img
                  className="service-detail-hero__photo"
                  src={heroBackdrop.photoSrc}
                  alt=""
                  loading="eager"
                  decoding="async"
                />
                <img
                  className="service-detail-hero__service-art"
                  src={heroBackdrop.serviceImageSrc}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ) : null}
            <div className="service-detail-hero__overlay" aria-hidden />

            <div className="service-detail-hero__container">
              <div className="service-detail-hero__layout">
                <div className="service-detail-hero__content">
                  <h1 className="service-detail-hero__title">{content.h1}</h1>

                  <div className="service-detail-hero__intro-group">
                    {content.heroParagraphs.map((paragraph) => (
                      <p key={paragraph} className="service-detail-hero__intro">
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  <ul className="service-detail-hero__bullets">
                    {heroBullets.map((bullet) => (
                      <li key={bullet} className="service-detail-hero__bullet">
                        <span className="service-detail-hero__bullet-icon" aria-hidden>
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>

                  <ServiceDetailCtaButtons
                    disabled={buttonsDisabled}
                    onInstantPrice={handleInstantPrice}
                    onBook={handleBook}
                    variant="hero"
                  />

                  <div className="service-detail-trust-bar">
                    {SERVICE_DETAIL_TRUST_BADGES.map((badge, index) => {
                      const TrustIcon = TRUST_BADGE_ICONS[index] ?? ShieldCheck;

                      return (
                        <div key={badge.line1} className="service-detail-trust-bar__item">
                          <span className="service-detail-trust-bar__icon-wrap" aria-hidden>
                            <TrustIcon className="service-detail-trust-bar__icon" strokeWidth={1.75} />
                          </span>
                          <span className="service-detail-trust-bar__label">
                            <span>{badge.line1}</span>
                            <span>{badge.line2}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {apiService ? (
                  <ServiceDetailInstantPriceForm
                    serviceId={apiService.id}
                    serviceName={apiService.service_name}
                    fallbackFromPrice={displayFromPrice}
                    disabled={buttonsDisabled}
                    onSubmit={onInstantPriceSubmit}
                  />
                ) : null}
              </div>
            </div>
          </section>

          <div className="service-detail-body">
            <div className="service-detail-overview">
              <OverviewCard
                icon={ListChecks}
                accent="blue"
                title={content.includes.title}
                summary={getOverviewSummary(content.includes, "includes", content)}
                linkLabel="View details"
                onViewDetails={() => scrollToSection(SECTION_META.includes.anchorId)}
              />
              <OverviewCard
                icon={Users}
                accent="green"
                title={content.whoNeeds.title}
                summary={getOverviewSummary(content.whoNeeds, "whoNeeds", content)}
                linkLabel="View details"
                onViewDetails={() => scrollToSection(SECTION_META.whoNeeds.anchorId)}
              />
              <OverviewCard
                icon={BadgePoundSterling}
                accent="red"
                title="Typical price / from-price"
                summary={getOverviewSummary(content.includes, "pricing", content)}
                linkLabel="View pricing"
                onViewDetails={() => scrollToSection(SECTION_META.pricing.anchorId)}
              />
              <OverviewCard
                icon={Clock}
                accent="orange"
                title={content.duration.title}
                summary={getOverviewSummary(content.duration, "duration", content)}
                linkLabel="View details"
                onViewDetails={() => scrollToSection(SECTION_META.duration.anchorId)}
              />
            </div>

            <div className="service-detail-grid">
              <DetailSectionBlock
                section={content.includes}
                sectionKey="includes"
                inGrid
                splitList
              />
              <DetailSectionBlock
                section={content.whoNeeds}
                sectionKey="whoNeeds"
                inGrid
                splitList
              />
            </div>

            <div className="service-detail-grid">
              <DetailPricingBlock pricing={content.pricing} inGrid />
              <DetailSectionBlock section={content.duration} sectionKey="duration" inGrid />
            </div>

            <div className="service-detail-grid">
              <section
                id={SECTION_META.customerReceives.anchorId}
                className="service-detail-section service-detail-section--in-grid"
              >
                <DetailSectionTitle
                  icon={SECTION_META.customerReceives.icon}
                  title={content.customerReceives.title}
                  accent={SECTION_META.customerReceives.accent}
                />
                <div className="service-detail-card">
                  <DetailList items={content.customerReceives.items} split />
                  <button type="button" className="service-detail-sample-link" onClick={onNavigateContact}>
                    See a sample report
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </section>

              <DetailSectionBlock
                section={content.beforeBooking}
                sectionKey="beforeBooking"
                inGrid
                splitList
              />
            </div>

            <section className="service-detail-block service-detail-block--how">
              <h2 className="service-detail-block__heading">How it works</h2>
              <div className="service-detail-how">
                <svg
                  className="service-detail-how__connector"
                  viewBox="0 0 1000 40"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    className="service-detail-how__connector-path"
                    d="M0,22 H72 L72,6 H178 L178,22 H322 L322,6 H428 L428,22 H572 L572,6 H678 L678,22 H822 L822,6 H928 L928,22 H1000"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>

                <div className="service-detail-how__steps">
                  {SERVICE_DETAIL_HOW_IT_WORKS.map((step, index) => {
                    const StepIcon = HOW_IT_WORKS_ICONS[index] ?? FileText;

                    return (
                      <article key={step.title} className="service-detail-how__step">
                        <div className="service-detail-how__badge-wrap">
                          <span className="service-detail-how__badge">{index + 1}</span>
                        </div>

                        <div className="service-detail-how__body">
                          <div className="service-detail-how__icon-wrap" aria-hidden>
                            <StepIcon className="service-detail-how__icon" strokeWidth={1.75} />
                          </div>
                          <h3 className="service-detail-how__title">{step.title}</h3>
                          <p className="service-detail-how__text">{step.description}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="service-detail-block service-detail-block--why">
              <h2 className="service-detail-block__heading">Why book through Fire Guide?</h2>
              <div className="service-detail-why">
                {SERVICE_DETAIL_WHY_BOOK.map((item, index) => {
                  const WhyIcon = WHY_BOOK_ICONS[index] ?? ShieldCheck;

                  return (
                    <article key={item.title} className="service-detail-why__item">
                      <div className="service-detail-why__icon-wrap" aria-hidden>
                        <WhyIcon className="service-detail-why__icon" strokeWidth={1.75} />
                      </div>
                      <div className="service-detail-why__copy">
                        <h3 className="service-detail-why__title">{item.title}</h3>
                        <p className="service-detail-why__text">{item.description}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <ServiceDetailFaq faqs={faqs} onViewAll={onNavigateAbout} />

            <section className="service-detail-cta-bar" aria-labelledby="service-detail-cta-heading">
              <div className="service-detail-cta-bar__copy">
                <h2 id="service-detail-cta-heading" className="service-detail-cta-bar__title">
                  {content.cta.title}
                </h2>
                <p className="service-detail-cta-bar__subtitle">{content.cta.subtitle}</p>
              </div>
              <ServiceDetailCtaButtons
                disabled={buttonsDisabled}
                onInstantPrice={handleInstantPrice}
                onBook={handleBook}
                variant="footer"
              />
            </section>
          </div>
        </>
      )}

      <Footer />
    </div>
  );
}
