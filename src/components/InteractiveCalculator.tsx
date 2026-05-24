import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Calculator, ArrowRight, Building2, Users, MapPin } from "lucide-react";

interface InteractiveCalculatorProps {
  onGetQuote: () => void;
}

export function InteractiveCalculator({ onGetQuote }: InteractiveCalculatorProps) {
  const [propertySize, setPropertySize] = useState<string>("small");
  const [serviceType, setServiceType] = useState<string>("assessment");
  const [occupancy, setOccupancy] = useState<string>("1-10");

  const calculateEstimate = () => {
    const baseRates: { [key: string]: number } = {
      assessment: 150,
      alarm: 120,
      extinguisher: 80,
      door: 95,
      training: 250
    };

    const sizeMultipliers: { [key: string]: number } = {
      small: 1,
      medium: 1.5,
      large: 2,
      xlarge: 3
    };

    const occupancyMultipliers: { [key: string]: number } = {
      "1-10": 1,
      "11-50": 1.2,
      "51-100": 1.4,
      "100+": 1.6
    };

    const base = baseRates[serviceType] || 150;
    const sizeMultiplier = sizeMultipliers[propertySize] || 1;
    const occupancyMultiplier = occupancyMultipliers[occupancy] || 1;

    return Math.round(base * sizeMultiplier * occupancyMultiplier);
  };

  const estimate = calculateEstimate();

  return (
    <section id="instant-price-calculator" className="py-24 px-6 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-8">
            <Calculator className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-[32px] md:text-[48px] font-bold leading-[125%] tracking-[-0.01em] mb-6">
            Instant Price Calculator
          </h2>
          <p className="text-[16px] md:text-[20px] leading-[150%] md:leading-[140%] text-gray-600 max-w-2xl mx-auto px-4">
            Get an estimated cost for your fire safety service in seconds
          </p>
        </div>

        <Card className="border-2 border-gray-200 shadow-xl">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-2 gap-12">
              {/* Left Side - Inputs */}
              <div className="space-y-8">
                {/* Service Type */}
                <div>
                  <label className="flex items-center gap-2 mb-4 font-semibold text-gray-900">
                    <Building2 className="w-5 h-5 text-red-600" />
                    Service Type
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "assessment", label: "Fire Risk Assessment" },
                      { value: "alarm", label: "Fire Alarm Service" },
                      { value: "extinguisher", label: "Fire Extinguisher Service" },
                      { value: "door", label: "Fire Door Inspection" },
                      { value: "training", label: "Fire Marshal Training" }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setServiceType(option.value)}
                        className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                          serviceType === option.value
                            ? 'border-red-600 bg-red-50 text-red-900'
                            : 'border-gray-200 hover:border-red-200 bg-white'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Property Size */}
                <div>
                  <label className="flex items-center gap-2 mb-4 font-semibold text-gray-900">
                    <MapPin className="w-5 h-5 text-red-600" />
                    Property Size
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "small", label: "Small (< 1000 sq ft)" },
                      { value: "medium", label: "Medium (1000-5000 sq ft)" },
                      { value: "large", label: "Large (5000-10000 sq ft)" },
                      { value: "xlarge", label: "Very Large (> 10000 sq ft)" }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setPropertySize(option.value)}
                        className={`px-4 py-3 rounded-lg border-2 transition-all text-sm ${
                          propertySize === option.value
                            ? 'border-red-600 bg-red-50 text-red-900'
                            : 'border-gray-200 hover:border-red-200 bg-white'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Occupancy */}
                <div>
                  <label className="flex items-center gap-2 mb-4 font-semibold text-gray-900">
                    <Users className="w-5 h-5 text-red-600" />
                    Typical Occupancy
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "1-10", label: "1-10 people" },
                      { value: "11-50", label: "11-50 people" },
                      { value: "51-100", label: "51-100 people" },
                      { value: "100+", label: "100+ people" }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setOccupancy(option.value)}
                        className={`px-4 py-3 rounded-lg border-2 transition-all text-sm ${
                          occupancy === option.value
                            ? 'border-red-600 bg-red-50 text-red-900'
                            : 'border-gray-200 hover:border-red-200 bg-white'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side - Estimate */}
              <div className="flex flex-col justify-center">
                <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-8 text-white text-center">
                  <p className="text-lg mb-2 opacity-90">Estimated Cost</p>
                  <p className="text-6xl font-semibold mb-2">£{estimate}</p>
                  <p className="text-sm opacity-90 mb-6">Starting from this price</p>
                  
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-6 text-left">
                    <p className="text-sm mb-3 opacity-90">Your estimate includes:</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        Professional service visit
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        Detailed inspection report
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        Compliance certification
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        Expert recommendations
                      </li>
                    </ul>
                  </div>

                  <Button 
                    onClick={onGetQuote}
                    className="w-full bg-white text-red-600 hover:bg-gray-100 py-6 text-lg"
                  >
                    Get Accurate Quote <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>

                <p className="text-center text-sm text-gray-600 mt-4">
                  * Final price may vary based on specific requirements and location
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}