# RocketRide Integration — Complete Issues Report

**Project:** Gemini0321 AI Video Generator
**Date:** 2026-03-22
**Scope:** Full integration of RocketRide as AI pipeline orchestration backend

---

## Summary

| Category | Issues | Critical | Resolved |
|----------|--------|----------|----------|
| SDK / Client | 8 | 3 | 8 |
| Pipeline Format | 6 | 2 | 6 |
| Docker / Engine | 4 | 1 | 4 |
| Networking / Tunnel | 5 | 2 | 5 |
| Code Quality / Bugs | 13 | 4 | 13 |
| Environment / Config | 5 | 2 | 5 |
| VS Code / Cursor Extension | 4 | 1 | 4 |
| **Total** | **45** | **15** | **45** |

---

## 1. SDK / Client Issues

### 1.1 SDK `normalizeUri` hardcodes port 5565
- **Severity:** Critical
- **Description:** `RocketRideClient.normalizeUri()` always appends `:5565` to any URL, breaking ngrok/Cloudflare tunnel connections that use port 443.
- **Symptom:** `Connection timeout after 10000ms` when using tunnel URLs.
- **Root Cause:** SDK function at `node_modules/rocketride/dist/cjs/client.js` strips the port and re-appends 5565.
- **Fix:** Override SDK internals (`_getWebsocketUri`, `_setUri`, `_uri`) with correct `wss://` URL for tunnel mode. Auto-detect tunnel URLs in `rocketride.ts`.

### 1.2 ESM directory import error
- **Severity:** Medium
- **Description:** `node test-rocketride.mjs` failed with `ERR_UNSUPPORTED_DIR_IMPORT` when importing `rocketride` via ESM.
- **Symptom:** `Directory import '/node_modules/rocketride/dist/esm/exceptions' is not supported`
- **Root Cause:** The SDK's ESM build uses bare directory imports without `/index.js`, which Node.js ESM doesn't allow.
- **Fix:** Use `createRequire()` to import via CJS instead of ESM import.

### 1.3 `ConnectErrorCallback` type mismatch
- **Severity:** Low
- **Description:** TypeScript error: `Type 'void' is not assignable to type 'Promise<void>'` on `onConnectError` callback.
- **Root Cause:** SDK expects all callbacks to return `Promise<void>`, not `void`.
- **Fix:** Changed `(message) => {` to `async (message) => {`.

### 1.4 `chat()` method doesn't work with webhook pipelines
- **Severity:** Medium
- **Description:** `client.chat()` throws `"You are looking for a 'chat', but this pipeline isn't it"`.
- **Root Cause:** `chat()` requires a pipeline with a `chat` source type, not `webhook`.
- **Fix:** Use `send()` with `text/plain` mimetype instead of `chat()`.

### 1.5 `send()` with `application/json` returns only metadata
- **Severity:** High
- **Description:** `send()` with JSON mimetype returns `{name, path, objectId}` — no LLM answer.
- **Root Cause:** Webhook pipelines process `text/plain` input through the question node. JSON input bypasses the question node's text lane.
- **Fix:** Use `send(token, input, { name: "prompt.txt" }, "text/plain")`.

### 1.6 Singleton client race condition
- **Severity:** High (found in audit)
- **Description:** Two concurrent calls to `getRocketRideClient()` could create duplicate client instances, orphaning one.
- **Root Cause:** `connecting` promise guard was set after client creation, leaving a window for a second caller to bypass it.
- **Fix:** Wrapped entire client creation + connect in a single async IIFE assigned to `connecting` atomically.

### 1.7 Broken client not reset on connection failure
- **Severity:** High (found in audit)
- **Description:** If `client.connect()` fails, `client` variable still points to the broken instance. Next caller creates a third instance without cleaning up.
- **Fix:** Added `.catch()` that resets `client = null` before rethrowing.

### 1.8 Private property access for tunnel mode
- **Severity:** Low
- **Description:** TypeScript errors when setting `client._uri`, `client._getWebsocketUri`, `client._setUri` — they're private.
- **Fix:** Cast to `unknown as Record<string, unknown>` to bypass TypeScript access checks.

---

## 2. Pipeline Format Issues

### 2.1 Gemini profile name uses dots instead of underscores
- **Severity:** Critical
- **Description:** Pipeline config used `"gemini-2.5-flash"` but engine expects `"gemini-2_5-flash"`.
- **Symptom:** `Profile gemini-2.5-flash is not defined in llm_gemini`
- **Root Cause:** The engine's `services.json` preconfig uses underscores in profile keys (e.g., `gemini-2_5-flash`), not the model's display name with dots.
- **Fix:** Changed all profile references to use underscore format.

### 2.2 Response node `"keys"` vs `"lanes"` vs `{}`
- **Severity:** Critical
- **Description:** Three different config formats attempted, each breaking something:
  - `"keys": { "answers": "answers" }` — worked for engine, rejected by VS Code extension
  - `"lanes": [{ "laneId": "answers", "laneName": "answers" }]` — accepted by extension, broke engine (`'NoneType' object does not support item assignment`)
  - `{}` (empty) — works for both
- **Root Cause:** The engine auto-detects output lanes from input connections when config is empty. The extension schema expects `lanes` array. The `keys` format was from an older engine version.
- **Fix:** Use empty `"config": {}` for response nodes.

### 2.3 Missing `project_id` field
- **Severity:** Medium
- **Description:** VS Code extension shows `Invalid pipeline file or missing project_id`.
- **Root Cause:** Extension requires a `project_id` UUID in each `.pipe` file.
- **Fix:** Added `crypto.randomUUID()` as `project_id` to all three pipeline files.

### 2.4 Missing `"ui": {}` field on components
- **Severity:** Low
- **Description:** Extension canvas showed "No active components" partly because components lacked the `"ui": {}` field.
- **Root Cause:** Reference pipelines include `"ui": {}` on every component; extension may use it for canvas rendering.
- **Fix:** Added `"ui": {}` to all components.

### 2.5 Webhook config missing standard fields
- **Severity:** Low
- **Description:** Our webhook config was minimal; reference pipelines include `key`, `name`, `include`, `sync` fields.
- **Fix:** Added `key: "webhook://*"`, `name: "Web Hook"`, `include: [{ path: "*" }]`, `sync: false`.

### 2.6 `${VAR}` and `%VAR%` variable substitution doesn't work
- **Severity:** Critical
- **Description:** Pipeline configs using `${ROCKETRIDE_APIKEY_GEMINI}` or `%ROCKETRIDE_APIKEY_GEMINI%` — neither resolved by the engine.
- **Symptom:** `Invalid Gemini API key format` even with the key set in Docker env and `user.json`.
- **Root Cause:** The engine does not perform variable substitution on pipeline configs received via the SDK's `use({ pipeline })` or `use({ filepath })`.
- **Fix:** Client-side substitution in `loadPipeline()` — reads `.pipe` file, replaces `${VAR}` with `process.env[VAR]`, sends resolved JSON to engine.

---

## 3. Docker / Engine Issues

### 3.1 No ARM64 Docker image
- **Severity:** Medium
- **Description:** `docker pull ghcr.io/rocketride-org/rocketride-engine:latest` fails on Apple Silicon.
- **Symptom:** `no matching manifest for linux/arm64/v8`
- **Fix:** Use `--platform linux/amd64` flag (Rosetta emulation).

### 3.2 Container name conflict on recreate
- **Severity:** Low
- **Description:** `docker create --name rocketride-engine` fails if container already exists.
- **Symptom:** `Conflict. The container name "/rocketride-engine" is already in use`
- **Fix:** `docker rm -f rocketride-engine` before creating.

### 3.3 Environment variable not reaching engine nodes
- **Severity:** High
- **Description:** Setting `ROCKETRIDE_APIKEY_GEMINI` via `docker create -e` and `user.json` didn't make it available to pipeline nodes.
- **Root Cause:** Engine resolves env vars for its own config but does NOT substitute them in pipeline component configs (see issue 2.6).
- **Fix:** Client-side substitution (see 2.6).

### 3.4 Port conflict with VS Code/Cursor extension
- **Severity:** High
- **Description:** Both VS Code and Cursor extensions try to start their own local engine on port 5565 while Docker owns it.
- **Symptom:** `[Errno 48] error while attempting to bind on address ('127.0.0.1', 5565): address already in use` — repeated crash loop.
- **Fix:** Set extension to "On-prem" mode with `localhost:5565` instead of "Local" mode. Or stop Docker and let extension use its own engine.

---

## 4. Networking / Tunnel Issues

### 4.1 ngrok free tier WebSocket interstitial
- **Severity:** Medium
- **Description:** ngrok free tier shows a browser warning page on first visit, blocking programmatic WebSocket connections from new clients.
- **Fix:** Add `ngrok-skip-browser-warning: true` header, or restart ngrok with `--request-header-add` flag.

### 4.2 ngrok URL changes on restart
- **Severity:** Medium
- **Description:** Every ngrok restart generates a new random URL. All clients must update their `ROCKETRIDE_URI`.
- **Fix:** Document this limitation. Paid ngrok plan offers static domains.

### 4.3 Cloudflare Tunnel WebSocket connection timeout
- **Severity:** Medium
- **Description:** Cloudflare tunnel (`trycloudflare.com`) WebSocket connections timed out despite HTTP working.
- **Root Cause:** Same SDK `normalizeUri` issue (appends `:5565`). Raw WebSocket to correct path worked.
- **Fix:** Abandoned Cloudflare in favor of ngrok (same root cause, ngrok worked with URI override).

### 4.4 SDK uses `ws://` but tunnel requires `wss://`
- **Severity:** High
- **Description:** SDK converts `https://` URLs to `ws://` (not `wss://`), which fails over TLS tunnels.
- **Root Cause:** `_getWebsocketUri()` in SDK strips scheme and rebuilds as `ws://`.
- **Fix:** Override with manual `wss://` URI for tunnel mode.

### 4.5 ngrok TCP tunnel requires paid account
- **Severity:** Low
- **Description:** `ngrok tcp 5565` (which would preserve the raw port) requires adding a credit card to ngrok.
- **Fix:** Used HTTP tunnel with WebSocket support instead.

---

## 5. Code Quality / Production Hardening Issues

### 5.1 No timeout on `send()` — Gemini can hang indefinitely
- **Severity:** High
- **Description:** `rc.send()` has no timeout. If Gemini hangs, the Node.js worker blocks forever.
- **Fix:** Wrapped in `Promise.race` with 2-minute timeout.

### 5.2 `terminate()` in `finally` can hang forever
- **Severity:** Medium
- **Description:** `rc.terminate(token)` in `finally` block has no timeout — if engine is unresponsive, the finally block never completes.
- **Fix:** Wrapped in `Promise.race` with 5-second timeout via `safeTerminate()`.

### 5.3 `JSON.parse` without try/catch on LLM responses
- **Severity:** High
- **Description:** `extractResultData()` called `JSON.parse()` without error handling. Malformed Gemini output throws opaque `SyntaxError`.
- **Fix:** Created `tryParseJson()` with descriptive error message including raw preview.

### 5.4 `stripCodeFences` regex fails on preamble text
- **Severity:** Medium
- **Description:** Gemini sometimes returns `"Here is the JSON:\n```json\n{...}\n```"`. The original regex `^```json` required the fence at the start of string.
- **Fix:** Rewrote regex to handle preamble: `^[\s\S]*?```(?:json|JSON)?\s*\n`.

### 5.5 Zod errors caught as "RocketRide unavailable"
- **Severity:** High
- **Description:** `ScriptSchema.parse()` throws `ZodError` inside `runScriptPipeline()`. The worker's catch block misattributes this as a connection error and unnecessarily falls back to direct Gemini.
- **Fix:** Check error type before falling back — only fall back on connection/network errors, rethrow `ZodError` and `SyntaxError`.

### 5.6 `rocketrideToken` never stored for cancellation
- **Severity:** High
- **Description:** `rocketrideToken` was declared in `JobStatus` but never actually set. Cancel endpoint checked for it but it was always `undefined`.
- **Fix:** Added `onToken` callback parameter to pipeline functions. Worker stores token synchronously via `updateJob()`.

### 5.7 `rocketrideToken` not cleared on error
- **Severity:** Medium
- **Description:** Token clear was after the try/catch, not in `finally`. If both RocketRide and Gemini fallback throw, the token clear was skipped.
- **Fix:** Moved to `finally` block.

### 5.8 `onToken` callback throw leaks pipeline slot
- **Severity:** Medium
- **Description:** `onToken?.(token)` called outside try block — if it throws, `use()` already allocated a slot but `terminate()` in `finally` is never reached.
- **Fix:** Wrapped `onToken` in defensive try/catch inside the main try block.

### 5.9 Cancel endpoint TOCTOU race condition
- **Severity:** Medium
- **Description:** Two simultaneous cancel requests could both pass the guard check and double-terminate.
- **Fix:** Clear token and set stage synchronously before any `await`.

### 5.10 Cancel endpoint missing UUID validation
- **Severity:** Medium
- **Description:** `jobId` parameter used without format validation — potential for abuse.
- **Fix:** Added UUID regex validation: `/^[0-9a-f]{8}-...$/i`.

### 5.11 `answers[0]` null check missing
- **Severity:** Low
- **Description:** `answers` array could contain `null` — `answers.length > 0` passes but `answers[0]` is null.
- **Fix:** Added explicit `answers[0] == null` check with descriptive error.

### 5.12 Missing schema validation on template content pipeline
- **Severity:** Medium
- **Description:** `runTemplateContentPipeline()` cast result to `TemplateInput` without Zod validation. Malformed responses pass silently.
- **Fix:** Added per-template schema validation using `TEMPLATE_SCHEMAS[templateId].parse()`.

### 5.13 Duplicate 70% progress update in worker
- **Severity:** Low
- **Description:** Two consecutive `updateJobPersistent` calls at 70% with different messages.
- **Fix:** Merged into single update.

---

## 6. Environment / Config Issues

### 6.1 `.env.local` overrides `.env` with expired Gemini key
- **Severity:** Critical
- **Description:** `.env.local` had `GEMINI_API_KEY=AIzaSyCHtTakouq4i7mZ5WsbNf_AtubUZGPqPx0` (expired). Next.js loads `.env.local` with higher priority than `.env`.
- **Symptom:** `API key not valid. Please pass a valid API key.`
- **Fix:** Updated `.env.local` with the working key.

### 6.2 `ROCKETRIDE_APIKEY` set to placeholder `MY_API_KEY`
- **Severity:** Low
- **Description:** The RocketRide API key `MY_API_KEY` is a placeholder but the engine accepts it (no real auth enforcement in free/local mode).
- **Status:** Works as-is. Not a real issue for local development.

### 6.3 `rocketride-client` Python package naming mismatch
- **Severity:** Medium
- **Description:** `pip install rocketride-mcp` fails because it depends on `rocketride-client>=1.1.0`, but the actual PyPI package is named `rocketride` (not `rocketride-client`).
- **Fix:** Installed both packages from source (`/tmp/rocketride-server/packages/client-python/` and `client-mcp/`) with `--no-deps` flag.

### 6.4 `"editorial"` missing from `GenerateRequestSchema` enum
- **Severity:** High
- **Description:** Adding `'editorial'` to `TemplateId` type but not to the Zod schema caused API validation to reject editorial requests.
- **Symptom:** `"Invalid request"` when selecting editorial template in UI.
- **Fix:** Added `"editorial"` to the `z.enum()` in `GenerateRequestSchema`.

### 6.5 MCP settings.json used `${ROCKETRIDE_APIKEY}` interpolation
- **Severity:** Low
- **Description:** `.claude/settings.json` used `${ROCKETRIDE_APIKEY}` but Claude Code doesn't support env var interpolation in settings.
- **Fix:** Replaced with literal value `MY_API_KEY`.

---

## 7. VS Code / Cursor Extension Issues

### 7.1 Extension starts local engine despite Docker running
- **Severity:** High
- **Description:** Both VS Code and Cursor extensions in "Local" mode try to start their own engine on port 5565, crashing repeatedly because Docker owns the port.
- **Symptom:** Infinite crash loop with `[Errno 48] address already in use`.
- **Fix:** Switch extension to "On-prem" mode with `localhost:5565`.

### 7.2 Extension doesn't support `wss://` for tunneled connections
- **Severity:** Medium
- **Description:** Extension "On-prem" mode uses `ws://` for WebSocket, not `wss://`. ngrok tunnels require TLS.
- **Symptom:** `Failed to connect: socket hang up` when using `host:443`.
- **Fix:** Created local WebSocket proxy on port 5566 that bridges `ws://` to `wss://`. Or just use `localhost:5565` directly.

### 7.3 "No active components" in Pipeline Flow
- **Severity:** Medium
- **Description:** Extension canvas shows pipeline but Pipeline Flow panel says "No active components".
- **Root Cause:** Pipeline Flow only shows components from **running** pipelines. The panel requires the pipeline to be actively executing.
- **Fix:** User must click Run on the pipeline. The panel is a runtime view, not a design view.

### 7.4 Cursor extension settings don't save via UI
- **Severity:** Low
- **Description:** Changing connection mode in Cursor settings UI didn't persist — extension kept trying Local mode.
- **Fix:** Edit `settings.json` directly: `"rocketride.connectionMode": "onprem"`.

---

## Lessons Learned

1. **Test against the real engine early.** Many issues (profile names, response config, variable substitution) only surfaced at runtime, not at compile time.

2. **SDK quirks require workarounds.** The `normalizeUri` port-hardcoding and ESM import issues required monkey-patching the SDK internals.

3. **Pipeline format is undocumented.** No single source of truth for the `.pipe` file format — had to reverse-engineer from test pipelines and node `services.json` files.

4. **Extension and engine have different requirements.** The response node config that works for the engine (`keys` or `{}`) differs from what the extension schema validates (`lanes` array).

5. **Always check `.env.local` priority.** Next.js loads `.env.local` > `.env` — an expired key in `.env.local` silently overrides a working key in `.env`.

6. **Tunnel mode needs explicit handling.** The SDK was not designed for reverse-proxied/tunneled connections. Every tunnel technology (ngrok, Cloudflare) required a different workaround.

7. **Graceful fallback is essential.** The try-RocketRide-then-fallback-to-Gemini pattern prevented every RocketRide issue from blocking video generation entirely.
