"use client";

import { useRef, useState, useCallback } from "react";
import type { Gender } from "@/types";

type Props = {
  imagePreviewUrl: string | null;
  gender: Gender;
  onGenderChange: (gender: Gender) => void;
  onImageUpload: (file: File) => void;
  onAnalyze: () => void;
  error: string | null;
};

export default function UploadStep({
  imagePreviewUrl,
  gender,
  onGenderChange,
  onImageUpload,
  onAnalyze,
  error,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (file.type.startsWith("image/")) {
      onImageUpload(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-stone-950">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2 text-stone-100">
          自撮りをアップロード
        </h1>
        <p className="text-stone-500 text-center mb-8 text-sm">
          未来の自分を呼び出す準備をしましょう
        </p>

        <div className="space-y-4">
          <div className="flex gap-2">
            {(["male", "female"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onGenderChange(g)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  gender === g
                    ? "bg-stone-100 text-stone-900"
                    : "bg-stone-800 text-stone-400 hover:bg-stone-700"
                }`}
              >
                {g === "male" ? "男性" : "女性"}
              </button>
            ))}
          </div>

          <div
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragging(false)}
            className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all overflow-hidden ${
              isDragging
                ? "border-stone-400 bg-stone-800"
                : "border-stone-700 bg-stone-900 hover:border-stone-500 hover:bg-stone-800/80"
            }`}
          >
            {imagePreviewUrl ? (
              <img
                src={imagePreviewUrl}
                alt="プレビュー"
                className="w-full h-64 object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-stone-600">
                <svg
                  className="w-12 h-12 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm">ドラッグ&ドロップ</p>
                <p className="text-xs mt-1 text-stone-700">または クリックして選択</p>
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="hidden"
          />

          <p className="text-xs text-stone-600 text-center">
            推奨: 正面・明るい照明 / 形式: jpg/png / 短辺1080px以上
          </p>

          {error && (
            <div className="bg-red-950/80 border border-red-800 rounded-lg p-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={onAnalyze}
            disabled={!imagePreviewUrl}
            className="w-full bg-stone-100 text-stone-900 font-semibold py-3 rounded-lg hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            未来の自分を呼び出す
          </button>
        </div>
      </div>
    </div>
  );
}
