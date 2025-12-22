import { useQuery } from "@tanstack/react-query";
import { spotifyApiRequest } from "@/lib/spotify";
import type { SpotifyPlaylist } from "@/types/spotify";

interface PlaylistsResponse {
    items: SpotifyPlaylist[];
    total: number;
    limit: number;
    offset: number;
}

export function useSpotifyPlaylists(enabled: boolean = true) {
    return useQuery({
        queryKey: ['spotify-playlists'],
        queryFn: async () => {
            const data = await spotifyApiRequest<PlaylistsResponse>('/me/playlists?limit=50');
            return data.items;
        },
        enabled,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
    });
}
