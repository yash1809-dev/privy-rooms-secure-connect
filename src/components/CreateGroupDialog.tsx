import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputWithToggle } from "@/components/ui/input-with-toggle";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
// Simple hash function to replace bcryptjs
// Note: In production, password hashing should be done server-side
const simpleHash = async (password: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

interface CreateGroupDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  onGroupCreated?: () => void;
}

export const CreateGroupDialog = ({ open: controlledOpen, onOpenChange: controlledOnOpenChange, trigger, onGroupCreated }: CreateGroupDialogProps = {}) => {
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let passwordHash = null;
      if (isPasswordProtected && password) {
        passwordHash = await simpleHash(password);
      }

      const { data, error } = await supabase
        .from("groups")
        .insert({
          name,
          description,
          creator_id: user.id,
          is_password_protected: isPasswordProtected,
          password_hash: passwordHash,
        })
        .select()
        .single();

      if (error) throw error;

      // Ensure creator is a member/admin for permissions
      await supabase.from("group_members").insert({ group_id: data.id, user_id: user.id, role: "admin" });

      // Group created silently

      setOpen(false);
      onGroupCreated?.();
      // navigate(`/group/${data.id}`); // Stay on chats page which will refresh
    } catch (error: any) {
      toast.error(error.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {(!isControlled || trigger) && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="secondary" className="w-full gap-2">
              <Plus className="h-4 w-4" />
              New Group
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md bg-slate-900/95 border-white/10 text-white backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>Create a Group</DialogTitle>
          <DialogDescription className="text-slate-400">
            Create a long-term collaboration space for your team
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name" className="text-white">Group Name</Label>
            <Input
              id="group-name"
              placeholder="My Team Group"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 focus:border-teal-500/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-description" className="text-white">Description (optional)</Label>
            <Textarea
              id="group-description"
              placeholder="What's this group for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 focus:border-teal-500/50 resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="group-password-protect" className="text-white">Password Protection</Label>
            <Switch
              id="group-password-protect"
              checked={isPasswordProtected}
              onCheckedChange={setIsPasswordProtected}
            />
          </div>

          {isPasswordProtected && (
            <div className="space-y-2">
              <Label htmlFor="group-password" className="text-white">Group Password</Label>
              <InputWithToggle
                id="group-password"
                placeholder="Enter a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={isPasswordProtected}
                className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 focus:border-teal-500/50"
              />
            </div>
          )}

          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-500 text-white border-0" disabled={loading}>
            {loading ? "Creating..." : "Create Group"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
