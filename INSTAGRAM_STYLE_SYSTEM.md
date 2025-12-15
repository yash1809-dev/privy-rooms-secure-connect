# Instagram-Style Friend & Group System - Implementation Guide

## 🎯 What's Changed 

### 1. **Friend Request System (Instagram-Style)**

#### Before:
- Accepting a friend request → **Auto-follow both users**

#### Now (Instagram-style):
- Accepting a friend request → **Only adds to friends list**
- **"Follow Back" button** appears in notification after acceptance
- User manually decides to follow or not

### 2. **Group Invite System (NEW)**

Added ability to invite users to groups with request/acceptance flow:
- Invite friends to join groups
- Invite non-friends (sends group invite notification)
- User can accept or decline group invitation

---

## 📦 Files Created/Modified

### **Database Migration:**
`UPDATE_FRIEND_AND_GROUP_SYSTEM.sql`
- Updated friend acceptance trigger (removed auto-follow)
- Created `group_invites` table
- Added group invite notifications
- Auto-adds user to group on invite acceptance

### **New Hooks:**
1. `src/hooks/useGroupInvites.ts` - Manage group invitations
2. `src/hooks/useFriends.ts` - Fetch list of accepted friends

### **Updated Components:**
1. `src/components/NotificationBell.tsx` 
   - Added "Follow Back" button for accepted friend requests
   - Added Accept/Decline buttons for group invites

---

## 🗄️ Database Schema

### New Table: `group_invites`
```sql
- id (uuid)
- group_id (references groups)
- inviter_id (user who sent invite)
- invitee_id (user being invited)
- status ('pending' | 'accepted' | 'declined')
- created_at
- updated_at
```

---

##  📋 To Complete the Implementation

### ✅ Step 1: Run Database Migration
```bash
# In Supabase SQL Editor, run:
UPDATE_FRIEND_AND_GROUP_SYSTEM.sql
```

### 🔨 Step 2: Update Group Dialogs (TODO)

Need to update these components to use friends list and send group invites:

1. **`CreateGroupDialog.tsx`**
   - Show list of friends
   - Allow search for non-friends
   - Send group invites to selected users

2. **`ContactSelectorDialog.tsx`** (or create new `GroupMemberSelector.tsx`)
   - Display friends list first
   - Add search bar for non-friends
   - Show "Send Invite" button for non-friends
   - Show "Add" button for friends

3. **Group Info "Add Members" section**
   - Same functionality as above
   - Search bar + friends list
   - Send invites to non-friends

---

## 🎨 User Experience Flow

### Friend Request Flow:
1. User A sends friend request to User B
2. User B receives notification → Accept/Deny
3. **On Accept**: 
   - Both are now "friends" (can see in friends list)
   - User A sees "Friend Request Accepted" notification with "Follow Back" button
   - User A can click "Follow Back" to follow User B
   - User B can also follow User A separately if desired

### Group Invite Flow:
1. User A wants to add User C to a group
2. **If User C is a friend**: 
   - Directly send group invite
3. **If User C is NOT a friend**:
   - Search for User C
   - Click "Invite to Group"
   - User C receives notification
4. User C can Accept (joins group) or Decline

---

## 🚀 Next Steps to Complete

### Priority 1: Update Create Group Dialog
```tsx
//  In CreateGroupDialog.tsx:
import { useFriends } from "@/hooks/useFriends";
import { useGroupInvites } from "@/hooks/useGroupInvites";

// Display friends list
// Add search for non-friends
// Send group invites
```

### Priority 2: Create Group Member Selector Component
Component that shows:
- Friends list (with checkboxes)
- Search bar for non-friends  
- "Send Invite" for non-friends
- Use in both Create Group and Add Members flows

### Priority 3: Test Complete Flow
1. Create 2 test accounts
2. Send friend request → Accept → Verify no auto-follow
3. Click "Follow Back" → Verify manual follow works
4. Create group → Invite friend → Verify notification
5. Invite non-friend → Verify invite sent

---

## 🎯 API Reference

### useFriends Hook
```tsx
const { friends, isLoading } = useFriends();
// Returns: Array of accepted friends
```

### useGroupInvites Hook
```tsx
const { 
  invites,
  sendInvite,
  acceptInvite,
  declineInvite,
  cancelInvite 
} = useGroupInvites();

// Send invite
sendInvite.mutate({ groupId: '...', inviteeId: '...' });
```

---

## ✅ Current Status

- ✅ Database schema created
- ✅ Friend system updated (no auto-follow)
- ✅ "Follow Back" button added
- ✅ Group invites backend ready
- ✅ Notification handling complete
- ⏳ **TODO**: Update group dialogs to use new system
- ⏳ **TODO**: Create member selector component

Would you like me to create the updated group dialogs and member selector component next?
