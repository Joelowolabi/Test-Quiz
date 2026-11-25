import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const testId = params.id;
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email')?.trim().toLowerCase();

    // If checking whether a student already submitted
    if (email) {
      const { data: existingSub } = await supabase
        .from('submissions')
        .select('id, score, total_questions, created_at')
        .eq('test_id', testId)
        .eq('student_email', email)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingSub && existingSub.length > 0) {
        const { data: lb } = await supabase
          .from('submissions')
          .select('student_name, score')
          .eq('test_id', testId)
          .order('score', { ascending: false })
          .limit(5);

        return NextResponse.json({
          alreadySubmitted: true,
          submission: existingSub[0],
          leaderboard: lb || [],
        });
      }

      return NextResponse.json({ alreadySubmitted: false });
    }

    // Fetch test metadata (omit source_content) and questions (omit correct_answer!)
    const [testRes, qRes] = await Promise.all([
      supabase
        .from('tests')
        .select('id, title, time_limit, created_at')
        .eq('id', testId)
        .single(),
      supabase
        .from('questions')
        .select('id, test_id, question_text, options')
        .eq('test_id', testId),
    ]);

    if (testRes.error || !testRes.data) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    return NextResponse.json({
      test: testRes.data,
      questions: qRes.data || [],
    });
  } catch (err: any) {
    console.error('Error loading quiz:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to load quiz' },
      { status: 500 }
    );
  }
}
