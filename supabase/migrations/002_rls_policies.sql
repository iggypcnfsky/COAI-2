-- RLS Policies for COAI Tables

-- =============================================
-- PROFILES POLICIES
-- =============================================

-- Users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON "coai-profiles"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON "coai-profiles"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON "coai-profiles"
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- SYNTHS POLICIES
-- =============================================

-- Users can only access their own custom synths
CREATE POLICY "Users can view own synths" ON "coai-synths"
    FOR SELECT USING (
        auth.uid() = user_id
    );

CREATE POLICY "Users can insert own synths" ON "coai-synths"
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "Users can update own synths" ON "coai-synths"
    FOR UPDATE USING (
        auth.uid() = user_id
    );

CREATE POLICY "Users can delete own synths" ON "coai-synths"
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- =============================================
-- TEAMS POLICIES
-- =============================================

-- Users can access their own teams
CREATE POLICY "Users can view own teams" ON "coai-teams"
    FOR SELECT USING (
        auth.uid() = user_id
    );

CREATE POLICY "Users can insert own teams" ON "coai-teams"
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "Users can update own teams" ON "coai-teams"
    FOR UPDATE USING (
        auth.uid() = user_id
    );

CREATE POLICY "Users can delete own teams" ON "coai-teams"
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- =============================================
-- TEAM-SYNTHS POLICIES
-- =============================================

-- Users can access team-synth relationships for their own teams
CREATE POLICY "Users can view own team-synths" ON "coai-team-synths"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "coai-teams" 
            WHERE "coai-teams".id = team_id 
            AND "coai-teams".user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own team-synths" ON "coai-team-synths"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "coai-teams" 
            WHERE "coai-teams".id = team_id 
            AND "coai-teams".user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own team-synths" ON "coai-team-synths"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "coai-teams" 
            WHERE "coai-teams".id = team_id 
            AND "coai-teams".user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own team-synths" ON "coai-team-synths"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "coai-teams" 
            WHERE "coai-teams".id = team_id 
            AND "coai-teams".user_id = auth.uid()
        )
    );

-- =============================================
-- THREADS POLICIES
-- =============================================

-- Users can only access their own threads
CREATE POLICY "Users can view own threads" ON "coai-threads"
    FOR SELECT USING (
        auth.uid() = user_id
    );

CREATE POLICY "Users can insert own threads" ON "coai-threads"
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "Users can update own threads" ON "coai-threads"
    FOR UPDATE USING (
        auth.uid() = user_id
    );

CREATE POLICY "Users can delete own threads" ON "coai-threads"
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- =============================================
-- MESSAGES POLICIES
-- =============================================

-- Users can only access messages from their own threads
CREATE POLICY "Users can view own messages" ON "coai-messages"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "coai-threads" 
            WHERE "coai-threads".id = thread_id 
            AND "coai-threads".user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own messages" ON "coai-messages"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "coai-threads" 
            WHERE "coai-threads".id = thread_id 
            AND "coai-threads".user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own messages" ON "coai-messages"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "coai-threads" 
            WHERE "coai-threads".id = thread_id 
            AND "coai-threads".user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own messages" ON "coai-messages"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "coai-threads" 
            WHERE "coai-threads".id = thread_id 
            AND "coai-threads".user_id = auth.uid()
        )
    ); 