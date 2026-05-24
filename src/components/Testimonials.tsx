import { Card, CardContent } from "./ui/card";
import { Star, Quote } from "lucide-react";

export function Testimonials() {
  const testimonials = [
    {
      name: "David Thompson",
      role: "Operations Manager",
      company: "TechHub London",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
      text: "Fire Guide made it incredibly easy to find a qualified fire risk assessor. The whole process from booking to receiving the report was seamless. Highly recommended!",
      rating: 5
    },
    {
      name: "Sarah Williams",
      role: "Property Manager",
      company: "Urban Estates",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
      text: "We've used Fire Guide for multiple properties. The platform is user-friendly, and the professionals are all top-notch. Saves us so much time!",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Restaurant Owner",
      company: "The Jade Kitchen",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
      text: "Getting our fire safety compliance sorted was always a hassle until we found Fire Guide. Quick, professional, and transparent pricing. Couldn't ask for more.",
      rating: 5
    }
  ];

  return (
    <section className="py-24 px-4 md:px-6 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-[32px] md:text-[48px] font-bold leading-[125%] tracking-[-0.01em] mb-6">
            What Our Customers Say
          </h2>
          <p className="text-[16px] md:text-[20px] leading-[150%] md:leading-[140%] text-gray-600 max-w-2xl mx-auto px-4">
            Don't just take our word for it - hear from businesses who trust Fire Guide
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="relative border-2 hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <Quote className="w-10 h-10 text-red-200 mb-4" />
                
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Testimonial Text */}
                <p className="text-gray-700 mb-6 italic">"{testimonial.text}"</p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                    <p className="text-sm text-gray-500">{testimonial.company}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}