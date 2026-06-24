import { Fragment } from "react";
import {
  ArrowRight,
  ClipboardList,
  Clock,
  Lock,
  PoundSterling,
  Scale,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";

interface HowItWorksProps {
  onGetStarted?: () => void;
}

export function HowItWorks({ onGetStarted }: HowItWorksProps) {
  const steps = [
    {
      number: 1,
      icon: ClipboardList,
      title: "Tell us what you need",
      description:
        "Answer a few quick questions about your property and fire safety requirements.",
      badgeIcon: Clock,
      badgeText: "Takes 1-2 minutes",
      numberBg: "bg-red-600",
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
      badgeBg: "bg-red-50",
      badgeColor: "text-red-600",
    },
    {
      number: 2,
      icon: Users,
      title: "Compare & choose",
      description:
        "We show you trusted, qualified professionals with clear prices, ratings and availability.",
      badgeIcon: Scale,
      badgeText: "Compare with confidence",
      numberBg: "bg-orange-500",
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500",
      badgeBg: "bg-orange-50",
      badgeColor: "text-orange-600",
    },
    {
      number: 3,
      icon: ShieldCheck,
      title: "Book & pay securely",
      description: "Book your service in seconds and pay safely online. It's that easy.",
      badgeIcon: Lock,
      badgeText: "Secure & hassle-free",
      numberBg: "bg-green-600",
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      badgeBg: "bg-green-50",
      badgeColor: "text-green-600",
    },
  ];

  const trustItems = [
    { icon: Clock, title: "Quick", subtitle: "Get a quote in minutes" },
    { icon: PoundSterling, title: "Transparent", subtitle: "No hidden fees" },
    { icon: Shield, title: "Trusted", subtitle: "Verified professionals" },
    { icon: Lock, title: "Secure", subtitle: "Safe payments" },
  ];

  return (
    <section
      id="how-it-works"
      className="py-20 md:py-24 px-6"
      style={{ backgroundColor: "#FEFEFF" }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Eyebrow */}
        <div className="flex justify-center mb-3">
          <span className="inline-flex items-center gap-2 text-[16px] md:text-[13px] font-bold text-red-600 tracking-[0.08em] uppercase">
            <Shield className="w-3.5 h-3.5" strokeWidth={2.25} />
            How Fire Guide Works
          </span>
        </div>

        {/* Heading */}
        <div className="text-center -mt-0.5">
          <h2 className="text-[32px] md:text-[48px] font-bold leading-none tracking-[-0.02em] text-[#0A1A2F]">
            Fire safety made simple.
          </h2>
          <h2 className="text-[32px] md:text-[48px] font-bold leading-none tracking-[-0.02em] text-red-600 -mt-3 md:-mt-4">
            Done in 3 easy steps.
          </h2>
        </div>
        <p className="text-center text-[15px] md:text-[16px] font-medium text-gray-500 mt-2 mb-3 max-w-lg mx-auto leading-snug">
          From quote to booking in minutes.<br/>Fast, transparent and hassle-free.
        </p>

        {/* Steps */}
        <div className="flex flex-col gap-6 md:grid md:grid-cols-3 md:gap-6 mb-8">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative w-full min-w-0 bg-white rounded-2xl border border-gray-100 shadow-xl px-6 pt-6 pb-6 h-full flex flex-col"
            >
              <span
                className={`${step.numberBg} text-white w-7 h-7 rounded-full absolute top-6 left-6 flex items-center justify-center text-[13px] font-bold z-10`}
              >
                {step.number}
              </span>

              <div className="flex justify-center pt-8 pb-5">
                <div
                  className={`w-20 h-20 ${step.iconBg} ${step.iconColor} rounded-full flex items-center justify-center`}
                >
                  <step.icon className="w-9 h-9" strokeWidth={1.75} />
                </div>
              </div>

              <h3 className="text-center text-[18px] font-bold text-[#0A1A2F] mb-2.5 px-1">
                {step.title}
              </h3>
              <p className="text-center text-[14px] text-gray-500 font-medium leading-relaxed mb-8 flex-1 px-1">
                {step.description}
              </p>

              <div className="flex justify-center mt-auto">
                <span
                  className={`inline-flex items-center gap-1.5 ${step.badgeBg} ${step.badgeColor} text-[12px] font-medium p-2 rounded-full`}
                >
                  <step.badgeIcon className="w-3.5 h-3.5" strokeWidth={2} />
                  {step.badgeText}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA bar */}
        <div className="bg-white rounded-2xl border border-gray-100 px-5 md:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 mb-6 shadow-xl">
          <div className="flex items-start md:items-center gap-2.5 text-[14px] md:text-[15px] text-gray-700 font-medium text-center md:text-left ">
            <ShieldCheck className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5 md:mt-0" />
            <span>
              Get started now and find the right professional for your fire safety needs.
            </span>
          </div>
          <button
            type="button"
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-[rgb(230,51,6)] hover:bg-[#c42d05] transition-colors text-white text-[14px] font-bold px-6 py-3 rounded-lg whitespace-nowrap shadow-sm"
          >
            Get Your Instant Quote
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Trust strip */}
        <div className="flex flex-col lg:flex-row">
          {trustItems.map((item, index) => (
            <Fragment key={item.title}>
              {index > 0 && (
                <>
                  <div
                    className="h-px w-full lg:hidden"
                    style={{ backgroundColor: "#cbd5e1" }}
                    aria-hidden="true"
                  />
                  <div
                    className="hidden lg:block shrink-0"
                    style={{
                      width: 1,
                      alignSelf: "stretch",
                      backgroundColor: "#cbd5e1",
                      marginLeft: -24,
                      marginRight: 24,
                    }}
                    aria-hidden="true"
                  />
                </>
              )}
              <div className="flex flex-1 items-center gap-3 px-0 py-3 lg:px-6 lg:py-0">
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-[#0A1A2F]">{item.title}</div>
                  <div className="text-[13px] text-gray-500">{item.subtitle}</div>
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
