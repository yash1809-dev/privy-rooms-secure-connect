# ✅ FIXED: Friends Now Appear in "Add Participants"!

## What I Just Fixed

Updated **TWO** places where contacts are loaded:

### 1. **ContactSelectorDialog.tsx** (Video Calls)
✅ Already fixed - Uses friend_requests table

### 2. **ChatConversation.tsx** (Group Info → Add Participants) ⭐ JUST FIXED
✅ Updated `loadFollowLists()` function to use friend_requests table

## 🎯 The Fix

**Before:**
```tsx
// Was loading from follows table
const { data: followersData } = await supabase
  .from("follows")
  .select("follower:profiles(*)")
  .eq("following_id", user.id);
```

**After:**
```tsx
// Now loads accepted friends from friend_requests
const { data: requests } = await supabase
  .from('friend_requests')
  .select('sender_id, receiver_id, sender:profiles(...), receiver:profiles(...)')
  .eq('status', 'accepted')
  .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

// Extracts the friends (the other person in each connection)
const friends = requests.map(r => 
  r.sender_id === user.id ? r.receiver : r.sender
);
```

## 🚀 Test It Now!

1. **Refresh your browser** (to load the new code)
2. Go to any **group chat**
3. Click the **Group Info** icon (top right)
4. Scroll down to **Participants**
5. Click the **"+ Add"** button
6. **"Add Participants"** dialog opens
7. **Your accepted friends should now appear!** ✅

## 📝 What Shows in "Add Participants"

- **All accepted friends** (from friend_requests table with status='accepted')
- Friends where you sent the request
- Friends where you received and accepted the request
- Excludes people already in the group

## 🔄 Updated Files

1. ✅ `src/components/ContactSelectorDialog.tsx` - Video call selector
2. ✅ `src/components/ChatConversation.tsx` - Group info add participants

Both now use the **friend_requests** table instead of the **follows** table!

## 💡 If It Still Shows "No contacts found"

1. **Hard refresh**: Cmd/Ctrl + Shift + R
2. Make sure you have at least one **accepted** friend request
3. Check that you ran the `UPDATE_FRIEND_AND_GROUP_SYSTEM.sql` migration
4. The friend must not already be in the group

**Try it now - your friends should appear!** 🎉
