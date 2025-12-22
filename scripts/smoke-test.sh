#!/bin/bash
# Pre-Production Smoke Test Script
# Run this before every deployment to verify system health

set -e

echo "🔥 Starting Pre-Production Smoke Test"
echo "======================================"

FIREBASE_PROJECT="easy-islanders"
BASE_URL="http://localhost:5001/$FIREBASE_PROJECT/europe-west1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

check_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}: $2"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC}: $2"
    ((FAILED++))
  fi
}

# =============================================
# 1. Check emulators are running
# =============================================
echo ""
echo "📍 Step 1: Checking emulators..."

if curl -s "http://localhost:4000" > /dev/null 2>&1; then
  check_result 0 "Emulators are running"
else
  echo -e "${RED}❌ FAIL${NC}: Emulators not running. Start with: firebase emulators:start"
  exit 1
fi

# =============================================
# 2. Create test user and get token
# =============================================
echo ""
echo "📍 Step 2: Creating test user..."

TEST_EMAIL="smoke-test-$(date +%s)@example.com"
USER_RESPONSE=$(curl -s -X POST "http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"TestPass123!\",\"returnSecureToken\":true}")

TOKEN=$(echo $USER_RESPONSE | grep -o '"idToken":"[^"]*"' | cut -d'"' -f4)
USER_ID=$(echo $USER_RESPONSE | grep -o '"localId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  check_result 0 "User created: $USER_ID"
else
  check_result 1 "User creation failed"
  echo "Response: $USER_RESPONSE"
  exit 1
fi

# =============================================
# 3. Test health endpoints
# =============================================
echo ""
echo "📍 Step 3: Testing health endpoints..."

# V1 Health
V1_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/apiV1/v1/health")
if [ "$V1_HEALTH" = "200" ]; then
  check_result 0 "/v1/health returns 200"
else
  check_result 1 "/v1/health returns $V1_HEALTH (expected 200)"
fi

# Jobs API Health
JOBS_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/jobsApi/v1/health")
if [ "$JOBS_HEALTH" = "200" ]; then
  check_result 0 "/jobsApi/v1/health returns 200"
else
  check_result 1 "/jobsApi/v1/health returns $JOBS_HEALTH (expected 200)"
fi

# =============================================
# 4. Test auth boundaries
# =============================================
echo ""
echo "📍 Step 4: Testing auth boundaries..."

# No token → 401
NO_TOKEN=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/search")
if [ "$NO_TOKEN" = "401" ]; then
  check_result 0 "No token returns 401"
else
  check_result 1 "No token returns $NO_TOKEN (expected 401)"
fi

# Invalid token → 401
INVALID_TOKEN=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer invalid-token-12345" \
  "$BASE_URL/api/search")
if [ "$INVALID_TOKEN" = "401" ] || [ "$INVALID_TOKEN" = "403" ]; then
  check_result 0 "Invalid token returns $INVALID_TOKEN"
else
  check_result 1 "Invalid token returns $INVALID_TOKEN (expected 401/403)"
fi

# =============================================
# 5. Test search endpoint
# =============================================
echo ""
echo "📍 Step 5: Testing search endpoint..."

SEARCH_RESPONSE=$(curl -s "$BASE_URL/api/search?query=restaurant&lat=35.1856&lng=33.3823" \
  -H "Authorization: Bearer $TOKEN")

SEARCH_STATUS=$(echo $SEARCH_RESPONSE | grep -o '"success":true' || echo "")
if [ -n "$SEARCH_STATUS" ]; then
  check_result 0 "Search endpoint works"
else
  check_result 1 "Search endpoint failed"
fi

# =============================================
# 6. Test job creation
# =============================================
echo ""
echo "📍 Step 6: Testing job creation..."

JOB_RESPONSE=$(curl -s -X POST "$BASE_URL/jobsApi/v1/jobs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"merchantTarget":{"type":"business","businessId":"smoke-test-merchant"}}')

JOB_ID=$(echo $JOB_RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
if [ -n "$JOB_ID" ] && [ "$JOB_ID" != "null" ]; then
  check_result 0 "Job created: $JOB_ID"
else
  check_result 1 "Job creation failed"
  echo "Response: $JOB_RESPONSE"
fi

# =============================================
# 7. Test job confirm (if job was created)
# =============================================
if [ -n "$JOB_ID" ] && [ "$JOB_ID" != "null" ]; then
  echo ""
  echo "📍 Step 7: Testing job confirmation..."

  CONFIRM_RESPONSE=$(curl -s -X POST "$BASE_URL/jobsApi/v1/jobs/$JOB_ID/confirm" \
    -H "Authorization: Bearer $TOKEN")

  CONFIRM_STATUS=$(echo $CONFIRM_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  if [ "$CONFIRM_STATUS" = "confirming" ] || [ "$CONFIRM_STATUS" = "confirmed" ]; then
    check_result 0 "Job confirmed: $CONFIRM_STATUS"
  else
    check_result 1 "Job confirmation failed"
    echo "Response: $CONFIRM_RESPONSE"
  fi
fi

# =============================================
# Summary
# =============================================
echo ""
echo "======================================"
echo "📊 SMOKE TEST SUMMARY"
echo "======================================"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL TESTS PASSED - System ready for deployment${NC}"
  exit 0
else
  echo -e "${RED}⚠️  SOME TESTS FAILED - Review before deployment${NC}"
  exit 1
fi
