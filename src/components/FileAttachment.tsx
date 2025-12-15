
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FileAttachmentProps {
    fileUrl: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    content?: string; // message content
}

export function FileAttachment({ fileUrl, fileName, fileType, fileSize, content }: FileAttachmentProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    // Determines if we should treat this as an image for preview purposes
    const isImage = fileType?.startsWith('image/') || (!fileType && fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i));

    const handleDownload = async (e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent opening lightbox if triggered from there
        if (isDownloading) return;

        setIsDownloading(true);
        const toastId = toast.loading("Downloading...");

        try {
            // Fetch the file as a blob to force native download
            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error("Download failed");

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            // Create temporary anchor to trigger download
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName || 'download';
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);

            toast.dismiss(toastId);
            toast.success("Download complete");
        } catch (error) {
            console.error("Download error:", error);
            toast.dismiss(toastId);
            toast.error("Failed to download file");

            // Fallback: try opening in new tab if blob fetch fails (CORS issues etc)
            window.open(fileUrl, '_blank');
        } finally {
            setIsDownloading(false);
        }
    };

    if (isImage) {
        return (
            <>
                <div className="space-y-1">
                    <div className="relative group cursor-pointer" onClick={() => setLightboxOpen(true)}>
                        <img
                            src={fileUrl}
                            alt={fileName || 'Photo'}
                            className="max-w-full rounded-lg hover:opacity-95 transition-opacity object-cover max-h-[300px]"
                        />
                        {/* Download button overlay on hover/long-press for images */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full shadow-md bg-black/50 hover:bg-black/70 text-white border-0"
                                onClick={handleDownload}
                            >
                                {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                    {content && content !== '📷 Photo' && <div className="text-sm px-1">{content}</div>}
                </div>

                <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                    <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-transparent border-0 shadow-none flex items-center justify-center outline-none">
                        <div className="relative w-full h-full flex items-center justify-center">
                            <img
                                src={fileUrl}
                                alt={fileName || 'Full Check'}
                                className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl"
                            />
                            <div className="absolute bottom-[-50px] left-1/2 transform -translate-x-1/2 flex gap-4">
                                <Button
                                    onClick={handleDownload}
                                    className="rounded-full bg-white/90 hover:bg-white text-black shadow-lg"
                                >
                                    {isDownloading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                                    Download Original
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    // Document / Other File
    return (
        <div
            className="flex items-center gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg cursor-pointer hover:bg-white/80 dark:hover:bg-black/30 transition-colors border border-transparent hover:border-border/50 group"
            onClick={handleDownload}
        >
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate text-foreground">{fileName || 'Document'}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                    {fileSize ? `${(fileSize / 1024).toFixed(1)} KB` : 'Unknown size'} • {fileType?.split('/')[1]?.toUpperCase() || 'FILE'}
                </div>
            </div>

            <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground h-8 w-8"
                onClick={handleDownload}
            >
                {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </Button>
        </div>
    );
}
