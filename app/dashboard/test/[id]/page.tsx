"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Copy, CheckCircle2, ArrowLeft, Users, BarChart3, Clock } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function TestDetailDashboard({ params }: { params: { id: string } }) {
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);

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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="animate-pulse flex space-x-4 p-8">Loading dashboard...</div>;
  }

  if (!test) {
    return <div>Test not found.</div>;
  }

  const averageScore = submissions.length > 0
    ? (submissions.reduce((acc, curr) => acc + (curr.score / curr.total_questions), 0) / submissions.length) * 100
    : 0;

  // Prepare chart data (Grade distribution)
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
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white font-bold transition-colors bg-white/5 px-4 py-2 rounded-full border border-white/5 hover:bg-white/10">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="bg-[#111] text-white p-8 md:p-12 rounded-[3rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-young-purple/20 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-young-green/10 blur-[80px] rounded-full pointer-events-none"></div>

        <div className="absolute -right-10 -top-10 opacity-[0.03] pointer-events-none">
          <BarChart3 size={300} />
        </div>
        
        <div className="z-10">
          <h1 className="text-3xl md:text-5xl font-black mb-2">{test.title}</h1>
          <p className="text-gray-400 font-medium">Created on {new Date(test.created_at).toLocaleDateString()}</p>
        </div>

        <div className="z-10 bg-black/40 backdrop-blur-xl border border-white/10 p-5 rounded-2xl flex items-center gap-5 shadow-2xl">
          <div>
            <p className="text-xs text-young-purple font-black uppercase tracking-widest mb-1">Student Link</p>
            <p className="text-sm font-medium truncate max-w-[200px] text-gray-300">
              .../test/{params.id.split('-')[0]}
            </p>
          </div>
          <button 
            onClick={copyLink}
            className="w-12 h-12 bg-white/10 hover:bg-young-green text-white hover:text-young-black border border-white/10 hover:border-young-green rounded-xl flex items-center justify-center hover:scale-110 transition-all shadow-lg"
          >
            {copied ? <CheckCircle2 size={24} /> : <Copy size={24} />}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {/* Stats */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-[#111] p-6 rounded-[2rem] border border-white/5 shadow-lg flex items-center gap-5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-young-orange/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-14 h-14 bg-young-orange/10 text-young-orange rounded-2xl flex items-center justify-center border border-young-orange/20 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
              <Users size={28} />
            </div>
            <div className="relative z-10">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Submissions</p>
              <p className="text-3xl font-black text-white">{submissions.length}</p>
            </div>
          </div>
          
          <div className="bg-[#111] p-6 rounded-[2rem] border border-white/5 shadow-lg flex items-center gap-5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-young-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-14 h-14 bg-young-green/10 text-young-green rounded-2xl flex items-center justify-center border border-young-green/20 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
              <BarChart3 size={28} />
            </div>
            <div className="relative z-10">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Average Score</p>
              <p className="text-3xl font-black text-white">{averageScore.toFixed(1)}%</p>
            </div>
          </div>

          <div className="bg-[#111] p-6 rounded-[2rem] border border-white/5 shadow-lg flex items-center gap-5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-young-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-14 h-14 bg-young-purple/10 text-young-purple rounded-2xl flex items-center justify-center border border-young-purple/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <CheckCircle2 size={28} />
            </div>
            <div className="relative z-10">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Hardest Question</p>
              <p className="text-lg font-black text-white truncate max-w-[150px]">
                {hardestQuestion ? hardestQuestion.text : "N/A"}
              </p>
              <p className="text-xs text-red-400 font-medium">
                {hardestQuestion ? `${hardestQuestion.failRate.toFixed(0)}% Failed` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="md:col-span-3 bg-[#111] p-6 rounded-[2rem] border border-white/5 shadow-lg">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
            <BarChart3 size={20} className="text-young-purple" /> Score Distribution
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
                    <Cell key={`cell-${index}`} fill={index === 4 ? '#4ade80' : index === 0 ? '#f97316' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Student Results List */}
        <div className="bg-[#111] p-6 rounded-[2rem] border border-white/5 shadow-lg">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
            <Users size={20} className="text-young-orange" /> Recent Submissions
          </h3>
          {submissions.length === 0 ? (
             <p className="text-gray-500 text-sm font-medium py-4 text-center">No submissions yet.</p>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub, idx) => (
                <div key={sub.id} className="bg-[#0a0a0a] rounded-2xl border border-white/5 hover:border-young-purple/30 transition-colors p-4 group">
                  <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedSubmission(expandedSubmission === sub.id ? null : sub.id)}>
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-young-orange text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]' : idx === 1 ? 'bg-gray-300 text-young-black' : idx === 2 ? 'bg-orange-200 text-orange-800' : 'bg-white/5 text-gray-500'}`}>
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-bold text-white group-hover:text-young-purple transition-colors">{sub.student_name}</p>
                        <p className="text-xs text-gray-500 font-medium">{sub.student_email}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className="font-black text-xl text-young-green">
                        {sub.score}<span className="text-sm text-gray-500">/{sub.total_questions}</span>
                      </p>
                      
                      {sub.result_released ? (
                        <span className="text-xs font-bold text-young-green bg-young-green/10 px-2 py-0.5 rounded-full border border-young-green/20">Released</span>
                      ) : sub.result_requested ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <span className="text-xs font-bold text-young-orange bg-young-orange/10 px-2 py-0.5 rounded-full border border-young-orange/20">Requested</span>
                          <button
                            onClick={() => handleGrantAccess(sub.id)}
                            className="text-xs font-bold text-white bg-young-purple hover:bg-young-purple/80 px-2 py-0.5 rounded-full"
                          >
                            Grant
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">Hidden</span>
                      )}

                      <p className="text-xs text-gray-500 font-medium flex items-center justify-end gap-1 mt-1">
                        <Clock size={12} /> {new Date(sub.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>

                  {/* Expanded Section */}
                  {expandedSubmission === sub.id && (
                    <div className="mt-4 border-t border-white/5 pt-4 space-y-4">
                      {questions.map((q, i) => {
                        const studentAnswer = sub.answers && sub.answers[q.id];
                        const isCorrect = studentAnswer === q.correct_answer;
                        return (
                          <div key={q.id} className="p-3 bg-black/20 rounded-xl border border-white/5">
                            <p className="font-bold text-sm text-white mb-2">
                              <span className="text-young-purple mr-1">Q{i+1}.</span>{q.question_text}
                            </p>
                            <div className="flex flex-wrap gap-2 items-center text-xs">
                              <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${isCorrect ? 'bg-young-green/20 text-young-green border border-young-green/20' : 'bg-red-400/20 text-red-400 border border-red-400/20'}`}>
                                {isCorrect ? 'Correct' : 'Incorrect'}
                              </span>
                              <span className="text-gray-400 font-medium">
                                Answered: <span className={isCorrect ? 'text-young-green font-bold' : 'text-red-400 font-bold'}>{studentAnswer || "No Answer"}</span>
                              </span>
                              {!isCorrect && (
                                <span className="text-gray-400 font-medium">
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
              ))}
            </div>
          )}
        </div>

        {/* Questions List */}
        <div className="bg-[#111] p-6 rounded-[2rem] border border-white/5 shadow-lg">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
            <CheckCircle2 size={20} className="text-young-green" /> Test Questions ({questions.length})
          </h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {questions.map((q, i) => (
              <div key={q.id} className="p-5 bg-[#0a0a0a] border border-white/5 rounded-2xl">
                <p className="font-bold text-sm mb-4 text-white leading-relaxed"><span className="text-young-purple mr-2 text-lg">Q{i+1}.</span>{q.question_text}</p>
                <div className="space-y-2 pl-8">
                  {q.options.map((opt: string, j: number) => (
                    <div key={j} className={`text-sm px-4 py-2.5 rounded-xl font-medium transition-colors ${opt === q.correct_answer ? 'bg-young-green/10 text-young-green border border-young-green/20 shadow-[0_0_10px_rgba(74,222,128,0.1)]' : 'bg-white/5 text-gray-400 border border-transparent'}`}>
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
