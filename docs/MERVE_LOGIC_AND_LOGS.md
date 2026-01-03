# Merve's Logic Implementation & Logging

This document shows where Merve's thinking, tool execution, and logs are captured.

## 🎯 Main Entry Points

### 1. **Unified Orchestrator** (Channel-Agnostic Entry)
**File:** `functions/src/services/orchestrator/unified.service.ts`

- **Function:** `processInbound()` (line 347)
- **What it does:** Single entrypoint for all channels (WhatsApp, App, Discover)
- **Flow:**
  1. Loads thread from `threads/{threadId}`
  2. Runs confirmation gate
  3. Routes to appropriate agent (Merve, Business, Ops, Dispatch)
  4. Returns outbound messages

**Logs:**
```typescript
logger.info('[Orchestrator] Processing inbound', { threadId, inboundMessageId });
logger.info('[Orchestrator] Running agent', { threadId, agentType });
logger.error('[Orchestrator] Processing error', error);
```

### 2. **Merve Agent Orchestrator** (Core LLM Logic)
**File:** `functions/src/services/agent/orchestrator.service.ts`

- **Function:** `processMessage()` (line 245)
- **What it does:** 
  - Runs confirmation gate
  - Loads conversation history + user memory
  - Initializes Gemini with tools
  - Executes tool loop (LLM → tools → LLM)
  - Saves messages to `chatSessions/{sessionId}/messages`

**Key Logs:**
```typescript
logger.info(`[Merve] Processing message`, {
    channel: actor.channel,
    userId: actor.userId,
    messageLength: message.length
});

logger.info(`[Merve] Executing tool: ${toolName}`);

logger.warn(`[Merve] Tool disabled by config: ${toolName}`);

logger.error(`[Merve] Tool error: ${toolName}`, toolError);

logger.error('[Merve] Orchestration error', error);
```

**Called from:**
- `functions/src/services/orchestrator/unified.service.ts:246` (via `runMerveAgent()`)
- `functions/src/controllers/chat.controller.ts` (legacy app chat)

---

## 📝 Where Merve's Thinking is Stored

### 1. **Conversation History**

#### **Canonical Threads** (New System)
- **Collection:** `threads/{threadId}/messages`
- **Repository:** `functions/src/services/domains/conversations/thread.repository.ts`
- **Fields:**
  - `id`: Message ID
  - `text`: Message content
  - `role`: 'user' | 'assistant' | 'system'
  - `direction`: 'inbound' | 'outbound'
  - `channel`: 'whatsapp' | 'app' | 'discover'
  - `createdAt`: Timestamp

#### **Legacy Chat Sessions** (Still Active)
- **Collection:** `chatSessions/{sessionId}/messages`
- **Repository:** `functions/src/repositories/chat.repository.ts`
- **Used by:** `orchestrator.service.ts` for Merve's internal processing

### 2. **Tool Execution Attempts** (NEW - Step G)
- **Collection:** `toolAttempts/{attemptId}`
- **Created in:** `functions/src/services/agent/orchestrator.service.ts:373`
- **Fields:**
  ```typescript
  {
    id: attemptId,                    // e.g., "tool:session123:orderGas:1234567890"
    sessionId: string,
    userId: string,
    agentId: 'merve',
    toolName: string,                  // e.g., "orderGas", "bookTaxi"
    args: Record<string, any>,        // Tool arguments from LLM
    status: 'started' | 'completed' | 'failed',
    traceId: string,
    durationMs: number,               // Execution time
    result: any,                      // Tool return value
    createdAt: string,
    updatedAt: string
  }
  ```

### 3. **Pending Actions** (Confirmation Gate State)
- **Collection:** `chatSessions/{sessionId}.pendingAction`
- **Used for:** Storing proposals that require user confirmation
- **Example:**
  ```typescript
  {
    kind: 'confirm_order',
    orderId: 'ORD-123',
    summary: 'Order 2x gas cylinders to Home address',
    holdExpiresAt: Date,
    expectedUserId: 'user-123'
  }
  ```

---

## 🔍 Where to View Logs

### **Firebase Functions Logs** (Cloud Logging)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Functions** → **Logs**
4. Filter by:
   - `[Merve]` - All Merve orchestration logs
   - `[Orchestrator]` - Unified orchestrator logs
   - `tool:` - Tool execution logs

**Example log entries:**
```
[INFO] [Merve] Processing message { channel: 'whatsapp', userId: 'user-123', messageLength: 25 }
[INFO] [Merve] Executing tool: orderGas
[INFO] [Merve] Executing tool: getUserAddresses
[ERROR] [Merve] Tool error: orderGas { error: 'Address not found' }
```

### **Firestore Collections** (Data View)

#### **1. View Tool Attempts**
```bash
# Firebase Console → Firestore Database
Collection: toolAttempts
Filter: userId == 'user-123'
Sort: createdAt DESC
```

**What you'll see:**
- Every tool Merve tried to call
- Arguments passed to each tool
- Success/failure status
- Execution duration
- Return values

#### **2. View Conversation History**
```bash
# Canonical threads
Collection: threads/{threadId}/messages

# Legacy sessions (still used by Merve internally)
Collection: chatSessions/{sessionId}/messages
```

#### **3. View Pending Actions**
```bash
Collection: chatSessions
Filter: pendingAction != null
```

Shows what Merve is waiting for user confirmation on.

---

## 🛠️ Tool Execution Flow

### **Step-by-Step Flow:**

1. **User sends message** → WhatsApp/App
2. **Unified orchestrator** (`unified.service.ts:processInbound`)
   - Appends message to `threads/{threadId}/messages`
   - Calls `runMerveAgent()`
3. **Merve agent** (`orchestrator.service.ts:processMessage`)
   - Loads history from `chatSessions/{sessionId}/messages`
   - Checks confirmation gate
   - Sends to Gemini with tools
4. **Gemini responds** with `functionCalls()`
5. **For each tool call:**
   - **Log:** `logger.info('[Merve] Executing tool: ${toolName}')`
   - **Write:** `toolAttempts/{attemptId}` with status='started'
   - **Execute:** Tool resolver (e.g., `orderGas`, `bookTaxi`)
   - **Update:** `toolAttempts/{attemptId}` with status='completed'/'failed' + result
6. **Tool results sent back to Gemini**
7. **Gemini generates final response**
8. **Save:** Both user message and assistant response to `chatSessions/{sessionId}/messages`
9. **Append:** Outbound message to `threads/{threadId}/messages` (canonical)

---

## 📊 Example: Tracing a Gas Order Request

### **User says:** "need gas delivered to my address"

### **1. Logs (Firebase Functions Logs)**
```
[INFO] [Orchestrator] Processing inbound { threadId: 'thread-abc', inboundMessageId: 'msg-123' }
[INFO] [Orchestrator] Running agent { threadId: 'thread-abc', agentType: 'merve' }
[INFO] [Merve] Processing message { channel: 'whatsapp', userId: 'user-123', messageLength: 35 }
[INFO] [Merve] Executing tool: getUserAddresses
[INFO] [Merve] Executing tool: orderGas
```

### **2. Firestore Records**

**`toolAttempts/tool:session123:getUserAddresses:1234567890`**
```json
{
  "id": "tool:session123:getUserAddresses:1234567890",
  "sessionId": "session123",
  "userId": "user-123",
  "agentId": "merve",
  "toolName": "getUserAddresses",
  "args": {},
  "status": "completed",
  "durationMs": 45,
  "result": {
    "success": true,
    "addresses": [
      { "id": "addr-1", "label": "Home", "address": "123 Main St" }
    ]
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**`toolAttempts/tool:session123:orderGas:1234567891`**
```json
{
  "id": "tool:session123:orderGas:1234567891",
  "sessionId": "session123",
  "userId": "user-123",
  "agentId": "merve",
  "toolName": "orderGas",
  "args": {
    "size": "NORMAL",
    "quantity": 2,
    "addressId": "addr-1"
  },
  "status": "completed",
  "durationMs": 1200,
  "result": {
    "success": true,
    "orderId": "ORD-456",
    "pendingAction": {
      "kind": "confirm_order",
      "orderId": "ORD-456",
      "summary": "Order 2x NORMAL gas cylinders to Home (123 Main St)"
    }
  },
  "createdAt": "2024-01-15T10:30:01Z",
  "updatedAt": "2024-01-15T10:30:02Z"
}
```

**`chatSessions/session123.pendingAction`**
```json
{
  "kind": "confirm_order",
  "orderId": "ORD-456",
  "summary": "Order 2x NORMAL gas cylinders to Home (123 Main St)",
  "holdExpiresAt": "2024-01-15T10:35:00Z",
  "expectedUserId": "user-123"
}
```

**`threads/thread-abc/messages/msg-123`** (inbound)
```json
{
  "id": "msg-123",
  "text": "need gas delivered to my address",
  "role": "user",
  "direction": "inbound",
  "channel": "whatsapp",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**`threads/thread-abc/messages/msg-124`** (outbound)
```json
{
  "id": "msg-124",
  "text": "I can help with that. What's your address, and how many gas cylinders do you need?",
  "role": "assistant",
  "direction": "outbound",
  "channel": "whatsapp",
  "createdAt": "2024-01-15T10:30:03Z"
}
```

---

## 🔧 Debugging Commands

### **View all tool attempts for a user:**
```bash
# Firebase Console → Firestore
Collection: toolAttempts
Filter: userId == 'user-123'
Sort: createdAt DESC
```

### **View conversation thread:**
```bash
Collection: threads/{threadId}/messages
Sort: createdAt ASC
```

### **View Merve's system prompt:**
```typescript
// functions/src/utils/systemPrompts.ts
getSystemInstruction('merve', 'en')
```

### **View available tools:**
```typescript
// functions/src/utils/tools/definitions/all.ts
ALL_TOOL_DEFINITIONS
```

---

## 📍 Key Files Summary

| File | Purpose | Logs/Data |
|------|---------|-----------|
| `unified.service.ts` | Channel-agnostic entry | `[Orchestrator]` logs, writes to `threads/*` |
| `orchestrator.service.ts` | Merve's core LLM logic | `[Merve]` logs, writes to `toolAttempts/*`, `chatSessions/*` |
| `thread.repository.ts` | Canonical conversation store | Writes to `threads/{id}/messages` |
| `chat.repository.ts` | Legacy session store | Writes to `chatSessions/{id}/messages` |
| `tool.service.ts` | Tool resolver registry | Routes tool calls to implementations |
| `whatsappInbound.task.ts` | WhatsApp processing | Calls `unified.service.processInbound()` |

---

## 🎯 Quick Reference: Where to Look

- **"Where did Merve log this?"** → Firebase Functions Logs, filter `[Merve]` or `[Orchestrator]`
- **"What tools did Merve call?"** → Firestore `toolAttempts` collection
- **"What did Merve say to the user?"** → Firestore `threads/{threadId}/messages` or `chatSessions/{sessionId}/messages`
- **"What is Merve waiting for?"** → Firestore `chatSessions/{sessionId}.pendingAction`
- **"What tools are available?"** → `functions/src/utils/tools/definitions/all.ts`



