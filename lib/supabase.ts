import { createClient } from '@supabase/supabase-js'

const ACTIVE_URL = 'https://jksoiceqfrvxgqymsuop.supabase.co';
const ACTIVE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprc29pY2VxZnJ2eGdxeW1zdW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxOTg4OTAsImV4cCI6MjA5MTc3NDg5MH0.Zi8lVXb90W6txUfZ8sj81wQA4b2AGmi3BcUfPo9WOXs';

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ACTIVE_URL;
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ACTIVE_ANON_KEY;

// Safeguard: If Vercel has the old/dead project URL configured, override with the active project credentials
if (supabaseUrl.includes('sqnbjbpoztloazcprxkm') || !supabaseUrl.startsWith('http')) {
  supabaseUrl = ACTIVE_URL;
  supabaseAnonKey = ACTIVE_ANON_KEY;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
