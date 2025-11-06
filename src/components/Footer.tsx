import { Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Footer = () => {
  const handleDonate = () => {
    // Prefer a Buy Me a Coffee (or any support) link via env var; fallback to UPI
    const coffee = import.meta.env.VITE_COFFEE_URL as string | undefined;
    const upiFallback = "upi://pay?pa=yourupi@upi&pn=PrivyRooms&am=100&cu=INR";
    const href = coffee && coffee.trim().length > 0 ? coffee : upiFallback;
    window.open(href, "_blank");
  };

  return (
    <footer className="bg-card border-t border-border py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            © 2025 PrivyRooms. Secure collaboration for everyone.
          </div>
          
          <Button
            onClick={handleDonate}
            variant="outline"
            size="sm"
            className="gap-2 hover:bg-accent hover:text-accent-foreground transition-[var(--transition-smooth)]"
          >
            <Coffee className="h-4 w-4" />
            Buy Me a Coffee
          </Button>
        </div>
      </div>
    </footer>
  );
};
