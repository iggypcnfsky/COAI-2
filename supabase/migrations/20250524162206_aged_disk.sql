-- Enable pg_net extension for edge functions
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to authenticated and anon users
GRANT USAGE ON SCHEMA extensions TO authenticated, anon;

-- Grant execute permission on pg_net functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO authenticated, anon;