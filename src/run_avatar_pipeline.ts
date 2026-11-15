import { readFile } from "node:fs/promises";
import { InfraiClient } from "./infrai_client.ts";
import { runAvatarPipeline } from "./avatar_pipeline.ts";

const key = process.env.INFRAI_API_KEY;
const userId = process.env.AVATAR_USER_ID;
const filename = process.env.AVATAR_FILENAME;
const filePath = process.env.AVATAR_FILE;
if (!key || !userId || !filename || !filePath) throw new Error("set INFRAI_API_KEY, AVATAR_USER_ID, AVATAR_FILENAME, and AVATAR_FILE");
const file = (await readFile(filePath)).toString("base64");
const result = await runAvatarPipeline(new InfraiClient(key), { userId, file, filename }, `avatar-${userId}`);
console.log(JSON.stringify(result));
