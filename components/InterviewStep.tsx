"use client";

import { useState, useRef, useEffect } from "react";
import type { AgingResult, Message, SkinData } from "@/types";

type Props = {
  currentAge: number;
  imagePreviewUrl: string | null;
  agingResults: AgingResult[];
  skinData: SkinData;
  messages: Message[];
  isGenerating: boolean;
  onSend: (message: string) => void;
  error: string | null;
};

const PRESET_QUESTIONS = [
  "転職しようか迷ってるんだけど、どうだった？",
  "もっとやっておけばよかったことって何？",
  "今の自分に一言ちょうだい",
];

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  const colorClass =
    pct >= 70
      ? "bg-emerald-500"
      : pct >= 40
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <div>
      <div className="flex justify-between text-xs text-stone-400 mb-1">
        <span>{label}</span>
        <span>{pct}</span>
      </div>
      <div className="h-1.5 bg-stone-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function InterviewStep({
  currentAge,
  imagePreviewUrl,
  agingResults,
  skinData,
  messages,
  isGenerating,
  onSend,
  error,
}: Props) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const futureAge = agingResults[agingResults.length - 1]?.res_age ?? "?";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isGenerating) return;
    onSend(text);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-stone-950 text-stone-100">
      {/* Left panel: timeline + skin data */}
      <aside className="w-64 flex-shrink-0 bg-stone-900 border-r border-stone-800 overflow-y-auto p-4 space-y-5">
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
          あなたの時系列
        </h2>

        {/* Current photo */}
        {imagePreviewUrl && (
          <div className="space-y-1.5">
            <p className="text-xs text-stone-500">現在（{currentAge}歳）</p>
            <img
              src={imagePreviewUrl}
              alt="現在"
              className="w-full rounded-lg object-cover aspect-square"
            />
          </div>
        )}

        {/* Aging results */}
        {agingResults.map((r) => (
          <div key={r.res_age} className="space-y-1.5">
            <p className="text-xs text-stone-500">{r.res_age}歳</p>
            <img
              src={r.url}
              alt={`${r.res_age}歳`}
              className="w-full rounded-lg object-cover aspect-square"
              loading="lazy"
            />
          </div>
        ))}

        {/* Skin data */}
        <div className="space-y-3 pt-3 border-t border-stone-800">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            肌データ
          </h3>
          <ScoreBar label="水分量" value={skinData.moisture} />
          <ScoreBar label="シワ" value={skinData.wrinkle} />
          <ScoreBar label="毛穴" value={skinData.pore} />
          <ScoreBar label="ニキビ" value={skinData.acne} />
          <p className="text-xs text-stone-600">100が最良・低いほど気になる状態</p>
        </div>
      </aside>

      {/* Right panel: chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="px-6 py-4 border-b border-stone-800 bg-stone-900">
          <p className="font-semibold text-stone-100">
            未来の自分（{futureAge}歳）と話しています
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            AIが生成した未来の自分の人格です
          </p>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-sm lg:max-w-lg px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-stone-200 text-stone-900 rounded-br-sm"
                    : "bg-stone-800 text-stone-100 rounded-bl-sm"
                }`}
              >
                {msg.role === "assistant" && (
                  <p className="text-xs text-stone-500 mb-1">{futureAge}歳の私</p>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isGenerating && (
            <div className="flex justify-start">
              <div className="bg-stone-800 px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex space-x-1 items-center h-4">
                  {[0, 150, 300].map((delay) => (
                    <div
                      key={delay}
                      className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-950/80 border border-red-800 rounded-lg p-3 text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Preset questions */}
        <div className="px-6 py-3 flex gap-2 flex-wrap border-t border-stone-800 bg-stone-950">
          {PRESET_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => setInput(q)}
              className="text-xs bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 px-3 py-1.5 rounded-full transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-stone-800 bg-stone-950">
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="未来の自分に質問する..."
              rows={2}
              className="flex-1 bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-stone-500 resize-none text-sm"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isGenerating}
              className="px-5 py-3 bg-stone-100 text-stone-900 font-medium rounded-xl hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              送信
            </button>
          </div>
          <p className="text-xs text-stone-700 mt-2">
            Enter で送信 / Shift+Enter で改行
          </p>
        </div>
      </div>
    </div>
  );
}
