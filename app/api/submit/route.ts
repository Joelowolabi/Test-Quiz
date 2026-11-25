import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      testId,
      studentName,
      studentEmail,
      answers = {},
      tabSwitches = 0,
      disqualified = false,
    } = body;

    if (!testId || !studentName || !studentEmail) {
      return NextResponse.json(
        { error: 'Missing required student or test information.' },
        { status: 400 }
      );
    }

    const cleanName = String(studentName).trim();
    const cleanEmail = String(studentEmail).trim().toLowerCase();

    // 1. Server-side duplicate submission guard
    const { data: existingSub } = await supabase
      .from('submissions')
      .select('id, score, total_questions')
      .eq('test_id', testId)
      .eq('student_email', cleanEmail)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingSub && existingSub.length > 0) {
      const { data: lbData } = await supabase
        .from('submissions')
        .select('student_name, score')
        .eq('test_id', testId)
        .order('score', { ascending: false })
        .limit(5);

      return NextResponse.json(
        {
          alreadySubmitted: true,
          submissionId: existingSub[0].id,
          score: existingSub[0].score,
          totalQuestions: existingSub[0].total_questions,
          leaderboard: lbData || [],
        },
        { status: 200 }
      );
    }

    // 2. Fetch authoritative questions + correct_answer on the server
    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('id, question_text, options, correct_answer')
      .eq('test_id', testId);

    if (qError || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'Could not load quiz questions for grading.' },
        { status: 404 }
      );
    }

    // 3. Grade server-side
    let calculatedScore = 0;
    const review = questions.map((q) => {
      const selected = answers[q.id] || null;
      const isCorrect = selected === q.correct_answer;
      if (isCorrect) calculatedScore++;
      return {
        id: q.id,
        questionText: q.question_text,
        selectedAnswer: selected,
        correctAnswer: q.correct_answer,
        isCorrect,
      };
    });

    const submissionAnswers = {
      ...answers,
      _telemetry: {
        tab_switches: Number(tabSwitches) || 0,
        disqualified_for_tab_switching: Boolean(disqualified),
        completed_at: new Date().toISOString(),
      },
    };

    // 4. Insert submission
    const { data: inserted, error: insertError } = await supabase
      .from('submissions')
      .insert([
        {
          test_id: testId,
          student_name: cleanName,
          student_email: cleanEmail,
          score: calculatedScore,
          total_questions: questions.length,
          answers: submissionAnswers,
        },
      ])
      .select('id')
      .single();

    if (insertError) {
      throw insertError;
    }

    // 5. Fetch updated top-5 leaderboard
    const { data: lbData } = await supabase
      .from('submissions')
      .select('student_name, score')
      .eq('test_id', testId)
      .order('score', { ascending: false })
      .limit(5);

    return NextResponse.json({
      submissionId: inserted?.id || null,
      score: calculatedScore,
      totalQuestions: questions.length,
      leaderboard: lbData || [],
      review,
    });
  } catch (err: any) {
    console.error('Server-side grading error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to submit assessment.' },
      { status: 500 }
    );
  }
}
