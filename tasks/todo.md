# Bug Fix Plan

- [x] Reproduce the current startup and video-flow failures locally.
- [x] Restore a valid Next.js config so the app boots on Next 16.
- [x] Reproduce the video-generation path after startup is fixed.
- [x] Fix the local video pipeline so it works without production-only infra.
- [x] Verify app startup, generation, preview, and download behavior.
- [x] Document review notes and verification results.

## Review

- Converted the Next config to `next.config.mjs` so the app boots under Next 16.
- Added a local asset-serving route and local-storage fallback so preview/download URLs work without S3.
- Disabled BullMQ usage unless `ENABLE_BULLMQ=true` and `REDIS_URL` are both configured, which restores fast in-memory local jobs.
- Added local stub behavior for Veo and Nano Banan assets so local generation completes quickly and still renders a valid video.
- Fixed the Remotion renderer to bundle the file that actually calls `registerRoot()`.
- Verified `npm run build`.
- Verified `node node_modules/typescript/bin/tsc --noEmit`.
- Verified the live app on `http://localhost:3000`.
- Verified `/api/generate` returns `202`, the job reaches `completed`, preview assets return `200`, and the final MP4 download returns `200`.
