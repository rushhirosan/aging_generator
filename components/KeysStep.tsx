"use client";

import { useState } from "react";

type Props = {
  onSubmit: (youcamKey: string, claudeKey: string) => void;
};

export default function KeysStep({ onSubmit }: Props) {
  const [youcamKey, setYoucamKey] = useState("");
  const [claudeKey, setClaudeKey] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (youcamKey.trim() && claudeKey.trim()) {
      onSubmit(youcamKey.trim(), claudeKey.trim());
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-stone-950">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-stone-100">
          Future Self Interview
        </h1>
        <p className="text-stone-500 text-center mb-8 text-sm">
          老化を売るAPIで、老化を受け入れるアプリ
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 bg-stone-900 p-8 rounded-2xl border border-stone-800"
        >
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">
              YouCam APIキー
            </label>
            <input
              type="password"
              value={youcamKey}
              onChange={(e) => setYoucamKey(e.target.value)}
              placeholder="Bearer token..."
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-stone-500 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">
              Claude APIキー
            </label>
            <input
              type="password"
              value={claudeKey}
              onChange={(e) => setClaudeKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-stone-500 text-sm"
              required
            />
          </div>

          <div className="bg-stone-800/60 rounded-lg p-4 text-xs text-stone-500 space-y-1">
            <p>※ キーはブラウザ内のみで処理されます</p>
            <p>※ サーバーには送信されません</p>
            <p>※ タブを閉じると自動的に削除されます</p>
          </div>

          <button
            type="submit"
            disabled={!youcamKey.trim() || !claudeKey.trim()}
            className="w-full bg-stone-100 text-stone-900 font-semibold py-3 rounded-lg hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            はじめる →
          </button>
        </form>
      </div>
    </div>
  );
}
