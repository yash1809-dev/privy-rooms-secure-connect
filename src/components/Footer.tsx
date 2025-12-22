import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { DonationDialog } from "./DonationDialog";
import { cn } from "@/lib/utils";

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const [donationOpen, setDonationOpen] = useState(false);

  return (
    <>
      <footer className={cn("py-8 border-t border-white/5 relative group transition-all duration-500", className)}>
        <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center md:items-start gap-1">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">CollegeOS // Neural Hub</div>
              <div className="text-[9px] text-slate-600 font-medium tracking-tight">
                © 2025 ALL RIGHTS RESERVED // SECURE PROTOCOL v2.5
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDonationOpen(true)}
              className="group/btn h-10 px-6 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 hover:border-teal-500/30 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
              <Heart className="h-4 w-4 text-pink-500 fill-pink-500/20 group-hover/btn:fill-pink-500 transition-all mr-2" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest relative z-10">Support Development</span>
            </Button>
          </div>
        </div>
      </footer>

      <DonationDialog open={donationOpen} onOpenChange={setDonationOpen} />
    </>
  );
};
