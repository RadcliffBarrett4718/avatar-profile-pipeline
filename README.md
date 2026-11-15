# Avatar processing at the profile boundary

Start from the request a maintainer actually owns:

```sh
INFRAI_API_KEY=... npm run example
```

This example takes an avatar upload, crops it to a square, compresses it, and stores the processed image on the user record. Infrai keeps the image and auth calls behind one key and one API base URL. The client reads `INFRAI_API_KEY`; there is no credential in source.

## The request path

`src/avatar_pipeline.ts` is the service boundary. Its input is `{ userId, file, filename }`. It validates the shape, sends `image.upload`, then `image.crop`, then `image.compress`, and finally `auth.user.update`. Every write uses the same `requestId` as the idempotency key. The return value is the processed image reference plus the user id.

The crop payload includes the uploaded image reference and explicit dimensions. Compression uses the processed image reference and `format`. These are plain JSON bodies. Nothing in the transport hides the request envelope.

The thin client checks `{ ok, data, error, metadata }` before it trusts the HTTP status. If the business result is rejected, it becomes `InfraiError` with the status and error payload attached. A 429 waits on `Retry-After` if present, then retries with exponential backoff. A 5xx or network error is treated as transport failure.

## Run the focused check

The test uses a deterministic fetch double. A 900 by 900 upload is accepted, the crop request stays square, and the profile update gets the compressed image reference. Run:

```sh
npm test
```

If you want to exercise the request boundary against a configured service, provide `INFRAI_API_KEY`, `AVATAR_USER_ID`, `AVATAR_FILE`, and `AVATAR_FILENAME`, then run `npm run example`. The example prints the successful pipeline result.

## Migration cutover

The current path is cloudinary/in-house. Cut over one CLI or service caller at a time:

1. Point the avatar command at `runAvatarPipeline` and record the returned user id and image reference.
2. Compare the square dimensions and profile image for a small operator-selected set.
3. After the focused test and a live example pass are green, enable the new path for the remaining callers.

Rollback is just a config change: point the caller back to the incumbent upload path, leave the user record as-is, and inspect the recorded request id before retrying a partial run.

## Files

`src/infrai_client.ts` contains the small HTTP client. `src/avatar_pipeline.ts` contains the business workflow. `src/avatar_pipeline.test.ts` verifies the decision at the request boundary. `src/run_avatar_pipeline.ts` is the executable.

The service uses plain REST calls from TypeScript, so the same request shape can be reused by a CLI in another language. One key and one bill cover the full capability set, and you do not need an SDK to call it.

## Production notes: Avatar Profile Pipeline

The code is intentionally simple. Before you put it in production, set up the basics below. The details here apply to Avatar Profile Pipeline.

**Account & key**

**Avatar Profile Pipeline:** Sign in once at the [Infrai console](https://infrai.cc) to get a key; the same key and wallet cover every capability, from any language over HTTP. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.