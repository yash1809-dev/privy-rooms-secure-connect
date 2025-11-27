-- Performance optimization indexes for faster queries

-- Index for group messages ordered by time (most used query)
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id_created_at 
ON group_messages(group_id, created_at DESC);

-- Index for group messages sender lookup
CREATE INDEX IF NOT EXISTS idx_group_messages_sender 
ON group_messages(sender_id);

-- Index for group members lookup
CREATE INDEX IF NOT EXISTS idx_group_members_user 
ON group_members(user_id);

-- Index for group members by group
CREATE INDEX IF NOT EXISTS idx_group_members_group 
ON group_members(group_id);

-- Index for follows (followers)
CREATE INDEX IF NOT EXISTS idx_follows_follower 
ON follows(follower_id);

-- Index for follows (following)
CREATE INDEX IF NOT EXISTS idx_follows_following 
ON follows(following_id);

-- Index for timetable by user
CREATE INDEX IF NOT EXISTS idx_timetable_user 
ON timetable_lectures(user_id);

-- Index for video calls by creator
CREATE INDEX IF NOT EXISTS idx_video_calls_creator 
ON video_calls(creator_id, created_at DESC);

-- Index for call participants by call
CREATE INDEX IF NOT EXISTS idx_call_participants_call 
ON call_participants(call_id);

-- Index for call participants by user
CREATE INDEX IF NOT EXISTS idx_call_participants_user 
ON call_participants(user_id);

-- Index for group polls
CREATE INDEX IF NOT EXISTS idx_group_polls_group 
ON group_polls(group_id, created_at DESC);

-- Index for poll votes
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll 
ON group_poll_votes(poll_id);

-- Index for poll votes by user
CREATE INDEX IF NOT EXISTS idx_poll_votes_user 
ON group_poll_votes(user_id, poll_id);

-- Index for group notes
CREATE INDEX IF NOT EXISTS idx_group_notes_group 
ON group_notes(group_id, created_at DESC);

-- Index for group recaps
CREATE INDEX IF NOT EXISTS idx_group_recaps_group 
ON group_recaps(group_id, created_at DESC);
