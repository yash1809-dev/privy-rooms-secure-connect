import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Edit2, Link as LinkIcon, ArrowLeft } from "lucide-react";

interface ProfileRow {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  coffee_url: string | null;
  bio: string | null;
  link: string | null;
}

export default function Profile() {
  const navigate = useNavigate();
  const [me, setMe] = useState<ProfileRow | null>(null);
  const [followers, setFollowers] = useState<ProfileRow[]>([]);
  const [following, setFollowing] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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
        .select("id, username, email, avatar_url, coffee_url, bio, link")
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Your public information</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditDialogOpen(true)}
                className="rounded-full"
              >
                <Edit2 className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex items-start gap-4">
            <Avatar className="h-20 w-20 flex-shrink-0">
              <AvatarImage
                src={me?.avatar_url || undefined}
                className="object-cover"
              />
              <AvatarFallback className="text-2xl">{me?.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-lg mb-1">{me?.username}</div>
              <div className="text-sm text-muted-foreground mb-2">{me?.email}</div>
              {me?.bio && (
                <p className="text-sm mb-2 whitespace-pre-wrap">{me.bio}</p>
              )}
              {me?.link && (
                <a
                  href={me.link.startsWith('http') ? me.link : `https://${me.link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-2"
                >
                  <LinkIcon className="h-3 w-3" />
                  {me.link}
                </a>
              )}
              <div className="text-xs text-muted-foreground mt-2">
                <span className="font-semibold">{followers.length}</span> followers • <span className="font-semibold">{following.length}</span> following
              </div>
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

        <div className="mt-6">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <EditProfileDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          profile={me}
          onProfileUpdated={load}
        />
      </div>
    </div>
  );
}

function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  onProfileUpdated
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileRow | null;
  onProfileUpdated: () => void;
}) {
  const [bio, setBio] = useState(profile?.bio || "");
  const [link, setLink] = useState(profile?.link || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || "");
      setLink(profile.link || "");
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Prepare update object with only bio and link
      const updates: { bio: string | null; link: string | null; avatar_url?: string } = {
        bio: bio.trim() || null,
        link: link.trim() || null
      };

      // Upload avatar if changed and add to updates
      if (avatarFile) {
        const path = `avatars/${user.id}-${Date.now()}-${avatarFile.name}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        updates.avatar_url = urlData.publicUrl;
      }

      // Update profile with only the fields we're changing
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
      onProfileUpdated();
      onOpenChange(false);
      setAvatarFile(null);
    } catch (e: any) {
      toast.error("Failed to update profile: " + (e.message || "Unknown error"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your profile information</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={avatarFile ? URL.createObjectURL(avatarFile) : (profile?.avatar_url || undefined)}
                className="object-cover"
              />
              <AvatarFallback className="text-2xl">{profile?.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Click to change profile picture
              </p>
            </div>
          </div>

          {/* Name (readonly) */}
          <div className="space-y-2">
            <Label htmlFor="username">Name</Label>
            <Input
              id="username"
              value={profile?.username || ""}
              disabled
              className="bg-muted"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 150))}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/150
            </p>
          </div>

          {/* Link */}
          <div className="space-y-2">
            <Label htmlFor="link">Website</Label>
            <Input
              id="link"
              type="url"
              placeholder="https://yourwebsite.com"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setAvatarFile(null);
                setBio(profile?.bio || "");
                setLink(profile?.link || "");
              }}
              className="flex-1"
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={uploading}
            >
              {uploading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
