import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function WhyChooseFireGuide() {
  const comparisons = [
    {
      feature: "Instant online booking",
      fireGuide: true,
      traditional: false
    },
    {
      feature: "Compare multiple professionals",
      fireGuide: true,
      traditional: false
    },
    {
      feature: "Transparent upfront pricing",
      fireGuide: true,
      traditional: false
    },
    {
      feature: "Verified certification WITH professional with certification",
      fireGuide: true,
      traditional: "sometimes"
    },
    {
      feature: "Customer reviews & ratings",
      fireGuide: true,
      traditional: false
    },
    {
      feature: "Secure online payments",
      fireGuide: true,
      traditional: false
    },

    {
      feature: "Same-day availability",
      fireGuide: true,
      traditional: "sometimes"
    },
    {
      feature: "Digital documentation",
      fireGuide: true,
      traditional: false
    }
  ];

  return (
    <section className="py-24 px-6 bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-[32px] md:text-[48px] font-bold leading-[125%] tracking-[-0.01em] mb-6">
            Why Choose Fire Guide?
          </h2>
          <p className="text-[16px] md:text-[20px] leading-[150%] md:leading-[140%] text-gray-600 max-w-2xl mx-auto px-4">
            See how we compare to traditional fire safety booking methods
          </p>
        </div>

        <Card className="border-2 border-gray-200 shadow-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white">
            <div className="grid grid-cols-3 gap-4 items-center">
              <div></div>
              <div className="text-center">
                <CardTitle className="text-2xl">Fire Guide</CardTitle>
                <p className="text-sm opacity-90 mt-1">Modern & Easy</p>
              </div>
              <div className="text-center">
                <CardTitle className="text-2xl">Traditional</CardTitle>
                <p className="text-sm opacity-90 mt-1">Old Method</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {comparisons.map((item, index) => (
              <div
                key={index}
                className={`grid grid-cols-3 gap-4 items-center py-4 px-6 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                } hover:bg-red-50 transition-colors`}
              >
                <div className="font-medium text-gray-900">{item.feature}</div>
                <div className="flex justify-center">
                  {item.fireGuide === true ? (
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                  ) : item.fireGuide === "sometimes" ? (
                    <div className="text-sm text-yellow-600 font-medium">Sometimes</div>
                  ) : (
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <X className="w-5 h-5 text-red-600" />
                    </div>
                  )}
                </div>
                <div className="flex justify-center">
                  {item.traditional === true ? (
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                  ) : item.traditional === "sometimes" ? (
                    <div className="text-sm text-yellow-600 font-medium">Sometimes</div>
                  ) : (
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <X className="w-5 h-5 text-red-600" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-6 py-3 rounded-full">
            <Check className="w-5 h-5" />
            <span className="font-semibold">Join 10,000+ satisfied customers who switched to Fire Guide</span>
          </div>
        </div>
      </div>
    </section>
  );
}