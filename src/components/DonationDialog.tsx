import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface DonationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DonationDialog({ open, onOpenChange }: DonationDialogProps) {
    const [copied, setCopied] = useState(false);
    const upiId = "yashchoudhary0066@okicici";

    const handleCopyUPI = async () => {
        try {
            await navigator.clipboard.writeText(upiId);
            setCopied(true);
            toast.success("UPI ID copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast.error("Failed to copy UPI ID");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-center">Support CollegeOS</DialogTitle>
                    <DialogDescription className="text-center">
                        Scan the QR code or use the UPI ID below to donate
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center space-y-6 py-4">
                    {/* QR Code */}
                    <div className="relative w-64 h-64 bg-white rounded-lg p-4 shadow-lg">
                        <img
                            src="/upi-qr.jpg"
                            alt="UPI QR Code"
                            className="w-full h-full object-contain"
                        />
                    </div>

                    {/* UPI ID with Copy Button */}
                    <div className="w-full space-y-2">
                        <p className="text-sm text-muted-foreground text-center">
                            Or copy the UPI ID:
                        </p>
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                            <code className="flex-1 text-sm font-mono break-all">
                                {upiId}
                            </code>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCopyUPI}
                                className="shrink-0"
                            >
                                {copied ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <p className="text-xs text-center text-muted-foreground">
                        Thank you for your support! 💙
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
