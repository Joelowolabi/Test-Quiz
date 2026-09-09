"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowRight, ArrowLeft, CheckCircle2, Circle, Sparkles, Clock, Trophy, Star, ShieldAlert, KeyRound } from "lucide-react";
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
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [resultRequested, setResultRequested] = useState(false);
  const [resultReleased, setResultReleased] = useState(true);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    fetchTestData();
  }, [params.id]);

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

  // Anti-Cheat: Visibility change tracking
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && step === "test") {
        setCheatWarnings(prev => prev + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [step]);

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
      if (qRes.data) {
        const shuffled = [...qRes.data].sort(() => Math.random() - 0.5);
        setQuestions(shuffled);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentName.trim() && studentEmail.trim()) {
      setStep("test");
    }
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
      submitTest();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Keyboard Shortcuts (1-4, A-D, Enter, F)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (step !== "test" || !questions[currentQuestionIndex]) return;

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
      if (answers[currentQ.id]) {
        handleNext();
      }
    }
  }, [step, questions, currentQuestionIndex, answers]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const submitTest = async () => {
    setIsSubmitting(true);
    try {
      let calculatedScore = 0;
      questions.forEach(q => {
        if (answers[q.id] === q.correct_answer) {
          calculatedScore++;
        }
      });
      setScore(calculatedScore);

      // Embed proctoring telemetry in the submission payload
      const submissionAnswers = {
        ...answers,
        _telemetry: {
          tab_switches: cheatWarnings,
          completed_at: new Date().toISOString()
        }
      };

      const { data } = await supabase.from('submissions').insert([{
        test_id: test.id,
        student_name: studentName,
        student_email: studentEmail,
        score: calculatedScore,
        total_questions: questions.length,
        answers: submissionAnswers
      }])
      .select()
      .single();

      if (data) setSubmissionId(data.id);

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
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl">
          <Sparkles className="animate-spin text-young-purple" /> Loading quiz room...
        </div>
      </div>
    );
  }

  if (!test || questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
        <div className="bg-[#141414] border border-white/10 p-8 rounded-3xl text-center max-w-md">
          <h2 className="text-2xl font-black mb-2">Quiz Not Found</h2>
          <p className="text-gray-400 mb-6">This test may have been removed or has no questions available.</p>
          <Link href="/" className="px-6 py-3 bg-young-purple font-bold rounded-xl text-white inline-block">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans relative selection:bg-young-purple selection:text-white">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800d_1px,transparent_1px),linear-gradient(to_bottom,#8080800d_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none"></div>

      {/* Navigation & Status Bar */}
      <nav className="p-4 md:p-6 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center backdrop-blur-xl bg-black/50 border border-white/10 rounded-full px-6 py-3 shadow-2xl">
          <Link href="/" className="font-black text-lg tracking-tighter flex items-center gap-2">
            <span className="text-white">YOUNG</span>
            <span className="text-young-purple">&amp;TEST</span>
          </Link>

          {step === "test" && (
            <div className="flex items-center gap-3">
              {cheatWarnings > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  <ShieldAlert size={14} /> Switches: {cheatWarnings}
                </div>
              )}

              {timeLeft !== null && (
                <div className={`text-xs font-mono font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border ${timeLeft < 60 ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' : 'bg-young-green/10 text-young-green border-young-green/20'}`}>
                  <Clock size={14} /> {formatTime(timeLeft)}
                </div>
              )}

              <div className="text-xs font-bold text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                {currentQuestionIndex + 1} / {questions.length}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Continuous Top Progress Line */}
      {step === "test" && (
        <div className="w-full bg-white/5 h-1.5">
          <motion.div 
            className="h-full bg-gradient-to-r from-young-green via-young-purple to-[#818cf8]"
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
              className="bg-[#141414] p-8 md:p-12 rounded-[2.5rem] border border-white/10 max-w-lg w-full text-center relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-young-green via-young-purple to-young-orange"></div>
              
              <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 text-young-green px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                <Sparkles size={13} /> Classroom Quiz
              </span>
              
              <h1 className="text-3xl md:text-4xl font-black mb-3 text-white">{test.title}</h1>
              <p className="text-gray-400 text-sm font-medium mb-8">
                {questions.length} questions • {test.time_limit > 0 ? `${test.time_limit} min limit` : 'No time limit'}
              </p>
              
              <form onSubmit={handleStartTest} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Your Name</label>
                  <input 
                    type="text" required
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-young-purple focus:ring-2 focus:ring-young-purple/20 outline-none transition-all placeholder:text-gray-600 font-medium"
                    placeholder="e.g. Alex Johnson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Student Email</label>
                  <input 
                    type="email" required
                    value={studentEmail}
                    onChange={e => setStudentEmail(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white focus:border-young-purple focus:ring-2 focus:ring-young-purple/20 outline-none transition-all placeholder:text-gray-600 font-medium"
                    placeholder="alex@school.edu"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    className="w-full py-4 bg-gradient-to-r from-young-purple to-[#818cf8] hover:opacity-95 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Enter Assessment <ArrowRight size={18} />
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
              <div className="flex items-center justify-center gap-1.5 mb-6 overflow-x-auto py-2">
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
                          ? 'ring-2 ring-young-purple bg-young-purple text-white scale-110' 
                          : isFlag
                          ? 'bg-young-orange text-white'
                          : isAnswered
                          ? 'bg-young-green/30 text-young-green border border-young-green/50'
                          : 'bg-white/5 text-gray-500 hover:bg-white/10'
                      }`}
                      title={`Question ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Main Question Card */}
              <div className="bg-[#141414] p-6 md:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl relative">
                <div className="flex justify-between items-start gap-4 mb-6">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                    <span>Question {currentQuestionIndex + 1}</span>
                    <span>•</span>
                    <span className="text-young-purple">Press 1-4 or A-D</span>
                  </div>

                  <button
                    onClick={() => toggleFlag(questions[currentQuestionIndex].id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      flagged[questions[currentQuestionIndex].id]
                        ? 'bg-young-orange/20 text-young-orange border-young-orange/40'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                    }`}
                  >
                    <Star size={13} fill={flagged[questions[currentQuestionIndex].id] ? "currentColor" : "none"} />
                    {flagged[questions[currentQuestionIndex].id] ? 'Flagged' : 'Flag (F)'}
                  </button>
                </div>

                <h2 className="text-xl md:text-2xl font-bold mb-8 text-white leading-relaxed">
                  {questions[currentQuestionIndex].question_text}
                </h2>
                
                <div className="space-y-3">
                  {questions[currentQuestionIndex].options.map((option: string, i: number) => {
                    const isSelected = answers[questions[currentQuestionIndex].id] === option;
                    const letter = String.fromCharCode(65 + i);

                    return (
                      <motion.button
                        key={i}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleSelectOption(questions[currentQuestionIndex].id, option)}
                        className={`w-full text-left p-4 md:p-5 rounded-2xl border transition-all flex items-center gap-4 ${
                          isSelected 
                            ? 'border-young-purple bg-young-purple/10 text-white font-bold shadow-[0_0_20px_rgba(99,102,241,0.2)]' 
                            : 'border-white/5 bg-white/5 hover:bg-white/10 text-gray-300 font-medium'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'bg-young-purple text-white shadow-md' 
                            : 'bg-white/10 text-gray-400'
                        }`}>
                          {letter}
                        </span>
                        <span className="flex-1 text-sm md:text-base">{option}</span>
                        {isSelected ? <CheckCircle2 size={20} className="text-young-purple flex-shrink-0" /> : <Circle size={20} className="text-gray-600 flex-shrink-0" />}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Footer Controls */}
                <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
                  <button 
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0 || isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-colors"
                  >
                    <ArrowLeft size={16} /> Previous
                  </button>

                  <button 
                    onClick={handleNext}
                    disabled={!answers[questions[currentQuestionIndex].id] || isSubmitting}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-young-purple hover:bg-young-purple/90 text-white disabled:opacity-40 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                  >
                    {isSubmitting ? 'Submitting...' : currentQuestionIndex === questions.length - 1 ? 'Finish Test' : 'Next Question'}
                    <ArrowRight size={16} />
                  </button>
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
              className="bg-[#141414] p-8 md:p-12 rounded-[3rem] border border-white/10 shadow-2xl max-w-xl w-full text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-young-green via-young-purple to-young-orange"></div>
              
              <div className="w-20 h-20 bg-young-green/20 border border-young-green/30 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(74,222,128,0.3)]">
                <span className="text-3xl">🎉</span>
              </div>
              <h2 className="text-3xl font-black mb-1 text-white">Assessment Finished!</h2>
              <p className="text-gray-400 text-sm font-medium mb-8">Great effort, {studentName.split(' ')[0]}.</p>
              
              {resultReleased ? (
                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl mb-8">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Final Score</p>
                  <p className="text-6xl font-black text-young-green">
                    {score}<span className="text-2xl text-gray-500">/{questions.length}</span>
                  </p>
                  <p className="text-sm font-bold mt-2 text-gray-300">
                    {Math.round((score / questions.length) * 100)}% Accuracy
                  </p>
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl mb-8">
                  <p className="text-base font-bold text-white mb-2">Results are currently hidden by the teacher.</p>
                  <p className="text-xs text-gray-400 mb-6">Your answers have been securely recorded.</p>
                  {resultRequested ? (
                    <div className="text-xs font-bold text-young-purple bg-young-purple/10 py-2.5 px-4 rounded-xl border border-young-purple/20">
                      Request sent. Awaiting teacher release...
                    </div>
                  ) : (
                    <button
                      onClick={handleRequestResult}
                      className="w-full py-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-sm transition-all border border-white/10"
                    >
                      Request Score Release
                    </button>
                  )}
                </div>
              )}

              {leaderboard.length > 0 && (
                <div className="bg-white/5 border border-white/10 text-left p-6 rounded-3xl mb-8">
                  <h3 className="font-bold flex items-center gap-2 mb-4 text-white text-base">
                    <Trophy size={18} className="text-young-orange" /> Class Leaderboard
                  </h3>
                  <div className="space-y-2.5">
                    {leaderboard.map((entry, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                            idx === 0 ? 'bg-young-orange text-white' : idx === 1 ? 'bg-gray-400 text-black' : idx === 2 ? 'bg-orange-400/50 text-white' : 'bg-white/10 text-gray-400'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-bold text-sm text-gray-200">{entry.student_name}</span>
                        </div>
                        <span className="font-black text-sm text-young-green">{entry.score} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <Link href="/" className="inline-flex items-center gap-2 px-8 py-3 bg-white/10 hover:bg-white/15 text-white font-bold text-sm rounded-xl transition-all border border-white/10">
                Back to Homepage
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
