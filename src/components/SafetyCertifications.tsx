import { Shield, CheckCircle, Award, FileCheck, Lock, Users } from "lucide-react";
import { Card, CardContent } from "./ui/card";

export function SafetyCertifications() {
  const certifications = [
    {
      icon: Shield,
      title: "BAFE Approved",
      description: "British Approvals for Fire Equipment certification"
    },
    {
      icon: Award,
      title: "NEBOSH Certified",
      description: "National Examination Board in Occupational Safety"
    },
    {
      icon: FileCheck,
      title: "FIA Accredited",
      description: "Fire Industry Association membership"
    },
    {
      icon: CheckCircle,
      title: "ISO 9001 Compliant",
      description: "Quality management system certified"
    }
  ];

  return (
    <section className="py-24 px-6 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto">
        {/* Certifications */}
        <div className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-[32px] md:text-[48px] font-bold leading-[125%] tracking-[-0.01em] mb-6 max-w-4xl mx-auto">
              Industry Certified Professionals
            </h2>
            <p className="text-[16px] md:text-[20px] leading-[150%] md:leading-[140%] text-gray-600 max-w-2xl mx-auto px-4">
              All our professionals hold relevant certifications and industry accreditations
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {certifications.map((cert, index) => (
              <Card key={index} className="border-2 border-gray-200 hover:border-red-600 hover:shadow-xl transition-all text-center">
                <CardContent className="p-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-4">
                    <cert.icon className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg mb-2">{cert.title}</h3>
                  <p className="text-gray-600 text-sm">{cert.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}