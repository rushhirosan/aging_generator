# Future Self Interview — 完全版仕様書

## コンセプト

YouCam Aging Generator + Skin Analysis + Claude APIを組み合わせ、
「AIが決めた未来の自分の年齢」と対話するインタビューアプリ。

老化を恐怖として売るAPIで、老化を受け入れるアプリを作る。

---

## セキュリティ設計方針

**完全クライアントサイド処理。APIキーはサーバーに一切送信しない。**

- YouCam API: ブラウザから直接叩く（FAQ Q5にてブラウザ対応を公式確認済み）
- Claude API: ブラウザから直接叩く（anthropic-dangerous-direct-browser-access: true ヘッダーで対応）
- 両APIキーはsessionStorageのみで管理（タブを閉じると消える）
- サーバーサイド処理ゼロ → Vercelへの静的デプロイでよい

---

## 技術スタック

- Next.js 15（App Router、静的エクスポート or Vercel deploy）
- TypeScript
- Tailwind CSS
- サーバーサイドなし（Route Handler不要）

---

## 画面構成

### Step 1: APIキー入力画面

```
┌─────────────────────────────────────┐
│   Future Self Interview             │
│                                     │
│   YouCam APIキー                    │
│   [________________________]        │
│                                     │
│   Claude APIキー                    │
│   [________________________]        │
│                                     │
│   ※キーはブラウザ内のみで処理されます  │
│   ※サーバーには送信されません         │
│                                     │
│         [はじめる →]                │
└─────────────────────────────────────┘
```

- 両キーとも入力必須
- sessionStorageに保存（タブを閉じると自動削除）
- 「キーはブラウザ内のみ」の説明文を必ず表示

### Step 2: 自撮りアップロード画面

```
┌─────────────────────────────────────┐
│   自撮りをアップロードしてください    │
│                                     │
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   │     ドラッグ&ドロップ        │   │
│   │     または クリック          │   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
│   推奨: 正面・明るい照明             │
│   形式: jpg/png 長辺1024px以下      │
│                                     │
│         [未来の自分を呼び出す]       │
└─────────────────────────────────────┘
```

- ファイル選択 or ドラッグ&ドロップ
- アップロード後プレビュー表示
- ボタン押下で2つのAPI（Aging + Skin Analysis）を並行実行
- ローディング中メッセージ: 「未来の自分を呼び出しています...（30〜60秒）」

### Step 3: 結果 + インタビュー画面

```
┌──────────────────┬──────────────────┐
│  あなたの時系列   │  対話UI          │
│                  │                  │
│  [現在]  [?歳]  │  未来の自分（?歳）│
│   顔写真  老顔   │  と話しています  │
│                  │                  │
│  推定現在年齢:   │  ┌────────────┐  │
│  ?歳             │  │ システム   │  │
│                  │  │ こんにちは │  │
│  肌データ:       │  └────────────┘  │
│  シワ:   □□□□□  │                  │
│  毛穴:   □□□□□  │  ┌────────────┐  │
│  水分量: □□□□□  │  │ あなた    │  │
│                  │  │ ...       │  │
│                  │  └────────────┘  │
│                  │                  │
│                  │ [転職して正解だった？]│
│                  │ [後悔していることは？]│
│                  │ [今の自分に一言]  │
│                  │                  │
│                  │ [____________]   │
│                  │      [送信]      │
└──────────────────┴──────────────────┘
```

---

## APIコール設計（クライアントサイド）

### Aging Generator呼び出し

```typescript
// 1. File API: メタデータ登録
POST https://yce-api-01.perfectcorp.com/s2s/v1.0/file/aging
Headers: { Authorization: `Bearer ${youcamKey}` }
Body: { files: [{ content_type: "image/jpg", file_name: "selfie.jpg" }] }
→ file_id + presigned upload URL取得

// 2. presigned URLへ画像本体PUT（これを忘れると失敗）
PUT {presigned_url}
Headers: { Content-Type: "image/jpg" }
Body: 画像バイナリ

// 3. タスク作成
POST https://yce-api-01.perfectcorp.com/s2s/v1.0/task/aging
Body: {
  request_id: 0,
  payload: {
    file_sets: { src_ids: [file_id] },
    actions: [{ id: 0 }]  // paramsなし（年齢はAPIが自動決定）
  }
}
→ task_id取得

// 4. ポーリング（polling_intervalの値を使う）
GET https://yce-api-01.perfectcorp.com/s2s/v1.0/task/aging?task_id={task_id}
→ status === "success"まで繰り返す

// レスポンスから取得するデータ
results[0].data: [
  { url, res_age, dst_id },  // 年齢順に複数枚
  ...
]
results[0].custom_info: {
  age,          // 現在の推定年齢
  age_idx,      // アップロード画像のindex
  age_min,
  age_max,
  num_of_photos
}
```

### Skin Analysis呼び出し

```typescript
// v2.1を使用（Beauty Bias Labと同じフロー）
// 1. File API
POST https://yce-api-01.perfectcorp.com/s2s/v2.1/file/skin-analysis

// 2. presigned URLへPUT

// 3. タスク作成
POST https://yce-api-01.perfectcorp.com/s2s/v2.1/task/skin-analysis
Body: {
  src_file_id: file_id,
  dst_actions: ["hd_wrinkle", "hd_pore", "hd_texture", "hd_moisture", "hd_acne"]
  // HD/SD混在不可。全部hd_に揃える
}

// 4. ポーリング
GET https://yce-api-01.perfectcorp.com/s2s/v2.1/task/skin-analysis/{task_id}

// 取得するデータ（LLMへ渡す用）
hd_wrinkle.whole.raw_score
hd_pore.whole.raw_score
hd_moisture.raw_score
hd_acne.raw_score
```

### Claude API呼び出し（対話）

```typescript
POST https://api.anthropic.com/v1/messages
Headers: {
  "x-api-key": claudeKey,
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
  "Content-Type": "application/json"
}
Body: {
  model: "claude-sonnet-4-6",
  max_tokens: 1000,
  system: `
あなたは${res_age_max}歳の本人です。
現在の推定年齢は${custom_info.age}歳です。

【現在の肌データ（生の測定値）】
シワ（全体）: ${hd_wrinkle_whole_raw}/100
毛穴（全体）: ${hd_pore_whole_raw}/100
水分量: ${hd_moisture_raw}/100
ニキビ: ${hd_acne_raw}/100

スコアは100が最良。数値が低いほど気になる状態。

${res_age_max}歳になった立場から若い自分（今のユーザー）へ話しかけてください。
- 一人称は「私」
- タメ口、でも優しく
- 肌データに基づいた具体的なアドバイスを1つ含める
- 後悔と愛情を込めて
- 200〜300文字
  `,
  messages: 会話履歴 + 今回のユーザー入力
}
```

---

## 状態管理

```typescript
type AppState = {
  step: 'keys' | 'upload' | 'loading' | 'interview'
  
  // APIキー（sessionStorageと同期）
  youcamKey: string
  claudeKey: string
  
  // アップロード画像
  imageFile: File | null
  imagePreviewUrl: string | null
  
  // Aging結果
  agingResults: {
    url: string
    res_age: number
  }[]
  currentAge: number      // custom_info.age
  
  // Skin Analysis結果
  skinData: {
    wrinkle: number       // raw_score
    pore: number
    moisture: number
    acne: number
  } | null
  
  // 対話
  messages: {
    role: 'user' | 'assistant'
    content: string
  }[]
  isGenerating: boolean
}
```

---

## プリセット質問（3つ）

- 「転職しようか迷ってるんだけど、どうだった？」
- 「もっとやっておけばよかったことって何？」
- 「今の私に一言ちょうだい」

---

## エラーハンドリング

| エラー | 対処 |
|---|---|
| error_src_face_too_small | 「顔が小さすぎます。顔が画像の60%以上を占める写真を使ってください」 |
| error_no_face | 「顔が検出できませんでした。正面向きの写真を使ってください」 |
| ポーリングタイムアウト（120秒） | 「処理に時間がかかっています。もう一度お試しください」 |
| Claude API 401 | 「Claude APIキーが無効です。確認してください」 |
| YouCam API 401 | 「YouCam APIキーが無効です。確認してください」 |

エラーコードは常に画面に表示して原因特定しやすくする。

---

## ユニット消費の見積もり

| API | 消費 |
|---|---|
| Aging Generator 1回 | 未確認（Playgroundで要確認） |
| Skin Analysis HD 5項目 | 約1〜2ユニット |
| Claude API | 別途Anthropicの課金 |

---

## ハマりどころ（実装前に把握）

1. **File APIのPOST後にPUTが必須** — POSTだけでは画像がアップロードされない
2. **Aging Generatorのactionsにはparamsなし** — 年齢指定パラメータは存在しない
3. **polling_intervalはレスポンスの値を使う** — 固定値にしない
4. **Skin AnalysisはHD/SD混在不可** — hd_で統一
5. **YouCam結果URLは2時間で失効** — 表示のみ、永続化不要
6. **ブラウザからのClaude API呼び出し** — `anthropic-dangerous-direct-browser-access: true`ヘッダーが必要

---

## デプロイ

- Vercel（静的）
- 環境変数なし（全てユーザー入力）
- GitHubリポジトリ公開 → 記事にリンク

---

## 記事タイトル案

「老化を売るAPIで、老化を受け入れるアプリを作った」

## 記事の核心

Aging Generator APIは本来「老化を恐怖として見せてアンチエイジング商品を売る」文脈で使われる。
このアプリはそれを逆用して「未来の自分と対話し、老いを祝福する」体験を作った。
さらにSkin Analysisの生データ（raw_score）を渡すことで、
「日焼け止めをサボるとこうなるぞ」という肌データに根拠のあるアドバイスが生まれる。