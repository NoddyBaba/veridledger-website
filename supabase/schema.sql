-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. PROFILES TABLE & SECURITY
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('allocator', 'analyst')),
    stripe_account_id TEXT,
    bio TEXT,
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- In case the table already exists, add the column idempotently
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    action_type TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Idempotent Policy Creation (Drop first if they exist, then create)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON public.activity_logs;

CREATE POLICY "Users can view their own activity logs"
    ON public.activity_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity logs"
    ON public.activity_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 2. PICKS TABLE & SECURITY
-- ==========================================
CREATE TABLE IF NOT EXISTS public.picks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analyst_id UUID REFERENCES public.profiles(id) NOT NULL,
    sport TEXT NOT NULL,
    match_title TEXT NOT NULL,
    selection TEXT NOT NULL,
    odds NUMERIC NOT NULL,
    stake NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'LOCKED' CHECK (status IN ('LOCKED', 'WIN', 'LOSS', 'PUSH')),
    is_premium BOOLEAN DEFAULT FALSE NOT NULL,
    selection_metadata JSONB,
    game_start_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on picks
ALTER TABLE public.picks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view non-premium picks" ON public.picks;
DROP POLICY IF EXISTS "Analysts can view their own premium picks" ON public.picks;
DROP POLICY IF EXISTS "Subscribers can view premium picks" ON public.picks;
DROP POLICY IF EXISTS "Analysts can insert their own picks" ON public.picks;
DROP POLICY IF EXISTS "Cappers can insert their own picks" ON public.picks; -- Drop old policy if exists
DROP POLICY IF EXISTS "Admins can update picks" ON public.picks;

CREATE POLICY "Anyone can view non-premium picks"
ON public.picks FOR SELECT
USING (is_premium = FALSE);

CREATE POLICY "Analysts can view their own premium picks"
ON public.picks FOR SELECT
USING (auth.uid() = analyst_id);

CREATE POLICY "Subscribers can view premium picks"
ON public.picks FOR SELECT
USING (
  is_premium = TRUE AND
  EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE allocator_id = auth.uid()
    AND analyst_id = public.picks.analyst_id
    AND status = 'active'
  )
);

CREATE POLICY "Analysts can insert their own picks"
ON public.picks FOR INSERT
WITH CHECK (auth.uid() = analyst_id);

CREATE POLICY "Admins can update picks"
ON public.picks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  )
);

-- ==========================================
-- 3. SUBSCRIPTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    allocator_id UUID REFERENCES public.profiles(id) NOT NULL,
    analyst_id UUID REFERENCES public.profiles(id) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'canceled')),
    stripe_sub_id TEXT,
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(allocator_id, analyst_id)
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own subscriptions" ON public.subscriptions;

CREATE POLICY "Users can read their own subscriptions" 
ON public.subscriptions FOR SELECT 
USING (auth.uid() = allocator_id OR auth.uid() = analyst_id);

-- ==========================================
-- 4. PROOF ENGINE IMMUTABILITY LOCKS
-- ==========================================
CREATE OR REPLACE FUNCTION enforce_pick_immutability()
RETURNS TRIGGER AS $$
DECLARE
    is_user_admin BOOLEAN;
BEGIN
    SELECT is_admin INTO is_user_admin FROM public.profiles WHERE id = auth.uid();
    
    IF is_user_admin = TRUE THEN
        -- Admins can update status, but they shouldn't change the original pick details
        IF TG_OP = 'UPDATE' THEN
            IF NEW.analyst_id != OLD.analyst_id OR
               NEW.sport != OLD.sport OR
               NEW.match_title != OLD.match_title OR
               NEW.selection != OLD.selection OR
               NEW.odds != OLD.odds OR
               NEW.stake != OLD.stake OR
               NEW.game_start_time != OLD.game_start_time OR
               NEW.is_premium != OLD.is_premium THEN
                RAISE EXCEPTION 'Proof Engine: Admins can only update status, not pick details.';
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    -- Rule 1: Cannot modify if game_start_time is in the past
    IF OLD.game_start_time < NOW() THEN
        RAISE EXCEPTION 'Proof Engine: Cannot modify a pick after the game has started.';
    END IF;

    -- Rule 2: Cannot modify once status is 'LOCKED'
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'LOCKED' AND (
            NEW.analyst_id != OLD.analyst_id OR
            NEW.sport != OLD.sport OR
            NEW.match_title != OLD.match_title OR
            NEW.selection != OLD.selection OR
            NEW.odds != OLD.odds OR
            NEW.stake != OLD.stake OR
            NEW.game_start_time != OLD.game_start_time OR
            NEW.is_premium != OLD.is_premium OR
            NEW.status != OLD.status
        ) THEN
            RAISE EXCEPTION 'Proof Engine: Cannot modify pick details once LOCKED.';
        END IF;
    END IF;

    -- Rule 3: Cannot delete if LOCKED
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'LOCKED' THEN
            RAISE EXCEPTION 'Proof Engine: Cannot delete a LOCKED pick.';
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger first to avoid errors if run multiple times
DROP TRIGGER IF EXISTS pick_immutability_trigger ON public.picks;

CREATE TRIGGER pick_immutability_trigger
BEFORE UPDATE OR DELETE ON public.picks
FOR EACH ROW
EXECUTE FUNCTION enforce_pick_immutability();

-- ==========================================
-- 5. LIVE EVENTS (ODDS API CACHE)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.live_events (
    id TEXT PRIMARY KEY,
    sport_key TEXT NOT NULL,
    commence_time TIMESTAMPTZ NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    odds_data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.live_events ENABLE ROW LEVEL SECURITY;

-- Allow anyone to VIEW the live events
DROP POLICY IF EXISTS "Anyone can view live events" ON public.live_events;

CREATE POLICY "Anyone can view live events"
ON public.live_events FOR SELECT
USING (true);


-- ==========================================
-- 6. STORAGE & AVATARS
-- ==========================================

-- Note: The following requires executing as a superuser in Supabase
-- Create the avatars bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to avatars
CREATE POLICY "Public Avatar Viewing"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload avatars
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- ==========================================
-- 7. SUBSCRIPTIONS (MOCK FLOW POLICIES)
-- ==========================================

-- Allow allocators to insert their own subscriptions
CREATE POLICY "Allocators can insert subscriptions"
ON public.subscriptions FOR INSERT
WITH CHECK (auth.uid() = allocator_id);

-- Allow allocators to update their own subscriptions (e.g., cancel)
CREATE POLICY "Allocators can update their own subscriptions"
ON public.subscriptions FOR UPDATE
USING (auth.uid() = allocator_id);

