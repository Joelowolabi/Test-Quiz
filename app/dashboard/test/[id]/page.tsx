"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Copy, CheckCircle2, ArrowLeft, Users, BarChart3, Clock, Download, Printer, KeyRound, ShieldAlert, ShieldCheck } from "lucide-react";
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

  const pin = uuidToPin(params.id);
  const formattedPin = formatPin(pin);

  useEffect(() => {
    fetchTestData();
  }, [params.id]);

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
      <div className="flex items-center justify-center p-20 text-white">
        <div className="animate-pulse flex items-center gap-3">Loading dashboard analytics...</div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="p-8 text-center text-white">
        <p className="text-xl font-bold mb-4">Test not found.</p>
        <Link href="/dashboard" className="px-5 py-2.5 bg-young-purple rounded-xl font-bold">
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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Action Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 print:hidden">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white font-bold transition-colors bg-white/5 px-4 py-2 rounded-full border border-white/5 hover:bg-white/10">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs transition-all shadow-md"
            title="Download CSV spreadsheet"
          >
            <Download size={14} className="text-young-green" /> Export CSV
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs transition-all shadow-md"
            title="Print test or save as PDF"
          >
            <Printer size={14} className="text-young-purple" /> Print Worksheet
          </button>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="bg-[#111] text-white p-8 md:p-12 rounded-[3rem] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-young-purple/20 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-young-green/10 blur-[80px] rounded-full pointer-events-none"></div>

        <div className="z-10">
          <span className="text-xs font-black uppercase tracking-widest text-young-green bg-young-green/10 px-3 py-1 rounded-full border border-young-green/20 mb-3 inline-block">
            Active Quiz
          </span>
          <h1 className="text-3xl md:text-5xl font-black mb-2">{test.title}</h1>
          <p className="text-gray-400 font-medium">Created on {new Date(test.created_at).toLocaleDateString()} • {questions.length} Questions</p>
        </div>

        {/* Quick Classroom Join Controls */}
        <div className="z-10 flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Projectable 6-Digit PIN */}
          <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-xl">
            <div>
              <p className="text-[10px] text-young-green font-black uppercase tracking-widest flex items-center gap-1">
                <KeyRound size={12} /> Class PIN
              </p>
              <p className="text-2xl font-mono font-black tracking-widest text-white">
                {formattedPin}
              </p>
            </div>
            <button 
              onClick={copyPin}
              className="w-10 h-10 bg-white/10 hover:bg-young-green text-white hover:text-black rounded-xl flex items-center justify-center transition-all border border-white/10"
              title="Copy 6-digit PIN"
            >
              {copiedPin ? <CheckCircle2 size={18} className="text-young-green" /> : <Copy size={18} />}
            </button>
          </div>

          {/* Student Link Box */}
          <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-xl">
            <div>
              <p className="text-[10px] text-young-purple font-black uppercase tracking-widest mb-1">Direct Link</p>
              <p className="text-xs font-mono font-medium truncate max-w-[140px] text-gray-300">
                .../test/{params.id.slice(0, 8)}
              </p>
            </div>
            <button 
              onClick={copyLink}
              className="w-10 h-10 bg-white/10 hover:bg-young-purple text-white rounded-xl flex items-center justify-center transition-all border border-white/10"
              title="Copy link"
            >
              {copiedLink ? <CheckCircle2 size={18} className="text-young-purple" /> : <Copy size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid md:grid-cols-4 gap-6 print:hidden">
        {/* Stats */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-[#111] p-6 rounded-[2rem] border border-white/5 shadow-lg flex items-center gap-5 relative overflow-hidden group">
            <div className="w-14 h-14 bg-young-orange/10 text-young-orange rounded-2xl flex items-center justify-center border border-young-orange/20 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
              <Users size={28} />
            </div>
            <div className="relative z-10">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Submissions</p>
              <p className="text-3xl font-black text-white">{submissions.length}</p>
            </div>
          </div>
          
          <div className="bg-[#111] p-6 rounded-[2rem] border border-white/5 shadow-lg flex items-center gap-5 relative overflow-hidden group">
            <div className="w-14 h-14 bg-young-green/10 text-young-green rounded-2xl flex items-center justify-center border border-young-green/20 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
              <BarChart3 size={28} />
            </div>
            <div className="relative z-10">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Average Score</p>
              <p className="text-3xl font-black text-white">{averageScore.toFixed(1)}%</p>
            </div>
          </div>

          <div className="bg-[#111] p-6 rounded-[2rem] border border-white/5 shadow-lg flex items-center gap-5 relative overflow-hidden group">
            <div className="w-14 h-14 bg-young-purple/10 text-young-purple rounded-2xl flex items-center justify-center border border-young-purple/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <CheckCircle2 size={28} />
            </div>
            <div className="relative z-10">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Hardest Question</p>
              <p className="text-base font-black text-white truncate max-w-[150px]">
                {hardestQuestion ? hardestQuestion.text : "N/A"}
              </p>
              <p className="text-xs text-red-400 font-medium">
                {hardestQuestion ? `${hardestQuestion.failRate.toFixed(0)}% Missed` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Score Chart */}
        <div className="md:col-span-3 bg-[#111] p-6 rounded-[2rem] border border-white/5 shadow-lg">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
            <BarChart3 size={20} className="text-young-purple" /> Score Distribution (Grades A-F)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12, fontWeight: 600}} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#0a0a0a', color: '#fff'}}
                  itemStyle={{color: '#4ade80', fontWeight: 'bold'}}
                />
                <Bar dataKey="students" radius={[8, 8, 8, 8]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#4ade80' : index === 4 ? '#ef4444' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Student Results List */}
        <div className="bg-[#111] p-6 rounded-[2rem] border border-white/5 shadow-lg print:hidden">
          <h3 className="text-lg font-bold mb-6 flex items-center justify-between text-white">
            <span className="flex items-center gap-2">
              <Users size={20} className="text-young-orange" /> Student Submissions ({submissions.length})
            </span>
          </h3>
          
          {submissions.length === 0 ? (
            <p className="text-gray-500 text-sm font-medium py-8 text-center">No students have submitted this quiz yet.</p>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub, idx) => {
                const tabSwitches = sub.answers?._telemetry?.tab_switches ?? 0;

                return (
                  <div key={sub.id} className="bg-[#0a0a0a] rounded-2xl border border-white/5 hover:border-young-purple/30 transition-colors p-4 group">
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedSubmission(expandedSubmission === sub.id ? null : sub.id)}>
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-young-orange text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-orange-300 text-black' : 'bg-white/5 text-gray-500'}`}>
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white group-hover:text-young-purple transition-colors text-sm">{sub.student_name}</p>
                            {tabSwitches > 0 ? (
                              <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20 inline-flex items-center gap-1">
                                <ShieldAlert size={10} /> {tabSwitches} switches
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-young-green bg-young-green/10 px-2 py-0.5 rounded-full border border-young-green/20 inline-flex items-center gap-1">
                                <ShieldCheck size={10} /> Focused
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 font-medium">{sub.student_email}</p>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1">
                        <p className="font-black text-lg text-young-green">
                          {sub.score}<span className="text-xs text-gray-500">/{sub.total_questions}</span>
                        </p>
                        
                        {sub.result_released ? (
                          <span className="text-[10px] font-bold text-young-green bg-young-green/10 px-2 py-0.5 rounded-full border border-young-green/20">Released</span>
                        ) : sub.result_requested ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-young-orange bg-young-orange/10 px-2 py-0.5 rounded-full border border-young-orange/20">Requested</span>
                            <button
                              onClick={() => handleGrantAccess(sub.id)}
                              className="text-xs font-bold text-white bg-young-purple hover:bg-young-purple/80 px-2 py-0.5 rounded-full"
                            >
                              Grant
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">Hidden</span>
                        )}

                        <p className="text-[10px] text-gray-500 font-medium flex items-center justify-end gap-1 mt-0.5">
                          <Clock size={10} /> {new Date(sub.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>

                    {/* Expanded Student Responses */}
                    {expandedSubmission === sub.id && (
                      <div className="mt-4 border-t border-white/5 pt-4 space-y-3">
                        {questions.map((q, i) => {
                          const studentAnswer = sub.answers && sub.answers[q.id];
                          const isCorrect = studentAnswer === q.correct_answer;
                          return (
                            <div key={q.id} className="p-3 bg-black/40 rounded-xl border border-white/5">
                              <p className="font-bold text-xs text-white mb-2">
                                <span className="text-young-purple mr-1">Q{i+1}.</span>{q.question_text}
                              </p>
                              <div className="flex flex-wrap gap-2 items-center text-xs">
                                <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${isCorrect ? 'bg-young-green/20 text-young-green border border-young-green/20' : 'bg-red-400/20 text-red-400 border border-red-400/20'}`}>
                                  {isCorrect ? 'Correct' : 'Incorrect'}
                                </span>
                                <span className="text-gray-400 text-xs">
                                  Answer: <span className={isCorrect ? 'text-young-green font-bold' : 'text-red-400 font-bold'}>{studentAnswer || "No Answer"}</span>
                                </span>
                                {!isCorrect && (
                                  <span className="text-gray-400 text-xs">
                                    Correct: <span className="text-young-green font-bold">{q.correct_answer}</span>
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
        <div className="bg-[#111] p-6 rounded-[2rem] border border-white/5 shadow-lg print:border-none print:p-0 print:bg-white print:text-black">
          <div className="hidden print:block mb-8">
            <h1 className="text-2xl font-black mb-2">{test.title}</h1>
            <p className="text-sm text-gray-600 mb-4">Name: _______________________ Date: ______________ Score: ______ / {questions.length}</p>
            <hr className="border-gray-300" />
          </div>

          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white print:hidden">
            <CheckCircle2 size={20} className="text-young-green" /> Test Questions ({questions.length})
          </h3>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar print:max-h-none print:overflow-visible">
            {questions.map((q, i) => (
              <div key={q.id} className="p-5 bg-[#0a0a0a] border border-white/5 rounded-2xl print:border-b print:border-gray-200 print:bg-white print:text-black print:rounded-none">
                <p className="font-bold text-sm mb-4 text-white print:text-black leading-relaxed">
                  <span className="text-young-purple mr-2 text-base print:text-black">Q{i+1}.</span>{q.question_text}
                </p>
                <div className="space-y-2 pl-6">
                  {q.options.map((opt: string, j: number) => {
                    const letter = String.fromCharCode(65 + j);
                    return (
                      <div key={j} className={`text-xs px-3.5 py-2 rounded-xl font-medium flex items-center gap-2 ${opt === q.correct_answer ? 'bg-young-green/10 text-young-green border border-young-green/20 print:font-bold print:text-black' : 'bg-white/5 text-gray-400 border border-transparent print:text-gray-700'}`}>
                        <span className="font-bold">{letter}.</span> {opt}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
