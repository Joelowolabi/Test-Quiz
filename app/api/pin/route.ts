import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { uuidToPin } from '@/lib/pin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code')?.trim().replace(/\s+/g, '');

    if (!code) {
      return NextResponse.json({ error: 'Please enter a valid PIN or test code.' }, { status: 400 });
    }

    // 1. If it looks like a UUID, search directly
    if (code.includes('-') && code.length >= 32) {
      const { data } = await supabase.from('tests').select('id, title').eq('id', code).single();
      if (data) {
        return NextResponse.json({ testId: data.id, title: data.title });
      }
    }

    // 2. Fetch all published tests and match by 6-digit PIN or ID prefix
    const { data: tests, error } = await supabase
      .from('tests')
      .select('id, title, status')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error || !tests) {
      return NextResponse.json({ error: 'Could not search tests.' }, { status: 500 });
    }

    const matchedTest = tests.find(t => {
      const pin = uuidToPin(t.id);
      return pin === code || t.id.toLowerCase().startsWith(code.toLowerCase());
    });

    if (matchedTest) {
      return NextResponse.json({ testId: matchedTest.id, title: matchedTest.title });
    }

    return NextResponse.json({ error: 'Quiz not found. Please check the PIN and try again.' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
