import { Fragment, type CSSProperties } from "react";
import bafeLogo from "../assets/certifications/BAFE.png";
import neboshLogo from "../assets/certifications/NEBOSH.png";
import fiaLogo from "../assets/certifications/FIA.png";
import isoLogo from "../assets/certifications/ISO.png";
import {
  Clock,
  Tag,
  ShieldCheck,
  ClipboardCheck,
  Check,
  X,
  PoundSterling,
  Users,
  Calendar,
  ShieldCheck as ShieldIcon,
  Info,
  Lock,
} from "lucide-react";
import "./WhyChooseFireGuide.css";

function TraditionalClipboardWatermark({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 80 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden
    >
      <rect x="8" y="18" width="64" height="72" rx="8" stroke="currentColor" strokeWidth="3" />
      <rect x="26" y="10" width="28" height="14" rx="4" stroke="currentColor" strokeWidth="3" />
      <circle cx="40" cy="8" r="3" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M22 38L28 44M28 38L22 44"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line x1="34" y1="41" x2="58" y2="41" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M22 54L28 60M28 54L22 60"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line x1="34" y1="57" x2="58" y2="57" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M22 70L28 76M28 70L22 76"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line x1="34" y1="73" x2="58" y2="73" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function WhyChooseFireGuide() {
  const features = [
    {
      icon: Clock,
      title: "Fast & Simple",
      description: "Compare professionals, get prices and book in minutes.",
    },
    {
      icon: Tag,
      title: "Transparent Pricing",
      description: "Upfront prices with no hidden fees. What you see is what you pay.",
    },
    {
      icon: ShieldCheck,
      title: "Qualified Professionals",
      description: "Experienced fire safety professionals who meet industry standards.",
    },
    {
      icon: ClipboardCheck,
      title: "Stay Compliant",
      description: "Receive reports, reminders and support to help you stay on top of your obligations.",
    },
  ];

  const fireGuidePoints = [
    "Compare multiple professionals",
    "Instant pricing & booking",
    "Professionals show their qualifications",
    "Manage everything in one place",
    "Stay organised and compliant",
  ];

  const traditionalPoints = [
    "Call around for quotes",
    "No clear pricing",
    "Hard to compare options",
    "Manual paperwork & emails",
    "Easy to miss deadlines",
  ];

  const certifications = [
    { label: "BAFE", sublabel: "Registered", image: bafeLogo },
    { label: "NEBOSH", sublabel: "Certified", image: neboshLogo },
    { label: "FIA", sublabel: "Member", image: fiaLogo },
    { label: "ISO", sublabel: "ISO-aligned Businesses", image: isoLogo },
  ];

  const bottomFeatures = [
    {
      icon: PoundSterling,
      title: "Clear Prices",
      description: "Know the cost before you book.",
    },
    {
      icon: Users,
      title: "Compare Options",
      description: "Access multiple professionals and choose with confidence.",
    },
    {
      icon: Calendar,
      title: "Book in Minutes",
      description: "Simple online booking that fits your schedule.",
    },
    {
      icon: ShieldIcon,
      title: "Stay in Control",
      description: "All your bookings, reports and reminders in one place.",
    },
  ];

  return (
    <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14 lg:mb-10 md:mb-8">
          <div className="inline-flex items-center gap-2 text-red-600 font-bold text-sm tracking-wide mb-4">
            <ShieldCheck className="w-4 h-4" />
            WHY CHOOSE FIRE GUIDE?
          </div>
          <h2 className="text-[32px] md:text-[48px] font-bold leading-[120%] tracking-[-0.01em] mb-4 text-gray-900">
            Smarter Fire Safety. <span className="text-red-600">Done Properly.</span>
          </h2>
          <p className="text-[16px] md:text-[17px] leading-[150%] text-gray-500 max-w-2xl mx-auto">
            Fire Guide makes fire safety simple, transparent and easy to manage 
            <br/>— so you can stay compliant with confidence.
          
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-6 mb-10 lg:mb-6 md:mb-8 ">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6 text-center"
              >
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">{feature.title}</h3>
                <div
                  className="mx-auto mb-3 w-14 rounded-full bg-red-600"
                  style={{ height: 3 }}
                />
                <p className="text-sm text-gray-500 font-medium leading-[150%]">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Comparison section */}
        <div className="wcfg-comparison mb-10">
          <div className="wcfg-comparison-inner">
            <div className="wcfg-comparison-fireguide">
              <ShieldCheck
                className="wcfg-comparison-watermark wcfg-comparison-watermark--shield"
                strokeWidth={1.25}
                aria-hidden
              />
              <h3 className="wcfg-comparison-heading">With Fire Guide</h3>
              <ul className="wcfg-comparison-list">
                {fireGuidePoints.map((point) => (
                  <li key={point} className="wcfg-comparison-list-item">
                    <span className="wcfg-comparison-check" aria-hidden>
                      <Check className="wcfg-comparison-check-icon" strokeWidth={3} />
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="wcfg-comparison-traditional">
              <TraditionalClipboardWatermark
                className="wcfg-comparison-watermark wcfg-comparison-watermark--clipboard"
                aria-hidden
              />
              <h3 className="wcfg-comparison-heading">Traditional Way</h3>
              <ul className="wcfg-comparison-list">
                {traditionalPoints.map((point) => (
                  <li key={point} className="wcfg-comparison-list-item">
                    <span className="wcfg-comparison-x" aria-hidden>
                      <X className="wcfg-comparison-x-icon" strokeWidth={3} />
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="wcfg-comparison-vs" aria-hidden>
            <span className="wcfg-comparison-vs-text">VS</span>
          </div>
        </div>

        {/* Certifications row */}
        <div className="mt-4 ml-7 flex flex-wrap gap-3 md:justify-start mb-4 text-sm text-gray-500">
          <ShieldCheck className="w-6 h-6 text-red-500" />
          <span>Professionals may hold recognised industry qualifications such as:</span>
        </div>
        <div className="mb-6 bg-white">
          <div className="flex flex-col md:flex-row">
            {certifications.map((cert, index) => (
              <Fragment key={cert.label}>
                {index > 0 && (
                  <>
                    <div className="h-px w-full bg-gray-300 md:hidden" aria-hidden="true" />
                    <div
                      className="hidden md:block shrink-0 bg-gray-300"
                      style={{ width: 1, alignSelf: "stretch" }}
                      aria-hidden="true"
                    />
                  </>
                )}
                <div className="flex flex-1 items-center gap-3 px-5 py-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                    <img
                      src={cert.image}
                      alt={`${cert.label} logo`}
                      className="h-10 w-10 object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{cert.label}</p>
                    <p className="text-xs text-gray-500">{cert.sublabel}</p>
                  </div>
                </div>
              </Fragment>
            ))}
            <div className="h-px w-full bg-gray-300 md:hidden" aria-hidden="true" />
            <div
              className="hidden md:block shrink-0 bg-gray-300"
              style={{ width: 1, alignSelf: "stretch" }}
              aria-hidden="true"
            />
            <div className="flex flex-1 bg-slate-500 items-center gap-2 px-5 py-4 text-xs text-gray-400">
              <Info className="h-4 w-4 flex-shrink-0" />
              <span>Qualifications vary by professional and are shown on their profile.</span>
            </div>
          </div>
        </div>

        {/* Bottom dark feature bar */}
        <div className="bg-gray-900 rounded-2xl p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {bottomFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-600">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">{feature.title}</h4>
                    <p className="text-sm text-gray-400 leading-[150%]">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer note */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mt-8">
          <Lock className="w-3.5 h-3.5" />
          <span>We do not carry out services. We connect you with independent fire safety professionals.</span>
        </div>
      </div>
    </section>
  );
}