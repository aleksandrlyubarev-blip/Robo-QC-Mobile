import type { DetectionResponse } from "@workspace/shared-types";

interface InferenceRequest {
  imageUrl: string;
  depthMapUrl?: string;
  textPrompts: string[];
  scoreThreshold?: number;
  maxDetections?: number;
}

const INFERENCE_URL = process.env["INFERENCE_SERVER_URL"] || "http://localhost:8000";
const INFERENCE_TIMEOUT = Number(process.env["INFERENCE_TIMEOUT_MS"] || "30000");

export async function callInferenceServer(request: InferenceRequest): Promise<DetectionResponse> {
  const formData = new FormData();

  // Fetch image from stored URL and attach as blob
  const imageResp = await fetch(request.imageUrl);
  if (!imageResp.ok) {
    throw new Error(`Failed to fetch image from ${request.imageUrl}`);
  }
  const imageBlob = await imageResp.blob();
  formData.append("image", imageBlob, "capture.jpg");

  // Attach depth map if available
  if (request.depthMapUrl) {
    const depthResp = await fetch(request.depthMapUrl);
    if (depthResp.ok) {
      const depthBlob = await depthResp.blob();
      formData.append("depth_map", depthBlob, "depth.png");
    }
  }

  formData.append("text_prompts", JSON.stringify(request.textPrompts));
  formData.append("score_threshold", String(request.scoreThreshold ?? 0.3));
  formData.append("max_detections", String(request.maxDetections ?? 100));

  const resp = await fetch(`${INFERENCE_URL}/detect`, {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(INFERENCE_TIMEOUT),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Inference server error (${resp.status}): ${body}`);
  }

  return (await resp.json()) as DetectionResponse;
}
