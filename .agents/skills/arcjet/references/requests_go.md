# Go Request Protection

## What Request Protection Is

Request protection inspects `net/http` requests — headers, IP, body — to enforce security rules on API routes and handlers. The Go SDK works with `net/http` and routers/frameworks that expose `*http.Request`.

## Installation

Requires the initial tagged Go SDK release: **`github.com/arcjet/arcjet-go` v0.1.0**. The module is pre-release and unstable. The module declares **Go 1.25** in `go.mod`; if the project uses an older Go toolchain, warn the user and stop until it is upgraded.

Install with Go tooling, not by editing `go.mod` directly:

```bash
go get github.com/arcjet/arcjet-go@latest
```

Read the installed package docs for exact API signatures.

## Architecture: Why Things Go Where They Do

### Client at package scope

Create one `arcjet.NewClient` at package scope or in a shared package such as `internal/security`. Reuse it across handlers.

```go
package security

import (
	"os"

	"github.com/arcjet/arcjet-go"
)

var Client = must(arcjet.NewClient(arcjet.Config{
	Key: os.Getenv("ARCJET_KEY"),
	Rules: []arcjet.Rule{
		arcjet.Shield(arcjet.ShieldOptions{Mode: arcjet.ModeLive}),
	},
}))
```

Do not construct a client inside each handler; it wastes connections and makes rules harder to manage.

### Protect inside handlers

Call `Protect(ctx, r, ...)` inside each route handler, once per request. Do not put it in generic middleware that runs on every path, including static assets; that removes per-route control and can double-count traffic.

```go
decision, err := security.Client.Protect(r.Context(), r)
if err != nil {
	// Arcjet fails open. Log and continue, or apply your fallback policy.
	log.Printf("arcjet: %v", err)
} else if decision.IsDenied() {
	status := http.StatusForbidden
	if decision.Reason.IsRateLimit() {
		status = http.StatusTooManyRequests
	}
	http.Error(w, "denied", status)
	return
}
```

Use `client.WithRule(...)` to derive a route-specific client when a handler needs extra rules beyond the shared base protection. It returns `(*arcjet.Client, error)`, so construct derived clients during initialization and handle the error rather than ignoring it.

## Choosing Rules

- `Shield` — always include and set `ShieldOptions{Mode: arcjet.ModeLive}` when it should enforce. The zero-value mode is dry run.
- `DetectBot` — request-based only; use `Allow` for a safelist or `Deny` for specific categories.
- Rate limits — `TokenBucket`, `FixedWindow`, `SlidingWindow`; use `WithRequested(n)` for variable-cost calls and `WithCharacteristics(...)` for user/session keys.
- `ValidateEmail` / `ProtectSignup` — signup and login forms.
- `SensitiveInfo` — scans text locally before it leaves the process; pass text with `WithSensitiveInfoValue(...)`.
- `DetectPromptInjection` — pass untrusted user text with `WithDetectPromptInjectionMessage(...)`.
- `Filter` — block by IP metadata, country, VPN/proxy/Tor, or request-local fields.

## Request Context

Pass the real `*http.Request` and `r.Context()` so Arcjet respects cancellation and extracts IP/header metadata correctly. If the app is behind trusted reverse proxies, set `Config.Proxies` to the trusted proxy IPs/CIDRs. If the app runs on a known platform, set `Config.Platform` when appropriate.

For user-based characteristics, use identity established by trusted authentication middleware or a verified token/session. Do not trust a caller-controlled header as a user ID unless a trusted proxy strips incoming values and rewrites the header.

## Correlation IDs

Available in **`arcjet-go` v0.1.0**: pass `arcjet.WithCorrelationId(id)` to `Protect` to correlate this decision with guard calls, workflow runs, or agent traces. It is a dedicated field, not `WithExtra`, and does not affect the decision.

## Outbound HTTP Proxy

Available in **`arcjet-go` v0.1.0**: standard `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` environment variables are honored for outbound Arcjet API calls. Do not log proxy URLs because they may contain credentials.

## Key Patterns

- Use `ModeLive` for enforcement and `ModeDryRun` to observe before blocking.
- Map only denial reasons that need different responses: rate limits usually return 429; email, sensitive info, and prompt injection often return 400; bot, shield, and filter denials usually return 403.
- Keep `ARCJET_KEY` in the environment. Never hardcode it.
