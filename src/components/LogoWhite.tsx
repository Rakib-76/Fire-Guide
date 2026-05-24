import { Flame } from "lucide-react";

export function LogoWhite() {
  return (
    <div className="flex items-center gap-2.5">
      {/* Fire Icon in Red */}
      <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
        <Flame className="w-6 h-6 text-white fill-white" />
      </div>
      
      {/* Logo Text in White */}
      <div className="flex flex-col leading-none">
        <span className="text-white tracking-wider uppercase" style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '0.05em' }}>
          FIRE GUIDE
        </span>
      </div>
    </div>
  );
}
