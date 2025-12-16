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
      <footer className={cn("border-t py-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              © 2025 CollegeOS. Secure collaboration for everyone.
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setDonationOpen(true)}
              className="gap-2"
            >
              <Heart className="h-4 w-4 text-red-500 fill-red-500" />
              Support Us
            </Button>
          </div>
        </div>
      </footer>

      <DonationDialog open={donationOpen} onOpenChange={setDonationOpen} />
    </>
  );
};
