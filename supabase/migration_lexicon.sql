-- ==========================================
-- VeridLedger Lexicon Migration Script
-- ==========================================
-- This script safely updates your existing tables to use the new FinTech Lexicon
-- ('analyst' instead of 'capper', 'allocator' instead of 'bettor') without deleting your existing user!

-- 1. Update the 'profiles' table roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
UPDATE public.profiles SET role = 'analyst' WHERE role = 'capper';
UPDATE public.profiles SET role = 'allocator' WHERE role = 'bettor';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('allocator', 'analyst'));

-- 2. Rename columns in 'picks' table
ALTER TABLE public.picks RENAME COLUMN capper_id TO analyst_id;

-- 3. Rename columns in 'subscriptions' table
ALTER TABLE public.subscriptions RENAME COLUMN capper_id TO analyst_id;
ALTER TABLE public.subscriptions RENAME COLUMN bettor_id TO allocator_id;

-- 4. Update the RLS Policies for 'picks'
DROP POLICY IF EXISTS "Cappers can insert their own picks" ON public.picks;
CREATE POLICY "Analysts can insert their own picks" 
ON public.picks FOR INSERT 
WITH CHECK (auth.uid() = analyst_id);

-- 5. Update the RLS Policies for 'subscriptions'
DROP POLICY IF EXISTS "Users can read their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can read their own subscriptions" 
ON public.subscriptions FOR SELECT 
USING (auth.uid() = allocator_id OR auth.uid() = analyst_id);
