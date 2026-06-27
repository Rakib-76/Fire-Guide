import { ShieldCheck, PoundSterling, Clock, Star } from "lucide-react";
import "./TrustIndicators.css";

const TRUST_ITEMS = [
  {
    id: "verified",
    icon: ShieldCheck,
    line1: "Verified",
    line2: "Professionals",
    iconClass: "trust-bar-icon--shield",
  },
  {
    id: "pricing",
    icon: PoundSterling,
    line1: "Transparent",
    line2: "Pricing",
    outlined: true,
    iconClass: "trust-bar-icon--pound",
  },
  {
    id: "booking",
    icon: Clock,
    line1: "Fast & Easy",
    line2: "Booking",
    iconClass: "trust-bar-icon--clock",
  },
  {
    id: "compliance",
    icon: ShieldCheck,
    line1: "Compliant with",
    line2: "UK Regulations",
    iconClass: "trust-bar-icon--shield",
  },
] as const;

export function TrustIndicators() {
  return (
    <section className="trust-bar-section" aria-label="Why customers trust Fire Guide">
      <div className="trust-bar-container">
        <div className="trust-bar">
          <div className="trust-bar-item trust-bar-item--reviews">
            <div className="trust-bar-copy">
              <p className="trust-bar-line">Trusted by 500+</p>
              <p className="trust-bar-line">Businesses across the UK</p>
            </div>
            <div className="trust-bar-rating">
              <div className="trust-bar-stars" aria-label="4.9 out of 5 stars">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="trust-bar-star" fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <p className="trust-bar-rating-text">4.9/5 from 200+ reviews</p>
            </div>
          </div>

          {TRUST_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="trust-bar-item trust-bar-item--feature">
                <div
                  className={`trust-bar-icon-wrap${
                    item.outlined ? " trust-bar-icon-wrap--outlined" : ""
                  }`}
                >
                  <Icon className={`trust-bar-icon ${item.iconClass}`} strokeWidth={2} aria-hidden />
                </div>
                <div className="trust-bar-copy">
                  <p className="trust-bar-line">{item.line1}</p>
                  <p className="trust-bar-line">{item.line2}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
