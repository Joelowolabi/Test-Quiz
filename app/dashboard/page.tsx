"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { FileText, Link as LinkIcon, Plus, Loader2, ArrowRight, Sparkles, Search, Trash2, Copy, CheckCircle2, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { uuidToPin, formatPin } from "@/lib/pin";

export default function DashboardPage() {
  const router = useRouter();
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("published");
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [targetFolder, setTargetFolder] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>("published");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedPinId, setCopiedPinId] = useState<string | null>(null);

  const handleDeleteTest = async (testId: string) => {
    if (!confirm("Are you sure you want to delete this quiz? This will remove all submissions associated with it.")) return;
    try {
      const { error } = await supabase.from('tests').delete().eq('id', testId);
      if (error) throw error;
      setTests(prev => prev.filter(t => t.id !== testId));
    } catch (err: any) {
      alert(err.message || "Failed to delete test.");
    }
  };

  const copyTestPin = (testId: string) => {
    const pin = uuidToPin(testId);
    navigator.clipboard.writeText(pin);
    setCopiedPinId(testId);
    setTimeout(() => setCopiedPinId(null), 2000);
  };
  
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
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);
          fetchTests(session.user.id);
          fetchFolders(session.user.id);
        } else {
          const auth = sessionStorage.getItem("teacher_auth");
          if (auth !== "true") {
            router.push("/login");
          } else {
            const mockUser = { id: "00000000-0000-0000-0000-000000000000", email: "teacher@example.com" };
            setUser(mockUser);
            fetchTests(mockUser.id);
            fetchFolders(mockUser.id);
          }
        }
      } catch (err) {
        console.error("Error retrieving user session:", err);
      }
    };
    checkUser();
  }, []);

  const fetchTests = async (userId?: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tests')
        .select('*, submissions(count)')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setTests(data || []);
    } catch (err: any) {
      console.error("Error fetching tests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTests(user.id);
    }
  }, [selectedStatus, selectedFolder]);

  const fetchFolders = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setFolders(data || []);
    } catch (err: any) {
      console.error("Error fetching folders:", err);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('folders')
        .insert([{ name: newFolderName, user_id: user.id }])
        .select()
        .single();
        
      if (error) throw error;
      setFolders([data, ...folders]);
      setNewFolderName("");
      setIsCreatingFolder(false);
    } catch (err: any) {
      console.error("Error creating folder:", err);
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
          time_limit: timeLimit
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
    <div className="space-y-8 animate-in fade-in duration-500 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#fffbeb] border border-[#fde68a] text-[#b45309] px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2.5 shadow-sm">
            <Sparkles size={12} className="text-[#f59e0b]" /> Educator Studio
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0c1322] tracking-tight">
            Tests Overview
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Manage your quizzes, generate assessments with AI, and track live student performance.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 items-start">
        {/* Left Column: Create New Test Card */}
        <div className="md:col-span-1 bg-white p-6 sm:p-7 rounded-[2rem] border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#0c1322] text-[#fbbf24] rounded-2xl flex items-center justify-center shadow-md shadow-slate-900/10">
              <Plus size={18} className="stroke-[3]" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#0c1322]">New Assessment</h2>
              <p className="text-xs text-slate-500 font-medium">Create or auto-generate quiz</p>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Assessment Title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 text-slate-900 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0c1322] focus:ring-2 focus:ring-[#0c1322]/10 outline-none transition-all placeholder:text-slate-400 font-medium text-sm"
                placeholder="e.g., Photosynthesis Basics"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Source Material</label>
              <div className="grid grid-cols-4 bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setSourceType("text")}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    sourceType === 'text' 
                      ? 'bg-white text-[#0c1322] shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText size={12} /> Text
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType("url")}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    sourceType === 'url' 
                      ? 'bg-white text-[#0c1322] shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LinkIcon size={12} /> URL
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType("file")}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    sourceType === 'file' 
                      ? 'bg-white text-[#0c1322] shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText size={12} /> PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType("manual")}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    sourceType === 'manual' 
                      ? 'bg-white text-[#0c1322] shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Plus size={12} /> Manual
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {sourceType === 'text' ? 'Paste Notes or Lecture' : sourceType === 'url' ? 'Paste Article URLs' : sourceType === 'file' ? 'Upload Slide Deck / PDF' : 'Draft Questions'}
              </label>
              {sourceType === 'manual' ? (
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {manualQuestions.map((q, qIndex) => (
                    <div key={qIndex} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-extrabold text-[#0c1322]">Question {qIndex + 1}</span>
                        {manualQuestions.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => {
                              const updated = [...manualQuestions];
                              updated.splice(qIndex, 1);
                              setManualQuestions(updated);
                            }}
                            className="text-red-500 hover:text-red-700 text-xs font-bold"
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
                        className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg focus:border-[#0c1322] outline-none text-xs placeholder:text-slate-400 font-medium"
                        placeholder="Type question text..."
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
                            className="w-full px-2.5 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg focus:border-[#0c1322] outline-none text-xs placeholder:text-slate-400 font-medium"
                            placeholder={`Option ${oIndex + 1}`}
                          />
                        ))}
                      </div>
                      <div>
                        <select
                          value={q.correctAnswer}
                          onChange={(e) => {
                            const updated = [...manualQuestions];
                            updated[qIndex].correctAnswer = e.target.value;
                            setManualQuestions(updated);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg focus:border-[#0c1322] outline-none text-xs font-semibold"
                        >
                          <option value="">Select Correct Answer</option>
                          {q.options.map((opt, oIndex) => (
                            <option key={oIndex} value={opt}>{opt || `Option ${oIndex + 1}`}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setManualQuestions([...manualQuestions, { question: '', options: ['', '', '', ''], correctAnswer: '' }])}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 border-dashed transition-colors"
                  >
                    + Add Another Question
                  </button>
                </div>
              ) : sourceType === 'text' ? (
                <textarea 
                  value={sourceContent}
                  onChange={(e) => setSourceContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 text-slate-900 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0c1322] focus:ring-2 focus:ring-[#0c1322]/10 outline-none transition-all resize-none h-28 placeholder:text-slate-400 font-medium text-xs leading-relaxed"
                  placeholder="Paste lecture notes, articles, or curriculum syllabus here..."
                />
              ) : sourceType === 'url' ? (
                <textarea 
                  value={sourceContent}
                  onChange={(e) => setSourceContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 text-slate-900 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0c1322] focus:ring-2 focus:ring-[#0c1322]/10 outline-none transition-all resize-none h-28 placeholder:text-slate-400 font-medium text-xs leading-relaxed"
                  placeholder="https://en.wikipedia.org/wiki/Photosynthesis&#10;https://edu-resource.org/notes"
                />
              ) : (
                <div className="p-4 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl text-center">
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
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#0c1322] file:text-white hover:file:bg-[#182542] cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400 mt-2 font-medium">Supports PDF slides or text files up to 10MB</p>
                </div>
              )}
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50/70 text-slate-900 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0c1322] outline-none text-xs font-medium"
                  >
                    <option value="Very Easy">Very Easy</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                    <option value="Expert">Expert</option>
                    <option value="Master (Insane)">Master (Insane)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Question Type</label>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50/70 text-slate-900 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0c1322] outline-none text-xs font-medium"
                  >
                    <option value="Multiple Choice">Multiple Choice</option>
                    <option value="True/False">True/False</option>
                    <option value="Mixed">Mixed</option>
                    <option value="Fill in the Blanks">Fill in the Blanks</option>
                    <option value="Scenario-based">Scenario-based</option>
                    <option value="Definition matching">Definition matching</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Questions (Max 80)</label>
                  <input 
                    type="number" 
                    min="1" max="80"
                    value={questionCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setQuestionCount(Math.min(Math.max(val, 1), 80));
                    }}
                    className="w-full px-3 py-2 bg-slate-50/70 text-slate-900 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0c1322] outline-none text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Time Limit</label>
                  <select
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50/70 text-slate-900 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0c1322] outline-none text-xs font-medium"
                  >
                    <option value={0}>No Limit</option>
                    <option value={5}>5 Mins</option>
                    <option value={10}>10 Mins</option>
                    <option value={15}>15 Mins</option>
                    <option value={30}>30 Mins</option>
                    <option value={45}>45 Mins</option>
                    <option value={60}>60 Mins</option>
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="text-red-700 text-xs font-bold bg-red-50 p-2.5 rounded-xl border border-red-200">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isGenerating}
              className="w-full py-3.5 mt-2 bg-[#0c1322] hover:bg-[#182542] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-slate-900/10 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-60 text-sm"
            >
              {isGenerating ? (
                <><Loader2 size={16} className="animate-spin text-[#fbbf24]" /> Generating {questionCount} Questions...</>
              ) : (
                <><Sparkles size={16} className="text-[#fbbf24]" /> {sourceType === 'manual' ? 'Create Quiz' : `Generate Quiz (${questionCount} Qs)`}</>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Existing Tests List */}
        <div className="md:col-span-2 space-y-5">
          {/* Controls: Status Tabs, Search, and Folders */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3.5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              {/* Segmented Status Filter */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {['published', 'draft', 'archived'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${
                      selectedStatus === status 
                        ? 'bg-white text-[#0c1322] shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-60">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search quizzes..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-[#0c1322] outline-none placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            {/* Folders Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
              <button
                onClick={() => setSelectedFolder(null)}
                className={`px-3.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  selectedFolder === null 
                    ? 'bg-[#0c1322] text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Quizzes
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedFolder === folder.id 
                      ? 'bg-[#0c1322] text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  📁 {folder.name}
                </button>
              ))}
              
              {/* Create Folder Trigger */}
              {isCreatingFolder ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="px-2.5 py-1 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs focus:border-[#0c1322] outline-none"
                    placeholder="Folder name..."
                  />
                  <button
                    onClick={handleCreateFolder}
                    className="p-1 bg-[#0c1322] text-white rounded-lg hover:bg-[#182542]"
                  >
                    <Plus size={13} />
                  </button>
                  <button
                    onClick={() => setIsCreatingFolder(false)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  className="px-3 py-1 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 flex items-center gap-1 transition-colors"
                >
                  <Plus size={12} /> New Folder
                </button>
              )}
            </div>
          </div>

          {/* Test Cards Grid */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-[#0c1322]" size={36} />
            </div>
          ) : tests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-[2rem] border border-dashed border-slate-300 p-8 shadow-sm">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                <FileText size={28} />
              </div>
              <h3 className="text-lg font-bold text-[#0c1322] mb-1">No quizzes generated yet</h3>
              <p className="text-slate-500 font-medium text-xs max-w-sm mx-auto">
                Paste notes, URLs, or upload a PDF using the generator on the left to create your first classroom quiz.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {tests
                .filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((test) => {
                  const testPin = uuidToPin(test.id);
                  const isCopied = copiedPinId === test.id;

                  return (
                    <div 
                      key={test.id} 
                      className="bg-white p-5 sm:p-6 rounded-[1.75rem] border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition-all group flex flex-col justify-between"
                    >
                      <div>
                        {/* Title & Delete Action */}
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h3 className="font-extrabold text-base text-[#0c1322] line-clamp-1 group-hover:text-amber-600 transition-colors">
                            {test.title}
                          </h3>
                          <button
                            onClick={() => handleDeleteTest(test.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete quiz"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Metadata Tags */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <span className="text-[11px] text-slate-500 font-medium">
                            {new Date(test.created_at).toLocaleDateString()}
                          </span>
                          {test.time_limit > 0 && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
                              {test.time_limit} Mins
                            </span>
                          )}

                          {/* 6-Digit PIN Badge with Click-to-Copy */}
                          <button
                            onClick={() => copyTestPin(test.id)}
                            className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg border flex items-center gap-1.5 transition-all ${
                              isCopied 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                : 'bg-[#fffbeb] text-[#92400e] border-[#fde68a] hover:bg-[#fef3c7]'
                            }`}
                            title="Click to copy 6-digit PIN"
                          >
                            <KeyRound size={11} className="text-[#d97706]" /> PIN: {formatPin(testPin)}
                            {isCopied ? <CheckCircle2 size={11} className="text-emerald-600" /> : <Copy size={11} />}
                          </button>
                        </div>
                      </div>
                      
                      {/* Submissions & Analytics Link */}
                      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {test.submissions?.[0]?.count || 0} Submissions
                        </span>
                        
                        <Link 
                          href={`/dashboard/test/${test.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0c1322] hover:bg-[#182542] text-xs font-bold text-white transition-all shadow-sm hover:scale-105 active:scale-95"
                        >
                          Analytics <ArrowRight size={13} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
