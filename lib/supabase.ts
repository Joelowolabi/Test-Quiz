import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jksoiceqfrvxgqymsuop.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprc29pY2VxZnJ2eGdxeW1zdW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxOTg4OTAsImV4cCI6MjA5MTc3NDg5MH0.Zi8lVXb90W6txUfZ8sj81wQA4b2AGmi3BcUfPo9WOXs';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn("Supabase environment variables not set; using active project defaults.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
