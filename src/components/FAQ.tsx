import { Fragment, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Award,
  Calendar,
  CalendarCheck,
  Check,
  ClipboardCheck,
  Headphones,
  HelpCircle,
  Info,
  ShieldCheck,
  Tag,
  Users,
  Zap,
} from "lucide-react";
import "./FAQ.css";

interface FAQProps {
  onContactSupport: () => void;
  onGetQuote?: () => void;
}

type FeatureCard = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type TrustItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function FAQ({ onContactSupport, onGetQuote }: FAQProps) {
  const [openIndex, setOpenIndex] = useState(0);

  const featureCards: FeatureCard[] = [
    {
      icon: CalendarCheck,
      title: "Simple Booking",
      description:
        "Answer a few quick questions and get instant pricing in minutes.",
    },
    {
      icon: Users,
      title: "Compare Professionals",
      description:
        "View multiple qualified professionals, compare options and choose what suits you.",
    },
    {
      icon: Tag,
      title: "Transparent Pricing",
      description:
        "Clear, upfront pricing so you know exactly what to expect — no hidden costs.",
    },
    {
      icon: ClipboardCheck,
      title: "Stay Organised",
      description:
        "Manage bookings, reports and reminders to stay on top of your compliance.",
    },
  ];

  const trustItems: TrustItem[] = [
    {
      icon: ShieldCheck,
      title: "No hidden fees",
      description: "What you see is what you pay.",
    },
    {
      icon: Zap,
      title: "Instant quotes",
      description: "Get pricing in minutes, 24/7.",
    },
    {
      icon: Calendar,
      title: "Flexible booking",
      description: "Book at a time that works for you.",
    },
    {
      icon: ShieldCheck,
      title: "Designed for compliance",
      description: "We help you stay on track, every time.",
    },
  ];

  const faqs = [
    {
      question: "How do I book a fire safety service?",
      answer:
        "Answer a few quick questions about your property and requirements. We'll show you available professionals with pricing so you can choose and book instantly.",
    },
    {
      question: "Are professionals qualified?",
      answer:
        "Yes, absolutely. Every professional on Fire Guide is thoroughly vetted. We verify certifications (BAFE, FIA, NEBOSH), conduct background checks, verify insurance, and review qualifications before they can join our platform.",
    },
    {
      question: "What payment methods do you accept?",
      answer:
        "We accept all major credit and debit cards (Visa, Mastercard, American Express), as well as digital wallets like Apple Pay and Google Pay. All payments are processed securely with bank-level encryption.",
    },
    {
      question: "Can I reschedule or cancel my booking?",
      answer:
        "Yes, you can reschedule or cancel through your customer dashboard. Free cancellation is available up to 24 hours before the scheduled service. You can also reschedule at no extra cost.",
    },
    {
      question: "How long does a fire risk assessment take?",
      answer:
        "The duration depends on your property size and complexity. A typical small office takes 1–2 hours, medium properties 2–4 hours, and larger commercial sites may require 4–8 hours.",
    },
    {
      question: "Do you offer emergency services?",
      answer:
        "Yes, many professionals provide same-day or next-day emergency appointments. When booking, select 'Emergency Service' to see professionals available for immediate response.",
    },
    {
      question: "What areas do you cover?",
      answer:
        "We cover major cities across the UK including London, Manchester, Birmingham, Leeds, Liverpool, Bristol, Glasgow, Edinburgh, and Cardiff. Enter your postcode to check availability.",
    },
  ];

  const supportFeatures = [
    "Fast response",
    "Friendly support",
    "No obligation",
  ];

  const toggleItem = (index: number) => {
    setOpenIndex((current) => (current === index ? -1 : index));
  };

  const handleGetQuote = () => {
    if (onGetQuote) {
      onGetQuote();
    }
  };

  const footerFeatures = [
    {
      icon: ShieldCheck,
      title: "Secure Payments",
      description: "Your payments are safe and protected.",
    },
    {
      icon: Users,
      title: "Independent Professionals",
      description: "We connect you with trusted local experts.",
    },
    {
      icon: Award,
      title: "Quality Services",
      description: "High standards you can rely on, every time.",
    },
    {
      icon: Headphones,
      title: "Support You Can Trust",
      description: "Our team is here when you need us.",
    },
  ];

  const ctaTrustPoints = ["Fast", "No hidden fees", "No obligation"];

  return (
    <section className="faq-section">
      <div className="faq-container">
        <div className="faq-intro">
          <div className="faq-intro-badge">
            <ShieldCheck className="faq-intro-badge-icon" strokeWidth={2.25} />
            <span>Built for businesses across the UK</span>
          </div>

          <h2 className="faq-intro-title">
            Fire Safety. <span className="faq-intro-title-accent">Sorted Simply.</span>
          </h2>

          <p className="faq-intro-subtitle">
            Fire Guide helps you find, compare and book trusted fire safety services
            with clear pricing and total peace of mind.
          </p>

          <div className="faq-feature-grid">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="faq-feature-card">
                  <span className="faq-feature-icon-wrap" aria-hidden>
                    <Icon className="faq-feature-icon" strokeWidth={2} />
                  </span>
                  <h3 className="faq-feature-title">{card.title}</h3>
                  <span className="faq-feature-divider" aria-hidden />
                  <p className="faq-feature-desc">{card.description}</p>
                </article>
              );
            })}
          </div>

          <div className="faq-trust-bar">
            {trustItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="faq-trust-item">
                  <span className="faq-trust-icon-wrap" aria-hidden>
                    <Icon className="faq-trust-icon" strokeWidth={2} />
                  </span>
                  <div className="faq-trust-text">
                    <p className="faq-trust-title">{item.title}</p>
                    <p className="faq-trust-desc">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="faq-panel">
          <div className="faq-body">
            <div className="faq-main">
              <header className="faq-header">
                <span className="faq-header-icon" aria-hidden>
                  <HelpCircle className="faq-header-icon-svg" strokeWidth={2.25} />
                </span>
                <div className="faq-header-text">
                  <h2 className="faq-title">Frequently Asked Questions</h2>
                  <p className="faq-subtitle">
                    Everything you need to know before booking.
                  </p>
                </div>
              </header>

              <div className="faq-list">
                {faqs.map((faq, index) => {
                  const isOpen = openIndex === index;
                  return (
                    <div
                      key={faq.question}
                      className={`faq-item${isOpen ? " faq-item--open" : ""}`}
                    >
                      <button
                        type="button"
                        className="faq-trigger"
                        aria-expanded={isOpen}
                        onClick={() => toggleItem(index)}
                      >
                        <span className="faq-question">
                          {index + 1}. {faq.question}
                        </span>
                        <span className="faq-toggle" aria-hidden>
                          {isOpen ? "−" : "+"}
                        </span>
                      </button>
                      {isOpen && <div className="faq-answer">{faq.answer}</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            <aside className="faq-support-card">
              <div className="faq-support-wave" aria-hidden />
              <div className="faq-support-inner">
                <span className="faq-support-icon-wrap" aria-hidden>
                  <Headphones className="faq-support-icon" strokeWidth={2} />
                </span>
                <h3 className="faq-support-title">Still have questions?</h3>
                <p className="faq-support-desc">
                  Our team is here to help you every step of the way.
                </p>
                <ul className="faq-support-features">
                  {supportFeatures.map((feature) => (
                    <li key={feature} className="faq-support-feature">
                      <span className="faq-support-check" aria-hidden>
                        <Check className="faq-support-check-icon" strokeWidth={3} />
                      </span>
                      <span className="faq-support-feature-text">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="faq-support-btn"
                  onClick={onContactSupport}
                >
                  Contact Support
                  <ArrowRight className="faq-support-btn-icon" strokeWidth={2.25} />
                </button>
              </div>
            </aside>
          </div>
        </div>

        <div className="faq-footer">
          <div className="faq-cta-banner">
            <div className="faq-cta-left">
              <span className="faq-cta-icon-wrap" aria-hidden>
                <CalendarCheck className="faq-cta-icon" strokeWidth={2} />
              </span>
              <div className="faq-cta-copy">
                <p className="faq-cta-eyebrow">Ready to get started?</p>
                <h3 className="faq-cta-title">Get your fire safety sorted today</h3>
                <p className="faq-cta-desc">
                  It only takes a few minutes to get your price and book a service.
                </p>
              </div>
            </div>

            <div className="faq-cta-right">
              <div className="faq-cta-right-inner">
                <button
                  type="button"
                  className="faq-cta-btn"
                  onClick={handleGetQuote}
                >
                  Get Your Instant Quote
                  <ArrowRight className="faq-cta-btn-icon" strokeWidth={2.25} />
                </button>
                <ul className="faq-cta-trust-list">
                  {ctaTrustPoints.map((point) => (
                    <li key={point} className="faq-cta-trust-item">
                      ✓ {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="faq-footer-features">
            {footerFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Fragment key={feature.title}>
                  {index > 0 && <span className="faq-footer-divider" aria-hidden />}
                  <div className="faq-footer-feature">
                    <span
                      className={`faq-footer-feature-icon-wrap${
                        index === footerFeatures.length - 1
                          ? " faq-footer-feature-icon-wrap--navy"
                          : ""
                      }`}
                      aria-hidden
                    >
                      <Icon className="faq-footer-feature-icon" strokeWidth={2} />
                    </span>
                    <div className="faq-footer-feature-text">
                      <p className="faq-footer-feature-title">{feature.title}</p>
                      <p className="faq-footer-feature-desc">{feature.description}</p>
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>

          <div className="faq-disclaimer">
            <div className="faq-disclaimer-inner">
              <span className="faq-disclaimer-icon-wrap" aria-hidden>
                <Info className="faq-disclaimer-icon" strokeWidth={1.75} />
              </span>
              <div className="faq-disclaimer-text">
                <p className="faq-disclaimer-line">Fire Guide connects you with independent fire safety professionals.</p>
                <p className="faq-disclaimer-line faq-disclaimer-line--center">
                  Services are carried out by third-party providers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
