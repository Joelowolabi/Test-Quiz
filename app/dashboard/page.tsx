"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { FileText, Link as LinkIcon, Plus, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Generation State
  const [sourceType, setSourceType] = useState<"text" | "url" | "file" | "manual">("text");
  const [manualQuestions, setManualQuestions] = useState([
    { question: "", options: ["", "", "", ""], correctAnswer: "" }
  ]);
  const [sourceContent, setSourceContent] = useState("");
  const [title, setTitle] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [timeLimit, setTimeLimit] = useState(0); // 0 = no limit
  const [difficulty, setDifficulty] = useState("Medium");
  const [questionType, setQuestionType] = useState("Multiple Choice");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
        fetchTests(user.id);
      }
    };
    checkUser();
  }, []);

  const fetchTests = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('*, submissions(count)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setTests(data || []);
    } catch (err: any) {
      console.error("Error fetching tests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || (sourceType !== 'manual' && !sourceContent)) {
      setError("Please provide a title and content.");
      return;
    }

    if (sourceType === 'manual') {
      const invalid = manualQuestions.some(q => !q.question || q.options.some(opt => !opt) || !q.correctAnswer);
      if (invalid) {
        setError("Please fill in all questions, options, and correct answers.");
        return;
      }
    }
    
    setIsGenerating(true);
    setError("");

    try {
      let questions = [];

      if (sourceType !== 'manual') {
        // 1. Call our API route to generate questions using Gemini
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: sourceContent, 
            count: questionCount,
            type: sourceType,
            difficulty,
            questionType
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Failed to generate questions");
        }

        const data = await response.json();
        questions = data.questions;
      } else {
        // Use manually created questions
        questions = manualQuestions.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer
        }));
      }

      // 2. Save Test to Supabase
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .insert([{ 
          title, 
          source_content: sourceType === 'text' ? sourceContent : sourceType === 'url' ? `URL(s): ${sourceContent}` : sourceType === 'file' ? 'Uploaded File' : 'Manually Created',
          time_limit: timeLimit,
          user_id: user.id
        }])
        .select()
        .single();

      if (testError) throw testError;

      // 3. Save Questions to Supabase
      const questionsToInsert = questions.map((q: any) => ({
        test_id: testData.id,
        question_text: q.question,
        options: q.options,
        correct_answer: q.correctAnswer
      }));

      const { error: qError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (qError) throw qError;

      // 4. Redirect to Test Detail
      router.push(`/dashboard/test/${testData.id}`);

    } catch (err: any) {
      let errorMsg = err.message || "An error occurred during generation.";
      try {
        // Try to parse the error message if the API returned a stringified JSON object
        if (errorMsg.startsWith('{') || errorMsg.startsWith('[')) {
          const parsed = JSON.parse(errorMsg);
          if (parsed.error?.message) {
            errorMsg = parsed.error.message;
          } else if (Array.isArray(parsed) && parsed[0]?.error?.message) {
            errorMsg = parsed[0].error.message;
          }
        }
      } catch (e) {
        // If it's not JSON, we'll just use the original string
      }
      
      setError(errorMsg);
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">Tests Overview</h1>
          <p className="text-gray-400 font-medium">Manage your generated quizzes and view results.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Create New Test Form */}
        <div className="md:col-span-1 bg-[#111] p-6 rounded-[2rem] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] h-fit relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-young-purple/10 blur-[50px] rounded-full pointer-events-none"></div>
          
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-10 h-10 bg-young-purple/20 text-young-purple rounded-xl flex items-center justify-center border border-young-purple/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Plus size={20} className="stroke-[3]" />
            </div>
            <h2 className="text-xl font-bold text-white">New Test</h2>
          </div>

          <form onSubmit={handleGenerate} className="space-y-5 relative z-10">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Test Title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 text-white border border-white/10 rounded-xl focus:border-young-purple focus:ring-2 focus:ring-young-purple/20 outline-none transition-all placeholder-gray-600 font-medium"
                placeholder="e.g., Photosynthesis Basics"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Source Type</label>
              <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5 flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setSourceType("text")}
                  className={`flex-1 min-w-[60px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${sourceType === 'text' ? 'bg-[#2a2a2a] shadow-md text-white border border-white/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                >
                  <FileText size={14} /> Text
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType("url")}
                  className={`flex-1 min-w-[60px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${sourceType === 'url' ? 'bg-[#2a2a2a] shadow-md text-white border border-white/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                >
                  <LinkIcon size={14} /> URL
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType("file")}
                  className={`flex-1 min-w-[60px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${sourceType === 'file' ? 'bg-[#2a2a2a] shadow-md text-white border border-white/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                >
                  <FileText size={14} /> PDF/File
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType("manual")}
                  className={`flex-1 min-w-[60px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${sourceType === 'manual' ? 'bg-[#2a2a2a] shadow-md text-white border border-white/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                >
                  <Plus size={14} /> Manual
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                {sourceType === 'text' ? 'Paste Article/Notes' : sourceType === 'url' ? 'Paste URLs (One per line)' : sourceType === 'file' ? 'Upload PDF/Doc' : 'Create Questions'}
              </label>
              {sourceType === 'manual' ? (
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {manualQuestions.map((q, qIndex) => (
                    <div key={qIndex} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-young-purple">Question {qIndex + 1}</span>
                        {manualQuestions.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => {
                              const updated = [...manualQuestions];
                              updated.splice(qIndex, 1);
                              setManualQuestions(updated);
                            }}
                            className="text-red-400 hover:text-red-300 text-xs font-bold"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input 
                        type="text"
                        value={q.question}
                        onChange={(e) => {
                          const updated = [...manualQuestions];
                          updated[qIndex].question = e.target.value;
                          setManualQuestions(updated);
                        }}
                        className="w-full px-3 py-2 bg-black/40 text-white border border-white/5 rounded-lg focus:border-young-purple outline-none text-sm placeholder-gray-700"
                        placeholder="Type question here..."
                      />
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oIndex) => (
                          <input 
                            key={oIndex}
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const updated = [...manualQuestions];
                              updated[qIndex].options[oIndex] = e.target.value;
                              setManualQuestions(updated);
                            }}
                            className="w-full px-3 py-2 bg-black/40 text-white border border-white/5 rounded-lg focus:border-young-purple outline-none text-xs placeholder-gray-700"
                            placeholder={`Option ${oIndex + 1}`}
                          />
                        ))}
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-600 mb-1 block">Correct Answer</label>
                        <select
                          value={q.correctAnswer}
                          onChange={(e) => {
                            const updated = [...manualQuestions];
                            updated[qIndex].correctAnswer = e.target.value;
                            setManualQuestions(updated);
                          }}
                          className="w-full px-3 py-2 bg-black/40 text-white border border-white/5 rounded-lg focus:border-young-purple outline-none text-xs"
                        >
                          <option value="">Select Correct Answer</option>
                          {q.options.map((opt, oIndex) => (
                            <option key={oIndex} value={opt} className="bg-[#1a1a1a]">{opt || `Option ${oIndex + 1}`}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setManualQuestions([...manualQuestions, { question: '', options: ['', '', '', ''], correctAnswer: '' }])}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold border border-white/10 border-dashed transition-colors"
                  >
                    + Add Question
                  </button>
                </div>
              ) : sourceType === 'text' ? (
                <textarea 
                  value={sourceContent}
                  onChange={(e) => setSourceContent(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 text-white border border-white/10 rounded-xl focus:border-young-purple focus:ring-2 focus:ring-young-purple/20 outline-none transition-all resize-none h-32 placeholder-gray-600 font-medium"
                  placeholder="Paste the content here..."
                />
              ) : sourceType === 'url' ? (
                <textarea 
                  value={sourceContent}
                  onChange={(e) => setSourceContent(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 text-white border border-white/10 rounded-xl focus:border-young-purple focus:ring-2 focus:ring-young-purple/20 outline-none transition-all resize-none h-32 placeholder-gray-600 font-medium leading-relaxed"
                  placeholder="https://example.com/article1&#10;https://example.com/article2"
                />
              ) : (
                <input
                  type="file"
                  accept="application/pdf, text/plain"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64 = reader.result?.toString().split(',')[1];
                        if (base64) {
                          setSourceContent(JSON.stringify({ fileBase64: base64, mimeType: file.type }));
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full px-4 py-3 bg-white/5 text-white border border-white/10 rounded-xl outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-young-purple/20 file:text-young-purple hover:file:bg-young-purple/30 text-sm"
                />
              )}
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 text-white border border-white/10 rounded-xl focus:border-young-purple focus:ring-2 focus:ring-young-purple/20 outline-none transition-all font-medium"
                >
                  <option value="Very Easy" className="bg-[#1a1a1a]">Very Easy</option>
                  <option value="Easy" className="bg-[#1a1a1a]">Easy</option>
                  <option value="Medium" className="bg-[#1a1a1a]">Medium</option>
                  <option value="Hard" className="bg-[#1a1a1a]">Hard</option>
                  <option value="Expert" className="bg-[#1a1a1a]">Expert</option>
                  <option value="Master (Insane)" className="bg-[#1a1a1a]">Master (Insane)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Question Type</label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 text-white border border-white/10 rounded-xl focus:border-young-purple focus:ring-2 focus:ring-young-purple/20 outline-none transition-all font-medium"
                >
                  <option value="Multiple Choice" className="bg-[#1a1a1a]">Multiple Choice</option>
                  <option value="True/False" className="bg-[#1a1a1a]">True/False</option>
                  <option value="Mixed" className="bg-[#1a1a1a]">Mixed</option>
                  <option value="Fill in the Blanks" className="bg-[#1a1a1a]">Fill in the Blanks</option>
                  <option value="Scenario-based" className="bg-[#1a1a1a]">Scenario-based</option>
                  <option value="Definition matching" className="bg-[#1a1a1a]">Definition matching</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Qs (Max 100)</label>
                  <input 
                    type="number" 
                    min="1" max="100"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-white/5 text-white border border-white/10 rounded-xl focus:border-young-purple focus:ring-2 focus:ring-young-purple/20 outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Time Limit (Mins)</label>
                  <select
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-white/5 text-white border border-white/10 rounded-xl focus:border-young-purple focus:ring-2 focus:ring-young-purple/20 outline-none transition-all font-medium"
                  >
                    <option value={0} className="bg-[#1a1a1a]">No Time Limit</option>
                    <option value={15} className="bg-[#1a1a1a]">15 Minutes</option>
                    <option value={30} className="bg-[#1a1a1a]">30 Minutes</option>
                    <option value={45} className="bg-[#1a1a1a]">45 Minutes</option>
                    <option value={60} className="bg-[#1a1a1a]">60 Minutes</option>
                    <option value={90} className="bg-[#1a1a1a]">90 Minutes</option>
                  </select>
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm font-medium bg-red-400/10 py-2 px-3 rounded-lg border border-red-400/20">{error}</p>}

            <button 
              type="submit" 
              disabled={isGenerating}
              className="w-full py-4 mt-2 bg-gradient-to-r from-young-purple to-[#818cf8] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:scale-[1.02] transition-all disabled:opacity-70 disabled:hover:scale-100"
            >
              {isGenerating ? (
                <><Loader2 size={20} className="animate-spin" /> Generating AI Quiz...</>
              ) : (
                <><Sparkles size={20} /> {sourceType === 'manual' ? 'Create Test' : 'Generate Test'}</>
              )}
            </button>
          </form>
        </div>

        {/* Existing Tests List */}
        <div className="md:col-span-2">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-young-purple" size={40} /></div>
          ) : tests.length === 0 ? (
            <div className="text-center py-20 bg-[#111] rounded-[2rem] border border-white/5 border-dashed">
              <div className="w-16 h-16 bg-[#222] rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500 border border-white/10 shadow-inner">
                <FileText size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">No tests yet</h3>
              <p className="text-gray-500 font-medium">Generate your first AI quiz to get started.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {tests.map((test) => (
                <div key={test.id} className="bg-[#111] p-6 rounded-3xl border border-white/5 hover:border-young-purple/30 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] hover:-translate-y-1 transition-all group flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-young-purple/5 rounded-full blur-[30px] group-hover:bg-young-purple/10 transition-colors"></div>
                  
                  <h3 className="font-bold text-lg text-white mb-1 line-clamp-1">{test.title}</h3>
                  <div className="flex items-center gap-2 mb-4">
                    <p className="text-xs text-gray-500 font-medium">
                      {new Date(test.created_at).toLocaleDateString()}
                    </p>
                    {test.time_limit > 0 && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
                        {test.time_limit} Mins
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-auto flex items-center justify-between z-10">
                    <span className="text-sm font-bold text-young-orange bg-young-orange/10 border border-young-orange/20 px-3 py-1 rounded-lg">
                      {test.submissions?.[0]?.count || 0} Submissions
                    </span>
                    
                    <Link 
                      href={`/dashboard/test/${test.id}`}
                      className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-300 group-hover:bg-young-purple group-hover:text-white transition-all shadow-sm"
                    >
                      <ArrowRight size={20} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
