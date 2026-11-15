import { InfraiClient } from "./infrai_client.ts";

export type AvatarRequest = { userId: string; file: string; filename: string };
export type AvatarResult = { userId: string; image: string };

function validate(input: AvatarRequest): void {
  if (!input || typeof input.userId !== "string" || input.userId.length === 0 || typeof input.file !== "string" || input.file.length === 0 || typeof input.filename !== "string" || input.filename.length === 0) {
    throw new TypeError("userId, file, and filename are required");
  }
}

export async function runAvatarPipeline(client: InfraiClient, input: AvatarRequest, requestId: string): Promise<AvatarResult> {
  validate(input);
  const uploaded = await client.call<{ image: string }>("/image/upload", "POST", { file: input.file, filename: input.filename, idempotency_key: requestId }, requestId);
  // image.crop is the square-avatar decision in this workflow.
  const cropped = await client.call<{ image: string }>("/image/crop", "POST", { image: uploaded.image, x: 0, y: 0, width: 512, height: 512, idempotency_key: requestId }, requestId);
  const compressed = await client.call<{ image: string }>("/image/compress", "POST", { image: cropped.image, format: "webp", idempotency_key: requestId }, requestId);
  await client.call("/auth/user/update/" + input.userId, "PATCH", { user_id: input.userId, metadata: { image: compressed.image }, idempotency_key: requestId }, requestId);
  return { userId: input.userId, image: compressed.image };
}
