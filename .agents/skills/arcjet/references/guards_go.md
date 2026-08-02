# Go Guard

## What Guard Is

Guard protects code paths that do not have an HTTP request — agent tool calls, MCP handlers, queue workers, background jobs, and other non-HTTP operations. In Go, Guard is part of the same `github.com/arcjet/arcjet-go` module as request protection, but uses `NewGuardClient` and `Guard`.

## Installation

Requires the initial tagged Go SDK release: **`github.com/arcjet/arcjet-go` v0.1.0**. The module is pre-release and unstable. The module declares **Go 1.25** in `go.mod`; if the project uses an older Go toolchain, warn the user and stop until it is upgraded.

Install with Go tooling:

```bash
go get github.com/arcjet/arcjet-go@latest
```

## Architecture: Why Things Go Where They Do

### Client at package scope

Create one `arcjet.NewGuardClient` at package scope or in a shared package.

```go
var guard = must(arcjet.NewGuardClient(arcjet.GuardConfig{
	Key: os.Getenv("ARCJET_KEY"),
}))
```

The client owns the connection to Arcjet. Creating it inside a tool function means a new connection per call.
The snippets use a small generic `must(value, err)` startup helper; use the project's existing initialization/error pattern if it has one.

Go does not load `.env` files automatically. Ensure the worker process or service manager exports `ARCJET_KEY`, or use the project's existing environment loader. Do not add a dotenv dependency solely to copy this example without reviewing it first.

### Rules at package scope

Declare configured rules at package scope so their result accessors are available and the configuration stays visible.

```go
var userLimit = must(arcjet.GuardTokenBucket(arcjet.GuardTokenBucketOptions{
	Mode:       arcjet.ModeLive,
	Label:      "tools.weather.limit",
	Bucket:     "tools-weather",
	RefillRate: 10,
	Interval:   time.Minute,
	Capacity:   10,
}))

var promptScan = must(arcjet.GuardPromptInjection(
	arcjet.GuardPromptInjectionOptions{Mode: arcjet.ModeLive},
))
```

### Guard at the operation

Call `Guard` at the specific operation with a hardcoded label. Do not protect a generic dispatcher with labels derived from tool names.

```go
decision, err := guard.Guard(ctx, arcjet.GuardRequest{
	Label:    "tools.get-weather",
	Metadata: map[string]string{"user_id": userID},
	Rules: []arcjet.GuardRuleInput{
		userLimit.Key(userID, requestedTokens),
		promptScan.Text(userMessage),
	},
})
if err != nil {
	// Configuration/programmer errors can return a zero decision, so do not
	// assume IsDenied or HasFailedOpen will catch every non-nil error.
	return fmt.Errorf("arcjet guard: %w", err)
}
if decision.HasFailedOpen() {
	// This sensitive operation chooses to fail closed.
	return fmt.Errorf("arcjet guard failed open: %+v", decision.ErrorResults())
}
if decision.IsDenied() {
	if rateLimited := userLimit.DeniedResult(decision); rateLimited != nil {
		return fmt.Errorf("rate limited")
	}
	return fmt.Errorf("blocked: %s", decision.Reason)
}
```

Labels and rate-limit buckets are validated as slugs: lowercase letters, digits, dash (`-`), and dot (`.`), starting and ending with a letter or digit. Use `tools.get-weather`, not `tools.get_weather`.

## Rate Limits and Keys

All Guard rate limit rules require an explicit key at call time. Use a user ID, session ID, API key, or another stable identifier. If there is no user context, use a deliberate scope such as deployment name, process identity, or `"global"` with a comment explaining why.

The second argument to `Key` is the amount consumed. Passing `1` creates a per-operation quota. For a token budget, pass a documented preflight token estimate or declared job cost; the SDK does not tokenize prompts or know the eventual output-token count for you.

## Content Scanning Rules

- `GuardPromptInjection` — use on untrusted text before it reaches a model or tool argument.
- `GuardSensitiveInfo` — use to block PII entering or leaving the system; scanning happens locally.
- `ExperimentalGuardModerateContent` — available in **`arcjet-go` v0.1.0**, but experimental. The name/result shape may change, and the server may return an error result while the rule is experimental. Treat those errors as fail-open and inspect `HasFailedOpen()` / `ErrorResults()`.
- `GuardCustom` — runs your local custom function and reports the result to Arcjet. Keep the function deterministic and side-effect free.

## Errors vs Warnings

Available in **`arcjet-go` v0.1.0**:

- `decision.HasFailedOpen()` is true when the decision is `ALLOW` only because a rule or the decision itself could not be processed. This is the fail-closed gate for sensitive operations.
- `decision.ErrorResults()` returns the errored rule results for logging.
- Each rule also exposes a per-rule `ErrorResult(decision)` accessor — the mirror of `DeniedResult(decision)` — returning that rule's `*ArcjetError` if it errored, else `nil`. Use it to attribute a fail-open to a specific rule (e.g. only block when the prompt-injection scan errored) instead of scanning `ErrorResults()`.
- `decision.Warnings` contains decision-level diagnostics such as invalid metadata that was stripped. Warnings never change the conclusion.

```go
if decision.HasFailedOpen() {
	log.Printf("guard failed open: %+v", decision.ErrorResults())
}
for _, w := range decision.Warnings {
	log.Printf("guard warning: [%s] %s", w.Code, w.Message)
}
```

## Correlation IDs

Available in **`arcjet-go` v0.1.0**: set `GuardRequest.CorrelationId` to correlate this guard call with HTTP requests, workflow runs, or agent traces. It is a dedicated field, not metadata, and does not affect the decision.

## Outbound HTTP Proxy

Available in **`arcjet-go` v0.1.0**: standard `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` environment variables are honored for outbound Arcjet API calls. Do not log proxy URLs because they may contain credentials.
