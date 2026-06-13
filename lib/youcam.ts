import type { AgingResult, SkinData } from "@/types";

const BASE = "https://yce-api-01.perfectcorp.com";

type UploadRequest = {
  url: string;
  method: string;
  headers?: Record<string, string>;
};

function normalizeContentType(type: string): string {
  if (type === "image/jpeg") return "image/jpg";
  return type || "image/jpg";
}

async function registerFile(
  apiKey: string,
  endpoint: string,
  imageFile: File
): Promise<{ fileId: string; uploadRequest: UploadRequest }> {
  const contentType = normalizeContentType(imageFile.type);
  const res = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      files: [
        {
          content_type: contentType,
          file_name: imageFile.name || "selfie.jpg",
          file_size: imageFile.size,
        },
      ],
    }),
  });

  if (res.status === 401) throw new Error("YOUCAM_401");

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.status !== 200) {
    throw new Error(`FILE_API_ERROR: ${JSON.stringify(body)}`);
  }

  const file = body.data?.files?.[0];
  const uploadRequest = file?.requests?.[0] as UploadRequest | undefined;
  if (!file?.file_id || !uploadRequest?.url) {
    throw new Error(
      `FILE_API_ERROR: unexpected response: ${JSON.stringify(body)}`
    );
  }

  return { fileId: file.file_id, uploadRequest };
}

async function putToPresignedUrl(
  uploadRequest: UploadRequest,
  imageFile: File
): Promise<void> {
  const res = await fetch(uploadRequest.url, {
    method: uploadRequest.method || "PUT",
    headers:
      uploadRequest.headers ?? {
        "Content-Type": normalizeContentType(imageFile.type),
      },
    body: imageFile,
  });
  if (!res.ok) throw new Error(`PRESIGNED_PUT_ERROR: ${res.status}`);
}

async function poll<T>(
  fetchFn: () => Promise<{ status: string; data: T; errorCode?: string }>,
  pollingInterval: number,
  timeoutMs = 120_000
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollingInterval));
    const result = await fetchFn();

    if (result.status === "failed" || result.status === "error") {
      const code = result.errorCode ?? "UNKNOWN";
      if (code === "error_src_face_too_small") throw new Error("FACE_TOO_SMALL");
      if (code === "error_no_face") throw new Error("NO_FACE");
      if (code === "error_below_min_image_size")
        throw new Error("IMAGE_TOO_SMALL");
      throw new Error(`API_FAILED: ${code}`);
    }
    if (result.status === "success") return result.data;
  }
  throw new Error("TIMEOUT");
}

export async function runAgingGenerator(
  apiKey: string,
  imageFile: File
): Promise<{ agingResults: AgingResult[]; currentAge: number }> {
  const { fileId, uploadRequest } = await registerFile(
    apiKey,
    "/s2s/v2.0/file/aging",
    imageFile
  );

  await putToPresignedUrl(uploadRequest, imageFile);

  const taskRes = await fetch(`${BASE}/s2s/v2.0/task/aging`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ src_file_id: fileId }),
  });
  if (!taskRes.ok) {
    const err = await taskRes.json().catch(() => ({}));
    throw new Error(`AGING_TASK_ERROR: ${JSON.stringify(err)}`);
  }
  const taskData = await taskRes.json();
  const taskId = taskData.data.task_id;
  const pollingInterval: number = taskData.data.polling_interval ?? 3000;

  const result = await poll(
    async () => {
      const res = await fetch(`${BASE}/s2s/v2.0/task/aging/${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return { status: "pending", data: null };
      const d = await res.json();
      return {
        status: d.data.task_status,
        data: d.data.results,
        errorCode: d.data.error,
      };
    },
    pollingInterval
  );

  const output = (result as { output: { url: string; res_age: number }[] })
    .output;
  const agingResults: AgingResult[] = output.map((item) => ({
    url: item.url,
    res_age: item.res_age,
  }));
  const currentAge: number = (result as { age: number }).age;

  return { agingResults, currentAge };
}

export async function runSkinAnalysis(
  apiKey: string,
  imageFile: File
): Promise<SkinData> {
  const { fileId, uploadRequest } = await registerFile(
    apiKey,
    "/s2s/v2.1/file/skin-analysis",
    imageFile
  );

  await putToPresignedUrl(uploadRequest, imageFile);

  const taskRes = await fetch(`${BASE}/s2s/v2.1/task/skin-analysis`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      src_file_id: fileId,
      dst_actions: [
        "hd_wrinkle",
        "hd_pore",
        "hd_texture",
        "hd_moisture",
        "hd_acne",
      ],
      format: "json",
    }),
  });
  if (!taskRes.ok) {
    const err = await taskRes.json().catch(() => ({}));
    throw new Error(`SKIN_TASK_ERROR: ${JSON.stringify(err)}`);
  }
  const taskData = await taskRes.json();
  const taskId = taskData.data.task_id;
  const pollingInterval: number = taskData.data.polling_interval ?? 3000;

  const result = await poll(
    async () => {
      const res = await fetch(
        `${BASE}/s2s/v2.1/task/skin-analysis/${taskId}`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      if (!res.ok) return { status: "pending", data: null };
      const d = await res.json();
      return {
        status: d.data.task_status,
        data: d.data.results,
        errorCode: d.data.error,
      };
    },
    pollingInterval
  );

  return parseSkinData(result);
}

type SkinScoreEntry = {
  type?: string;
  raw_score?: number;
  ui_score?: number;
  whole?: { raw_score?: number; ui_score?: number };
};

function scoreFromEntry(entry: SkinScoreEntry | undefined): number | undefined {
  if (!entry) return undefined;
  return entry.whole?.raw_score ?? entry.raw_score ?? entry.whole?.ui_score ?? entry.ui_score;
}

function parseSkinData(results: unknown): SkinData {
  // format=json: { output: [{ type, raw_score }, ...] }
  const output = (results as { output?: SkinScoreEntry[] })?.output;
  if (output?.length) {
    const byType = new Map(
      output.filter((e) => e.type).map((e) => [e.type!, e])
    );
    const wrinkle = scoreFromEntry(byType.get("hd_wrinkle"));
    const pore = scoreFromEntry(byType.get("hd_pore"));
    const moisture = scoreFromEntry(byType.get("hd_moisture"));
    const acne = scoreFromEntry(byType.get("hd_acne"));
    if (wrinkle != null && pore != null && moisture != null && acne != null) {
      return { wrinkle, pore, moisture, acne };
    }
  }

  // format=zip (score_info.json 相当): { hd_wrinkle: { whole: { raw_score } }, ... }
  const r = results as Record<string, SkinScoreEntry>;
  const wrinkle = scoreFromEntry(r.hd_wrinkle);
  const pore = scoreFromEntry(r.hd_pore);
  const moisture = scoreFromEntry(r.hd_moisture);
  const acne = scoreFromEntry(r.hd_acne);
  if (wrinkle != null && pore != null && moisture != null && acne != null) {
    return { wrinkle, pore, moisture, acne };
  }

  throw new Error(
    `SKIN_PARSE_ERROR: unexpected results format: ${JSON.stringify(results)}`
  );
}
