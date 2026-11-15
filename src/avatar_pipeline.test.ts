import assert from "node:assert/strict";
import { InfraiClient } from "./infrai_client.ts";
import { runAvatarPipeline } from "./avatar_pipeline.ts";

const bodies: Record<string, unknown>[] = [];
const fakeFetch: typeof fetch = async (url, init) => {
  bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
  const requestUrl = String(url);
  const data = requestUrl.includes("upload") ? { image: "uploaded-avatar" } : requestUrl.includes("crop") ? { image: "square-avatar" } : requestUrl.includes("compress") ? { image: "avatar.webp" } : {};
  return new Response(JSON.stringify({ ok: true, data, metadata: {} }), { status: 200, headers: { "content-type": "application/json" } });
};

const result = await runAvatarPipeline(new InfraiClient("test-key", fakeFetch), { userId: "u-7", file: "base64-avatar", filename: "avatar.png" }, "request-7");
assert.deepEqual(result, { userId: "u-7", image: "avatar.webp" });
assert.deepEqual(bodies[1], { image: "uploaded-avatar", x: 0, y: 0, width: 512, height: 512, idempotency_key: "request-7" });
assert.deepEqual(bodies[3], { user_id: "u-7", metadata: { image: "avatar.webp" }, idempotency_key: "request-7" });
console.log("avatar pipeline test passed");
