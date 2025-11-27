# Gemini 2.0 Experimental Model API Fix

**Date:** 2025-11-26
**Status:** ✅ Fixed
**Model:** `gemini-2.0-flash-exp`

---

## Issue Summary

### Problem
Gemini API was returning 400 Bad Request errors when using the experimental `gemini-2.0-flash-exp` model:

```
GoogleGenerativeAIFetchError: [400 Bad Request] Invalid JSON payload received.
Unknown name "tools": Cannot find field.
Unknown name "systemInstruction": Cannot find field.
```

### Root Cause
The experimental Gemini 2.0 models require the **v1beta API**, not the stable v1 API. The v1 API doesn't support `tools` and `systemInstruction` parameters for experimental models.

### User Requirement
- **Must use `gemini-2.0-flash-exp`** (experimental model)
- **Cannot use `gemini-1.5-flash`** (doesn't work well with tools according to user)

---

## Solution

### Updated API Version: v1 → v1beta

Changed all `getGenerativeModel()` calls from `apiVersion: 'v1'` to `apiVersion: 'v1beta'` to support experimental models with tools and systemInstruction.

### Files Modified

#### 1. [functions/src/controllers/chat.controller.ts:136](functions/src/controllers/chat.controller.ts#L136)

**Before:**
```typescript
const model = genAI.getGenerativeModel(
    {
        model: modelName,
        systemInstruction: contextPrompt,
        tools: [{ functionDeclarations: ALL_TOOL_DEFINITIONS }]
    },
    { apiVersion: 'v1' }  // ❌ Doesn't support experimental models
);
```

**After:**
```typescript
const model = genAI.getGenerativeModel(
    {
        model: modelName,
        systemInstruction: contextPrompt,
        tools: [{ functionDeclarations: ALL_TOOL_DEFINITIONS }]
    },
    { apiVersion: 'v1beta' }  // ✅ Supports experimental models
);
```

**Also updated default model fallback:**
```typescript
const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
```

#### 2. [functions/src/services/ai/profiler.ts:21](functions/src/services/ai/profiler.ts#L21)

**Before:**
```typescript
const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    systemInstruction: `...`
}, { apiVersion: 'v1' });
```

**After:**
```typescript
const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
    systemInstruction: `...`
}, { apiVersion: 'v1beta' });
```

#### 3. [functions/src/controllers/import.controller.ts:212](functions/src/controllers/import.controller.ts#L212)

**Before:**
```typescript
const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
});
```

**After:**
```typescript
const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'
}, { apiVersion: 'v1beta' });
```

---

## Environment Configuration

### `.env` File
```bash
# Gemini Model Configuration
GEMINI_MODEL=gemini-2.0-flash-exp
```

The experimental model is explicitly set in the environment and used as the default fallback in all three files.

---

## API Version Comparison

| Feature | v1 API | v1beta API |
|---------|--------|------------|
| Stable models (1.5-flash, 1.5-pro) | ✅ Supported | ✅ Supported |
| Experimental models (2.0-flash-exp) | ❌ Not supported | ✅ Supported |
| Tool calling (`tools` parameter) | ✅ Limited | ✅ Full support |
| System instructions | ✅ Limited | ✅ Full support |
| Production ready | ✅ Yes | ⚠️ Beta features |

---

## Why v1beta?

### Google's API Structure

1. **v1 (Stable):**
   - Production-ready models only
   - Limited to officially released features
   - Doesn't support experimental models with advanced features

2. **v1beta (Beta):**
   - Supports experimental models
   - Full feature set including tools and systemInstruction for all models
   - Required for `gemini-2.0-flash-exp` to use function calling

### Trade-offs

**Pros:**
- ✅ Access to latest experimental features
- ✅ Better performance with 2.0 models
- ✅ Enhanced tool calling capabilities
- ✅ More advanced system instruction support

**Cons:**
- ⚠️ Beta API may change
- ⚠️ Experimental models can be deprecated without notice
- ⚠️ Slightly less stable than v1

**Recommendation:** Monitor Google's announcements. When `gemini-2.0-flash` becomes stable, you can switch back to v1 API.

---

## Testing the Fix

### Build Status
```bash
$ npm run build
> tsc
✅ Build completed successfully (0 errors)
```

### Test Locally with Emulator

```bash
# Start Firebase emulators
cd functions
firebase emulators:start

# In another terminal, test a chat message with tools
# The agent should now successfully:
# 1. Use gemini-2.0-flash-exp
# 2. Access system instructions
# 3. Call tools without API errors
```

### Expected Behavior

**Before Fix:**
```
🔴 Error: [400 Bad Request] Invalid JSON payload
Unknown name "tools": Cannot find field
```

**After Fix:**
```
🤖 Using model: gemini-2.0-flash-exp
🟦 [Backend] Initializing Gemini...
✅ Agent responds successfully with tool calling
```

---

## Migration Path (Future)

When Gemini 2.0 becomes stable:

### Option 1: Stay on v1beta
Continue using v1beta with stable `gemini-2.0-flash` (when released)

### Option 2: Switch to v1
```typescript
// When gemini-2.0-flash is stable
const model = genAI.getGenerativeModel(
    {
        model: 'gemini-2.0-flash',  // Stable version
        systemInstruction: contextPrompt,
        tools: [{ functionDeclarations: ALL_TOOL_DEFINITIONS }]
    },
    { apiVersion: 'v1' }  // Back to stable API
);
```

---

## Key Learnings

### Gemini API Best Practices

1. **Experimental models require v1beta:**
   ```typescript
   // ❌ Bad
   genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' }, { apiVersion: 'v1' })

   // ✅ Good
   genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' }, { apiVersion: 'v1beta' })
   ```

2. **Use environment variables for model selection:**
   ```typescript
   const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
   ```
   This allows easy switching between models without code changes.

3. **Consistent API version across services:**
   Ensure all `getGenerativeModel()` calls use the same API version for consistency.

4. **Tool calling compatibility:**
   - `gemini-1.5-flash`: Limited tool support (user reported issues)
   - `gemini-2.0-flash-exp`: Enhanced tool support with v1beta
   - Future `gemini-2.0-flash`: Expected to have best tool support

---

## Related Documentation

- [Compilation Fixes](COMPILATION_FIXES.md) - TypeScript error resolutions
- [Architecture Improvements](ARCHITECTURE_IMPROVEMENTS.md) - Service modularization
- [Security Fixes Summary](SECURITY_FIXES_SUMMARY.md) - Firestore rules updates

---

## Next Steps

### Immediate (Completed)
- ✅ Update all three files to use v1beta API
- ✅ Change default model to gemini-2.0-flash-exp
- ✅ Verify build succeeds with no errors

### Short-term (Test & Deploy)
1. **Test locally:**
   ```bash
   firebase emulators:start
   # Test chat with tool calling
   ```

2. **Deploy to production:**
   ```bash
   firebase deploy --only functions
   ```

3. **Monitor logs:**
   - Check Firebase Console for any API errors
   - Verify tool calling works correctly
   - Monitor response quality and latency

### Long-term (Monitor & Migrate)
1. **Track Gemini 2.0 release:**
   - Watch for `gemini-2.0-flash` stable release
   - Monitor deprecation notices for experimental model

2. **Performance comparison:**
   - Compare 2.0-exp vs 1.5-flash response quality
   - Measure latency differences
   - Track tool calling accuracy

3. **Plan stable migration:**
   - When 2.0 is stable, consider migrating to v1 API
   - Update documentation
   - Test thoroughly before production deploy

---

## Support & Troubleshooting

### Common Issues

**Issue:** "Model not found" error
**Solution:** Ensure `.env` has `GEMINI_MODEL=gemini-2.0-flash-exp`

**Issue:** "Invalid API version" error
**Solution:** Update `@google/generative-ai` package to latest version

**Issue:** Tool calling still fails
**Solution:** Verify all three files use `apiVersion: 'v1beta'`

### Debug Commands

```bash
# Check environment variable
cd functions
node -e "require('dotenv').config(); console.log(process.env.GEMINI_MODEL)"

# View compiled JavaScript
cat lib/controllers/chat.controller.js | grep -A5 "getGenerativeModel"

# Test with curl (if using HTTP trigger)
curl -X POST https://your-function-url/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Find me a taxi"}'
```

---

**Fixed By:** Claude Code
**Date:** 2025-11-26
**API Version:** v1beta
**Model:** gemini-2.0-flash-exp
**Build Status:** ✅ Passing
