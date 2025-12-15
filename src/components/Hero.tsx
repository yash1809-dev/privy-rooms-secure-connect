import { Button } from "@/components/ui/button";
import { Shield, Users, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

export const Hero = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroBg}
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-[var(--gradient-hero)] opacity-90" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20 text-center">
        <div className="flex items-center justify-center mb-6">
          <Shield className="h-16 w-16 text-primary-foreground animate-pulse" />
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-primary-foreground mb-6 tracking-tight">
          CollegeOS
        </h1>

        <p className="text-xl md:text-2xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
          Secure collaboration spaces for teams and friends. Create Rooms for interactive sessions or Groups for long-term collaboration.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link to="/signup">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-[var(--shadow-glow)] transition-all hover:scale-105">
              Get Started Free
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="border-white/30 text-gray-900 bg-white/90 hover:bg-white backdrop-blur-sm font-semibold">
              Sign In
            </Button>
          </Link>
          <Link to="/features">
            <Button size="lg" variant="secondary" className="backdrop-blur-sm">
              See Features
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-20">
          <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl border border-white/20 shadow-[var(--shadow-smooth)] hover:scale-105 transition-transform">
            <Users className="h-12 w-12 text-secondary mb-4 mx-auto" />
            <h3 className="text-2xl font-bold text-primary-foreground mb-3">Rooms</h3>
            <p className="text-primary-foreground/80">
              Short-lived interactive spaces for real-time collaboration, video calls, screen sharing, and synchronized activities.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl border border-white/20 shadow-[var(--shadow-smooth)] hover:scale-105 transition-transform">
            <Lock className="h-12 w-12 text-secondary mb-4 mx-auto" />
            <h3 className="text-2xl font-bold text-primary-foreground mb-3">Groups</h3>
            <p className="text-primary-foreground/80">
              Long-term chat hubs for teams to share messages, notes, documents, and polls with persistent storage.
            </p>
          </div>
        </div>

        {/* Security Highlights */}
        <div className="mt-20 flex flex-wrap justify-center gap-8 text-primary-foreground/70 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>End-to-end encryption</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span>Password protected spaces</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Privacy first</span>
          </div>
        </div>
      </div>
    </div>
  );
};
