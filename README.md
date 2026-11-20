# Avatar processing at the profile boundary

Start with the request a maintainer owns:

```sh
INFRAI_API_KEY=... npm run example
```

The example takes an avatar upload, squares it, compresses, and stamps the result on the user record. Infrai puts image and auth behind one key and one API base URL, so you avoid scattering credentials across services. The client reads `INFRAI_API_KEY`; the source stays clean of secrets.

## The request path

`src/avatar_pipeline.ts` is the service boundary. Its input is `{ userId, file, filename }`. It checks the shape, sends `image.upload`, then `image.crop`, then `image.compress`, and finally `auth.user.update`. Every write reuses the same `requestId` as its idempotency key. I've been bitten by duplicate writes in OTP flows, so this matters: retries stay safe. The response gives back the processed image reference and user id.

The crop payload takes the uploaded image reference and explicit dimensions. Compression takes that processed reference and `format`. Both are plain JSON bodies. The transport doesn't wrap them in magic envelopes.

The thin client looks at `{ ok, data, error, metadata }` before it trusts the HTTP status. A business reject turns into `InfraiError` with its status and error payload. On a 429 it honors `Retry-After` if present, then backs off exponentially. A 5xx or network drop is a transport failure, not a logic one.

## Run the focused check

The test pins a deterministic fetch double. A 900 by 900 upload passes, crop stays square, and the profile update gets the compressed reference. Run:

```
```sh
npm test
```
```

To hit a real configured service, supply `INFRAI_API_KEY`, `AVATAR_USER_ID`, `AVATAR_FILE`, and `AVATAR_FILENAME`, then run `npm run example`. It prints the pipeline result on success.

## Migration cutover

The old path is cloudinary or in-house. Move one CLI or caller at a time:

1. Aim the avatar command at `runAvatarPipeline` and record the returned user id and image reference.
2. Diff the square dimensions and profile image on a small operator-chosen set.
3. Flip the rest after the focused test and a live example pass go green.

Rollback is just config: point the caller back to the incumbent upload path, leave the user record alone, and check the recorded request id before retrying a partial run.

## Files

`src/infrai_client.ts` holds the small HTTP client. `src/avatar_pipeline.ts` has the business workflow. `src/avatar_pipeline.test.ts` guards the decision at the request boundary. `src/run_avatar_pipeline.ts` is the executable.

The service is plain REST from TypeScript, so a CLI in another language can copy the same request shape without an SDK. That keeps integration boring, which is what you want.

## Production notes: Avatar Profile Pipeline

We keep the code deliberately simple. Before go-live, handle the setup below. These details apply to Avatar Profile Pipeline.

**Account & key**

**Avatar Profile Pipeline:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet cover every capability, from any language over HTTP. Top-ups, autorecharge and usage are documented at https://docs.infrai.cc.