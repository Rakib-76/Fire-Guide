import { Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import {
  ArrowRight,
  Calendar,
  Check,
  Flame,
  Headphones,
  PoundSterling,
  Shield,
  Star,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import professionalImage from "../assets/professional-cta.png";
import { professionalBenefitsJoinTo } from "../lib/professionalBenefitsNavigation";
import "./ProfessionalCTA.css";

interface ProfessionalCTAProps {
  onJoinNow?: () => void;
}

function LightIconCircle({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="procta-icon-light">
      <Icon className="w-5 h-5 text-red-600" strokeWidth={2} />
    </span>
  );
}

function StatIconCircle({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="procta-icon-stat">
      <Icon className="w-[18px] h-[18px] text-white" strokeWidth={2} />
    </span>
  );
}

function CtaFeatureIconCircle({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="procta-icon-light procta-feature-icon">
      <Icon className="w-4 h-4 text-red-600" strokeWidth={2} />
    </span>
  );
}

export function ProfessionalCTA({ onJoinNow }: ProfessionalCTAProps) {
  const navigate = useNavigate();

  const handleJoinNow = () => {
    if (onJoinNow) {
      onJoinNow();
      return;
    }
    navigate(professionalBenefitsJoinTo());
  };

  const benefits = [
    {
      icon: Users,
      title: "Get More Quality Jobs",
      description: "Connect with local customers actively looking for fire safety services.",
    },
    {
      icon: Calendar,
      title: "Control Your Schedule",
      description: "Choose when and where you work. You're in control.",
    },
    {
      icon: PoundSterling,
      title: "Lower Costs, Higher Earnings",
      description: "No subscription fees. Pay a low, transparent commission only when you get paid.",
    },
    {
      icon: Star,
      title: "Build Trust & Get Reviews",
      description: "Showcase your work, earn verified reviews and stand out from the competition.",
    },
    {
      icon: TrendingUp,
      title: "Grow Your Business",
      description: "More visibility, more bookings, more growth. We help you scale your business.",
    },
  ];

  const stats = [
    { icon: Users, value: "10K+", label: "Active customers searching every month" },
    { icon: Calendar, value: "500+", label: "Jobs posted weekly across the UK" },
    { icon: PoundSterling, value: "No Setup Fees", label: "No monthly fees. Pay only when you earn" },
    { icon: Star, value: "4.8/5", label: "Average pro rating by our customers" },
    { icon: TrendingUp, value: "Fast Payments", label: "Get paid quickly and securely" },
  ];

  const ctaFeatures = [
    { icon: Flame, title: "Free to Join", description: "No setup or monthly fees" },
    { icon: UserCheck, title: "Verified Customers", description: "High-intent customers ready to book" },
    { icon: Headphones, title: "Dedicated Support", description: "We're here to help you grow" },
  ];

  const trustItems = [
    "Trusted by Professionals Across the UK",
    "Transparent Commission",
    "Secure Payments",
    "We Grow When You Grow",
  ];

  return (
    <section id="professionals" className="procta-section">
      <div className="max-w-7xl mx-auto">
        {/* TOP — 2 columns */}
        <div className="procta-top">
          <div className="procta-top-left">
            <div className="inline-flex items-center gap-2 mb-5">
              <Shield className="w-4 h-4 text-red-600" strokeWidth={2.25} />
              <span className="procta-eyebrow">For Fire Safety Professionals</span>
            </div>

            <h2 className="procta-heading">
              <span className="text-gray-900">More Jobs. Less Hassle.</span>
              <br />
              <span className="text-red-600">Grow Your Fire Safety Business.</span>
            </h2>

            <p className="procta-intro">{`Join Fire Guide and get matched with high-intent customers in your area. No setup fees. No monthly fees. Just work that works for you.`}</p>

            <ul className="procta-benefits">
              {benefits.map((benefit) => (
                <li key={benefit.title} className="procta-benefit-row">
                  <LightIconCircle icon={benefit.icon} />
                  <div>
                    <h3 className="procta-benefit-title">{benefit.title}</h3>
                    <p className="procta-benefit-desc">{benefit.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="procta-top-right">
            <div className="procta-visual">
              <div className="procta-visual-grid">
                <div className="procta-photo-col">
                  <div className="procta-photo-wrap">
                    <img
                      src={professionalImage}
                      alt="Fire safety professional"
                      className="procta-photo"
                    />
                  </div>
                </div>
                <div className="procta-stats-card">
                  <h3 className="procta-stats-title">
                    Why Professionals Choose <span className="text-red-500">Fire Guide</span>
                  </h3>
                  <ul className="procta-stats-list">
                    {stats.map((stat, index) => (
                      <li
                        key={stat.value}
                        className={`procta-stat-row${index < stats.length - 1 ? " procta-stat-row--border" : ""}`}
                      >
                        <StatIconCircle icon={stat.icon} />
                        <div>
                          <p className="procta-stat-value">{stat.value}</p>
                          <p className="procta-stat-label">{stat.label}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM — full-width CTA card (always visible) */}
        <div className="procta-bottom-card">
          <div className="procta-bottom-row">
            <div className="procta-bottom-message">
              <div className="flex items-start gap-3 mb-4">
                <span className="procta-icon-light">
                  <Shield className="w-5 h-5 text-red-600" strokeWidth={2} />
                </span>
                <div>
                  <p className="procta-bottom-title">
                    Join thousands of fire safety professionals already growing with Fire Guide.
                  </p>
                  <p className="procta-bottom-sub">It&apos;s free to join and always will be.</p>
                </div>
              </div>
              <p className="procta-signature" style={{ fontSize: '14px', marginLeft: '45px' }}>Your expertise. More opportunities.</p>
            </div>

            <div className="procta-bottom-features">
              {ctaFeatures.map((feature, index) => (
                <Fragment key={feature.title}>
                  {index > 0 && <div className="procta-vdivider" aria-hidden />}
                  <div className="procta-feature-col">
                    <div className="procta-feature-row">
                      <CtaFeatureIconCircle icon={feature.icon} />
                      <div className="procta-feature-text">
                        <p className="procta-feature-title">{feature.title}</p>
                        <p className="procta-feature-desc">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                </Fragment>
              ))}
            </div>

            <div className="procta-bottom-action">
              <Button
                type="button"
                onClick={handleJoinNow}
                className="bg-red-600 hover:bg-red-700 text-white text-[15px] font-bold px-8 py-[22px] rounded-xl group shadow-md whitespace-nowrap w-full sm:w-auto"
              >
                Join Fire Guide Today
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <p className="procta-bottom-hint">Get started in minutes</p>
            </div>
          </div>
        </div>

        {/* TRUST FOOTER */}
        <div className="procta-trust">
          {trustItems.map((item, index) => (
            <Fragment key={item}>
              {index > 0 && <div className="procta-trust-divider" aria-hidden />}
              <div className="procta-trust-item">
                <span className="procta-trust-check">
                  <Check className="w-3 h-3 text-green-600" strokeWidth={3} />
                </span>
                <span className="procta-trust-text">{item}</span>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
