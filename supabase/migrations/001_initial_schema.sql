-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create coai-profiles table
CREATE TABLE IF NOT EXISTS "coai-profiles" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create coai-synths table
CREATE TABLE IF NOT EXISTS "coai-synths" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES "coai-profiles"(user_id) ON DELETE CASCADE NOT NULL,
    synth_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create coai-teams table
CREATE TABLE IF NOT EXISTS "coai-teams" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES "coai-profiles"(user_id) ON DELETE CASCADE NOT NULL,
    team_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create coai-team-synths junction table
CREATE TABLE IF NOT EXISTS "coai-team-synths" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES "coai-teams"(id) ON DELETE CASCADE NOT NULL,
    synth_id UUID REFERENCES "coai-synths"(id) ON DELETE CASCADE,
    synth_reference JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create coai-threads table
CREATE TABLE IF NOT EXISTS "coai-threads" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES "coai-profiles"(user_id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES "coai-teams"(id) ON DELETE SET NULL,
    thread_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create coai-messages table
CREATE TABLE IF NOT EXISTS "coai-messages" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID REFERENCES "coai-threads"(id) ON DELETE CASCADE NOT NULL,
    message_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);



-- Create indexes for better query performance
CREATE INDEX idx_coai_profiles_user_id ON "coai-profiles"(user_id);
CREATE INDEX idx_coai_synths_user_id ON "coai-synths"(user_id);
CREATE INDEX idx_coai_teams_user_id ON "coai-teams"(user_id);
CREATE INDEX idx_coai_team_synths_team_id ON "coai-team-synths"(team_id);
CREATE INDEX idx_coai_team_synths_synth_id ON "coai-team-synths"(synth_id);
CREATE INDEX idx_coai_threads_user_id ON "coai-threads"(user_id);
CREATE INDEX idx_coai_threads_team_id ON "coai-threads"(team_id);
CREATE INDEX idx_coai_messages_thread_id ON "coai-messages"(thread_id);

-- Create JSONB indexes for common queries
CREATE INDEX idx_coai_profiles_data ON "coai-profiles" USING GIN (profile_data);
CREATE INDEX idx_coai_synths_data ON "coai-synths" USING GIN (synth_data);
CREATE INDEX idx_coai_teams_data ON "coai-teams" USING GIN (team_data);
CREATE INDEX idx_coai_team_synths_reference ON "coai-team-synths" USING GIN (synth_reference);
CREATE INDEX idx_coai_threads_data ON "coai-threads" USING GIN (thread_data);
CREATE INDEX idx_coai_messages_data ON "coai-messages" USING GIN (message_data);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_coai_profiles_updated_at BEFORE UPDATE ON "coai-profiles"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coai_synths_updated_at BEFORE UPDATE ON "coai-synths"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coai_teams_updated_at BEFORE UPDATE ON "coai-teams"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coai_threads_updated_at BEFORE UPDATE ON "coai-threads"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE "coai-profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coai-synths" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coai-teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coai-team-synths" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coai-threads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coai-messages" ENABLE ROW LEVEL SECURITY; 