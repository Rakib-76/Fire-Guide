import React, { useState, useEffect, useMemo } from "react";
import { CheckCircle } from "lucide-react";
import heroImage1 from "figma:asset/189ec7e3689608dad914f59dd7c02d25da91583d.png";
import heroImage2 from "figma:asset/06f1b3e41c2783f18bdafecd74ab9e64333871d6.png";
import heroImage3 from "figma:asset/e0dbc899d99d79876818127d318a196dc1afa811.png";
import heroImage4 from "figma:asset/2a524831d9c08eec0e10c448c5848452698dd089.png";
import heroImage5 from "figma:asset/4a602fcb2197368c8ba48f35530a0c308f2262bb.png";
import heroImage6 from "figma:asset/6d3b45bdbd70d604c743717e8996da118e1d2ab9.png";
import heroImage7 from "figma:asset/480b0c0a77e9ab632fe90d62f30d6330c18adff5.png";
import heroImage8 from "figma:asset/dcc0d6fdc32b7d65870a8a7a4cf0cb3e7dad77d5.png";
import heroImage9 from "figma:asset/9f9a1b825f2bba8823c5d3f17dd17fcac7ef3c43.png";
import heroImage10 from "figma:asset/593ecc8734544a291a2372ea93c0cbd9fb50c3ce.png";
import heroImage11 from "figma:asset/564386e01b260c73d9917c802efdd6b9fae211c2.png";

interface HeroProps {
  onGetStarted: () => void;
}

export const Hero = React.memo(function Hero({ onGetStarted }: HeroProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0])); // Preload first image
  const images = [heroImage1, heroImage2, heroImage3, heroImage4, heroImage5, heroImage6, heroImage7, heroImage8, heroImage9, heroImage10, heroImage11];

  // Preload next image before it's needed
  useEffect(() => {
    const preloadNext = (index: number) => {
      if (!loadedImages.has(index)) {
        const img = new Image();
        img.src = images[index];
        img.onload = () => {
          setLoadedImages(prev => new Set([...prev, index]));
        };
      }
    };

    // Preload current and next image
    preloadNext(currentImageIndex);
    const nextIndex = (currentImageIndex + 1) % images.length;
    preloadNext(nextIndex);
  }, [currentImageIndex, images, loadedImages]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, [images.length]); 

  return (
    <section id="home" className="relative overflow-hidden pt-16">
      {/* Background Slider */}
      <div className="absolute inset-0">
        {images.map((image, index) => {
          const isVisible = currentImageIndex === index;
          const shouldLoad = loadedImages.has(index) || isVisible;
          
          return (
            <div
              key={index}
              className="absolute inset-0 transition-opacity duration-1000 bg-cover bg-no-repeat bg-[calc(50%-220px)_center] md:bg-center"
              style={{
                backgroundImage: shouldLoad ? `url(${image})` : undefined,
                opacity: isVisible ? 1 : 0,
                willChange: isVisible ? 'opacity' : 'auto',
              }}
            />
          );
        })}
      </div>

      {/* Gradient Overlay - Mobile Only */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/40 to-transparent md:from-transparent md:via-transparent md:to-transparent" />

      {/* Main Hero Content */}
      <div className="relative max-w-7xl mx-auto px-5 md:px-6 lg:px-12 pt-32 md:pt-48 pb-16 md:pb-36 min-h-[550px] md:min-h-0">
        <div className="grid md:grid-cols-1 lg:grid-cols-[40%_60%] gap-12 items-center">
          
          {/* Left Column - Content */}
          <div className="space-y-5 md:space-y-5">
            {/* Heading */}
            <h1 className="text-white md:text-[#0A1A2F] text-[32px] md:text-[70px] leading-[115%] md:leading-[120%] tracking-[-0.01em] font-bold mt-[10px] mb-3 max-w-[280px] md:max-w-none mx-auto md:mx-0 text-center md:text-left">
              Fire Safety Made <span className="text-red-500">Simple.</span>
            </h1>
            
            {/* Paragraph */}
            <p className="text-white/95 md:text-[#0A1A2F] text-[15px] md:text-lg lg:text-xl leading-relaxed">
              Book trusted fire safety professionals for assessments, alarms, extinguisher services, training, and end-to-end support — all arranged conveniently through one platform.
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap gap-3 md:gap-4 pt-2 md:pt-0">
              <button 
                onClick={onGetStarted}
                className="bg-[rgb(230,51,6)] hover:bg-[#0A1A2F]/90 text-white px-[22px] md:px-[24px] py-[11px] md:py-[10px] rounded-lg transition-all text-[14px] font-bold shadow-lg md:shadow-none"
              >
                Book Now
              </button>
              
              <button 
                onClick={() => document.getElementById('pricing-preview')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-white hover:bg-gray-50 text-[#0A1A2F] px-[22px] md:px-[24px] py-[10px] md:py-[9px] rounded-lg border-2 border-white md:border-gray-300 transition-all text-[14px] font-bold shadow-lg md:shadow-none"
              >
                Get prices
              </button>
            </div>
          </div>

          {/* Right Column - Spacer (Desktop only) */}
          <div className="relative hidden md:block"></div>

        </div>
      </div>

      {/* Features Section - Full Width */}
      
    </section>
  );
});