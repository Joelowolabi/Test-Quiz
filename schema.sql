-- Run this in your Supabase SQL Editor

-- 1. Create tests table
CREATE TABLE tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  source_content TEXT,
  time_limit INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create questions table
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL
);

-- 3. Create submissions table
CREATE TABLE submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  answers JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Row Level Security (RLS) policies
-- Enable RLS
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access to tests and questions (so students can take tests)
CREATE POLICY "Allow anonymous read tests" ON tests FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read questions" ON questions FOR SELECT USING (true);

-- Allow anonymous insert to tests, questions, and submissions (so teacher can create and students can submit without auth)
-- In a real app, teacher routes would be protected via an auth user, but since we are using a simple password in the UI, we allow insert here.
CREATE POLICY "Allow anonymous insert tests" ON tests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous insert questions" ON questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous insert submissions" ON submissions FOR INSERT WITH CHECK (true);

-- Allow anonymous read to submissions (so teacher dashboard can fetch them)
CREATE POLICY "Allow anonymous read submissions" ON submissions FOR SELECT USING (true);
