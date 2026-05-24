import { MapPin, Flame } from "lucide-react";

interface LogoHeaderProps {
  variant?: "default" | "white";
}

export function LogoHeader({ variant = "default" }: LogoHeaderProps) {
  const pinColor = variant === "white" ? "text-white" : "text-[#0A1A2F]";
  const flameColor = "text-red-600";
  const textColor = variant === "white" ? "text-white" : "text-[#0A1A2F]";

  return (
    <div className="flex items-center gap-2.5">
      {/* Map Pin with Fire Icon */}
      <div className="relative w-10 h-10 flex items-center justify-center">
        {/* Map Pin Outline */}
        <MapPin className={`w-10 h-10 ${pinColor} absolute`} strokeWidth={2} fill="none" />
        {/* Fire Flame Inside */}
        <Flame className={`w-5 h-5 ${flameColor} relative z-10`} fill="currentColor" style={{ marginTop: '-4px' }} />
      </div>
      
      {/* Logo Text */}
      <div className="flex flex-col leading-none">
        <span className={`${textColor} tracking-wider uppercase`} style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '0.05em' }}>
          FIRE GUIDE
        </span>
      </div>
    </div>
  );
}
