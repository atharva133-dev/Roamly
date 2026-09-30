"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { SignedIn } from "@clerk/nextjs";
import {
  X,
  Send,
  Bot,
  Sparkles,
  RotateCcw,
  ChevronDown,
  Plane,
  MapPin,
  Hotel,
  IndianRupee,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  { icon: MapPin, label: "Best destinations in India" },
  { icon: Hotel, label: "Budget hotels in Goa" },
  { icon: Plane, label: "Cheapest time to fly to Bali" },
  { icon: IndianRupee, label: "10-day Europe trip budget" },
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <span
        className="w-2 h-2 rounded-full bg-[#485C11]/60 animate-bounce"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="w-2 h-2 rounded-full bg-[#485C11]/60 animate-bounce"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="w-2 h-2 rounded-full bg-[#485C11]/60 animate-bounce"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && (
        <div className="shrink-0 w-7 h-7 rounded-full bg-[#485C11] flex items-center justify-center shadow-sm mt-0.5">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "bg-[#485C11] text-white rounded-br-sm"
            : "bg-white text-[#1a1a1a] rounded-bl-sm border border-[#e5e7db]"
        }`}
      >
        {msg.content.split("\n").map((line, i) => (
          <p key={i} className={line.startsWith("•") || line.startsWith("-") ? "ml-1" : ""}>
            {line || <br />}
          </p>
        ))}
        <span
          className={`block text-[10px] mt-1.5 ${
            isUser ? "text-white/60 text-right" : "text-[#9ca3af]"
          }`}
        >
          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "✈️ Hi! I'm your Roamly AI Travel Assistant.\n\nAsk me anything about destinations, itineraries, budgets, hotels, flights, or local tips!\n\nWhere are you thinking of going? 🌍",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setChatCount((c) => c + 1);

    try {
      const allMessages = [
        ...messages.filter((m) => m.id !== "welcome"),
        userMsg,
      ].map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.reply || "Sorry, I couldn't get a response. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "⚠️ Something went wrong. Please check your connection and try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content:
          "✈️ Chat cleared! I'm ready to help you plan your next adventure.\n\nWhere would you like to go? 🌍",
        timestamp: new Date(),
      },
    ]);
    setChatCount(0);
  };

  return (
    <SignedIn>
      {/* FAB trigger button */}
      <button
        id="ai-chatbot-fab"
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-[#485C11] text-white shadow-lg hover:bg-[#3a4d0d] hover:shadow-xl transition-all duration-300 group ${
          isOpen ? "opacity-0 pointer-events-none scale-90" : "opacity-100 scale-100"
        }`}
        aria-label="Open AI Travel Assistant"
      >
        <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" />
        <span className="text-sm font-semibold">AI Assistant</span>
        {chatCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {chatCount > 9 ? "9+" : chatCount}
          </span>
        )}
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-all duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 right-0 h-full z-50 flex flex-col w-[380px] max-w-[95vw] bg-[#FAFBF8] shadow-2xl border-l border-[#e5e7db] transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#e5e7db] bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#e5e7db] flex items-center justify-center shadow-sm overflow-hidden p-0.5">
              <Image
                src="/logo-icon.png"
                alt="Roamly"
                width={32}
                height={32}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1a1a1a] leading-none">Roamly AI Assistant</h2>
              <p className="text-[11px] text-[#6b7280] mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                Powered by <strong className="text-[#485C11]">Gemini</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearChat}
              title="Clear chat"
              className="p-1.5 rounded-lg text-[#6b7280] hover:text-[#485C11] hover:bg-[#e5e7db]/60 transition-all duration-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-[#6b7280] hover:text-[#1a1a1a] hover:bg-[#e5e7db]/60 transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Gemini Travel Intelligence Indicator */}
        <div className="px-4 py-1.5 bg-[#f0f4e8] border-b border-[#e5e7db] flex items-center justify-between text-[10px] text-[#485C11] font-medium">
          <span>AI Travel & Itinerary Assistant</span>
          <span className="bg-[#485C11]/10 px-2 py-0.5 rounded-full font-semibold">Gemini AI</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {isTyping && (
            <div className="flex gap-2.5">
              <div className="shrink-0 w-7 h-7 rounded-full bg-[#485C11] flex items-center justify-center shadow-sm mt-0.5">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-white border border-[#e5e7db] rounded-2xl rounded-bl-sm shadow-sm">
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompts — shown only at the start */}
        {messages.length <= 1 && (
          <div className="px-4 pb-3">
            <p className="text-[10px] uppercase font-semibold text-[#9ca3af] mb-2 tracking-wider">
              Try asking
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_PROMPTS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(label)}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white border border-[#e5e7db] text-[11px] text-[#374151] hover:border-[#485C11]/50 hover:bg-[#DFECC6]/30 hover:text-[#485C11] transition-all duration-200 text-left"
                >
                  <Icon className="w-3 h-3 shrink-0 text-[#485C11]" />
                  <span className="leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="px-4 py-3 border-t border-[#e5e7db] bg-white/80 backdrop-blur-md">
          <div className="flex items-end gap-2 bg-[#f4f6ef] rounded-2xl px-3 py-2 border border-[#e5e7db] focus-within:border-[#485C11]/50 focus-within:bg-white transition-all duration-200">
            <textarea
              ref={inputRef}
              id="ai-chatbot-input"
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder='Ask anything or type "/" to see'
              disabled={isTyping}
              className="flex-1 resize-none bg-transparent text-sm text-[#1a1a1a] placeholder-[#9ca3af] outline-none leading-relaxed min-h-[24px] max-h-[100px] disabled:opacity-50"
            />
            <button
              id="ai-chatbot-send"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              className="shrink-0 w-8 h-8 rounded-xl bg-[#485C11] text-white flex items-center justify-center hover:bg-[#3a4d0d] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-[#9ca3af] mt-1.5 text-center">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>

        {/* Minimize handle on the left edge */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-12 bg-white border border-[#e5e7db] rounded-l-lg flex items-center justify-center shadow-sm hover:bg-[#DFECC6]/30 transition-colors duration-200"
          aria-label="Close panel"
        >
          <ChevronDown className="w-3 h-3 text-[#6b7280] rotate-[-90deg]" />
        </button>
      </div>
    </SignedIn>
  );
}
