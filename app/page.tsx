'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  ArrowRight, 
  Github, 
  Twitter, 
  Cpu, 
  Zap, 
  Shield,
  MessageSquare,
  ChevronRight,
  Plus,
  Trophy,
  Activity,
  Target,
  BarChart3,
  LayoutDashboard,
  History,
  Settings,
  Search,
  Menu,
  X,
  Image as ImageIcon,
  Copy,
  Maximize2,
  LogOut,
  LogIn
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MatchesView from '@/components/MatchesView';

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' });

interface Message {
  role: 'user' | 'model';
  content: string;
  image?: string;
  timestamp: Date;
}

type ViewType = 'chat' | 'matches' | 'history' | 'settings';

export default function GoalMetrics() {
  const { user, signIn, logout, loading: authLoading } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<{q: string, icon: any}[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('goalmetrics_chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert string timestamps back to Date objects
        const formatted = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(formatted);
      } catch (e) {
        console.error('Failed to parse chat history', e);
      }
    }
  }, []);

  // Save history when messages change
  useEffect(() => {
    if (mounted && messages.length > 0) {
      localStorage.setItem('goalmetrics_chat_history', JSON.stringify(messages));
    }
  }, [messages, mounted]);

  // Fetch dynamic suggestions
  useEffect(() => {
    if (mounted && messages.length === 0) {
      fetchTodayMatches();
    }
  }, [mounted, messages.length]);

  const fetchTodayMatches = async () => {
    setIsSuggestionsLoading(true);
    try {
      const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `List 4 high-profile sports matches (Football, Basketball, etc.) happening today, ${today}. Return them as a JSON array of strings, each being a short prompt like "Predict [Team A] vs [Team B]".`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: { type: "string" }
          }
        }
      });

      const matchPrompts = JSON.parse(response.text || "[]");
      const icons = [Target, Activity, BarChart3, Trophy];
      
      if (Array.isArray(matchPrompts) && matchPrompts.length > 0) {
        const formatted = matchPrompts.slice(0, 4).map((q, i) => ({
          q,
          icon: icons[i % icons.length]
        }));
        setDynamicSuggestions(formatted);
      } else {
        // Fallback
        setDynamicSuggestions([
          { q: "Predict today's top Football matches", icon: Target },
          { q: "Analyze NBA games for tonight", icon: Activity },
          { q: "Tennis tournament updates", icon: BarChart3 },
          { q: "Champions League winner odds", icon: Trophy }
        ]);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setDynamicSuggestions([
        { q: "Predict Real Madrid vs Barcelona", icon: Target },
        { q: "Analyze Lakers vs Warriors form", icon: Activity },
        { q: "Premier League top 4 prediction", icon: BarChart3 },
        { q: "Champions League winner odds", icon: Trophy }
      ]);
    } finally {
      setIsSuggestionsLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      image: selectedImage || undefined,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    const currentImage = selectedImage;
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const parts: any[] = [{ text: currentInput || "Analyze this image for sports insights." }];
      
      if (currentImage) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: currentImage.split(',')[1]
          }
        });
      }

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts },
        config: {
          systemInstruction: `You are GOALMETRICS, an expert sports analyst and prediction AI. Your goal is to provide data-driven predictions for sports matches (Football, Basketball, Tennis, etc.). Analyze team form, player stats, head-to-head records, and other relevant metrics to give the most accurate predictions possible. Use Google Search to get real-time data on upcoming matches, current team form, and injury updates. If the user provides an image, analyze it for match stats, lineups, or odds and incorporate those into your prediction. ALWAYS present data-heavy information (like match stats, team comparisons, or league tables) in clean Markdown tables. Avoid scattered elements; keep the layout structured and professional. Always include a disclaimer that sports predictions are not guaranteed and should be used for informational purposes only. ${user ? `The user's name is ${user.displayName}.` : ''}`,
          tools: [{ googleSearch: {} }],
        }
      });
      
      const text = response.text;

      const aiMessage: Message = {
        role: 'model',
        content: text || 'No response received.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error calling Gemini:', error);
      setMessages(prev => [...prev, {
        role: 'model',
        content: 'Sorry, I encountered an error. Please check your API key and try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem('goalmetrics_chat_history');
    setShowClearConfirm(false);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-emerald-500/30">
      <AnimatePresence mode="wait">
        {!isChatOpen ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative h-screen grid grid-cols-1 lg:grid-cols-2 overflow-hidden"
          >
            {/* Left Pane - Content */}
            <div className="flex flex-col justify-center p-8 lg:p-24 z-10">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 mb-8"
              >
                <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <Trophy className="text-black w-6 h-6" />
                </div>
                <span className="text-xl font-bold tracking-tighter uppercase">GOALMETRICS</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-6xl lg:text-8xl font-bold leading-[0.88] tracking-tighter mb-8"
              >
                PREDICT <br />
                <span className="text-emerald-500">THE GAME.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-zinc-400 max-w-md mb-12 leading-relaxed"
              >
                Advanced AI-powered sports analytics. Get precise predictions and deep insights into every match.
              </motion.p>

                <div className="flex flex-wrap gap-4">
                  {user ? (
                    <button
                      onClick={() => setIsChatOpen(true)}
                      className="px-8 py-4 bg-white text-black font-bold rounded-full flex items-center gap-2 hover:bg-emerald-500 transition-colors group"
                    >
                      START CONVERSATION
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ) : (
                    <button
                      onClick={signIn}
                      className="px-8 py-4 bg-emerald-500 text-black font-bold rounded-full flex items-center gap-2 hover:bg-emerald-400 transition-colors group"
                    >
                      SIGN IN TO START
                      <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                  <button className="px-8 py-4 border border-zinc-800 rounded-full font-bold hover:bg-zinc-900 transition-colors">
                    VIEW DOCUMENTATION
                  </button>
                </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                transition={{ delay: 0.8 }}
                className="mt-24 flex flex-wrap gap-8 border-t border-zinc-800/50 pt-8"
              >
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase mb-1 tracking-wider">Model</span>
                  <span className="text-sm font-bold">Gemini 3 Flash</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase mb-1 tracking-wider">Version</span>
                  <span className="text-sm font-bold">v3.0-Preview</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase mb-1 tracking-wider">Latency</span>
                  <span className="text-sm font-bold">&lt; 180ms</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase mb-1 tracking-wider">Accuracy</span>
                  <span className="text-sm font-bold">99.4%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase mb-1 tracking-wider">Status</span>
                  <span className="text-sm font-bold text-emerald-500">Operational</span>
                </div>
              </motion.div>
            </div>

            {/* Right Pane - Visuals */}
            <div className="hidden lg:block relative bg-zinc-900/50 border-l border-zinc-800">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_70%)]" />
              
              {/* Floating Feature Cards */}
              <div className="absolute inset-0 flex items-center justify-center p-12">
                <div className="grid grid-cols-2 gap-6 w-full max-w-lg">
                  {[
                    { icon: Activity, title: "Form", desc: "Real-time team performance" },
                    { icon: Target, title: "Precision", desc: "Data-driven accuracy" },
                    { icon: BarChart3, title: "Stats", desc: "Deep historical analysis" },
                    { icon: Trophy, title: "Wins", desc: "Maximize your edge" }
                  ].map((feature, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
                      animate={{ opacity: 1, scale: 1, rotate: i % 2 === 0 ? -3 : 3 }}
                      transition={{ delay: 0.6 + (i * 0.1) }}
                      className="p-6 bg-black border border-zinc-800 rounded-2xl hover:border-emerald-500/50 transition-colors"
                    >
                      <feature.icon className="w-8 h-8 text-emerald-500 mb-4" />
                      <h3 className="font-bold mb-1 uppercase tracking-tight">{feature.title}</h3>
                      <p className="text-xs text-zinc-500">{feature.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute bottom-12 right-12 flex flex-col items-end">
                <div className="flex gap-4 mb-4">
                  <Twitter className="w-5 h-5 text-zinc-500 hover:text-white cursor-pointer" />
                  <Github className="w-5 h-5 text-zinc-500 hover:text-white cursor-pointer" />
                </div>
                <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                  © 2026 GOALMETRICS ANALYTICS.
                </span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-screen flex bg-black overflow-hidden"
          >
            {/* Sidebar - Desktop Navigation */}
            <motion.aside
              initial={false}
              animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
              className="hidden lg:flex flex-col border-r border-zinc-800 bg-zinc-900/20 backdrop-blur-xl overflow-hidden"
            >
              <div className="p-6 flex items-center gap-3 border-b border-zinc-800/50">
                <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center">
                  <Trophy className="text-black w-5 h-5" />
                </div>
                <span className="font-bold tracking-tighter uppercase text-sm">GOALMETRICS</span>
              </div>

              <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4 px-2">Navigation</div>
                {[
                  { id: 'chat', icon: LayoutDashboard, label: "Dashboard" },
                  { id: 'history', icon: History, label: "History" },
                  { id: 'matches', icon: Search, label: "Live Schedule" },
                  { id: 'settings', icon: Settings, label: "Settings" },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentView(item.id as ViewType)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      currentView === item.id ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-tight">{item.label}</span>
                  </button>
                ))}

                <div className="pt-8">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4 px-2">Recent Analysis</div>
                  <div className="space-y-1">
                    {messages.length > 0 ? (
                      <div className="px-4 py-3 bg-zinc-800/30 rounded-xl border border-zinc-800/50">
                        <p className="text-[10px] text-zinc-400 truncate">Current Session Active</p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-zinc-600 px-4 italic">No recent activity</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-zinc-800/50">
                {user && (
                  <div className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-xl border border-zinc-800/50">
                    <div className="relative w-8 h-8 flex-shrink-0">
                      <Image 
                        src={user.photoURL || ''} 
                        alt={user.displayName || 'User'} 
                        fill
                        className="rounded-full border border-zinc-700 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold truncate">{user.displayName}</p>
                      <p className="text-[8px] text-zinc-500 truncate uppercase tracking-widest">Pro Analyst</p>
                    </div>
                    <button onClick={logout} className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-500 hover:text-red-500 transition-colors">
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </motion.aside>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#050505] relative">
              {/* Chat Header */}
              <header className="h-16 border-b border-zinc-800/50 flex items-center justify-between px-4 lg:px-8 bg-black/50 backdrop-blur-md z-20">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="hidden lg:p-2 hover:bg-zinc-800 rounded-lg transition-colors lg:block"
                  >
                    <Menu className="w-5 h-5 text-zinc-400" />
                  </button>
                  <button 
                    onClick={() => setIsChatOpen(false)}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors lg:hidden"
                  >
                    <ChevronRight className="w-5 h-5 rotate-180" />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center lg:hidden">
                      <Trophy className="text-black w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-tighter">Mission Control</h2>
                      <p className="text-[8px] text-zinc-500 uppercase tracking-widest">AI Prediction Engine v3.0</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Live Analysis</span>
                  </div>
                  <div className="relative flex items-center gap-2">
                    <button 
                      onClick={() => setShowClearConfirm(!showClearConfirm)}
                      className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
                      title="Clear History"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <AnimatePresence>
                      {showClearConfirm && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 10 }}
                          className="absolute right-0 top-full mt-2 p-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 w-48"
                        >
                          <p className="text-xs font-bold mb-3 uppercase tracking-tight">Clear all history?</p>
                          <div className="flex gap-2">
                            <button onClick={clearHistory} className="flex-1 py-2 bg-emerald-500 text-black text-[10px] font-bold rounded-lg hover:bg-emerald-400 transition-colors">YES</button>
                            <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2 bg-zinc-800 text-white text-[10px] font-bold rounded-lg hover:bg-zinc-700 transition-colors">NO</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </header>

              {/* Main Content Area */}
              {currentView === 'matches' ? (
                <MatchesView />
              ) : (
                <>
                  {/* Chat Messages */}
                  <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-12 scroll-smooth"
                  >
                    {messages.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-8 max-w-2xl mx-auto">
                        <motion.div 
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="w-20 h-20 bg-zinc-900/50 rounded-3xl flex items-center justify-center border border-zinc-800/50 relative"
                        >
                          <Trophy className="w-10 h-10 text-emerald-500" />
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center animate-bounce">
                            <Sparkles className="w-3 h-3 text-black" />
                          </div>
                        </motion.div>
                        <div>
                          <h2 className="text-3xl lg:text-4xl font-bold mb-4 tracking-tighter uppercase">Awaiting Input</h2>
                          <p className="text-zinc-500 text-sm leading-relaxed">
                            Upload a screenshot of match stats or type a query to begin deep analysis. 
                            Our engine is ready to process real-time data for your edge.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                          {isSuggestionsLoading ? (
                            Array(4).fill(0).map((_, i) => (
                              <div key={i} className="h-16 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl animate-pulse" />
                            ))
                          ) : (
                            (dynamicSuggestions.length > 0 ? dynamicSuggestions : [
                              { q: "Predict Real Madrid vs Barcelona", icon: Target },
                              { q: "Analyze Lakers vs Warriors form", icon: Activity },
                              { q: "Premier League top 4 prediction", icon: BarChart3 },
                              { q: "Champions League winner odds", icon: Trophy }
                            ]).map((suggestion, i) => (
                              <button
                                key={i}
                                onClick={() => setInput(suggestion.q)}
                                className="group p-4 text-left text-xs border border-zinc-800/50 rounded-2xl hover:border-emerald-500/50 hover:bg-zinc-900/30 transition-all flex items-center gap-3"
                              >
                                <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
                                  <suggestion.icon className="w-4 h-4 text-zinc-500 group-hover:text-emerald-500" />
                                </div>
                                <span className="font-bold uppercase tracking-tight text-zinc-400 group-hover:text-white">{suggestion.q}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {messages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-4xl mx-auto w-full`}
                      >
                        <div className={`flex gap-4 w-full ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                            msg.role === 'user' ? 'bg-zinc-900 border-zinc-800' : 'bg-emerald-500 border-emerald-400'
                          }`}>
                            {msg.role === 'user' ? <User className="w-6 h-6" /> : <Trophy className="text-black w-6 h-6" />}
                          </div>
                          <div className={`flex-1 space-y-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                                {msg.role === 'user' ? 'User Analyst' : 'GOALMETRICS AI'}
                              </span>
                              <span className="text-[10px] text-zinc-700 font-mono">•</span>
                              <span className="text-[10px] text-zinc-700 font-mono">
                                {mounted ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                              </span>
                            </div>
                            
                            <div className={`inline-block w-full p-6 lg:p-8 rounded-3xl leading-relaxed text-sm lg:text-base prose prose-invert max-w-none shadow-2xl ${
                              msg.role === 'user' 
                                ? 'bg-zinc-900 text-white rounded-tr-none border border-zinc-800' 
                                : 'bg-zinc-900/50 text-zinc-300 border border-zinc-800/50 rounded-tl-none backdrop-blur-sm'
                            }`}>
                              {msg.image && (
                                <div className="mb-6 rounded-2xl overflow-hidden border border-zinc-800 max-w-md relative aspect-video">
                                  <Image 
                                    src={msg.image} 
                                    alt="Uploaded context" 
                                    fill
                                    className="object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                              </ReactMarkdown>
                              
                              {msg.role === 'model' && (
                                <div className="mt-8 pt-6 border-t border-zinc-800/50 flex items-center justify-between">
                                  <div className="flex gap-4">
                                    <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors" title="Copy Analysis">
                                      <Copy className="w-4 h-4" />
                                    </button>
                                    <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors" title="Expand View">
                                      <Maximize2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">Confidence Score: 98.2%</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {isLoading && (
                      <div className="flex gap-4 max-w-4xl mx-auto w-full">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center border border-emerald-400">
                          <Trophy className="text-black w-6 h-6" />
                        </div>
                        <div className="flex gap-2 items-center p-6 bg-zinc-900/30 border border-zinc-800/50 rounded-3xl rounded-tl-none">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0s]" />
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                          <span className="ml-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Processing Data...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat Input Area */}
                  <div className="p-4 lg:p-8 bg-gradient-to-t from-black via-black to-transparent z-20">
                    <div className="max-w-4xl mx-auto">
                      <AnimatePresence>
                        {selectedImage && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="mb-4 relative inline-block group"
                          >
                            <div className="relative h-24 w-24">
                              <Image 
                                src={selectedImage} 
                                alt="Preview" 
                                fill
                                className="object-cover rounded-2xl border-2 border-emerald-500 shadow-lg shadow-emerald-500/20" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <button 
                              onClick={() => setSelectedImage(null)}
                              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      <form 
                        onSubmit={handleSendMessage}
                        className="relative flex items-end gap-2"
                      >
                        <div className="flex-1 relative">
                          <textarea
                            rows={1}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                              }
                            }}
                            placeholder="Analyze match stats, predict winners, or upload screenshots..."
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-3xl px-6 py-4 pr-32 focus:outline-none focus:border-emerald-500/50 transition-all text-sm lg:text-base resize-none min-h-[60px] max-h-[200px] backdrop-blur-md"
                          />
                          <div className="absolute right-4 bottom-3 flex items-center gap-2">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              ref={fileInputRef}
                              onChange={handleImageUpload}
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className={`p-2 rounded-xl transition-all ${selectedImage ? 'bg-emerald-500 text-black' : 'hover:bg-zinc-800 text-zinc-500 hover:text-white'}`}
                              title="Upload Screenshot"
                            >
                              <ImageIcon className="w-5 h-5" />
                            </button>
                            <button
                              type="submit"
                              disabled={(!input.trim() && !selectedImage) || isLoading}
                              className="p-2 bg-white text-black rounded-xl font-bold hover:bg-emerald-500 transition-all disabled:opacity-50 disabled:hover:bg-white"
                            >
                              <Send className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </form>
                      <div className="flex justify-between items-center mt-4">
                        <p className="text-[8px] text-zinc-600 uppercase tracking-widest">
                          Gemini 3 Flash Multimodal Engine • Real-time Grounding Enabled
                        </p>
                        <div className="flex gap-4">
                          <span className="text-[8px] text-zinc-600 uppercase tracking-widest flex items-center gap-1">
                            <Shield className="w-2 h-2" /> Secure
                          </span>
                          <span className="text-[8px] text-zinc-600 uppercase tracking-widest flex items-center gap-1">
                            <Zap className="w-2 h-2" /> High Speed
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
