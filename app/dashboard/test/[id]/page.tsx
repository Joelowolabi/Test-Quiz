"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Copy, CheckCircle2, ArrowLeft, Users, BarChart3, Clock, Download, Printer, KeyRound, ShieldAlert, ShieldCheck, Loader2, Pencil, Trash2, RefreshCw, Plus, Radio, Save, X } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { uuidToPin, formatPin } from "@/lib/pin";

export default function TestDetailDashboard({ params }: { params: { id: string } }) {
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);
  const [liveMonitor, setLiveMonitor] = useState(true);

  // Question editing / management state
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ question_text: string; options: string[]; correct_answer: string }>({
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: "",
  });
  const [savingQ, setSavingQ] = useState(false);
  const [regeneratingQId, setRegeneratingQId] = useState<string | null>(null);
  const [isAddingQ, setIsAddingQ] = useState(false);
  const [newQForm, setNewQForm] = useState({
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: "",
  });

  const pin = uuidToPin(params.id);
  const formattedPin = formatPin(pin);

  useEffect(() => {
    fetchTestData();
  }, [params.id]);

  // Live Classroom Monitor: poll submissions every 10s when enabled
  useEffect(() => {
    if (!liveMonitor) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('submissions')
          .select('*')
          .eq('test_id', params.id)
          .order('created_at', { ascending: false });
        if (data) setSubmissions(data);
      } catch (e) {
        // Silent background refresh
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [liveMonitor, params.id]);

  const fetchTestData = async () => {
    try {
      const [testRes, qRes, subRes] = await Promise.all([
        supabase.from('tests').select('*').eq('id', params.id).single(),
        supabase.from('questions').select('*').eq('test_id', params.id),
        supabase.from('submissions').select('*').eq('test_id', params.id).order('created_at', { ascending: false })
      ]);

      if (testRes.data) setTest(testRes.data);
      if (qRes.data) setQuestions(qRes.data);
      if (subRes.data) setSubmissions(subRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAccess = async (submissionId: string) => {
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ result_released: true })
        .eq('id', submissionId);
        
      if (error) throw error;
      setSubmissions(prev => prev.map(sub => 
        sub.id === submissionId ? { ...sub, result_released: true } : sub
      ));
    } catch (err) {
      console.error("Error granting access", err);
    }
  };

  const startEditQuestion = (q: any) => {
    setEditingQId(q.id);
    setEditForm({
      question_text: q.question_text,
      options: Array.isArray(q.options) ? [...q.options] : ["", "", "", ""],
      correct_answer: q.correct_answer,
    });
  };

  const saveQuestionEdit = async (qId: string) => {
    if (!editForm.question_text.trim() || editForm.options.some(o => !o.trim()) || !editForm.correct_answer) {
      alert("Please fill in the question, all options, and select the correct answer.");
      return;
    }
    setSavingQ(true);
    try {
      const { error } = await supabase
        .from('questions')
        .update({
          question_text: editForm.question_text.trim(),
          options: editForm.options.map(o => o.trim()),
          correct_answer: editForm.correct_answer,
        })
        .eq('id', qId);

      if (error) throw error;
      setQuestions(prev => prev.map(q => q.id === qId ? { ...q, ...editForm } : q));
      setEditingQId(null);
    } catch (err: any) {
      alert(err.message || "Failed to update question.");
    } finally {
      setSavingQ(false);
    }
  };

  const deleteQuestion = async (qId: string) => {
    if (!confirm("Delete this question from the quiz?")) return;
    try {
      const { error } = await supabase.from('questions').delete().eq('id', qId);
      if (error) throw error;
      setQuestions(prev => prev.filter(q => q.id !== qId));
    } catch (err: any) {
      alert(err.message || "Failed to delete question.");
    }
  };

  const regenerateQuestion = async (q: any) => {
    setRegeneratingQId(q.id);
    try {
      const contextText = test?.source_content && !test.source_content.startsWith('Uploaded File') && test.source_content !== 'Manually Created'
        ? `${test.source_content}\n\nGenerate 1 brand-new alternative question (different from: "${q.question_text}").`
        : `Topic: ${test?.title || 'General Knowledge'}. Generate 1 brand-new question at the same level as: "${q.question_text}".`;

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: contextText,
          count: 1,
          type: 'text',
          difficulty: 'Medium',
          questionType: q.options?.length === 2 ? 'True/False' : 'Multiple Choice',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.questions?.[0]) {
        throw new Error(data.error || "Failed to regenerate question.");
      }

      const newQ = data.questions[0];
      const { error } = await supabase
        .from('questions')
        .update({
          question_text: newQ.question,
          options: newQ.options,
          correct_answer: newQ.correctAnswer,
        })
        .eq('id', q.id);

      if (error) throw error;
      setQuestions(prev => prev.map(item => item.id === q.id ? {
        ...item,
        question_text: newQ.question,
        options: newQ.options,
        correct_answer: newQ.correctAnswer,
      } : item));
    } catch (err: any) {
      alert(err.message || "Failed to regenerate question.");
    } finally {
      setRegeneratingQId(null);
    }
  };

  const addNewQuestion = async () => {
    if (!newQForm.question_text.trim() || newQForm.options.some(o => !o.trim()) || !newQForm.correct_answer) {
      alert("Please fill in the question, all 4 options, and select the correct answer.");
      return;
    }
    setSavingQ(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .insert([{
          test_id: params.id,
          question_text: newQForm.question_text.trim(),
          options: newQForm.options.map(o => o.trim()),
          correct_answer: newQForm.correct_answer,
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) setQuestions(prev => [...prev, data]);
      setNewQForm({ question_text: "", options: ["", "", "", ""], correct_answer: "" });
      setIsAddingQ(false);
    } catch (err: any) {
      alert(err.message || "Failed to add question.");
    } finally {
      setSavingQ(false);
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/test/${params.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyPin = () => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const exportToCSV = () => {
    if (submissions.length === 0) {
      alert("No submissions to export.");
      return;
    }

    const headers = ["Student Name", "Email Address", "Score", "Total Questions", "Percentage", "Tab Switches", "Date Submitted"];
    const rows = submissions.map(sub => {
      const pct = Math.round((sub.score / sub.total_questions) * 100);
      const tabSwitches = sub.answers?._telemetry?.tab_switches ?? 0;
      const date = new Date(sub.created_at).toLocaleString();
      return [
        `"${sub.student_name.replace(/"/g, '""')}"`,
        `"${sub.student_email.replace(/"/g, '""')}"`,
        sub.score,
        sub.total_questions,
        `"${pct}%"`,
        tabSwitches,
        `"${date}"`
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const sanitizedTitle = (test?.title || "quiz").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    link.setAttribute("download", `${sanitizedTitle}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-slate-700 font-sans">
        <div className="animate-pulse flex items-center gap-3 font-bold text-sm">
          <Loader2 className="animate-spin text-[#0c1322]" size={20} /> Loading assessment analytics...
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="p-8 text-center text-slate-900 font-sans">
        <p className="text-xl font-extrabold mb-4">Quiz not found.</p>
        <Link href="/dashboard" className="px-5 py-2.5 bg-[#0c1322] text-white rounded-full font-bold text-xs">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const averageScore = submissions.length > 0
    ? (submissions.reduce((acc, curr) => acc + (curr.score / curr.total_questions), 0) / submissions.length) * 100
    : 0;

  // Grade distribution
  const scoreDistribution = submissions.reduce((acc: any, curr) => {
    const percent = Math.round((curr.score / curr.total_questions) * 100);
    let grade = "F";
    if (percent >= 90) grade = "A";
    else if (percent >= 80) grade = "B";
    else if (percent >= 70) grade = "C";
    else if (percent >= 60) grade = "D";
    
    acc[grade]++;
    return acc;
  }, { "A": 0, "B": 0, "C": 0, "D": 0, "F": 0 });

  const chartData = ["A", "B", "C", "D", "F"].map(key => ({
    name: key,
    students: scoreDistribution[key]
  }));

  // Find hardest question
  const questionStats = questions.map(q => {
    let incorrectCount = 0;
    submissions.forEach(sub => {
      const studentAnswer = sub.answers && sub.answers[q.id];
      if (studentAnswer !== q.correct_answer) {
        incorrectCount++;
      }
    });
    return {
      id: q.id,
      text: q.question_text,
      incorrectCount,
      failRate: submissions.length > 0 ? (incorrectCount / submissions.length) * 100 : 0
    };
  });

  const hardestQuestion = questionStats.sort((a, b) => b.incorrectCount - a.incorrectCount)[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans">
      {/* Top Action Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 print:hidden">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 font-bold transition-colors bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm text-xs"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs transition-all shadow-sm"
            title="Download CSV spreadsheet"
          >
            <Download size={14} className="text-emerald-600" /> Export CSV
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs transition-all shadow-sm"
            title="Print test or save as PDF"
          >
            <Printer size={14} className="text-slate-600" /> Print Worksheet
          </button>
        </div>
      </div>

      {/* Hero Header Card (Midnight Navy) */}
      <div className="bg-[#0c1322] text-white p-7 sm:p-10 rounded-[2.5rem] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative overflow-hidden shadow-xl">
        <div className="relative z-10">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#fbbf24] bg-white/10 px-3 py-1 rounded-full mb-3 inline-block">
            ● Active Assessment
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2 text-white">
            {test.title}
          </h1>
          <p className="text-slate-400 font-medium text-xs sm:text-sm">
            Created on {new Date(test.created_at).toLocaleDateString()} • {questions.length} Calibrated Questions
          </p>
        </div>

        {/* Quick Classroom Join Controls */}
        <div className="relative z-10 flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Projectable 6-Digit PIN */}
          <div className="bg-[#16233f] border border-white/10 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-4 shadow-md">
            <div>
              <p className="text-[10px] text-[#fbbf24] font-black uppercase tracking-widest flex items-center gap-1">
                <KeyRound size={11} /> Class PIN
              </p>
              <p className="text-2xl font-mono font-extrabold tracking-widest text-white mt-0.5">
                {formattedPin}
              </p>
            </div>
            <button 
              onClick={copyPin}
              className="w-9 h-9 bg-white/10 hover:bg-[#fbbf24] text-white hover:text-slate-950 rounded-xl flex items-center justify-center transition-all"
              title="Copy 6-digit PIN"
            >
              {copiedPin ? <CheckCircle2 size={16} className="text-[#fbbf24]" /> : <Copy size={16} />}
            </button>
          </div>

          {/* Student Link Box */}
          <div className="bg-[#16233f] border border-white/10 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-4 shadow-md">
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Direct Link</p>
              <p className="text-xs font-mono font-medium truncate max-w-[130px] text-slate-200">
                .../test/{params.id.slice(0, 8)}
              </p>
            </div>
            <button 
              onClick={copyLink}
              className="w-9 h-9 bg-white/10 hover:bg-white text-white hover:text-slate-950 rounded-xl flex items-center justify-center transition-all"
              title="Copy link"
            >
              {copiedLink ? <CheckCircle2 size={16} className="text-white" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid md:grid-cols-4 gap-6 print:hidden">
        {/* Stats */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center border border-amber-200/60">
              <Users size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submissions</p>
              <p className="text-2xl font-extrabold text-[#0c1322]">{submissions.length}</p>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center border border-emerald-200/60">
              <BarChart3 size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Score</p>
              <p className="text-2xl font-extrabold text-[#0c1322]">{averageScore.toFixed(1)}%</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center border border-slate-200">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hardest Question</p>
              <p className="text-sm font-extrabold text-[#0c1322] truncate max-w-[140px]">
                {hardestQuestion ? hardestQuestion.text : "N/A"}
              </p>
              <p className="text-[11px] text-red-600 font-bold">
                {hardestQuestion ? `${hardestQuestion.failRate.toFixed(0)}% Missed` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Score Chart */}
        <div className="md:col-span-3 bg-white p-6 rounded-[2rem] border border-slate-200/90 shadow-sm">
          <h3 className="text-base font-extrabold mb-4 flex items-center gap-2 text-[#0c1322]">
            <BarChart3 size={18} className="text-[#0c1322]" /> Score Distribution (Grades A-F)
          </h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 700}} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: 'rgba(0,0,0,0.03)'}}
                  contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#0c1322'}}
                  itemStyle={{color: '#0c1322', fontWeight: 'bold'}}
                />
                <Bar dataKey="students" radius={[6, 6, 6, 6]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 4 ? '#ef4444' : '#0c1322'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Student Results List */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200/90 shadow-sm print:hidden">
          <h3 className="text-base font-extrabold mb-5 flex items-center justify-between text-[#0c1322]">
            <span className="flex items-center gap-2">
              <Users size={18} className="text-[#0c1322]" /> Student Submissions ({submissions.length})
            </span>
            <button
              type="button"
              onClick={() => setLiveMonitor(prev => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                liveMonitor
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
              title="Toggle 10-second live auto-refresh"
            >
              <Radio size={11} className={liveMonitor ? 'animate-pulse text-emerald-600' : ''} />
              {liveMonitor ? 'Live (10s)' : 'Paused'}
            </button>
          </h3>
          
          {submissions.length === 0 ? (
            <p className="text-slate-400 text-xs font-medium py-8 text-center">No students have submitted this quiz yet.</p>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub, idx) => {
                const tabSwitches = sub.answers?._telemetry?.tab_switches ?? 0;

                return (
                  <div key={sub.id} className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 transition-all hover:bg-slate-50">
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedSubmission(expandedSubmission === sub.id ? null : sub.id)}>
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold ${idx === 0 ? 'bg-[#0c1322] text-[#fbbf24] shadow-sm' : 'bg-white text-slate-700 border border-slate-200'}`}>
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-extrabold text-slate-900 text-sm">{sub.student_name}</p>
                            {tabSwitches > 0 ? (
                              <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <ShieldAlert size={10} /> {tabSwitches} switches
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <ShieldCheck size={10} /> Focused
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-medium">{sub.student_email}</p>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1">
                        <p className="font-extrabold text-base text-[#0c1322]">
                          {sub.score}<span className="text-xs text-slate-500">/{sub.total_questions}</span>
                        </p>
                        
                        {sub.result_released ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">Released</span>
                        ) : sub.result_requested ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">Requested</span>
                            <button
                              onClick={() => handleGrantAccess(sub.id)}
                              className="text-xs font-bold text-white bg-[#0c1322] hover:bg-[#182542] px-2.5 py-0.5 rounded-full"
                            >
                              Grant
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">Hidden</span>
                        )}

                        <p className="text-[10px] text-slate-400 font-medium flex items-center justify-end gap-1 mt-0.5">
                          <Clock size={10} /> {new Date(sub.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>

                    {/* Expanded Student Responses */}
                    {expandedSubmission === sub.id && (
                      <div className="mt-3.5 border-t border-slate-200 pt-3.5 space-y-2.5">
                        {questions.map((q, i) => {
                          const studentAnswer = sub.answers && sub.answers[q.id];
                          const isCorrect = studentAnswer === q.correct_answer;
                          return (
                            <div key={q.id} className="p-3 bg-white rounded-xl border border-slate-200">
                              <p className="font-extrabold text-xs text-slate-900 mb-1.5">
                                <span className="text-[#0c1322] mr-1">Q{i+1}.</span>{q.question_text}
                              </p>
                              <div className="flex flex-wrap gap-2 items-center text-xs">
                                <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                  {isCorrect ? 'Correct' : 'Incorrect'}
                                </span>
                                <span className="text-slate-600 text-xs">
                                  Answer: <span className={isCorrect ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>{studentAnswer || "No Answer"}</span>
                                </span>
                                {!isCorrect && (
                                  <span className="text-slate-500 text-xs">
                                    Correct: <span className="text-emerald-700 font-bold">{q.correct_answer}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Questions List / Printable Layout */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200/90 shadow-sm print:border-none print:p-0 print:bg-white print:text-black">
          <div className="hidden print:block mb-8">
            <h1 className="text-2xl font-black mb-2">{test.title}</h1>
            <p className="text-sm text-gray-600 mb-4">Name: _______________________ Date: ______________ Score: ______ / {questions.length}</p>
            <hr className="border-gray-300" />
          </div>

          <div className="flex items-center justify-between mb-5 print:hidden">
            <h3 className="text-base font-extrabold flex items-center gap-2 text-[#0c1322]">
              <CheckCircle2 size={18} className="text-[#0c1322]" /> Test Questions ({questions.length})
            </h3>
            <button
              type="button"
              onClick={() => setIsAddingQ(prev => !prev)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#0c1322] hover:bg-[#182542] text-white text-xs font-bold transition-all"
            >
              {isAddingQ ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Add Question</>}
            </button>
          </div>

          {isAddingQ && (
            <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 print:hidden">
              <p className="text-xs font-extrabold text-[#0c1322] uppercase tracking-wider">Add New Question</p>
              <input
                type="text"
                value={newQForm.question_text}
                onChange={(e) => setNewQForm({ ...newQForm, question_text: e.target.value })}
                placeholder="Question text..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-[#0c1322]"
              />
              <div className="grid grid-cols-2 gap-2">
                {newQForm.options.map((opt, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...newQForm.options];
                      updated[idx] = e.target.value;
                      setNewQForm({ ...newQForm, options: updated });
                    }}
                    placeholder={`Option ${idx + 1}`}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 outline-none focus:border-[#0c1322]"
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={newQForm.correct_answer}
                  onChange={(e) => setNewQForm({ ...newQForm, correct_answer: e.target.value })}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:border-[#0c1322]"
                >
                  <option value="">Select Correct Answer</option>
                  {newQForm.options.map((opt, idx) => (
                    <option key={idx} value={opt}>{opt || `Option ${idx + 1}`}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addNewQuestion}
                  disabled={savingQ}
                  className="px-4 py-1.5 bg-[#0c1322] text-white rounded-lg text-xs font-bold hover:bg-[#182542] disabled:opacity-50"
                >
                  {savingQ ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}
          
          <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-1 print:max-h-none print:overflow-visible">
            {questions.map((q, i) => {
              const isEditing = editingQId === q.id;
              const isRegenerating = regeneratingQId === q.id;

              return (
                <div key={q.id} className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl print:border-b print:border-gray-200 print:bg-white print:text-black print:rounded-none">
                  {isEditing ? (
                    <div className="space-y-2.5 print:hidden">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-extrabold text-[#0c1322]">Editing Q{i + 1}</span>
                        <button type="button" onClick={() => setEditingQId(null)} className="text-xs font-bold text-slate-500 hover:text-slate-800">Cancel</button>
                      </div>
                      <input
                        type="text"
                        value={editForm.question_text}
                        onChange={(e) => setEditForm({ ...editForm, question_text: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-[#0c1322]"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        {editForm.options.map((opt, idx) => (
                          <input
                            key={idx}
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const updated = [...editForm.options];
                              const oldVal = updated[idx];
                              updated[idx] = e.target.value;
                              setEditForm({
                                ...editForm,
                                options: updated,
                                correct_answer: editForm.correct_answer === oldVal ? e.target.value : editForm.correct_answer,
                              });
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 outline-none focus:border-[#0c1322]"
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={editForm.correct_answer}
                          onChange={(e) => setEditForm({ ...editForm, correct_answer: e.target.value })}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:border-[#0c1322]"
                        >
                          <option value="">Select Correct Answer</option>
                          {editForm.options.map((opt, idx) => (
                            <option key={idx} value={opt}>{opt || `Option ${idx + 1}`}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => saveQuestionEdit(q.id)}
                          disabled={savingQ}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-[#0c1322] text-white rounded-lg text-xs font-bold hover:bg-[#182542] disabled:opacity-50"
                        >
                          <Save size={12} /> {savingQ ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <p className="font-extrabold text-xs sm:text-sm text-slate-900 print:text-black leading-relaxed">
                          <span className="text-[#0c1322] mr-1.5 font-black">Q{i+1}.</span>{q.question_text}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0 print:hidden">
                          <button
                            type="button"
                            onClick={() => regenerateQuestion(q)}
                            disabled={isRegenerating}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-40"
                            title="Regenerate question with AI"
                          >
                            <RefreshCw size={13} className={isRegenerating ? 'animate-spin' : ''} />
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditQuestion(q)}
                            className="p-1.5 text-slate-500 hover:text-[#0c1322] hover:bg-slate-200/70 rounded-lg transition-colors"
                            title="Edit question"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteQuestion(q.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete question"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5 pl-4">
                        {q.options.map((opt: string, j: number) => {
                          const letter = String.fromCharCode(65 + j);
                          return (
                            <div key={j} className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-2 ${opt === q.correct_answer ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300' : 'bg-white text-slate-600 border border-slate-200'}`}>
                              <span className="font-bold">{letter}.</span> {opt}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
