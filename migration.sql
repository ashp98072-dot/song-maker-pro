-- ==========================================================
-- Realtime Authorization Fix
-- Worship Session Channels
--
-- Purpose:
-- Allow authenticated users to publish and receive
-- realtime broadcast events on:
--   worship-session-*
--
-- Fixes:
--   "Session connected" but no sync in production.
-- ==========================================================

BEGIN;

-- 1. Ensure realtime.messages exists and enable RLS
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'realtime'
      AND table_name = 'messages'
  ) THEN
    ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
  ELSE
    RAISE NOTICE 'realtime.messages table does not exist';
  END IF;
END $$;

-- 2. Remove old conflicting policies (safe reset)
DROP POLICY IF EXISTS worship_session_broadcast_select
  ON realtime.messages;

DROP POLICY IF EXISTS worship_session_broadcast_insert
  ON realtime.messages;

-- 3. Allow authenticated users to RECEIVE broadcasts
CREATE POLICY worship_session_broadcast_select
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    realtime.topic() LIKE 'worship-session-%'
  );

-- 4. Allow authenticated users to SEND broadcasts
CREATE POLICY worship_session_broadcast_insert
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    realtime.topic() LIKE 'worship-session-%'
  );

COMMIT;

-- ==========================================================
-- Verification (run after COMMIT)
-- ==========================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'realtime'
  AND tablename = 'messages';
