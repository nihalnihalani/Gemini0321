# Project Rules for Claude Code

## Project Overview

**AI Video Generator** — A Next.js application that generates composed video content using AI.

### Architecture: Remotion + Gemini (Approach A)

- **Rendering Engine**: [Remotion](https://www.remotion.dev/) — composes video clips, text overlays, and animations; exports MP4 server-side via `renderMedia`
- **Script Generation**: Google Gemini API — writes scene scripts (narration, visual descriptions, timing)
- **AI Video Clips**: Google Veo — generates short AI video clips per scene from Gemini's visual descriptions
- **Framework**: Next.js (App Router) — hosts the UI, API routes, and Remotion preview player
- **Composition Pipeline**: Gemini script -> Veo clips per scene -> Remotion composes clips + text overlays -> MP4 export

### Key Technical Decisions

- Remotion handles all video composition — do NOT use ffmpeg directly for stitching or overlays
- Use Remotion's `<Player>` component for in-browser preview before rendering
- Server-side rendering via Remotion's `renderMedia` (runs in Node.js, not the browser)
- Gemini API for all text/script generation; Veo API for all video clip generation
- Each "scene" maps to one Remotion `<Sequence>` with its own Veo-generated clip and text overlay
- Store intermediate assets (Veo clips, audio) in a temp directory or cloud storage, not in the public folder

### Project Structure (Target)

```
src/
  app/                    # Next.js App Router pages & API routes
    api/
      generate-script/    # Gemini script generation endpoint
      generate-clip/      # Veo video clip generation endpoint
      render/             # Remotion server-side render endpoint
  components/             # React UI components
  remotion/               # Remotion video composition
    Root.tsx              # Remotion entry point
    compositions/         # Individual video compositions
    sequences/            # Reusable sequence components (scene, overlay, etc.)
  lib/
    gemini.ts             # Gemini API client & prompt templates
    veo.ts                # Veo API client
    types.ts              # Shared TypeScript types (Script, Scene, etc.)
  styles/                 # CSS/Tailwind styles
remotion.config.ts        # Remotion bundler configuration
```

### Dependencies

- `next` — framework
- `remotion`, `@remotion/cli`, `@remotion/renderer`, `@remotion/player` — video composition & rendering
- `@google/genai` — Gemini API SDK (use the latest `@google/genai` package, not the deprecated `@google-ai/generativelanguage`)
- `zod` — schema validation for Gemini structured outputs and API payloads

### Important Constraints

- **Remotion License**: Free for individuals and teams of 3 or fewer; requires a license for larger teams
- **Veo API**: Async — clip generation is not instant; design the pipeline to handle polling/callbacks
- **Server-side rendering**: `renderMedia` is CPU/memory intensive; consider queuing for production
- **Frame rate**: Default to 30fps for Remotion compositions unless specified otherwise
- **Video resolution**: Default to 1920x1080 (1080p) unless specified otherwise

## Auto-Commit and Push Rule

**MANDATORY**: After every change you make to any file in this repository, you MUST:

1. Stage the changed files: `git add <specific files you changed>`
2. Commit with a clear message describing what changed: `git commit -m "description of change"`
3. Push to `nihal`: `git push origin nihal`

This applies to EVERY change — no exceptions. Do not batch changes. Commit and push immediately after each logical change.

- Always push to `nihal`
- Never force push
- Use descriptive commit messages that explain the "why"
- If a pre-commit hook fails, fix the issue and create a NEW commit (never amend)

## Agent Team Strategy

Use agent teams for any task that benefits from parallel work across independent modules. Teams are enabled via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.

### When to Use Teams
- Multi-file features spanning frontend, backend, and tests
- Research + implementation in parallel (one teammate explores, another builds)
- Code review with competing perspectives (security, performance, correctness)
- Debugging with competing hypotheses — teammates test different theories simultaneously
- Any task with 3+ independent subtasks that don't touch the same files

### When NOT to Use Teams
- Sequential tasks with heavy dependencies between steps
- Changes to a single file or tightly coupled files
- Simple bug fixes or small tweaks
- Tasks where coordination overhead exceeds the benefit

### Team Configuration
- Start with **3-5 teammates** for most workflows
- Aim for **5-6 tasks per teammate** to keep everyone productive
- Use **Opus for the lead** (reasoning/coordination), **Opus for teammates** (focused implementation)
- Use **delegate mode** (`Shift+Tab`) when the lead should only coordinate, not write code

### Team Communication Rules
- Use `SendMessage` (type: "message") for direct teammate communication — always refer to teammates by **name**
- Use `SendMessage` (type: "broadcast") **only** for critical blockers affecting everyone
- Use `TaskCreate`/`TaskUpdate`/`TaskList` for work coordination — teammates self-claim unblocked tasks
- When a teammate finishes, they check `TaskList` for the next available task (prefer lowest ID first)
- Mark tasks `completed` only after verification passes

### Task Dependencies
- Use `addBlockedBy` to express task ordering (e.g., "frontend depends on API being done")
- Teammates skip blocked tasks and pick up unblocked work
- When a blocking task completes, dependent tasks auto-unblock

### Plan Approval for Risky Work
- For architectural changes or risky refactors, require **plan approval** before implementation
- The teammate works in read-only mode, submits a plan, lead approves/rejects
- Only after approval does the teammate implement

### Team Quality Hooks
- `TaskCompleted` hook: prevents marking tasks done unless tests pass
- `TeammateIdle` hook: auto-assigns follow-up work to idle teammates
- Every teammate must run verification before reporting completion

### Shutdown Protocol
- When all tasks are complete, the lead sends `shutdown_request` to each teammate
- Teammates approve shutdown after confirming their work is committed
- Lead calls `TeamDelete` to clean up team resources

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.