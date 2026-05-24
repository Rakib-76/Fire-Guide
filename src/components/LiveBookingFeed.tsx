import React, { useState, useEffect } from "react";
import { CheckCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function LiveBookingFeed() {
  const bookings = [
    { customer: "Sarah M.", service: "Fire Risk Assessment", location: "Manchester", time: "2 minutes ago" },
    { customer: "John D.", service: "Fire Alarm Service", location: "London", time: "5 minutes ago" },
    { customer: "Emma L.", service: "Fire Extinguisher Service", location: "Birmingham", time: "8 minutes ago" },
    { customer: "Michael R.", service: "Fire Door Inspection", location: "Leeds", time: "12 minutes ago" },
    { customer: "Lisa P.", service: "Fire Marshal Training", location: "Bristol", time: "15 minutes ago" },
    { customer: "David K.", service: "Fire Risk Assessment", location: "Liverpool", time: "18 minutes ago" },
    { customer: "Anna T.", service: "Fire Alarm Service", location: "Sheffield", time: "22 minutes ago" },
    { customer: "Tom W.", service: "Fire Extinguisher Service", location: "Nottingham", time: "25 minutes ago" }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bookings.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="live-booking"
      className="py-24 px-6 bg-[#0A1A2F] relative overflow-hidden scroll-mt-24 md:scroll-mt-28"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        ></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-6 py-2 rounded-full mb-6 shadow-lg">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-medium text-sm">Live Booking Activity</span>
          </div>
          <h2 className="text-[28px] md:text-5xl leading-[120%] md:leading-tight font-extrabold text-white tracking-[-0.01em] mt-4 mb-3 text-center">
            Join Thousands Booking Fire Safety Services
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Real-time bookings happening right now across the UK
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 p-2">
                    <CheckCircle className="w-full h-full text-white" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-white font-semibold text-[15px] leading-[140%]">
                      {bookings[currentIndex].customer} just booked{" "}
                      <span className="font-semibold tracking-[-0.003em] text-[#E54646]">{bookings[currentIndex].service}</span>
                    </p>
                    <p className="text-[#C9D1D9] text-[13px] font-normal">
                      {bookings[currentIndex].location}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-[#CFCFCF] flex-shrink-0">
                  <Clock className="w-4 h-4 mt-0.5" />
                  <span className="text-[13px] font-normal">{bookings[currentIndex].time}</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Booking Count */}
          <div className="flex justify-center items-center gap-6 mt-16 px-5">
            <div className="text-center pt-3 pb-4 min-w-[90px]">
              <p className="text-[32px] leading-[110%] font-bold text-white mb-2">1,247</p>
              <p className="text-[14px] leading-[130%] text-[#CCD3D9]">Bookings This Month</p>
            </div>
            <div className="text-center pt-3 pb-4 min-w-[90px]">
              <p className="text-[32px] leading-[110%] font-bold text-white mb-2">89</p>
              <p className="text-[14px] leading-[130%] text-[#CCD3D9]">Bookings Today</p>
            </div>
            <div className="text-center pt-3 pb-4 min-w-[90px]">
              <p className="text-[32px] leading-[110%] font-bold text-white mb-2">12</p>
              <p className="text-[14px] leading-[130%] text-[#CCD3D9]">Active Right Now</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}