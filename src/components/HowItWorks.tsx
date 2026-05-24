import { ClipboardList, Users, CheckCircle } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      icon: ClipboardList,
      title: "Answer a few questions",
      description: "Tell us about your fire safety needs and location",
      color: "red"
    },
    {
      icon: Users,
      title: "Compare professionals",
      description: "Review qualified professionals and their ratings",
      color: "orange"
    },
    {
      icon: CheckCircle,
      title: "Book & pay instantly",
      description: "Schedule your service and pay securely online",
      color: "green"
    }
  ];

  const colorClasses = {
    red: {
      bg: "bg-red-100",
      text: "text-red-600",
      ring: "ring-red-100",
      line: "bg-red-400"
    },
    orange: {
      bg: "bg-orange-100",
      text: "text-orange-600",
      ring: "ring-orange-100",
      line: "bg-orange-400"
    },
    green: {
      bg: "bg-green-100",
      text: "text-green-600",
      ring: "ring-green-100",
      line: "bg-green-400"
    }
  };

  return (
    <section id="how-it-works" className="py-24 px-6 bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-[32px] md:text-[48px] font-[800] leading-[120%] tracking-[-0.01em] mt-3 mb-2">
            How It Works
          </h2>
          <p className="text-[14px] md:text-[16px] leading-[140%] text-[#666] max-w-2xl mx-auto">
            Get your fire safety sorted in three simple steps
          </p>
        </div>
        
        <div className="relative">
          {/* Connecting Line */}
          <div className="hidden md:block absolute top-[52px] left-[25%] right-[25%] h-0.5 bg-gradient-to-r from-red-400 via-orange-400 to-green-400 opacity-30"></div>

          {/* Steps Grid */}
          <div className="relative grid md:grid-cols-3 gap-12">
            {steps.map((step, index) => {
              const colors = colorClasses[step.color as keyof typeof colorClasses];
              return (
                <div key={index} className="relative">
                  <div className="text-center">
                    {/* Step Number Badge */}
                    <div className="flex justify-center mb-2">
                      <div className={`w-7 h-7 ${colors.bg} ${colors.text} rounded-full flex items-center justify-center font-semibold text-sm border-2 border-white shadow-lg z-20`}>
                        {index + 1}
                      </div>
                    </div>

                    {/* Icon Circle */}
                    <div className="flex justify-center mb-6">
                      <div className={`w-20 h-20 ${colors.bg} ${colors.text} rounded-full flex items-center justify-center border-4 border-white shadow-xl ring-4 ${colors.ring} ring-opacity-30 relative z-10`}>
                        <step.icon className="w-9 h-9" />
                      </div>
                    </div>

                    {/* Divider Line */}
                    <div className="flex justify-center mb-6">
                      <div className={`w-16 h-0.5 ${colors.line} opacity-40`}></div>
                    </div>

                    {/* Content */}
                    <h3 className="mb-3 text-xl font-semibold">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}