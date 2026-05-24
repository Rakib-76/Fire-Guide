import React, { useEffect, useState } from "react";
import { Star, CheckCircle } from "lucide-react";

export function RecentActivityTicker() {
  const activities = [
    { type: "review", customer: "Sarah M.", professional: "James Mitchell", rating: 5, service: "Fire Risk Assessment", time: "2 min ago" },
    { type: "completed", customer: "John D.", professional: "Emma Richardson", service: "Fire Alarm Service", time: "5 min ago" },
    { type: "review", customer: "Lisa P.", professional: "Robert Davies", rating: 5, service: "Fire Extinguisher Service", time: "8 min ago" },
    { type: "completed", customer: "Michael R.", professional: "Sophie Anderson", service: "Fire Marshal Training", time: "12 min ago" },
    { type: "review", customer: "David K.", professional: "James Mitchell", rating: 5, service: "Fire Door Inspection", time: "15 min ago" },
    { type: "completed", customer: "Anna T.", professional: "Emma Richardson", service: "Fire Risk Assessment", time: "18 min ago" }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [activities.length]);

  const current = activities[currentIndex];

  return (
    <section className="py-4 px-6 bg-gradient-to-r from-red-600 to-red-700 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex items-center justify-center gap-4 text-white">
          {current.type === "review" ? (
            <>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(current.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                  ))}
                </div>
              </div>
              <p className="text-sm sm:text-base">
                <span className="font-semibold">{current.customer}</span> just rated{" "}
                <span className="font-semibold">{current.professional}</span> 5 stars for{" "}
                <span className="italic">{current.service}</span>
                <span className="ml-2 opacity-75">• {current.time}</span>
              </p>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 text-yellow-300" />
              <p className="text-sm sm:text-base">
                <span className="font-semibold">{current.customer}</span> just completed{" "}
                <span className="italic">{current.service}</span> with{" "}
                <span className="font-semibold">{current.professional}</span>
                <span className="ml-2 opacity-75">• {current.time}</span>
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
