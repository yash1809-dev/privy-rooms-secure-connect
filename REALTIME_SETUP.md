# Real-time Chat Setup Guide

## ✅ Real-time is ALREADY IMPLEMENTED

The code for real-time messaging using **Supabase Realtime Subscriptions** is already in place in `src/hooks/useChatMessages.ts`.

However, you need to **enable it in your Supabase Dashboard**.

---

## 🔧 Steps to Enable Real-time on Supabase

### 1. Go to Supabase Dashboard
Visit: https://supabase.com/dashboard/project/YOUR_PROJECT_ID

### 2. Enable Realtime for `group_messages` table

1. Click on **Database** (left sidebar)
2. Click on **Replication** 
3. Find the `group_messages` table
4. **Toggle ON** the switch for `group_messages`
5. Click **Save**

### 3. Verify RLS Policies Allow Real-time

Go to **Authentication** → **Policies** and ensure:

#### For `group_messages` table:
- **SELECT policy** allows users to read messages in their groups
- **INSERT policy** allows users to send messages

Example policy for SELECT:
```sql
CREATE POLICY "Users can view messages in their groups"
ON group_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = group_messages.group_id
    AND group_members.user_id = auth.uid()
  )
);
```

### 4. Check Browser Console for Real-time Status

Open DevTools (F12) → Console tab. You should see:
```
[Realtime] Setting up subscription for group: <group-id>
[Realtime] Subscription status: SUBSCRIBED
[Realtime] ✅ Successfully subscribed to group: <group-id>
```

If you see **CHANNEL_ERROR** or **TIMED_OUT**, realtime is not enabled.

---

## 🧪 How to Test

1. Open chat in **two different browsers** (or incognito + normal)
2. Log in as different users in each
3. Send a message from Browser A
4. **Browser B should receive it INSTANTLY** without refresh

---

## 📊 How It Works (Current Implementation)

### Architecture:
```
User A sends message
    ↓
1. Optimistic UI Update (instant on sender's screen)
    ↓
2. Insert to Supabase database
    ↓
3. Supabase broadcasts postgres_changes event
    ↓
4. All subscribed clients receive the event
    ↓
5. React Query cache updated
    ↓
6. UI re-renders with new message (instant on receiver's screen)
```

### Key Files:
- **`src/hooks/useChatMessages.ts`** - Real-time subscription logic
- **`src/components/ChatConversation.tsx`** - Uses the hook

### Features Already Implemented:
✅ Supabase Real-time subscriptions (postgres_changes)
✅ Event-driven updates (INSERT, UPDATE, DELETE)
✅ Optimistic UI updates
✅ Automatic deduplication
✅ Subscription status logging
✅ No polling, no refresh needed

---

## 🐛 Troubleshooting

### Issue: Messages don't appear in real-time

**Possible causes:**

1. **Realtime not enabled on Supabase**
   - Solution: Follow Step 2 above

2. **RLS policies blocking**
   - Solution: Verify policies in Step 3

3. **Subscription not connecting**
   - Check console for: `[Realtime] CHANNEL_ERROR`
   - Verify Supabase project URL and anon key are correct

4. **Network issues**
   - Check browser Network tab for WebSocket connection
   - Should see `wss://` connection to Supabase

### Issue: Duplicate messages

This is already handled by deduplication logic in `useChatMessages.ts` lines 158-174.

---

## 🚀 Next Steps (Optional Enhancements)

Once real-time is working:
- ✅ Typing indicators (already partially implemented in `useTypingIndicator`)
- ✅ Online/offline presence (already implemented in `usePresence`)
- ⏳ Message "seen" status (read receipts already tracked)
- ⏳ Smooth animations for message arrival

---

## 📞 Support

If real-time still doesn't work after enabling:
1. Check browser console for errors
2. Verify Supabase Realtime is enabled (Settings → API → Realtime)
3. Test with Supabase Realtime Inspector tool
