export type AppStep = "keys" | "upload" | "loading" | "interview";

export type Gender = "male" | "female";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export type AgingResult = {
  url: string;
  res_age: number;
};

export type SkinData = {
  wrinkle: number;
  pore: number;
  moisture: number;
  acne: number;
};

export type AppState = {
  step: AppStep;
  youcamKey: string;
  claudeKey: string;
  gender: Gender;
  imageFile: File | null;
  imagePreviewUrl: string | null;
  agingResults: AgingResult[];
  currentAge: number;
  skinData: SkinData | null;
  messages: Message[];
  isGenerating: boolean;
};
