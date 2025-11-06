import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface ProfileRow {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  coffee_url: string | null;
}

export default function Profile() {
  const navigate = useNavigate();
  const [me, setMe] = useState<ProfileRow | null>(null);
  const [followers, setFollowers] = useState<ProfileRow[]>([]);
  const [following, setFollowing] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("id, username, email, avatar_url, coffee_url")
        .eq("id", user.id)
        .single();
      if (pErr) throw pErr;
      setMe(profile as ProfileRow);

      const { data: followerJoins, error: fErr } = await supabase
        .from("follows")
        .select("follower_id, following_id")
        .eq("following_id", user.id);
      if (fErr) throw fErr;

      const { data: followingJoins, error: gErr } = await supabase
        .from("follows")
        .select("follower_id, following_id")
        .eq("follower_id", user.id);
      if (gErr) throw gErr;

      const followerIds = (followerJoins || []).map((j: any) => j.follower_id);
      const followingIds = (followingJoins || []).map((j: any) => j.following_id);

      const [followersRes, followingRes] = await Promise.all([
        followerIds.length
          ? supabase.from("profiles").select("id, username, email, avatar_url").in("id", followerIds)
          : Promise.resolve({ data: [] }),
        followingIds.length
          ? supabase.from("profiles").select("id, username, email, avatar_url").in("id", followingIds)
          : Promise.resolve({ data: [] }),
      ]);

      setFollowers((followersRes as any).data || []);
      setFollowing((followingRes as any).data || []);
    } catch (e: any) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (targetId: string, isFollowing: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (isFollowing) {
        await supabase.from("follows").delete().match({ follower_id: user.id, following_id: targetId });
      } else {
        await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
      }
      await load();
    } catch (e: any) {
      toast.error("Unable to update follow");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gradient-subtle)]">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your public information</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={me?.avatar_url || undefined} />
              <AvatarFallback>{me?.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{me?.username}</div>
              <div className="text-sm text-muted-foreground">{me?.email}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {followers.length} followers • {following.length} following
              </div>
              {/* Buy me a coffee button removed as requested; global footer button remains */}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="followers">
          <TabsList>
            <TabsTrigger value="followers">Followers ({followers.length})</TabsTrigger>
            <TabsTrigger value="following">Following ({following.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="followers" className="space-y-2 mt-4">
            {followers.length === 0 && (
              <div className="text-sm text-muted-foreground">No followers yet.</div>
            )}
            {followers.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={p.avatar_url || undefined} />
                    <AvatarFallback>{p.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{p.username}</div>
                    <div className="text-xs text-muted-foreground">{p.email}</div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleFollowToggle(p.id, following.some(f => f.id === p.id))}>
                  {following.some(f => f.id === p.id) ? "Unfollow" : "Follow"}
                </Button>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="following" className="space-y-2 mt-4">
            {following.length === 0 && (
              <div className="text-sm text-muted-foreground">You aren't following anyone yet.</div>
            )}
            {following.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={p.avatar_url || undefined} />
                    <AvatarFallback>{p.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{p.username}</div>
                    <div className="text-xs text-muted-foreground">{p.email}</div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleFollowToggle(p.id, true)}>Unfollow</Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <AvatarUploader onUpdated={async () => await load()} />
        <div className="mt-6">
          <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
        </div>
      </div>
    </div>
  );
}

function AvatarUploader({ onUpdated }: { onUpdated: () => Promise<void> | void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async () => {
    try {
      if (!file) return;
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const path = `avatars/${user.id}-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user.id);
      await onUpdated();
      toast.success("Profile picture updated");
      setFile(null);
    } catch (e: any) {
      toast.error("Failed to upload avatar (ensure 'avatars' bucket is public)");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Change Profile Picture</CardTitle>
        <CardDescription>Upload a new profile picture</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Button onClick={upload} disabled={uploading || !file}>{uploading ? "Uploading..." : "Upload"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

