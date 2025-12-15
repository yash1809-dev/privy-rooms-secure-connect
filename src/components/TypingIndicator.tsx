interface TypingIndicatorProps {
    typingUsers: Array<{ username?: string }>;
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
    if (typingUsers.length === 0) return null;

    const getTypingText = () => {
        if (typingUsers.length === 1) {
            return `${typingUsers[0].username || "Someone"} is typing`;
        } else if (typingUsers.length === 2) {
            return `${typingUsers[0].username || "Someone"} and ${typingUsers[1].username || "someone"} are typing`;
        } else {
            return `${typingUsers.length} people are typing`;
        }
    };

    return (
        <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
            <span>{getTypingText()}</span>
            <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
        </div>
    );
}
