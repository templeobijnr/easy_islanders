## Identity Engine & Latency Plan — Status

- Phase 3 kicked off:
  - [x] Lite context for chat (`getLiteContext`)
  - [x] Background profiler scaffolding (listener trigger + Gemini analyzer)
  - [x] Typesense sync for user intelligence (flattened)
  - [ ] Profile schema finalized and enforced across services
  - [ ] Listener prompt tuning + confidence thresholds
  - [ ] Typesense user collection init hook in deploy/startup
  - [ ] Vibe/cache services for Promise.all context fetch

Next steps:
- Hook initialization for Typesense user collection (`initializeUserCollection`) during startup.
- Add debounce/batch if intelligence writes are noisy.
- Tighten profiler prompt and mapping of segments/attributes to canonical keys.
- Integrate lite context usage in chat fully once Vibe/cache service is available.
