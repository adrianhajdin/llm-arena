# Python Guard

## What Guard Is

Guard protects code paths that don't have an HTTP request — tool calls, agent loops, queue consumers, background jobs. It's part of the `arcjet` package (≥ 0.7.0) but uses a different entry point (`arcjet.guard`) from the HTTP request protection (`arcjet`). New release features called out below require **`arcjet` 0.9.0**. There's no request object to inspect, so you pass explicit context (labels, keys, text to scan) at each call site.

**Version compatibility:** Python ≥ 3.10 (same as the request SDK — they're shipped together in the `arcjet` package). If the project's Python is older, warn the user and stop.

> _Version info last verified against the `arcjet` v0.9.0 release on **2026-06-30**. Before relying on these numbers, check the `requires-python` field in the current [`pyproject.toml`](https://github.com/arcjet/arcjet-py/blob/main/pyproject.toml) — minimums tend to creep upward over time._

## Installation

Install with whichever package manager the project already uses (`pip install`, `uv add`, `poetry add`, etc.) — don't hand-edit `requirements.txt` with a guessed version (`arcjet>=1.0.0` doesn't exist; the current minor release line is `0.x`):

```bash
pip install arcjet
```

Guard is included in the `arcjet` package — no separate install. Read the installed package's types and docstrings for the full API surface.

## Architecture: Why Things Go Where They Do

### Client at module scope

```python
import os
from arcjet.guard import launch_arcjet

arcjet = launch_arcjet(key=os.environ["ARCJET_KEY"])
```

Use `launch_arcjet` for async code, `launch_arcjet_sync` for sync. The client holds a persistent connection to the Arcjet decision service. Creating it inside a function means a new connection per call.

### Rules at module scope

Rate limit state is tracked server-side by the combination of `bucket` and other configuration properties, so recreating rules per call won't break counting. However, defining rules at module scope is still best practice because:

- It makes the per-rule result accessors (e.g. `user_limit.denied_result(decision)`) work — you need a stable reference to call methods on.
- It avoids unnecessary object allocation on every invocation.
- It keeps rule configuration visible and centralized.

```python
from arcjet.guard import TokenBucket, DetectPromptInjection

# WORKS but awkward — no stable reference for result inspection
def handle_tool():
    limit = TokenBucket(...)  # hard to call limit.denied_result() later

# BETTER — declare rules at module scope, dynamically choose which to apply
admin_limit = TokenBucket(
    label="admin.tool-calls",
    bucket="admin-tools",
    refill_rate=100,
    interval_seconds=60,
    max_tokens=1000,
)
member_limit = TokenBucket(
    label="member.tool-calls",
    bucket="member-tools",
    refill_rate=10,
    interval_seconds=60,
    max_tokens=100,
)
pi_rule = DetectPromptInjection()

def tool_rules(user_id: str, role: str, text: str):
    limit = admin_limit if role == "admin" else member_limit
    return [
        limit(key=user_id, requested=1),
        pi_rule(text),
    ]
```

### guard() at the operation, with a hardcoded label

Place `guard()` wherever you already know exactly what operation is happening. That's typically inside the specific tool/task function, but the dispatch arm right before calling it works equally well — sometimes it gives cleaner error propagation:

```python
# Option A: guard inside the tool function
async def get_weather(city: str, user_id: str) -> dict:
    decision = await arcjet.guard(
        label="tools.get-weather",
        rules=[tool_call_limit(key=user_id, requested=1)],
        metadata={"user_id": user_id},
    )
    if decision.conclusion == "DENY":
        raise Exception(decision.reason)
    # ...do the work

# Option B: guard at the dispatch arm, right before the call
async def dispatch(task):
    if task["type"] == "summarize":
        decision = await arcjet.guard(
            label="queue.summarize",
            rules=[user_task_limit(key=task["user_id"], requested=3)],
            metadata={"user_id": task["user_id"]},
        )
        if decision.conclusion == "DENY":
            raise Exception(decision.reason)
        return _summarize(task)

# Avoid: generic dispatcher with interpolated label
async def handle_tool_call(name: str, args: dict, user_id: str):  # 👎
    decision = await arcjet.guard(label=f"tools.{name}", rules=[...])
```

The `label` should be a hardcoded string — `"tools.get-weather"`, not `f"tools.{name}"`. Hardcoded labels stay greppable, and the Console groups by them.

**Label naming rules (often surprising):** labels are validated server-side as slugs — **lowercase letters, digits, dash (`-`), and dot (`.`) only**, must start and end with a letter or digit, max 256 bytes. Underscores, uppercase, and forward slashes are rejected even though some SDK TSDoc / docstring comments list them as allowed. Use `tools.get-weather`, not `tools.get_weather`. Same rules apply to rate-limit `bucket` names.

Pass `metadata` whenever you have useful auditing context (`{"user_id": ..., "request_id": ...}`) — it shows up in the Console and makes debugging much easier later.

## Choosing a Rate Limit Strategy

See the "Rate Limiting Strategies" section in the main skill for a comparison of token bucket vs fixed window vs sliding window.

Key guard-specific notes: all rate limit rules require a `key` parameter at call time (user ID, session ID) — without it, limits are global across all callers. They also need a `bucket` name to avoid collisions between different rules.

**Picking a `key` when there's no user:** Some call sites have no per-user context — e.g. a single-tenant background worker. Don't fake it with an empty string. Use whatever identifier matches the scope (`os.environ.get("HOSTNAME", "default")`, deployment name, etc.) and add a short comment if it's deliberately global.

## Content Scanning Rules

### Prompt injection detection

Use `DetectPromptInjection()` on any untrusted text before it reaches a model or is used as a tool argument. Also useful on tool call *results* when the tool fetches content from untrusted sources.

### Sensitive information detection

Use `LocalDetectSensitiveInfo()` to block PII from entering or leaving the system (e.g. users sending credit card numbers, or tool outputs leaking email addresses). The scan runs locally — raw text never leaves the SDK, which matters for compliance.

### Content moderation

Available from **`arcjet` 0.9.0**: `experimental_ModerateContent()` flags unsafe or policy-violating text for Guard call sites. It is explicitly experimental — the name and result shape may change, and the server may return an error result while the rule is experimental. Treat those errors as fail-open and inspect `decision.has_failed_open()` / `decision.error_results()`.

## Decision Handling

`decision.conclusion` is either `"ALLOW"` or `"DENY"`. Always check before proceeding.

For useful error messages, branch on **which rule** denied — not just on `DENY`. Each rule defined at module scope exposes a `.denied_result(decision)` accessor that returns rule-specific info (e.g. `reset_at_unix_seconds` for rate limits). Use this to give the caller something actionable:

```python
if decision.conclusion == "DENY":
    rate_limited = user_task_limit.denied_result(decision)
    if rate_limited:
        raise Exception(f"rate limited — retry after unix {rate_limited.reset_at_unix_seconds}")
    if decision.reason == "PROMPT_INJECTION":
        raise Exception("input flagged as prompt injection")
    raise Exception("blocked")
```

`decision.reason` is a flat string — one of `"RATE_LIMIT"`, `"PROMPT_INJECTION"`, `"SENSITIVE_INFO"`, `"CUSTOM"`, `"ERROR"`, `"NOT_RUN"`, `"UNKNOWN"`. Read the types on the decision object for the full structure.

### Errors vs warnings (failing open)

`guard()` never raises for runtime degradation — a transport failure or a rule that couldn't be processed comes back as a fail-open `"ALLOW"` decision, not an exception. (Programmer errors — an invalid label, a misconfigured rule — still raise `ArcjetError`.) Two distinct signals (available from **`arcjet` 0.9.0**) tell you what happened:

- `decision.has_failed_open()` — `True` when the decision is `"ALLOW"` *only* because a rule or the decision itself could not be processed. This is the **fail-closed gate**: if the operation is sensitive enough that a degraded Arcjet signal should block rather than allow, branch on this and deny. `decision.error_results()` returns the errored results (each with a `code`/`message`) for logging.
- `decision.warnings` — request-validation diagnostics (e.g. an invalid metadata key that was stripped). The decision is still valid and trustworthy; warnings never change the conclusion. Log them so the config gets fixed, but don't block on them.

To attribute a failure to a *specific* rule rather than scanning the whole decision, each rule also exposes `.error_result(decision)` (new in **`arcjet` 0.9.0**) — the mirror of `.denied_result(decision)`. It returns that rule's `RuleResultError` (with `code`/`message`) if that rule errored, else `None`. Use it when only one rule failing open is actually unsafe (e.g. the prompt-injection scan) while others failing open is tolerable.

```python
decision = await arcjet.guard(label="tools.get-weather", rules=rules)
if decision.has_failed_open():
    # Arcjet couldn't fully evaluate. Allow by default, or deny for a sensitive op.
    logging.error("guard failed open: %s", decision.error_results())
for w in decision.warnings:
    logging.warning("%s: %s", w.code, w.message)
```

On `arcjet` ≤ 0.8.0 the only signal is `decision.has_error()`, which is **deprecated** from 0.9.0 (it conflated request diagnostics with rule errors, and now emits a `DeprecationWarning`). Check the installed package's types — if `has_failed_open` exists, prefer it over `has_error()`.

### Correlation IDs

Available from **`arcjet` 0.9.0**: pass `correlation_id` to `.guard()` to correlate a guard decision with a request, workflow run, or agent trace. It is a dedicated field, not metadata, and it does not affect the decision.

### Outbound HTTP proxy

Available from **`arcjet` 0.9.0**: standard `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` environment variables are honored for outbound Arcjet API calls. Do not log proxy URLs because they may contain credentials.

## Async vs Sync

The package provides both variants:
- `launch_arcjet` / `await arcjet.guard(...)` — async, use in `async def` functions
- `launch_arcjet_sync` / `arcjet.guard(...)` — sync, use in regular `def` functions

**Pick the variant that matches the function you're protecting.** A FastAPI handler or an `AsyncOpenAI` agent loop is async — use `launch_arcjet`. A Celery task, a queue poller defined with `def`, or anything wrapped by a sync framework is sync — use `launch_arcjet_sync`. Mixing them produces "coroutine was never awaited" warnings or blocking calls inside an event loop. Both variants provide the same protection.

## Key Patterns

- Use `metadata` for analytics/auditing context (user ID, session, etc.) — this appears in the Console.
- The `label` string should identify the operation (e.g. `"tools.get-weather"`, `"queue.process-job"`) — it appears in the Console and helps you understand which operations are being limited or blocked.
