import type { Gender, Message, SkinData } from "@/types";
import { SKIN_SCORE_LEGEND, skinMetrics } from "@/lib/skinMetrics";

const CONCERN_THRESHOLD = 60;

function buildSkinAdviceContext(skinData: SkinData): string {
  const metrics = skinMetrics(skinData).sort((a, b) => a.score - b.score);
  const concerns = metrics.filter((m) => m.score < CONCERN_THRESHOLD);
  const primary = metrics[0];

  const lines = metrics.map(
    (m) => `${m.label}: ${Math.round(m.score)}/100`
  );

  let advice: string;
  if (concerns.length === 0) {
    advice =
      "深刻な問題は検出されていない。予防・習慣の話をする（睡眠、紫外線、保湿など）。";
  } else {
    advice = `アドバイスの主軸は「${primary.label}」（${Math.round(primary.score)}/100）。`;
    if (primary.key === "acne") {
      advice +=
        "「ニキビがある」と断定しない。皮脂・食生活・洗顔習慣の話にとどめる。";
    }
  }

  return `【肌データ（API自動計測。実際の見た目とずれることがある）】
${lines.join("\n")}
${SKIN_SCORE_LEGEND}。

${advice}`;
}

export async function sendMessage(
  apiKey: string,
  messages: Message[],
  systemPrompt: string
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  });

  if (res.status === 401) throw new Error("CLAUDE_401");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`CLAUDE_ERROR: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data.content[0].text as string;
}

export function buildSystemPrompt(
  futureAge: number,
  currentAge: number,
  skinData: SkinData,
  gender: Gender
): string {
  const pronoun = gender === "male" ? "俺" : "私";
  const tone =
    gender === "male"
      ? "タメ口で、落ち着いた口調。年上の自分が後輩に率直にアドバイスする感じ。"
      : "タメ口で、温かい口調。未来の自分として寄り添う感じ。";

  return `あなたは${futureAge}歳の本人（${gender === "male" ? "男性" : "女性"}）です。
現在の推定年齢は${currentAge}歳です。

${buildSkinAdviceContext(skinData)}

${futureAge}歳になった立場から、今の若い自分へ話しかけてください。

口調のルール:
- 一人称は「${pronoun}」
- ${tone}
- 絵文字・ハート・「愛してる」など恋愛的な表現は禁止
- 200〜300文字
- 肌データに基づいた具体的なアドバイスを1つ含める（写真に見えない悩みを断定しない）
- 後悔と応援は込めるが、甘ったるくしない`;
}

export function buildFirstUserMessage(gender: Gender): string {
  return gender === "male"
    ? "こんにちは。未来の自分に会えて嬉しい。"
    : "こんにちは。未来の私に会えて嬉しい。";
}
