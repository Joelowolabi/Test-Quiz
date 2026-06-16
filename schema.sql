-- Run this in your Supabase SQL Editor

-- 1. Create folders table
CREATE TABLE folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create tests table
CREATE TABLE tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  source_content TEXT,
  time_limit INTEGER DEFAULT 30,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'published' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create questions table
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL
);

-- 4. Create submissions table
CREATE TABLE submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE NOT NULL,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  answers JSONB NOT NULL,
  result_released BOOLEAN DEFAULT false NOT NULL,
  result_requested BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Row Level Security (RLS) policies
-- Enable RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Folders policies
CREATE POLICY "Users can manage their own folders" ON folders 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Tests policies
CREATE POLICY "Users can manage their own tests" ON tests 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow anonymous read tests" ON tests 
  FOR SELECT USING (true);

-- Questions policies
CREATE POLICY "Allow anonymous read questions" ON questions 
  FOR SELECT USING (true);

CREATE POLICY "Allow test owners to manage questions" ON questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tests 
      WHERE tests.id = questions.test_id AND tests.user_id = auth.uid()
    )
  );

-- Submissions policies
CREATE POLICY "Allow anonymous insert submissions" ON submissions 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read submissions" ON submissions 
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous update submissions" ON submissions 
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow test owners to manage submissions" ON submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tests 
      WHERE tests.id = submissions.test_id AND tests.user_id = auth.uid()
    )
  );
