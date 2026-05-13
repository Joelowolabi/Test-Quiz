"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowRight, CheckCircle2, Circle, Sparkles, Clock, Trophy } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentTestPage({ params }: { params: { id: string } }) {
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [step, setStep] = useState<"onboarding" | "test" | "result">("onboarding");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [resultRequested, setResultRequested] = useState(false);
  const [resultReleased, setResultReleased] = useState(false);
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

  // Basic Anti-Cheat: Page Visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && step === "test") {
        setCheatWarnings(prev => prev + 1);
        alert("Warning: You have switched tabs or minimized the browser. Doing this repeatedly may invalidate your test.");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [step]);

  useEffect(() => {
    let poller: any;
    if (step === "result" && !resultReleased && submissionId) {
      poller = setInterval(async () => {
        const { data } = await supabase
          .from('submissions')
          .select('result_released')
          .eq('id', submissionId)
          .single();
          
        if (data && data.result_released) {
          setResultReleased(true);
        }
      }, 5000);
    }
    return () => {
      if (poller) clearInterval(poller);
    };
  }, [step, resultReleased, submissionId]);

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
        // Shuffle questions
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
    if (studentName && studentEmail) {
      setStep("test");
    }
  };



  const handleSelectOption = (questionId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
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

  const submitTest = async () => {
    setIsSubmitting(true);
    try {
      // Calculate score
      let calculatedScore = 0;
      questions.forEach(q => {
        if (answers[q.id] === q.correct_answer) {
          calculatedScore++;
        }
      });
      setScore(calculatedScore);

      // Save to Supabase
      const { data, error } = await supabase.from('submissions').insert([{
        test_id: test.id,
        student_name: studentName,
        student_email: studentEmail,
        score: calculatedScore,
        total_questions: questions.length,
        answers: answers
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
    return <div className="min-h-screen flex items-center justify-center bg-young-purple text-white"><div className="animate-pulse flex items-center gap-2"><Sparkles className="animate-spin" /> Loading test...</div></div>;
  }

  if (!test || questions.length === 0) {
    return <div className="min-h-screen flex items-center justify-center">Test not found or has no questions.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <nav className="p-4 flex justify-between items-center max-w-4xl mx-auto w-full">
        <div className="font-black text-xl"><span className="text-young-purple">YOUNG</span>&amp;TEST</div>
        {step === "test" && (
          <div className="flex gap-4 items-center">
            {cheatWarnings > 0 && (
              <div className="text-xs font-bold px-3 py-1.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200">
                Warnings: {cheatWarnings}
              </div>
            )}
            {timeLeft !== null && (
              <div className={`text-sm font-bold px-4 py-2 rounded-full flex items-center gap-2 ${timeLeft < 60 ? 'bg-red-100 text-red-600 border border-red-200 shadow-sm' : 'bg-young-green/20 text-young-green border border-young-green/30 shadow-sm'}`}>
                <Clock size={16} /> {formatTime(timeLeft)}
              </div>
            )}
            <div className="text-sm font-bold bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1 flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {/* ONBOARDING */}
          {step === "onboarding" && (
            <motion.div 
              key="onboarding"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl border border-gray-100 max-w-xl w-full text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-young-green via-young-purple to-young-orange"></div>
              <h1 className="text-3xl font-black mb-2 text-young-black">{test.title}</h1>
              <p className="text-gray-500 font-medium mb-8">Enter your details to begin the assessment.</p>
              
              <form onSubmit={handleStartTest} className="space-y-4 text-left">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                  <input 
                    type="text" required
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    className="w-full px-5 py-3 rounded-xl border-2 border-gray-100 focus:border-young-purple outline-none transition-colors"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                  <input 
                    type="email" required
                    value={studentEmail}
                    onChange={e => setStudentEmail(e.target.value)}
                    className="w-full px-5 py-3 rounded-xl border-2 border-gray-100 focus:border-young-purple outline-none transition-colors"
                    placeholder="john@example.com"
                  />
                </div>
                <button type="submit" className="w-full btn-primary bg-young-purple hover:bg-young-black py-4 mt-4 text-lg">
                  Start Test <ArrowRight size={20} />
                </button>
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
              className="max-w-2xl w-full"
              onCopy={(e) => { e.preventDefault(); alert("Copying is disabled during the test."); }}
              onPaste={(e) => { e.preventDefault(); alert("Pasting is disabled during the test."); }}
              onContextMenu={(e) => e.preventDefault()}
              style={{ userSelect: "none" }}
            >
              <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-xl border border-gray-100">
                <h2 className="text-2xl md:text-3xl font-bold mb-8 leading-snug">
                  {questions[currentQuestionIndex].question_text}
                </h2>
                
                <div className="space-y-3">
                  {questions[currentQuestionIndex].options.map((option: string, i: number) => {
                    const isSelected = answers[questions[currentQuestionIndex].id] === option;
                    return (
                      <motion.button
                        key={i}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectOption(questions[currentQuestionIndex].id, option)}
                        className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                          isSelected 
                            ? 'border-young-purple bg-young-purple/5 text-young-purple font-bold' 
                            : 'border-gray-100 hover:border-gray-300 font-medium text-gray-700'
                        }`}
                      >
                        {isSelected ? <CheckCircle2 className="text-young-purple flex-shrink-0" /> : <Circle className="text-gray-300 flex-shrink-0" />}
                        {option}
                      </motion.button>
                    )
                  })}
                </div>

                <div className="mt-10 flex justify-between items-center">
                  <button 
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0 || isSubmitting}
                    className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                  >
                    Previous
                  </button>
                  <button 
                    onClick={handleNext}
                    disabled={!answers[questions[currentQuestionIndex].id] || isSubmitting}
                    className="btn-primary px-8 py-3 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting...' : currentQuestionIndex === questions.length - 1 ? 'Submit Test' : 'Next Question'}
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
              className="bg-young-green p-8 md:p-16 rounded-[3rem] shadow-2xl max-w-xl w-full text-center text-young-black relative overflow-hidden"
            >
              <div className="absolute inset-0 squiggle-bg opacity-20"></div>
              <div className="relative z-10">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-4xl">🎉</span>
                </div>
                <h2 className="text-3xl font-black mb-2">Test Completed!</h2>
                <p className="text-young-black/80 font-bold mb-8">Great job, {studentName.split(' ')[0]}.</p>
                
                {resultReleased ? (
                  <div className="bg-white/90 backdrop-blur p-8 rounded-3xl mb-8">
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Your Score</p>
                    <p className="text-6xl font-black text-young-purple">
                      {score}<span className="text-3xl text-gray-400">/{questions.length}</span>
                    </p>
                    <p className="text-lg font-bold mt-2 text-young-black">
                      {Math.round((score / questions.length) * 100)}%
                    </p>
                  </div>
                ) : (
                  <div className="bg-white/90 backdrop-blur p-8 rounded-3xl mb-8">
                    <p className="text-lg font-bold text-young-black mb-4">Results are hidden by the teacher.</p>
                    {resultRequested ? (
                      <p className="text-sm font-medium text-gray-500">Request sent. Waiting for teacher approval...</p>
                    ) : (
                      <button
                        onClick={handleRequestResult}
                        className="btn-primary w-full"
                      >
                        Ask to see my result
                      </button>
                    )}
                  </div>
                )}

                {leaderboard.length > 0 && (
                  <div className="bg-white text-left p-6 rounded-3xl mb-8 shadow-sm border border-gray-100 relative z-10">
                    <h3 className="font-bold flex items-center gap-2 mb-4 text-young-black text-xl">
                      <Trophy size={20} className="text-young-orange" /> Top Performers
                    </h3>
                    <div className="space-y-3">
                      {leaderboard.map((entry, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-young-orange text-white' : idx === 1 ? 'bg-gray-300 text-young-black' : idx === 2 ? 'bg-orange-200 text-orange-800' : 'bg-gray-200 text-gray-500'}`}>
                              {idx + 1}
                            </span>
                            <span className="font-bold text-young-black">{entry.student_name}</span>
                          </div>
                          <span className="font-black text-young-purple">{entry.score} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <Link href="/" className="btn-primary bg-white text-young-black hover:bg-young-black hover:text-white mx-auto inline-flex relative z-10">
                  Back to Home
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
