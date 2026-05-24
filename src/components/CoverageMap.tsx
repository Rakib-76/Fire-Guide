import { Card, CardContent } from "./ui/card";
import { MapPin, CheckCircle, Clock, Phone } from "lucide-react";
import { Button } from "./ui/button";

interface CoverageMapProps {
  onCheckAvailability: () => void;
}

export function CoverageMap({ onCheckAvailability }: CoverageMapProps) {
  const regions = [
    { name: "London", professionals: 127, avgResponse: "< 1 hour", available: true },
    { name: "Manchester", professionals: 84, avgResponse: "< 2 hours", available: true },
    { name: "Birmingham", professionals: 72, avgResponse: "< 2 hours", available: true },
    { name: "Leeds", professionals: 56, avgResponse: "< 3 hours", available: true },
    { name: "Liverpool", professionals: 48, avgResponse: "< 3 hours", available: true },
    { name: "Bristol", professionals: 42, avgResponse: "< 3 hours", available: true },
    { name: "Sheffield", professionals: 38, avgResponse: "< 4 hours", available: true },
    { name: "Newcastle", professionals: 34, avgResponse: "< 4 hours", available: true },
    { name: "Nottingham", professionals: 31, avgResponse: "< 4 hours", available: true },
    { name: "Glasgow", professionals: 45, avgResponse: "< 3 hours", available: true },
    { name: "Edinburgh", professionals: 39, avgResponse: "< 3 hours", available: true },
    { name: "Cardiff", professionals: 28, avgResponse: "< 4 hours", available: true }
  ];

  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-[32px] md:text-[48px] font-bold leading-[125%] tracking-[-0.01em] mb-6">
            Nationwide Coverage
          </h2>
          <p className="text-[16px] md:text-[20px] leading-[150%] md:leading-[140%] text-gray-600 max-w-2xl mx-auto px-4">
            Certified with independent fire safety professionals available in major cities across the UK
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Map Visual */}
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-50 to-red-50 rounded-2xl p-12 relative overflow-hidden">
              {/* Decorative UK Map representation */}
              <div className="relative z-10">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-red-600 rounded-full mb-4">
                    <MapPin className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-3xl mb-2">500+</h3>
                  <p className="text-gray-600">Certified Professionals</p>
                </div>

                {/* Coverage Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 text-center shadow-lg">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-semibold text-gray-900">12</p>
                    <p className="text-sm text-gray-600">Major Cities</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center shadow-lg">
                    <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-semibold text-gray-900">24/7</p>
                    <p className="text-sm text-gray-600">Availability</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center shadow-lg">
                    <MapPin className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-semibold text-gray-900">98%</p>
                    <p className="text-sm text-gray-600">Coverage Rate</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center shadow-lg">
                    <Phone className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-semibold text-gray-900">&lt; 2hr</p>
                    <p className="text-sm text-gray-600">Avg Response</p>
                  </div>
                </div>
              </div>

              {/* Background Dots */}
              <div className="absolute inset-0 opacity-10">
                <div 
                  className="absolute inset-0" 
                  style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, #0A1A2F 1px, transparent 0)`,
                    backgroundSize: '30px 30px'
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Right Side - Region List */}
          <div>
            <h3 className="text-2xl mb-6">
              Available in Your Area
            </h3>
            <p className="text-gray-600 mb-6">
              We have verified professionals ready to help in these locations:
            </p>

            <div className="space-y-3">
              {regions.map((region, index) => (
                <Card key={index} className="border-2 border-gray-200 hover:border-red-600 hover:shadow-lg transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{region.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>{region.professionals} professionals</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {region.avgResponse}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-semibold text-green-600">Available</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8">
              <Button 
                onClick={onCheckAvailability}
                className="w-full bg-red-600 hover:bg-red-700 py-6 text-lg"
              >
                Check Availability in Your Area
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}