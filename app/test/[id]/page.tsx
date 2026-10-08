"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowRight, ArrowLeft, CheckCircle2, Circle, Sparkles, Clock, Trophy, Star, ShieldAlert, ShieldCheck, KeyRound, Send, AlertCircle, Zap, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

export default function StudentTestPage({ params }: { params: { id: string } }) {
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [step, setStep] = useState<"onboarding" | "test" | "result">("onboarding");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSubmission, setIsCheckingSubmission] = useState(false);
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [resultRequested, setResultRequested] = useState(false);
  const [resultReleased, setResultReleased] = useState(true);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [showForceSubmitModal, setShowForceSubmitModal] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);

  // Anti-Cheat: Tab Switching Enforcement (3-Strike System)
  const MAX_TAB_SWITCHES = 3;
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false);
  const lastSwitchTimeRef = useRef(0);

  useEffect(() => {
    fetchTestData();
  }, [params.id]);

  // Session auto-save: persist answers and progress so refresh/sleep never resets questions
  useEffect(() => {
    if (step === "test" && studentEmail) {
      try {
        const sessionPayload = {
          studentName,
          studentEmail: studentEmail.trim().toLowerCase(),
          answers,
          currentQuestionIndex,
          flagged,
          timeLeft,
          cheatWarnings,
          step: "test",
          isCompleted: false,
          questionOrder: questions.map(q => q.id),
          updatedAt: Date.now()
        };
        localStorage.setItem(`quiz_session_${params.id}`, JSON.stringify(sessionPayload));
      } catch (e) {
        // Storage access error handling
      }
    }
  }, [step, studentName, studentEmail, answers, currentQuestionIndex, flagged, timeLeft, cheatWarnings, questions, params.id]);

  // Prevent accidental page reloads/tab close while taking test
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (step === "test" && !isSubmitting) {
        e.preventDefault();
        e.returnValue = "Assessment in progress. Your answers may be lost if you leave.";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [step, isSubmitting]);

  useEffect(() => {
    if (step === "test" && timeLeft === null && test?.time_limit > 0) {
      setTimeLeft(test.time_limit * 60); 
    }
  }, [step, test, timeLeft]);

  useEffect(() => {
    if (step === "test" && timeLeft !== null && timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(prev => prev! - 1), 1000);
      return () => clearTimeout(timerId);
    } else if (step === "test" && timeLeft === 0 && !isSubmitting) {
      submitTest();
    }
  }, [timeLeft, step, isSubmitting]);

  // Anti-Cheat: Visibility change and window blur enforcement
  useEffect(() => {
    const handleTabViolation = () => {
      if (step !== "test" || isSubmitting) return;

      const now = Date.now();
      // Debounce so rapid events (blur + visibilitychange) only count once per 1.5 seconds
      if (now - lastSwitchTimeRef.current < 1500) return;
      lastSwitchTimeRef.current = now;

      setCheatWarnings(prev => {
        const nextCount = prev + 1;
        if (nextCount >= MAX_TAB_SWITCHES) {
          // Exceeded allowed tab switches: immediately lock and submit test
          submitTest(true);
        } else {
          setShowTabSwitchWarning(true);
        }
        return nextCount;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleTabViolation();
      }
    };

    const handleBlur = () => {
      handleTabViolation();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [step, isSubmitting]);

  // Confetti when result is shown
  useEffect(() => {
    if (step === "result") {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // Fallback safely if canvas not available
      }
    }
  }, [step]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const fetchTestData = async () => {
    try {
      const [testRes, qRes] = await Promise.all([
        supabase.from('tests').select('*').eq('id', params.id).single(),
        supabase.from('questions').select('*').eq('test_id', params.id)
      ]);

      if (testRes.data) setTest(testRes.data);

      if (qRes.data && qRes.data.length > 0) {
        let ordered = [...qRes.data];

        // Check if there is a saved local session for this quiz
        try {
          const savedSessionRaw = localStorage.getItem(`quiz_session_${params.id}`);
          if (savedSessionRaw) {
            const saved = JSON.parse(savedSessionRaw);

            // If user already finished this test on this device, restore results immediately
            if (saved.isCompleted) {
              setStudentName(saved.studentName || "");
              setStudentEmail(saved.studentEmail || "");
              setScore(saved.score || 0);
              setSubmissionId(saved.submissionId || null);
              setQuestions(ordered);
              setStep("result");

              // Load leaderboard
              const { data: lb } = await supabase
                .from('submissions')
                .select('student_name, score')
                .eq('test_id', params.id)
                .order('score', { ascending: false })
                .limit(5);
              if (lb) setLeaderboard(lb);

              setLoading(false);
              return;
            }

            // Restore consistent question ordering so questions don't jump around
            if (saved.questionOrder && Array.isArray(saved.questionOrder)) {
              const map = new Map(qRes.data.map((q: any) => [q.id, q]));
              const restoredOrder = saved.questionOrder.map((id: string) => map.get(id)).filter(Boolean);
              if (restoredOrder.length === qRes.data.length) {
                ordered = restoredOrder;
              }
            }

            // Restore active quiz progress
            if (saved.step === "test") {
              setStudentName(saved.studentName || "");
              setStudentEmail(saved.studentEmail || "");
              setAnswers(saved.answers || {});
              setCurrentQuestionIndex(saved.currentQuestionIndex || 0);
              setFlagged(saved.flagged || {});
              if (typeof saved.timeLeft === 'number') setTimeLeft(saved.timeLeft);
              if (typeof saved.cheatWarnings === 'number') setCheatWarnings(saved.cheatWarnings);
              setStep("test");
              setSessionRestored(true);
              setTimeout(() => setSessionRestored(false), 4000);
            }
          } else {
            // First time load: deterministically shuffle
            ordered.sort(() => Math.random() - 0.5);
          }
        } catch (storageErr) {
          console.error("Storage parse error:", storageErr);
        }

        setQuestions(ordered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = studentName.trim();
    const cleanEmail = studentEmail.trim().toLowerCase();

    if (!cleanName || !cleanEmail) return;

    setIsCheckingSubmission(true);
    try {
      // Duplicate submission guard: check if this student has already submitted this test
      const { data: existingSub, error } = await supabase
        .from('submissions')
        .select('id, score, total_questions')
        .eq('test_id', params.id)
        .eq('student_email', cleanEmail)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingSub && existingSub.length > 0) {
        const sub = existingSub[0];
        setScore(sub.score);
        setSubmissionId(sub.id);
        setStep("result");

        try {
          localStorage.setItem(`quiz_session_${params.id}`, JSON.stringify({
            studentName: cleanName,
            studentEmail: cleanEmail,
            score: sub.score,
            submissionId: sub.id,
            isCompleted: true,
            step: "result"
          }));
        } catch (e) {}

        const { data: lb } = await supabase
          .from('submissions')
          .select('student_name, score')
          .eq('test_id', params.id)
          .order('score', { ascending: false })
          .limit(5);
        if (lb) setLeaderboard(lb);

        alert(`You have already completed this test with a score of ${sub.score}/${sub.total_questions || questions.length}. Retakes are not permitted.`);
        setIsCheckingSubmission(false);
        return;
      }
    } catch (err) {
      console.error("Error checking existing submissions:", err);
    } finally {
      setIsCheckingSubmission(false);
    }

    setStep("test");
  };

  const handleSelectOption = (questionId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const toggleFlag = (questionId: string) => {
    setFlagged(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Reached the final question: check if all questions are answered
      const unanswered = questions.filter(q => !answers[q.id]).length;
      if (unanswered > 0) {
        setShowForceSubmitModal(true);
      } else {
        submitTest();
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const jumpToFirstUnanswered = () => {
    const firstUnansweredIndex = questions.findIndex(q => !answers[q.id]);
    if (firstUnansweredIndex !== -1) {
      setCurrentQuestionIndex(firstUnansweredIndex);
    }
    setShowForceSubmitModal(false);
  };

  // Keyboard Shortcuts (1-4, A-D, Enter, F)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (step !== "test" || !questions[currentQuestionIndex] || showForceSubmitModal) return;

    const currentQ = questions[currentQuestionIndex];
    const key = e.key.toUpperCase();

    // Option shortcuts
    const optionMap: Record<string, number> = {
      '1': 0, 'A': 0,
      '2': 1, 'B': 1,
      '3': 2, 'C': 2,
      '4': 3, 'D': 3,
    };

    if (key in optionMap) {
      const optIdx = optionMap[key];
      if (currentQ.options && currentQ.options[optIdx]) {
        handleSelectOption(currentQ.id, currentQ.options[optIdx]);
      }
    } else if (key === 'F') {
      toggleFlag(currentQ.id);
    } else if (e.key === 'Enter') {
      handleNext();
    }
  }, [step, questions, currentQuestionIndex, answers, showForceSubmitModal]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const submitTest = async (isAutoDisqualified = false) => {
    setIsSubmitting(true);
    setShowForceSubmitModal(false);
    setShowTabSwitchWarning(false);
    try {
      let calculatedScore = 0;
      questions.forEach(q => {
        if (answers[q.id] === q.correct_answer) {
          calculatedScore++;
        }
      });
      setScore(calculatedScore);

      const finalSwitches = isAutoDisqualified ? Math.max(cheatWarnings, MAX_TAB_SWITCHES) : cheatWarnings;

      // Embed proctoring telemetry in the submission payload
      const submissionAnswers = {
        ...answers,
        _telemetry: {
          tab_switches: finalSwitches,
          disqualified_for_tab_switching: isAutoDisqualified,
          completed_at: new Date().toISOString()
        }
      };

      const cleanEmail = studentEmail.trim().toLowerCase();

      const { data } = await supabase.from('submissions').insert([{
        test_id: test.id,
        student_name: studentName,
        student_email: cleanEmail,
        score: calculatedScore,
        total_questions: questions.length,
        answers: submissionAnswers
      }])
      .select()
      .single();

      if (data) setSubmissionId(data.id);

      // Save completed state to localStorage so retakes and refreshes permanently stay on result screen
      try {
        localStorage.setItem(`quiz_session_${params.id}`, JSON.stringify({
          studentName,
          studentEmail: cleanEmail,
          score: calculatedScore,
          submissionId: data?.id,
          step: "result",
          isCompleted: true,
          disqualified: isAutoDisqualified,
          tabSwitches: finalSwitches,
          completedAt: new Date().toISOString()
        }));
      } catch (e) {}

      // Fetch Leaderboard
      const { data: lbData } = await supabase
        .from('submissions')
        .select('student_name, score')
        .eq('test_id', test.id)
        .order('score', { ascending: false })
        .limit(5);
        
      if (lbData) setLeaderboard(lbData);

      setStep("result");
    } catch (err) {
      console.error("Error submitting test", err);
      alert("There was an error submitting your test.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestResult = async () => {
    if (!submissionId) return;
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ result_requested: true })
        .eq('id', submissionId);
        
      if (error) throw error;
      setResultRequested(true);
    } catch (err) {
      console.error("Error requesting result", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-800 font-sans">
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-6 py-4 rounded-2xl shadow-sm">
          <Loader2 className="animate-spin text-[#0c1322]" size={20} />
          <span className="text-sm font-bold text-slate-700">Loading quiz room...</span>
        </div>
      </div>
    );
  }

  if (!test || questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-white border border-slate-200 p-8 rounded-3xl text-center max-w-md shadow-sm">
          <h2 className="text-2xl font-extrabold mb-2 text-[#0c1322]">Quiz Not Found</h2>
          <p className="text-slate-500 mb-6 text-sm font-medium">This assessment may have been removed or has no questions available.</p>
          <Link href="/" className="px-6 py-3 bg-[#0c1322] hover:bg-[#182542] font-bold rounded-full text-white text-xs inline-block shadow-md">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans relative selection:bg-[#fbbf24] selection:text-slate-900">
      {/* Navigation & Status Bar */}
      <nav className="p-4 md:p-6 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center backdrop-blur-xl bg-white/90 border border-slate-200 rounded-full px-5 sm:px-6 py-3 shadow-sm">
          <Link href="/" className="font-black text-lg tracking-tight flex items-center gap-2 text-[#0c1322]">
            <div className="w-8 h-8 rounded-full bg-[#0c1322] flex items-center justify-center text-white shadow-sm">
              <Zap size={15} className="text-[#fbbf24] fill-[#fbbf24]" />
            </div>
            <span>
              Young<span className="text-[#f59e0b]">&amp;</span>Test
            </span>
          </Link>

          {step === "test" && (
            <div className="flex items-center gap-2 sm:gap-3">
              {cheatWarnings > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                  <ShieldAlert size={13} /> Switches: {cheatWarnings}/3
                </div>
              )}

              {timeLeft !== null && (
                <div className={`text-xs font-mono font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border ${
                  timeLeft < 60 
                    ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' 
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}>
                  <Clock size={13} /> {formatTime(timeLeft)}
                </div>
              )}

              <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                {currentQuestionIndex + 1} / {questions.length}
              </div>

              <button
                type="button"
                onClick={() => setShowForceSubmitModal(true)}
                disabled={isSubmitting}
                className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                title="Finish and submit test early"
              >
                <Send size={11} /> <span className="hidden sm:inline">Force</span> Submit
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Session Restored Toast */}
      {sessionRestored && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#0c1322] text-white border border-slate-800 px-5 py-2.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={15} className="text-[#fbbf24]" /> Active test progress restored.
        </div>
      )}

      {/* Continuous Top Progress Line */}
      {step === "test" && (
        <div className="w-full bg-slate-200 h-1.5">
          <motion.div 
            className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-[#0c1322]"
            animate={{ width: `${progressPercent}%` }}
            transition={{ ease: "easeOut", duration: 0.3 }}
          />
        </div>
      )}

      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <AnimatePresence mode="wait">
          {/* ONBOARDING */}
          {step === "onboarding" && (
            <motion.div 
              key="onboarding"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white p-8 sm:p-11 rounded-[2.5rem] border border-slate-200 max-w-lg w-full text-center relative overflow-hidden shadow-sm"
            >
              <span className="inline-flex items-center gap-1.5 bg-[#fffbeb] border border-[#fde68a] text-[#b45309] px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                <Sparkles size={12} className="text-[#f59e0b]" /> Proctored Classroom Quiz
              </span>
              
              <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 text-[#0c1322]">{test.title}</h1>
              <p className="text-slate-500 text-xs sm:text-sm font-medium mb-7">
                {questions.length} questions • {test.time_limit > 0 ? `${test.time_limit} min limit` : 'No time limit'} • 3-strike tab proctoring
              </p>
              
              <form onSubmit={handleStartTest} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Your Full Name</label>
                  <input 
                    type="text" required
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-[#0c1322] focus:ring-2 focus:ring-[#0c1322]/10 outline-none transition-all placeholder:text-slate-400 font-medium text-sm"
                    placeholder="e.g. Alex Johnson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Student Email Address</label>
                  <input 
                    type="email" required
                    value={studentEmail}
                    onChange={e => setStudentEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-[#0c1322] focus:ring-2 focus:ring-[#0c1322]/10 outline-none transition-all placeholder:text-slate-400 font-medium text-sm"
                    placeholder="alex@school.edu"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={isCheckingSubmission}
                    className="w-full py-3.5 bg-[#0c1322] hover:bg-[#182542] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-slate-900/10 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 text-sm"
                  >
                    {isCheckingSubmission ? (
                      <><Loader2 size={16} className="animate-spin text-[#fbbf24]" /> Verifying...</>
                    ) : (
                      <>Enter Assessment <ArrowRight size={16} /></>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* TEST */}
          {step === "test" && (
            <motion.div 
              key="test"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl w-full"
              onCopy={(e) => { e.preventDefault(); }}
              onPaste={(e) => { e.preventDefault(); }}
              onContextMenu={(e) => e.preventDefault()}
              style={{ userSelect: "none" }}
            >
              {/* Question Navigation Dot Bar */}
              <div className="flex items-center justify-center gap-1.5 mb-5 overflow-x-auto py-2">
                {questions.map((q, idx) => {
                  const isAnswered = !!answers[q.id];
                  const isCurrent = idx === currentQuestionIndex;
                  const isFlag = !!flagged[q.id];

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                        isCurrent 
                          ? 'ring-2 ring-[#0c1322] bg-[#0c1322] text-white scale-110 shadow-sm' 
                          : isFlag
                          ? 'bg-amber-500 text-white'
                          : isAnswered
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'
                      }`}
                      title={`Question ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Main Question Card */}
              <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-slate-200/90 shadow-sm relative">
                <div className="flex justify-between items-start gap-4 mb-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                    <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                    <span>•</span>
                    <span className="text-[#0c1322] font-extrabold">Keys 1-4 / A-D</span>
                  </div>

                  <button
                    onClick={() => toggleFlag(questions[currentQuestionIndex].id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      flagged[questions[currentQuestionIndex].id]
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <Star size={12} fill={flagged[questions[currentQuestionIndex].id] ? "currentColor" : "none"} />
                    {flagged[questions[currentQuestionIndex].id] ? 'Flagged' : 'Flag (F)'}
                  </button>
                </div>

                <h2 className="text-lg sm:text-2xl font-extrabold mb-7 text-[#0c1322] leading-snug">
                  {questions[currentQuestionIndex].question_text}
                </h2>
                
                <div className="space-y-3">
                  {questions[currentQuestionIndex].options.map((option: string, i: number) => {
                    const isSelected = answers[questions[currentQuestionIndex].id] === option;
                    const letter = String.fromCharCode(65 + i);

                    return (
                      <motion.button
                        key={i}
                        whileHover={{ scale: 1.005 }}
                        whileTap={{ scale: 0.995 }}
                        onClick={() => handleSelectOption(questions[currentQuestionIndex].id, option)}
                        className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all flex items-center gap-3.5 ${
                          isSelected 
                            ? 'border-[#0c1322] bg-[#0c1322] text-white font-bold shadow-md' 
                            : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300 text-slate-800 font-semibold'
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'bg-white/20 text-white' 
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}>
                          {letter}
                        </span>
                        <span className="flex-1 text-sm sm:text-base leading-snug">{option}</span>
                        {isSelected ? (
                          <CheckCircle2 size={18} className="text-[#fbbf24] flex-shrink-0" />
                        ) : (
                          <Circle size={18} className="text-slate-300 flex-shrink-0" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Footer Controls */}
                <div className="mt-8 pt-5 border-t border-slate-100 flex flex-wrap justify-between items-center gap-3">
                  <button 
                    type="button"
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0 || isSubmitting}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  >
                    <ArrowLeft size={14} /> Previous
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForceSubmitModal(true)}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all active:scale-95 disabled:opacity-40"
                    >
                      <Send size={12} /> Force Submit
                    </button>

                    <button 
                      type="button"
                      onClick={handleNext}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs bg-[#0c1322] hover:bg-[#182542] text-white disabled:opacity-40 transition-all shadow-md shadow-slate-900/10"
                    >
                      {isSubmitting ? 'Submitting...' : currentQuestionIndex === questions.length - 1 ? 'Finish Assessment' : 'Next Question'}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* RESULT */}
          {step === "result" && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 sm:p-12 rounded-[2.5rem] border border-slate-200 shadow-sm max-w-xl w-full text-center relative overflow-hidden"
            >
              <div className="w-16 h-16 bg-[#fffbeb] border border-[#fde68a] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="text-2xl">🎉</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-1 text-[#0c1322]">Assessment Complete!</h2>
              <p className="text-slate-500 text-xs sm:text-sm font-medium mb-4">Well done, {studentName.split(' ')[0]}.</p>

              {/* Proctoring Integrity Summary */}
              <div className="mb-6 flex justify-center">
                {cheatWarnings >= MAX_TAB_SWITCHES ? (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                    <ShieldAlert size={14} /> Auto-Submitted: Exceeded {MAX_TAB_SWITCHES} Tab Switches
                  </div>
                ) : cheatWarnings > 0 ? (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                    <ShieldAlert size={14} /> Proctoring Notice: {cheatWarnings} Tab Switch(es)
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    <ShieldCheck size={14} /> Clean Record: 0 Tab Switches
                  </div>
                )}
              </div>
              
              {resultReleased ? (
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl mb-6">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Final Score</p>
                  <p className="text-5xl font-black text-[#0c1322]">
                    {score}<span className="text-xl text-slate-400">/{questions.length}</span>
                  </p>
                  <p className="text-xs font-bold mt-2 text-emerald-700">
                    {Math.round((score / questions.length) * 100)}% Accuracy
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl mb-6">
                  <p className="text-sm font-bold text-[#0c1322] mb-1">Results are currently locked by the teacher.</p>
                  <p className="text-xs text-slate-500 mb-4">Your responses have been recorded securely.</p>
                  {resultRequested ? (
                    <div className="text-xs font-bold text-[#0c1322] bg-slate-200 py-2 px-4 rounded-xl">
                      Release requested. Awaiting teacher approval.
                    </div>
                  ) : (
                    <button
                      onClick={handleRequestResult}
                      className="w-full py-2.5 bg-[#0c1322] hover:bg-[#182542] text-white font-bold rounded-xl text-xs transition-all"
                    >
                      Request Score Release
                    </button>
                  )}
                </div>
              )}

              {leaderboard.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 text-left p-5 rounded-2xl mb-6">
                  <h3 className="font-extrabold flex items-center gap-2 mb-3 text-[#0c1322] text-sm">
                    <Trophy size={16} className="text-amber-500" /> Class Leaderboard
                  </h3>
                  <div className="space-y-2">
                    {leaderboard.map((entry, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center font-extrabold text-[10px] ${
                            idx === 0 ? 'bg-[#0c1322] text-[#fbbf24]' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-800">{entry.student_name}</span>
                        </div>
                        <span className="font-black text-[#0c1322]">{entry.score} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <Link href="/" className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0c1322] hover:bg-[#182542] text-white font-bold text-xs rounded-full transition-all shadow-sm">
                Back to Homepage
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Force Submit Confirmation Modal */}
      <AnimatePresence>
        {showForceSubmitModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 max-w-md w-full text-center shadow-2xl relative"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-700 border border-red-200 flex items-center justify-center mx-auto mb-3 shadow-sm">
                <Send size={20} />
              </div>

              <h3 className="text-lg font-extrabold text-[#0c1322] mb-1">Turn in Assessment Early?</h3>
              <p className="text-xs text-slate-500 mb-5">
                You answered <span className="text-emerald-700 font-bold">{answeredCount}</span> of <span className="font-bold text-slate-900">{questions.length}</span> questions.
              </p>

              {questions.length - answeredCount > 0 ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 mb-5 text-left">
                  <p className="text-xs font-bold text-red-700 mb-0.5 flex items-center gap-1.5">
                    <AlertCircle size={14} /> {questions.length - answeredCount} Unanswered Question(s)
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Unanswered questions receive 0 points. Are you sure you want to finish and submit now?
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 mb-5 text-left">
                  <p className="text-xs font-bold text-emerald-800 mb-0.5 flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> All Questions Answered!
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Ready to submit and view your final score?
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                {questions.length - answeredCount > 0 ? (
                  <button
                    type="button"
                    onClick={jumpToFirstUnanswered}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                  >
                    Review Questions
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowForceSubmitModal(false)}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                  >
                    Back to Quiz
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => submitTest(false)}
                  disabled={isSubmitting}
                  className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Yes, Submit Now'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Anti-Cheat: Tab Switch Violation Modal */}
      <AnimatePresence>
        {showTabSwitchWarning && !isSubmitting && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white border-2 border-red-300 rounded-[2rem] p-6 md:p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <ShieldAlert size={28} className="animate-bounce" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-100 text-red-700 mb-3">
                Strike {cheatWarnings} of {MAX_TAB_SWITCHES}
              </div>

              <h3 className="text-xl font-extrabold text-[#0c1322] mb-1.5">Tab Switch Detected!</h3>
              
              <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                You navigated away from or minimized the exam tab. Navigating away is actively monitored by the proctor.
              </p>

              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 text-left">
                <p className="text-xs font-bold text-red-700 mb-1 flex items-center gap-1.5">
                  <AlertCircle size={14} /> Proctoring Policy
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  You have <span className="text-[#0c1322] font-bold">{Math.max(0, MAX_TAB_SWITCHES - cheatWarnings)}</span> warning(s) remaining. On your 3rd strike, the test will be <span className="text-red-700 font-bold">automatically locked and submitted</span>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowTabSwitchWarning(false)}
                className="w-full py-3 px-5 rounded-xl bg-[#0c1322] hover:bg-[#182542] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md hover:scale-[1.01] active:scale-[0.98]"
              >
                Return to Assessment
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
