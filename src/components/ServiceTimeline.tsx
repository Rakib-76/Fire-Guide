import { CheckCircle, Calendar, UserCheck, Wrench, FileText, Star } from "lucide-react";

export function ServiceTimeline() {
  const steps = [
    {
      icon: Calendar,
      title: "Book Your Service",
      description: "Select your service, compare professionals, choose your date & time",
      time: "Day 1",
      color: "blue"
    },
    {
      icon: UserCheck,
      title: "Professional Assigned",
      description: "Receive instant confirmation with professional details and contact info",
      time: "Within 1 hour",
      color: "purple"
    },
    {
      icon: Wrench,
      title: "Service Completed",
      description: "Professional arrives on time, completes thorough inspection or service",
      time: "Scheduled date",
      color: "orange"
    },
    {
      icon: FileText,
      title: "Receive Documentation",
      description: "Get detailed report, certificates, and recommendations via email & dashboard",
      time: "Within 48 hours",
      color: "green"
    },
    {
      icon: Star,
      title: "Review & Rate",
      description: "Share your experience to help other customers make informed decisions",
      time: "Anytime",
      color: "red"
    }
  ];

  const colorClasses = {
    blue: {
      bg: "bg-blue-100",
      text: "text-blue-600",
      border: "border-blue-600",
      line: "bg-blue-300"
    },
    purple: {
      bg: "bg-purple-100",
      text: "text-purple-600",
      border: "border-purple-600",
      line: "bg-purple-300"
    },
    orange: {
      bg: "bg-orange-100",
      text: "text-orange-600",
      border: "border-orange-600",
      line: "bg-orange-300"
    },
    green: {
      bg: "bg-green-100",
      text: "text-green-600",
      border: "border-green-600",
      line: "bg-green-300"
    },
    red: {
      bg: "bg-red-100",
      text: "text-red-600",
      border: "border-red-600",
      line: "bg-red-300"
    }
  };

  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-[32px] md:text-[48px] font-bold leading-[120%] tracking-[-0.01em] mb-6">
            Your Service Journey
          </h2>
          <p className="text-[16px] md:text-[20px] leading-[150%] md:leading-[140%] text-gray-600 max-w-2xl mx-auto px-4">
            From booking to completion - here's exactly what happens at each step
          </p>
        </div>

        {/* Desktop Timeline */}
        <div className="hidden lg:block">
          <div className="relative">
            {/* Connecting Line */}
            <div className="absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 via-purple-400 via-orange-400 via-green-400 to-red-400 opacity-30"></div>

            {/* Steps */}
            <div className="relative grid grid-cols-5 gap-6">
              {steps.map((step, index) => {
                const colors = colorClasses[step.color as keyof typeof colorClasses];
                return (
                  <div key={index} className="relative">
                    {/* Time Badge */}
                    <div className="text-center mb-6">
                      <span className={`inline-block ${colors.bg} ${colors.text} px-4 py-2 rounded-full text-sm font-medium shadow-md`}>
                        {step.time}
                      </span>
                    </div>

                    {/* Step Number */}
                    <div className="flex justify-center mb-2">
                      <div className={`w-7 h-7 ${colors.bg} ${colors.text} rounded-full flex items-center justify-center font-semibold text-sm z-20 border-2 border-white shadow-lg`}>
                        {index + 1}
                      </div>
                    </div>

                    {/* Icon Circle */}
                    <div className="flex justify-center mb-8 relative z-10">
                      <div className={`w-20 h-20 ${colors.bg} ${colors.text} rounded-full flex items-center justify-center border-4 border-white shadow-xl ring-4 ${colors.bg} ring-opacity-20`}>
                        <step.icon className="w-9 h-9" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-3">{step.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile Timeline */}
        <div className="lg:hidden space-y-8">
          {steps.map((step, index) => {
            const colors = colorClasses[step.color as keyof typeof colorClasses];
            return (
              <div key={index} className="relative flex gap-6">
                {/* Left Side - Icon & Line */}
                <div className="flex flex-col items-center">
                  <div className={`w-16 h-16 ${colors.bg} ${colors.text} rounded-full flex items-center justify-center relative z-10 border-4 border-white shadow-xl ring-4 ${colors.bg} ring-opacity-20`}>
                    <step.icon className="w-8 h-8" />
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-0.5 flex-1 mt-4 ${colors.line} opacity-30`}></div>
                  )}
                </div>

                {/* Right Side - Content */}
                <div className="flex-1 pb-8">
                  <div className="mb-3">
                    <span className={`inline-block ${colors.bg} ${colors.text} px-4 py-2 rounded-full text-sm font-medium shadow-md`}>
                      {step.time}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </div>

                {/* Step Number */}
                <div className={`absolute left-6 top-14 w-7 h-7 ${colors.bg} ${colors.text} rounded-full flex items-center justify-center font-semibold text-xs z-20 border-2 border-white shadow-lg`}>
                  {index + 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}