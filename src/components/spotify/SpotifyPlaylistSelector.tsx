import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Music2, Loader2 } from "lucide-react";
import type { SpotifyPlaylist } from "@/types/spotify";
import { cn } from "@/lib/utils";

interface SpotifyPlaylistSelectorProps {
    playlists: SpotifyPlaylist[];
    isLoading: boolean;
    selectedPlaylistId: string | null;
    onSelectPlaylist: (playlistId: string) => void;
    className?: string;
}

export function SpotifyPlaylistSelector({
    playlists,
    isLoading,
    selectedPlaylistId,
    onSelectPlaylist,
    className,
}: SpotifyPlaylistSelectorProps) {
    if (isLoading) {
        return (
            <div className={cn("flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10", className)}>
                <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
                <span className="text-xs text-slate-400">Loading playlists...</span>
            </div>
        );
    }

    if (!playlists || playlists.length === 0) {
        return (
            <div className={cn("flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10", className)}>
                <Music2 className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-500">No playlists found</span>
            </div>
        );
    }

    const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);

    return (
        <div className={cn("space-y-2", className)}>
            <label className="text-[10px] font-black text-teal-400 uppercase tracking-widest">
                Select Playlist
            </label>
            <Select value={selectedPlaylistId || undefined} onValueChange={onSelectPlaylist}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                    <SelectValue placeholder="Choose a playlist">
                        {selectedPlaylist && (
                            <div className="flex items-center gap-2">
                                {selectedPlaylist.images[0] && (
                                    <img
                                        src={selectedPlaylist.images[0].url}
                                        alt={selectedPlaylist.name}
                                        className="w-6 h-6 rounded object-cover"
                                    />
                                )}
                                <span className="text-sm truncate">{selectedPlaylist.name}</span>
                            </div>
                        )}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-slate-950/95 backdrop-blur-xl border-white/10">
                    <ScrollArea className="h-72">
                        {playlists.map((playlist) => (
                            <SelectItem
                                key={playlist.id}
                                value={playlist.id}
                                className="cursor-pointer hover:bg-white/10 focus:bg-white/10"
                            >
                                <div className="flex items-center gap-3 py-1">
                                    {playlist.images[0] && (
                                        <img
                                            src={playlist.images[0].url}
                                            alt={playlist.name}
                                            className="w-10 h-10 rounded object-cover"
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white truncate">
                                            {playlist.name}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {playlist.tracks.total} tracks
                                        </p>
                                    </div>
                                </div>
                            </SelectItem>
                        ))}
                    </ScrollArea>
                </SelectContent>
            </Select>
        </div>
    );
}
