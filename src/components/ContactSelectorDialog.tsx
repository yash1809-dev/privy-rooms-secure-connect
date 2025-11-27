import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Search, Video } from "lucide-react";

interface Contact {
    id: string;
    username: string;
    avatar_url: string | null;
}

interface ContactSelectorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onStartCall: (selectedContactIds: string[]) => void;
}

export function ContactSelectorDialog({
    open,
    onOpenChange,
    onStartCall,
}: ContactSelectorDialogProps) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            loadContacts();
            setSelectedIds(new Set());
            setSearchQuery("");
        }
    }, [open]);

    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredContacts(contacts);
        } else {
            const query = searchQuery.toLowerCase();
            setFilteredContacts(
                contacts.filter((contact) =>
                    contact.username.toLowerCase().includes(query)
                )
            );
        }
    }, [searchQuery, contacts]);

    const loadContacts = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get followers (people who follow me)
            const { data: followers } = await supabase
                .from("follows")
                .select("follower_id")
                .eq("following_id", user.id);

            // Get following (people I follow)
            const { data: following } = await supabase
                .from("follows")
                .select("following_id")
                .eq("follower_id", user.id);

            // Combine and deduplicate
            const contactIds = new Set<string>();
            followers?.forEach((f) => contactIds.add(f.follower_id));
            following?.forEach((f) => contactIds.add(f.following_id));

            if (contactIds.size === 0) {
                setContacts([]);
                setFilteredContacts([]);
                return;
            }

            // Fetch profile data
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, username, avatar_url")
                .in("id", Array.from(contactIds));

            const contactList = (profiles || []) as Contact[];
            setContacts(contactList);
            setFilteredContacts(contactList);
        } catch (error: any) {
            toast.error("Failed to load contacts");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleContact = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleStartCall = () => {
        if (selectedIds.size === 0) {
            toast.error("Please select at least one contact");
            return;
        }
        onStartCall(Array.from(selectedIds));
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-primary" />
                        Start Video Call
                    </DialogTitle>
                    <DialogDescription>
                        Select contacts to invite to the call
                    </DialogDescription>
                </DialogHeader>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search contacts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Contact List */}
                <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
                    {loading ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            Loading contacts...
                        </p>
                    ) : filteredContacts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            {contacts.length === 0
                                ? "No contacts found. Follow someone to start a call!"
                                : "No contacts match your search."}
                        </p>
                    ) : (
                        filteredContacts.map((contact) => (
                            <div
                                key={contact.id}
                                className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                                onClick={() => toggleContact(contact.id)}
                            >
                                <Checkbox
                                    checked={selectedIds.has(contact.id)}
                                    onCheckedChange={() => toggleContact(contact.id)}
                                />
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={contact.avatar_url || undefined} className="object-cover" />
                                    <AvatarFallback>
                                        {contact.username.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{contact.username}</span>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleStartCall} disabled={selectedIds.size === 0}>
                        Start Call ({selectedIds.size})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
