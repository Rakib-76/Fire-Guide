import { Check } from "lucide-react";
import "./WhatWeDo.css";

const ASSESSMENT_ITEMS = [
  "Identify fire hazards and sources of ignition",
  "Assess people at risk and means of escape",
  "Evaluate fire safety measures in place",
  "Provide a detailed report and action plan",
];

export function WhatWeDo() {
  return (
    <section className="what-we-do-section" aria-labelledby="what-we-do-title">
      <div className="what-we-do-container">
        <div className="what-we-do-layout">
          <div className="what-we-do-content">
            <p className="what-we-do-eyebrow">WHAT WE DO</p>
            <h2 id="what-we-do-title" className="what-we-do-title">
              Your Safety. Our Priority.
            </h2>
            <p className="what-we-do-description">
              We connect you with trusted fire safety professionals who help protect your people,
              property and business.
            </p>
          </div>

          <div className="what-we-do-card">
            <h3 className="what-we-do-card-title">
              What&apos;s included in a Fire Risk Assessment?
            </h3>
            <ul className="what-we-do-list">
              {ASSESSMENT_ITEMS.map((item) => (
                <li key={item} className="what-we-do-list-item">
                  <span className="what-we-do-check" aria-hidden>
                    <Check className="what-we-do-check-icon" strokeWidth={3} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
