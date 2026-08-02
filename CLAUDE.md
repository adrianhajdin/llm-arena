# LLM Arena

## What this is

Send one prompt, watch up to three AI models answer it at the same time, vote for the best one. Real votes and real per-call numbers build an honest leaderboard of which model is actually worth using. Read `scope.md` before building anything, it's the living plan, broken into features, and it tracks what's actually done versus what's still open. Keep it up to date as you go, that's not optional housekeeping, it's how a fresh conversation picks this up without anyone re-explaining the project.

## How to work

Before building anything, decide what you're doing and why, in a few plain sentences, out loud or in a short note. Don't write code yet at that point. Report the decision, then stop and wait, don't move on to building until you're told to go ahead. Every feature, no exceptions, even ones that look obvious.

If something genuinely forks, where a reasonable person could actually go two different ways and it matters which, ask about it, one question at a time, with two or three concrete options to pick from, so a short reply settles it. Not a long list of questions needing a written response, and not silence when a real fork exists, either extreme is the wrong move. Most things don't need asking, decide those and just say what you decided. Save an actual question for the ones that do.

Then build it. If the plan turns out wrong once it's actually built, or contradicts something already in the codebase, say so and fix the plan too, not just the code. Don't quietly work around a contradiction.

When you report back, especially anything that needs a person to actually go do something, verify by hand, test a real flow, make a choice, write that part as a short bulleted list of concrete steps, not a paragraph to read through. Someone should be able to scan it and know exactly what to go do next. The detailed reasoning still belongs in `scope.md` as the permanent record, dense is fine there. What comes back in the reply should be the short version.

When a build step is actually underway, break it into its own short checklist of what's genuinely being done, and check items off in `scope.md` as they're finished.

There's no formal spec-file system here, no numbered acceptance criteria, no separate directory per feature. A short, real, plain-language decision beats a long templated one every time.

## Rules

- Functional style: pure functions by default, no shared mutable state, side effects pushed to the edges.
- Immutable data, `const` and `readonly`, prefer `map`/`filter`/`reduce` over mutating loops.
- Folder by feature, not by shared layer-wide folders.
- Strict TypeScript, no `any`.
- Fail fast on a missing environment variable at startup, don't let it fail silently later.
- An accessibility baseline on every screen: real contrast, visible focus, full keyboard operation.
- Every model in this app is free tier. Cost will always read $0.0000, that's correct, not a bug, show it anyway since it's still a real, honestly measured number.
- Never show a raw exception or provider error to the user. A plain, human sentence and a retry action, always.
- Shared values, spacing, color, repeated UI patterns, live in `globals.css` or a shared component, never copy-pasted as raw Tailwind classes across files. If the same handful of classes show up in three places, that's a component, not a coincidence.
- After building or changing anything, actually run it, typecheck, lint, and a real build, not just read the code and assume it's right. Fix whatever fails before calling the step done.
- No test runner, no browser automation framework, for this project. Verify manually, a running dev server and a real browser, or something as light as `curl`. That's already decided, not something to add later, don't install one to check something works.

## Design

Colors, contrast, and the accent rules are all decided in `scope.md`'s design feature, read that before touching any styling, don't guess or restate it here. Anthropic's `frontend-design` plugin must actually be invoked for any UI work, not just assumed active, it commits to a real visual direction before writing code instead of defaulting to the generic AI look. If it doesn't fire on its own, say so and invoke it directly before building any screen.

## Sketches

Structural reference only, arena, leaderboard, and models page, see `scope.md` for how to treat them.

## Tools

Connect the real MCP servers for Prisma and PostHog once their accounts exist, so the agent can check schema and query real data directly instead of guessing. Arcjet ships its own published skill with current guidance for wiring it into a Next.js route, worth pulling in when that feature is being built rather than relying on general training data, which can be stale on a fast-moving tool. Clerk's own official Next.js integration docs are the reference for auth, not a general guess at how it works.

## Context files

_Nested context files, if any get created for a specific part of the codebase, are listed here._
