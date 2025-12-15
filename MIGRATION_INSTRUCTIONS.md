# Friend Request Migration - Instructions

## ✅ Safety Check Complete

I've checked all your existing SQL files and migrations. **No conflicts were found!**

Your database does NOT have:
- `friend_requests` table
- `notifications` table  
- Related triggers or functions

## 📝 Installation Steps

### Option 1: Clean Install (Recommended)
If you want to be 100% safe, run these in order:

```sql
-- Step 1: Run cleanup (optional, for safety)
CLEANUP_BEFORE_FRIEND_REQUESTS.sql

-- Step 2: Run the main migration
ADD_FRIEND_REQUEST_SYSTEM.sql
```

### Option 2: Direct Install
Since no conflicts exist, you can run directly:

```sql
ADD_FRIEND_REQUEST_SYSTEM.sql
```

## ⚠️ What the Migration Does

1. **Creates Tables:**
   - `friend_requests` - stores request status (pending/accepted/denied)
   - `notifications` - stores all notifications

2. **Creates Functions:**
   - `create_friend_request_notification()` - auto-creates notification when request sent
   - `handle_friend_request_acceptance()` - auto-follows both users when accepted

3. **Creates Triggers:**
   - Sends notifications on friend request
   - Creates bidirectional follows on acceptance

4. **Sets Up Security:**
   - Row Level Security (RLS) policies
   - Proper indexes for performance

## ✨ After Migration

The backend is ready. You'll still need to:
1. Add `<NotificationBell />` to your navigation
2. Create a user search page
3. Integrate `<FriendRequestButton />` where needed

All components are already created in:
- `src/hooks/useFriendRequests.ts`
- `src/hooks/useNotifications.ts`
- `src/components/NotificationBell.tsx`
- `src/components/FriendRequestButton.tsx`
