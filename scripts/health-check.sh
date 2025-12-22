#!/bin/bash
# Comprehensive System Health Check - Zero Tolerance Mode
# Run before any production deployment
# Usage: ./scripts/health-check.sh

set -e

echo "═══════════════════════════════════════════════════════════"
echo "🔬 COMPREHENSIVE SYSTEM HEALTH CHECK"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# ═══════════════════════════════════════════════════════════════
# PHASE 1: BUILD VERIFICATION
# ═══════════════════════════════════════════════════════════════

echo "📦 PHASE 1: Build Verification"
echo "───────────────────────────────"

# Functions build
echo "Building functions..."
cd functions
if npm run build > /tmp/functions-build.log 2>&1; then
  echo -e "${GREEN}✅ Functions build passed${NC}"
else
  echo -e "${RED}❌ Functions build failed${NC}"
  tail -20 /tmp/functions-build.log
  ((ERRORS++))
fi
cd ..

# Web build
echo "Building web..."
if pnpm exec vite build > /tmp/web-build.log 2>&1; then
  echo -e "${GREEN}✅ Web build passed${NC}"
else
  echo -e "${RED}❌ Web build failed${NC}"
  tail -20 /tmp/web-build.log
  ((ERRORS++))
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# PHASE 2: UNIT TESTS
# ═══════════════════════════════════════════════════════════════

echo "🧪 PHASE 2: Unit Tests"
echo "───────────────────────────────"

cd functions
if npm test > /tmp/test-results.log 2>&1; then
  PASSED=$(grep -oP '\d+(?= passed)' /tmp/test-results.log | tail -1 || echo "0")
  FAILED=$(grep -oP '\d+(?= failed)' /tmp/test-results.log | tail -1 || echo "0")
  TOTAL=$((PASSED + FAILED))
  
  if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}✅ Tests: $PASSED/$TOTAL passed (0% failure)${NC}"
  else
    RATE=$(echo "scale=1; $FAILED * 100 / $TOTAL" | bc)
    echo -e "${YELLOW}⚠️ Tests: $PASSED/$TOTAL passed ($RATE% failure)${NC}"
    ((WARNINGS++))
  fi
else
  echo -e "${RED}❌ Test suite failed${NC}"
  tail -30 /tmp/test-results.log
  ((ERRORS++))
fi
cd ..

echo ""

# ═══════════════════════════════════════════════════════════════
# PHASE 3: CONFIGURATION CHECK
# ═══════════════════════════════════════════════════════════════

echo "⚙️ PHASE 3: Configuration Check"
echo "───────────────────────────────"

# Firebase config
if [ -f firebase.json ] && [ -f .firebaserc ]; then
  echo -e "${GREEN}✅ Firebase config exists${NC}"
else
  echo -e "${RED}❌ Missing Firebase config${NC}"
  ((ERRORS++))
fi

# Firestore rules
if [ -f firestore.rules ]; then
  echo -e "${GREEN}✅ Firestore rules exist${NC}"
else
  echo -e "${YELLOW}⚠️ No firestore.rules${NC}"
  ((WARNINGS++))
fi

# Storage rules
if [ -f storage.rules ]; then
  if grep -q "allow write: if true" storage.rules; then
    echo -e "${RED}❌ CRITICAL: Public write in storage.rules!${NC}"
    ((ERRORS++))
  else
    echo -e "${GREEN}✅ Storage rules secure${NC}"
  fi
else
  echo -e "${YELLOW}⚠️ No storage.rules${NC}"
  ((WARNINGS++))
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# PHASE 4: GIT STATUS
# ═══════════════════════════════════════════════════════════════

echo "📋 PHASE 4: Git Status"
echo "───────────────────────────────"

UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

if [ "$UNCOMMITTED" -eq 0 ]; then
  echo -e "${GREEN}✅ Working directory clean${NC}"
else
  echo -e "${YELLOW}⚠️ $UNCOMMITTED uncommitted changes${NC}"
  ((WARNINGS++))
fi

BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "Branch: $BRANCH"

echo ""

# ═══════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════"
echo "📊 HEALTH CHECK SUMMARY"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo -e "Errors:   ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}🎯 DECISION: ✅ READY TO DEPLOY${NC}"
  echo ""
  echo "All critical checks passed. Run:"
  echo "  firebase deploy --only functions,hosting"
  exit 0
else
  echo -e "${RED}🛑 DECISION: ❌ NOT READY${NC}"
  echo ""
  echo "Fix $ERRORS critical errors before deployment."
  exit 1
fi
