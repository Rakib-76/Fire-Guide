import { Button } from "./ui/button";
import { Users, TrendingUp, Shield, Calendar, CreditCard, Star, ArrowRight, Zap } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import teamImage from "figma:asset/08939bb03be0325201050404a721d42e221a3890.png";
import professionalTeam from "figma:asset/f6909d09c2ecb5bb1fb962235437cb1413afb6bc.png";
import verifiedTeam from "figma:asset/7e7dc8c5af40c3b71729d1882716219bc6009ebf.png";

interface ProfessionalCTAProps {
  onJoinNow: () => void;
}

export function ProfessionalCTA({ onJoinNow }: ProfessionalCTAProps) {
  const benefits = [
    {
      icon: Users,
      title: "Access Thousands of Customers",
      description: "Connect with customers actively searching for fire safety services"
    },
    {
      icon: Calendar,
      title: "Flexible Scheduling",
      description: "Control your availability and manage bookings on your terms"
    },
    {
      icon: CreditCard,
      title: "Secure & Fast Payments",
      description: "Get paid quickly with simple and transparent commission charges"
    },
    {
      icon: Star,
      title: "Customer-led ratings & feedback",
      description: "Showcase verified reviews and grow your business"
    }
  ];

  return (
    <section id="professionals" className="py-20 px-6 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-100 rounded-full blur-3xl opacity-20"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-20"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-2 rounded-full mb-6">
            <Shield className="w-5 h-5" />
            <span className="font-medium text-[14px]">For Fire Safety Professionals</span>
          </div>
          <h2 className="mb-6 text-[28px] md:text-5xl font-bold leading-[120%] tracking-[-0.01em] pt-4 pb-3 px-4">
            Grow Your Fire Safety Business
          </h2>
          <p className="text-base md:text-lg lg:text-xl max-w-3xl mx-auto leading-relaxed text-[#666]">
            Join Fire Guide and connect with thousands of customers who need your expertise. No setup fees.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Left Column - Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl h-[240px] md:h-[530px]">
              <ImageWithFallback
                src={verifiedTeam}
                alt="Fire Safety Professional"
                className="w-full h-full object-cover"
                style={{
                  objectPosition: 'center center'
                }}
              />
            </div>
          </div>

          {/* Right Column - Benefits */}
          <div className="space-y-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-xl hover:border-red-200 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button
            onClick={onJoinNow}
            className="bg-red-600 hover:bg-red-700 text-lg group text-[16px] !px-[35px] !py-[25px] font-bold"
          >
            Join Fire Guide Today
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            Free to join
          </p>
        </div>
      </div>
    </section>
  );
}