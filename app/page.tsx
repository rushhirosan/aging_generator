"use client";

import { useState, useEffect } from "react";
import KeysStep from "@/components/KeysStep";
import UploadStep from "@/components/UploadStep";
import LoadingStep from "@/components/LoadingStep";
import InterviewStep from "@/components/InterviewStep";
import { runAgingGenerator, runSkinAnalysis } from "@/lib/youcam";
import { prepareImageForYouCam } from "@/lib/prepareImage";
import {
  sendMessage,
  buildSystemPrompt,
  buildFirstUserMessage,
} from "@/lib/claude";
import type { AppState, Message } from "@/types";

const SK_YOUCAM = "fsi_youcam_key";
const SK_CLAUDE = "fsi_claude_key";

const initialState: AppState = {
  step: "keys",
  youcamKey: "",
  claudeKey: "",
  gender: "male",
  imageFile: null,
  imagePreviewUrl: null,
  agingResults: [],
  currentAge: 0,
  skinData: null,
  messages: [],
  isGenerating: false,
};

function formatError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("IMAGE_TOO_SMALL") || msg.includes("error_below_min_image_size"))
    return "画像の解像度が低すぎます。短辺1080px以上の写真を使ってください。";
  if (msg.includes("FACE_TOO_SMALL"))
    return "顔が小さすぎます。顔が画像の60%以上を占める写真を使ってください。";
  if (msg.includes("NO_FACE"))
    return "顔が検出できませんでした。正面向きの写真を使ってください。";
  if (msg.includes("TIMEOUT"))
    return "処理に時間がかかっています。もう一度お試しください。";
  if (msg.includes("CLAUDE_401"))
    return "Claude APIキーが無効です。確認してください。";
  if (msg.includes("YOUCAM_401"))
    return "YouCam APIキーが無効です。確認してください。";
  if (msg.includes("SKIN_PARSE_ERROR"))
    return "肌分析の結果を読み取れませんでした。もう一度お試しください。";
  return `エラー: ${msg}`;
}

export default function Home() {
  const [state, setState] = useState<AppState>(initialState);
  const [error, setError] = useState<string | null>(null);

  // セッションストレージからキーを復元
  useEffect(() => {
    const youcamKey = sessionStorage.getItem(SK_YOUCAM) ?? "";
    const claudeKey = sessionStorage.getItem(SK_CLAUDE) ?? "";
    if (youcamKey && claudeKey) {
      setState((s) => ({ ...s, youcamKey, claudeKey, step: "upload" }));
    }
  }, []);

  const handleKeysSubmit = (youcamKey: string, claudeKey: string) => {
    sessionStorage.setItem(SK_YOUCAM, youcamKey);
    sessionStorage.setItem(SK_CLAUDE, claudeKey);
    setState((s) => ({ ...s, youcamKey, claudeKey, step: "upload" }));
    setError(null);
  };

  const handleImageUpload = async (file: File) => {
    setError(null);
    try {
      const prepared = await prepareImageForYouCam(file);
      const url = URL.createObjectURL(prepared);
      setState((s) => ({
        ...s,
        imageFile: prepared,
        imagePreviewUrl: url,
      }));
    } catch (err) {
      setError(formatError(err));
    }
  };

  const handleAnalyze = async () => {
    if (!state.imageFile) return;
    setError(null);
    setState((s) => ({ ...s, step: "loading" }));

    try {
      const imageFile = await prepareImageForYouCam(state.imageFile);

      // Aging と Skin Analysis を並行実行
      const [agingRes, skinRes] = await Promise.all([
        runAgingGenerator(state.youcamKey, imageFile),
        runSkinAnalysis(state.youcamKey, imageFile),
      ]);

      // 最も老けた年齢をfutureAgeとする
      const futureAge =
        agingRes.agingResults[agingRes.agingResults.length - 1]?.res_age ?? 60;

      // 初回メッセージを Claude に送る
      const systemPrompt = buildSystemPrompt(
        futureAge,
        agingRes.currentAge,
        skinRes,
        state.gender
      );
      const firstUserMsg = buildFirstUserMessage(state.gender);
      const firstAssistantMsg = await sendMessage(
        state.claudeKey,
        [{ role: "user", content: firstUserMsg }],
        systemPrompt
      );

      setState((s) => ({
        ...s,
        step: "interview",
        agingResults: agingRes.agingResults,
        currentAge: agingRes.currentAge,
        skinData: skinRes,
        messages: [
          { role: "user", content: firstUserMsg },
          { role: "assistant", content: firstAssistantMsg },
        ],
      }));
    } catch (err) {
      setError(formatError(err));
      setState((s) => ({ ...s, step: "upload" }));
    }
  };

  const handleSend = async (userText: string) => {
    if (!userText.trim() || state.isGenerating || !state.skinData) return;

    const newMessages: Message[] = [
      ...state.messages,
      { role: "user", content: userText },
    ];
    setState((s) => ({ ...s, messages: newMessages, isGenerating: true }));
    setError(null);

    const futureAge =
      state.agingResults[state.agingResults.length - 1]?.res_age ?? 60;
    const systemPrompt = buildSystemPrompt(
      futureAge,
      state.currentAge,
      state.skinData,
      state.gender
    );

    try {
      const reply = await sendMessage(
        state.claudeKey,
        newMessages,
        systemPrompt
      );
      setState((s) => ({
        ...s,
        messages: [...newMessages, { role: "assistant", content: reply }],
        isGenerating: false,
      }));
    } catch (err) {
      setError(formatError(err));
      setState((s) => ({ ...s, isGenerating: false }));
    }
  };

  return (
    <main>
      {state.step === "keys" && <KeysStep onSubmit={handleKeysSubmit} />}
      {state.step === "upload" && (
        <UploadStep
          imagePreviewUrl={state.imagePreviewUrl}
          gender={state.gender}
          onGenderChange={(gender) => setState((s) => ({ ...s, gender }))}
          onImageUpload={handleImageUpload}
          onAnalyze={handleAnalyze}
          error={error}
        />
      )}
      {state.step === "loading" && <LoadingStep />}
      {state.step === "interview" && state.skinData && (
        <InterviewStep
          currentAge={state.currentAge}
          imagePreviewUrl={state.imagePreviewUrl}
          agingResults={state.agingResults}
          skinData={state.skinData}
          messages={state.messages}
          isGenerating={state.isGenerating}
          onSend={handleSend}
          error={error}
        />
      )}
    </main>
  );
}
