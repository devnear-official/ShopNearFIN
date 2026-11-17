"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  Maximize2,
  Minimize2,
  TrendingUp,
  Package,
  Wallet,
  Truck,
} from "lucide-react";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isError?: boolean;
}

const QUICK_PROMPTS = [
  {
    icon: TrendingUp,
    label: "এই মাসের লাভ ও খরচ",
    prompt: "এই মাসের টোটাল রেভিনিউ, প্রোডাক্ট কেনা খরচ, ডেলিভারি খরচ, রিটার্ন লস এবং নিট প্রফিট কত?",
  },
  {
    icon: Package,
    label: "প্রোডাক্টের দাম ও স্টক",
    prompt: "আমাদের সব প্রোডাক্টের নাম, বিক্রয় মূল্য, কেনা দাম এবং বর্তমান স্টক কত আছে বলো।",
  },
  {
    icon: Wallet,
    label: "ক্যাশ ও ভল্ট ব্যালেন্স",
    prompt: "ক্যাশ ইন হ্যান্ড, বিকাশ, নগদ এবং ব্যাংকে বর্তমানে কত টাকা জমা আছে?",
  },
  {
    icon: Truck,
    label: "অর্ডারের স্ট্যাটাস সামারি",
    prompt: "মোট কতগুলো অর্ডার ডেলিভারড, শিপড বা পেন্ডিং অবস্থায় আছে?",
  },
];

export function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 **স্বাগতম! আমি ShopNearFin এর AI বিজনেস ও ফাইন্যান্স অ্যাসিস্ট্যান্ট।**\n\nআপনার ডাটাবেজের রিয়েল-টাইম তথ্য অনুযায়ী আমি যেকোনো প্রশ্নের উত্তর দিতে পারি। নিচে কিছু কুইক অপশন রয়েছে অথবা সরাসরি যেকোনো প্রশ্ন লিখে পাঠান!",
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [missingKey, setMissingKey] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Prepare history (last 8 messages)
      const history = messages
        .filter((m) => m.id !== "welcome" && !m.isError)
        .slice(-8)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          history,
        }),
      });

      const json = await res.json();

      if (json.data?.missingKey) {
        setMissingKey(true);
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: json.data?.reply || json.message || "দুঃখিত, কোনো উত্তর পাওয়া যায়নি।",
        timestamp: new Date(),
        isError: !res.ok,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "❌ সার্ভারের সাথে সংযোগ বিচ্ছিন্ন হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-" + Date.now(),
        role: "assistant",
        content:
          "চ্যাট ক্লিয়ার করা হয়েছে। নতুন কোনো হিসাব বা প্রডাক্টের স্টক জানতে চাইলে প্রশ্ন করুন!",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 group flex items-center gap-2.5 bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 text-white pl-3.5 pr-4 py-3 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 ring-4 ring-teal-500/20"
          aria-label="Open AI Assistant"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <span className="text-xs font-semibold tracking-wide hidden sm:inline-block">
            AI Assistant
          </span>
        </button>
      )}

      {/* AI Chat Popup / Panel */}
      {isOpen && (
        <div
          className={`fixed z-50 flex flex-col bg-card border border-border shadow-2xl rounded-2xl md:rounded-3xl overflow-hidden transition-all duration-300 ${
            isExpanded
              ? "inset-2 md:inset-8"
              : "bottom-20 md:bottom-6 right-2 md:right-6 w-[calc(100vw-16px)] sm:w-[440px] h-[580px] max-h-[82vh]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-700 to-emerald-800 text-white border-b border-teal-800/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                <Bot className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-xs font-bold flex items-center gap-1.5 leading-none">
                  <span>ShopNearFin AI</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-medium">
                    Gemini 1.5
                  </span>
                </h3>
                <p className="text-[10px] text-teal-100/80 mt-0.5">
                  Live Database Connected
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-teal-100">
              <button
                onClick={clearChat}
                title="Clear Chat"
                className="p-1.5 hover:bg-white/10 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse" : "Expand"}
                className="p-1.5 hover:bg-white/10 rounded-lg transition hidden sm:inline-flex"
              >
                {isExpanded ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1.5 hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar (when only welcome message is present) */}
          {messages.length <= 1 && (
            <div className="p-3 bg-muted/40 border-b border-border/50">
              <p className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                কুইক অপশন সিলেক্ট করুন:
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {QUICK_PROMPTS.map((qp, idx) => {
                  const Icon = qp.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSend(qp.prompt)}
                      className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/40 text-left transition-all group"
                    >
                      <Icon className="w-3.5 h-3.5 text-teal-600 shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] font-medium text-foreground line-clamp-1">
                        {qp.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Missing Key Banner */}
          {missingKey && (
            <div className="p-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400">
              <span>Gemini API Key সেট করা প্রয়োজন।</span>
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center gap-1 font-semibold underline hover:text-amber-500"
              >
                <span>Settings এ যান</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 font-sans text-xs">
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`relative group max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed whitespace-pre-wrap break-words ${
                      isUser
                        ? "bg-teal-600 text-white rounded-br-xs"
                        : m.isError
                        ? "bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-bl-xs"
                        : "bg-muted/70 text-foreground border border-border/50 rounded-bl-xs"
                    }`}
                  >
                    {m.content}

                    {!isUser && (
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                        <span>
                          {m.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <button
                          onClick={() => copyToClipboard(m.id, m.content)}
                          title="Copy Answer"
                          className="opacity-60 hover:opacity-100 transition inline-flex items-center gap-1"
                        >
                          {copiedId === m.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-6 h-6 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0 mt-0.5 border border-border">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-2 justify-start items-center text-xs text-muted-foreground">
                <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-muted/70 border border-border/50 rounded-2xl px-3.5 py-2.5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                  <span className="text-[11px]">ডাটাবেজ এনালাইসিস করছি...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-2.5 bg-card border-t border-border flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="যেকোনো হিসাব বা প্রশ্ন লিখুন... (Enter চাপুন)"
              className="flex-1 resize-none max-h-24 bg-muted/50 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-foreground placeholder:text-muted-foreground"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:hover:bg-teal-600 text-white flex items-center justify-center shrink-0 transition"
              aria-label="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
