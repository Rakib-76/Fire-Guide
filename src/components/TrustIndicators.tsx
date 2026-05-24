import { Shield, Layers, Zap, BookOpen, CheckCircle } from "lucide-react";

export function TrustIndicators() {
  return (
    <div className="bg-[#0A1A2F] border-t border-gray-700">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Feature 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-white text-xl">Trusted Industry Experts</h3>
            </div>
            <p className="text-white/70">Professionals reviewed for experience, qualifications and customer feedback</p>
          </div>

          {/* Feature 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-white text-xl">Comprehensive Services
              </h3>
            </div>
            <p className="text-white/70">All your fire safety needs in one placele through one platform.</p>
          </div>

          {/* Feature 3 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-white text-xl">Fast & Reliable</h3>
            </div>
            <p className="text-white/70">Quick response and efficient service</p>
          </div>

          {/* Feature 4 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-white text-xl">Regulation-Focused Services</h3>
            </div>
            <p className="text-white/70">Services aligned with current fire safety regulations and industry expectations</p>
          </div>

        </div>
      </div>
    </div>
  );
}