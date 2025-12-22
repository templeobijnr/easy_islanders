# Pre-Production Debugging Plan - 7 Layer Testing Pyramid

**Date:** 2025-12-19  
**Purpose:** Comprehensive testing plan to ensure system stability before production deployment.

---

## Overview

```
Layer 7: Business Critical Flows     ← Top Priority (Break = Business Failure)
Layer 6: API Contract Testing        ← (Break = Integration Failure)
Layer 5: Auth & Security Boundaries  ← (Break = Security Incident)
Layer 4: Data Integrity & State      ← (Break = Data Corruption)
Layer 3: Integration Points          ← (Break = Degraded Functionality)
Layer 2: Error Handling              ← (Break = Poor UX)
Layer 1: Performance & Load          ← Base (Break = Slow/Unavailable)
```

**Stop Signal:** A failure at any layer is a STOP signal. Fix before proceeding.

---

## Existing Test Infrastructure

| Test Suite | Location | Command |
|------------|----------|---------|
| Unit Tests | `functions/src/**/*.test.ts` | `cd functions && npm test` |
| Integration Tests | `functions/src/__tests__/integration/` | `cd functions && npm run test:integration` |
| Auth Middleware | `functions/src/middleware/__tests__/` | `npm test -- auth.test.ts` |
| Jobs API | `functions/src/http/v1/jobs/__tests__/` | `npm test -- jobs` |
| Chat Controller | `functions/src/controllers/__tests__/` | `npm test -- chat.controller` |

---

## Layer 7: Business Critical Flows

### 7.1 User Discovery & Booking Flow

**Precondition:** Emulators running with test data

```bash
# Start emulators
firebase emulators:start --import=./test-data &
sleep 10

# Test: Search returns listings
curl -s "http://localhost:5001/easy-islanders/europe-west1/api/search?query=restaurant&lat=35.1856&lng=33.3823" \
  -H "Authorization: Bearer $TOKEN" | jq '.results | length'
# Expected: > 0

# Test: Create booking
curl -s -X POST "http://localhost:5001/easy-islanders/europe-west1/api/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"itemId":"test-listing","date":"2025-12-25","guests":2}' | jq '.bookingId'
# Expected: Valid booking ID
```

**Pass Criteria:** ✅ User can search and create bookings

---

### 7.2 AI Chat with Tool Execution

**Test:** Chat triggers searchMarketplace tool

```bash
curl -s -X POST "http://localhost:5001/easy-islanders/europe-west1/api/chat" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Find restaurants in Kyrenia","sessionId":"test-session"}' | jq '.toolCalls'
# Expected: Tool name = "searchMarketplace"
```

**Existing Test Coverage:**
```bash
cd functions && npm test -- chat.controller.test.ts
```

**Pass Criteria:** ✅ AI interprets intent and executes correct tools

---

### 7.3 Job Order Lifecycle

**Test:** Create → Confirm → Dispatch

```bash
# Create job
JOB_ID=$(curl -s -X POST "http://localhost:5001/easy-islanders/europe-west1/jobsApi/v1/jobs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"merchantTarget":{"type":"business","businessId":"test-merchant"}}' | jq -r '.jobId')

# Confirm
curl -s -X POST "http://localhost:5001/easy-islanders/europe-west1/jobsApi/v1/jobs/$JOB_ID/confirm" \
  -H "Authorization: Bearer $TOKEN" | jq '.status'
# Expected: "confirming"
```

**Existing Test Coverage:**
```bash
cd functions && npm run test:integration -- jobs.test.ts
```

**Pass Criteria:** ✅ Job state machine works correctly

---

## Layer 6: API Contract Testing

### Run All API Tests

```bash
cd functions && npm test
```

### Endpoint Checklist

| Endpoint | Method | Auth | Expected Status |
|----------|--------|------|-----------------|
| `/v1/health` | GET | None | 200 |
| `/v1/jobs` | POST | Bearer | 201 (create) |
| `/v1/jobs/:id` | GET | Bearer | 200 (owner) / 403 (other) |
| `/v1/jobs/:id/confirm` | POST | Bearer | 200 (owner) |
| `/v1/jobs/:id/dispatch` | POST | Bearer | 200 (owner) |
| `/search` | GET | Bearer | 200 |
| `/chat` | POST | Bearer | 200 |
| `/bookings` | POST | Bearer | 201 |

**Verification Script:**
```bash
# Test all endpoints return expected status codes
./scripts/smoke-test.sh
```

---

## Layer 5: Auth & Security Boundaries

### 5.1 Token Validation

```bash
# No token → 401
curl -s -o /dev/null -w "%{http_code}" "http://localhost:5001/easy-islanders/europe-west1/api/search"
# Expected: 401

# Invalid token → 401
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer invalid-token" \
  "http://localhost:5001/easy-islanders/europe-west1/api/search"
# Expected: 401

# Valid token → 200
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $VALID_TOKEN" \
  "http://localhost:5001/easy-islanders/europe-west1/api/search?query=test&lat=35&lng=33"
# Expected: 200
```

**Existing Test Coverage:**
```bash
cd functions && npm test -- auth.test.ts
```

### 5.2 Role-Based Access Control

| User Role | Own Data | Other's Data | Admin Endpoints |
|-----------|----------|--------------|-----------------|
| user | ✅ 200 | ❌ 403 | ❌ 403 |
| business | ✅ 200 | ❌ 403 | ❌ 403 |
| owner | ✅ 200 | ❌ 403 | ❌ 403 |
| admin | ✅ 200 | ✅ 200 | ✅ 200 |

### 5.3 Firestore Rules

```bash
# Test Firestore rules enforcement
# - User can read own bookings
# - User cannot read other's bookings
# - Public can read listings
# - No public writes anywhere
```

---

## Layer 4: Data Integrity & State Machines

### 4.1 Job State Machine

```
Valid Transitions:
collecting → confirming → dispatching → completed
            → cancelled (from any state)

Invalid Transitions:
- confirming → collecting (regression)
- completed → anything
```

**Test:**
```bash
cd functions && npm test -- confirm.test.ts
```

### 4.2 Booking Status Flow

```
payment_pending → confirmed → completed
               → cancelled (from pending/confirmed)
```

---

## Layer 3: Integration Points

### 3.1 Gemini AI

| Scenario | Expected Behavior |
|----------|-------------------|
| API key present | Tools execute normally |
| API key missing | Error: "GEMINI_API_KEY not configured" |
| Rate limited | Retry with backoff or error |

### 3.2 WhatsApp/Twilio

| Scenario | Expected Behavior |
|----------|-------------------|
| Credentials present | Messages send |
| Credentials missing | Error or graceful skip |
| Webhook signature valid | Process message |
| Webhook signature invalid | Reject with 403 |

**Test:**
```bash
cd functions && npm test -- twilio.controller.test.ts
```

### 3.3 Typesense Search

| Scenario | Expected Behavior |
|----------|-------------------|
| Typesense available | Use Typesense search |
| Typesense unavailable | Fallback to Firestore |

---

## Layer 2: Error Handling

### 2.1 Input Validation

```bash
# Empty required field → 400
curl -s -X POST "http://localhost:5001/easy-islanders/europe-west1/api/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"itemId":"","date":"2025-12-25","guests":2}' \
  -w "\n%{http_code}"
# Expected: 400

# Invalid date → 400
# Negative guests → 400
```

### 2.2 Resource Not Found

```bash
# Non-existent job → 404
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5001/easy-islanders/europe-west1/jobsApi/v1/jobs/non-existent-id"
# Expected: 404
```

---

## Layer 1: Performance & Load

### 1.1 Response Time SLA

| Endpoint | Target P95 | Target P99 |
|----------|------------|------------|
| `/search` | < 500ms | < 1000ms |
| `/chat` | < 2000ms | < 5000ms |
| `/v1/jobs` | < 300ms | < 500ms |

### 1.2 Cold Start

- Target: < 3 seconds
- Verify in Functions logs after deploy

### 1.3 Load Test

```bash
# Install apache bench
# ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" \
#   "http://localhost:5001/easy-islanders/europe-west1/api/search?query=test&lat=35&lng=33"
```

---

## Smoke Test Script

See: `scripts/smoke-test.sh`

Run before every deployment:
```bash
chmod +x scripts/smoke-test.sh
./scripts/smoke-test.sh
```

---

## Test Execution Order

1. **Run unit tests first:**
   ```bash
   cd functions && npm test
   ```

2. **Run integration tests:**
   ```bash
   cd functions && npm run test:integration
   ```

3. **Run smoke test against emulators:**
   ```bash
   ./scripts/smoke-test.sh
   ```

4. **Manual verification (if needed):**
   - Open browser to localhost
   - Sign in with test account
   - Send chat message
   - Create booking
   - Check payment UI shows "not available yet"

---

## Pre-Production Checklist

- [ ] All unit tests pass (`npm test`)
- [ ] All integration tests pass (`npm run test:integration`)
- [ ] Smoke test passes
- [ ] Auth boundaries verified
- [ ] State machines work correctly
- [ ] Error handling returns proper status codes
- [ ] Payment UI shows "not available yet"
- [ ] Connect tab works without social features
- [ ] Functions build passes
- [ ] Web build passes

---

## Test Report Template

After running all tests, document results in:
`docs/PRE_PRODUCTION_TEST_REPORT.md`

Include:
- Date/time of test run
- Pass/fail for each layer
- Any failures with details
- Sign-off from reviewer
