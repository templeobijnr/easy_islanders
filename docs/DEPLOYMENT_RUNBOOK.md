# Production Deployment Runbook

**Date:** 2025-12-19  
**Status:** Ready for deployment

---

## Pre-Deployment Checklist

- [x] P0 security fixes verified (SSRF, auth, tool gating)
- [x] P1 stability items complete (payments disabled, social removed)
- [x] All builds passing (functions + web)
- [ ] Environment variables configured
- [ ] Firebase project selected
- [ ] Backup taken (Firestore export)

---

## Environment Variables

### Functions
Ensure `functions/.env` contains:
```bash
GEMINI_API_KEY=<from Firebase secrets>
GEMINI_MODEL=gemini-1.5-flash
# Other required keys
```

### Web
Ensure `.env.production` contains:
```bash
VITE_FIREBASE_API_KEY=<from Firebase console>
VITE_FIREBASE_PROJECT_ID=easy-islanders
VITE_PAYMENTS_ENABLED=false
```

---

## Deployment Commands

### 1. Verify Firebase Project
```bash
firebase use default
firebase projects:list
# Should show: easy-islanders
```

### 2. Verify Builds Pass
```bash
pnpm -C functions build
pnpm exec vite build
```

### 3. Deploy (Dry Run)
```bash
firebase deploy --only hosting,functions --dry-run
```

### 4. Deploy to Production
```bash
firebase deploy --only hosting,functions
```

**Expected Output:**
- Functions deployed: apiV1, api
- Hosting deployed to: easy-islanders.web.app

---

## Post-Deployment Verification

### Immediate (0-5 min)
- [ ] Site loads
- [ ] Auth works: Sign in with test account
- [ ] Chat works: Send test message
- [ ] Tools work: Try "searchMarketplace"
- [ ] Payment UI: Shows "not available yet"
- [ ] Connect tab: Works without social features

### Short-term (5-30 min)
```bash
# Check Functions logs
firebase functions:log --only apiV1 --limit 100
```
- [ ] No 5xx errors in logs
- [ ] No CORS errors in browser console

### Medium-term (1-24 hours)
- [ ] Monitor Cloud Functions usage (cost)
- [ ] Watch for tool gating errors
- [ ] Monitor storage uploads

---

## Rollback Procedure

### Rollback Hosting
```bash
firebase hosting:rollback
```

### Rollback Functions
```bash
# Redeploy previous version from git
git log --oneline -10
git checkout <previous-commit>
firebase deploy --only functions
git checkout main
```

---

## Monitoring

- **Firebase Console:** https://console.firebase.google.com/project/easy-islanders
- **Functions Logs:** Functions > Logs
- **Hosting Analytics:** Hosting > Usage

---

## Success Criteria

Deployment is successful when:
- ✅ No 5xx errors in Functions logs (first hour)
- ✅ Users can sign in and chat
- ✅ Tools execute correctly (not "disabled")
- ✅ Payment UI shows "not available yet"
- ✅ Connect tab works without social features

---

## Post-Launch Tasks (Next 7 days)

1. Monitor logs daily for patterns
2. Address CORS allowlist (P2.5)
3. Fix shared package build (P2.7)
4. Gather user feedback on missing features
