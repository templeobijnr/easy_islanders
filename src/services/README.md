# Services Directory

> **Status:** Phase 2A Complete — Infrastructure Moved

This directory contains all frontend service modules for AskMerve.
For architectural overview, see [SERVICES.md](./SERVICES.md).

## Quick Reference

| Layer | Files | Purpose |
|:------|:------|:--------|
| Domain | 9 | CRUD + business rules for single domain |
| Application | 2 | Multi-domain orchestration |
| Integration | 4 | External API clients |
| Infrastructure | 5 | Firebase, storage, config |
| Projection | 1 | Read-only aggregated views |
| Utility | 3+ | Pure functions |

## Layer Responsibilities

### Domain Services
- Single collection ownership
- Business validation rules
- No cross-domain dependencies

### Application/Orchestration
- Coordinate multiple domains
- Complex workflows
- Feed aggregation

### Integrations
- External API communication
- No business logic

### Infrastructure
- Firebase config
- Storage wrappers
- Health checks

## Key Files

- **SERVICES.md** - Full architectural map
- **firebaseConfig.ts** - Root dependency (do not modify)
- **connectService.ts** - Largest service (802 lines, ⚠ needs split)
- **listingsService.ts** - ⚠ Misnamed (operates on `stays`)

## Modifying Services

✅ **Safe:** Domain services, utilities, infrastructure
⚠ **Careful:** Application services (multi-domain impact)
❌ **Avoid:** firebaseConfig.ts without architecture review
