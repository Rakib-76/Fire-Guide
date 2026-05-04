import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { HelpCircle } from "lucide-react";
import { Button } from "./ui/button";

interface FAQProps {
  onContactSupport: () => void;
}

export function FAQ({ onContactSupport }: FAQProps) {
  const faqs = [
    {
      question: "How do I book a fire safety service?",
      answer: "Booking is simple! Click 'Get Started', answer a few questions about your property and needs, browse through qualified professionals in your area, select your preferred date and time, and complete the secure payment. You'll receive instant confirmation."
    },
    {
      question: "Are all professionals verified and certified?",
      answer: "Yes, absolutely. Every professional on Fire Guide is thoroughly vetted. We verify their certifications (BAFE, FIA, NEBOSH), conduct DBS background checks, verify their insurance (minimum £5M public liability), and review their qualifications and experience. Only certified professionals can join our platform."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit and debit cards (Visa, Mastercard, American Express), as well as digital wallets like Apple Pay and Google Pay. All payments are processed securely through our PCI DSS compliant payment system with bank-level encryption."
    },
    {
      question: "Can I reschedule or cancel my booking?",
      answer: "Yes, you can reschedule or cancel your booking through your customer dashboard. Free cancellation is available up to 24 hours before the scheduled service. If you cancel within 24 hours, a small cancellation fee may apply. You can reschedule at no extra cost."
    },
    {
      question: "How long does a fire risk assessment take?",
      answer: "The duration depends on your property size and complexity. A typical small office or retail space takes 1-2 hours. Medium-sized properties (1000-5000 sq ft) usually take 2-4 hours. Larger commercial properties may require 4-8 hours. The professional will provide a detailed report within 48 hours of the assessment."
    },
    {
      question: "Do you offer emergency services?",
      answer: "Yes, we offer emergency fire safety services for urgent situations. Many of our professionals provide same-day or next-day emergency appointments. When booking, select 'Emergency Service' and you'll see professionals available for immediate response. Emergency services may have premium pricing."
    },
    {
      question: "What areas do you cover?",
      answer: "We currently cover all major cities across the UK including London, Manchester, Birmingham, Leeds, Liverpool, Bristol, Sheffield, Newcastle, Nottingham, Glasgow, Edinburgh, and Cardiff. We're constantly expanding to new areas. Enter your postcode to check availability in your location."
    },
    {
      question: "Will I receive a certificate after the service?",
      answer: "Yes, you'll receive official certification and documentation after the service is completed. For fire risk assessments, you'll get a comprehensive report with findings, recommendations, and a compliance certificate. For equipment services (alarms, extinguishers), you'll receive maintenance certificates valid for the regulatory period."
    },
    {
      question: "What happens if I'm not satisfied with the service?",
      answer: "We offer a 100% satisfaction guarantee. If you're not happy with the service, contact our support team within 48 hours. We'll either arrange for the professional to return and address your concerns at no extra cost, or provide a full refund. Customer satisfaction is our top priority."
    },
    {
      question: "How much do fire safety services cost?",
      answer: "Pricing varies based on service type, property size, and location. Fire risk assessments typically start from £150, fire alarm services from £120, and extinguisher services from £80. Use our instant price calculator above to get an estimate for your specific needs. All quotes include no hidden fees."
    },
    {
      question: "Do I need to be present during the service?",
      answer: "For most services, yes, someone needs to be present to provide access and discuss findings. However, if you're unable to be there, you can designate another person (property manager, colleague, etc.) to be present on your behalf. The professional will need access to all areas being assessed."
    },
    {
      question: "How often should I get a fire risk assessment?",
      answer: "It depends on your property type and use. Generally, commercial premises should have fire risk assessments reviewed annually or whenever there are significant changes (renovations, change of use, new equipment). High-risk premises like hotels, care homes, and nightclubs may require more frequent assessments. Your professional will advise on the recommended schedule."
    }
  ];

  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
            <HelpCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-[32px] md:text-[48px] font-bold leading-[125%] tracking-[-0.01em] mb-6 max-w-4xl mx-auto">
            Frequently Asked Questions
          </h2>
          <p className="text-[16px] md:text-[20px] leading-[150%] md:leading-[140%] text-gray-600 max-w-2xl mx-auto px-4">
            Everything you need to know about Fire Guide and our services
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border-2 border-gray-200 rounded-lg px-6 hover:border-red-600 transition-colors"
            >
              <AccordionTrigger className="text-left hover:text-red-600 py-6">
                <span className="font-semibold">{faq.question}</span>
              </AccordionTrigger>
              <AccordionContent className="text-gray-700 pb-6">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 text-center bg-gradient-to-br from-blue-50 to-red-50 rounded-2xl p-8">
          <h3 className="text-2xl mb-4">
            Still have questions?
          </h3>
          <p className="text-gray-600 mb-6">
            Our support team is here to help. Get in touch and we'll respond within 24 hours.
          </p>
          <Button
            type="button"
            onClick={onContactSupport}
            className="bg-red-600 hover:bg-red-700 px-8 py-6 text-lg"
          >
            Contact Support
          </Button>
        </div>
      </div>
    </section>
  );
}