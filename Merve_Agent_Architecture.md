# MERVE AI AGENT ARCHITECTURE

## Tool Enforcement, Hallucination Prevention, and Audit Design

**Date**: December 31, 2025  
**Context**: Easy Islanders AI agent (Merve) for tourism bookings  
**Current Stack**: Gemini AI, Firestore, Stripe, Twilio  

---

## EXECUTIVE SUMMARY

**The Problem**: LLMs (including Gemini) will hallucinate actions if not strictly constrained to a predefined tool set. For a booking system, hallucinations = incorrect bookings, phantom payments, broken user trust.

**The Solution**: A **tool-enforced architecture** that:
1. **Restricts Merve to a fixed tool set** (no freestyle responses)
2. **Validates all tool calls before execution** (approval layer)
3. **Implements circuit breakers** (fail-safe defaults)
4. **Audits every action** (complete trail for debugging and compliance)
5. **Uses MCP where beneficial** (not everywhere)

**Key Insight**: The architecture isn't about making Gemini smarter; it's about making hallucinations **impossible**.

---

## PART 1: AGENT ARCHITECTURE OVERVIEW

### High-Level Flow

```
User Input (Chat/Discover/Connect)
    ↓
Merve Agent (Gemini)
    ↓
[Tool Validation Layer] ← Enforce strict tool calling
    ↓
Tool Execution (Firestore, Stripe, WhatsApp, etc.)
    ↓
[Result Validation Layer] ← Verify outcome matches intent
    ↓
[Audit Logger] ← Log everything
    ↓
Response to User
```

### Core Principle

**Merve never executes user intent directly. Merve always translates user intent into a tool call.**

Pattern:
```
Tourist: "Book me a table at Tony's for 2 people at 8pm"
    ↓
Merve: "I need to use the 'search_restaurants' tool"
    ↓
Merve: "I need to use the 'create_reservation' tool"
    ↓
[Tool Validation] "Does this match available restaurants and time slots?"
    ↓
Execute or reject
```

---

## PART 2: TOOL ENFORCEMENT ARCHITECTURE

### 2.1 Fixed Tool Set (No Freestyle)

Define a **complete, closed set** of tools. Merve cannot use any tool not in this set.

**Tourism & Booking Tools**:

| Tool | Input | Output | Safety Notes |
|------|-------|--------|--------------|
| `search_restaurants` | location, cuisine, time, party_size | [restaurant_ids, names, availability] | Returns real data from Firestore only |
| `search_accommodations` | location, check_in, check_out, guests | [accommodation_ids, names, prices] | Validates dates; blocks past bookings |
| `search_activities` | location, date, duration, category | [activity_ids, names, times] | Validates capacity; blocks overbooked |
| `create_reservation` | restaurant_id, time, party_size, guest_phone | {reservation_id, confirmation} | Requires validation layer approval |
| `create_booking` | accommodation_id, check_in, check_out, guests | {booking_id, total_price} | Requires payment validation |
| `create_activity_booking` | activity_id, date, time, participants | {booking_id, confirmation} | Validates capacity in real-time |
| `process_payment` | booking_id, amount, payment_method | {transaction_id, status} | Stripe integration with retry logic |
| `get_booking_details` | booking_id | {booking, status, details} | Read-only; no modifications |
| `cancel_booking` | booking_id, reason | {status, refund_info} | Requires user confirmation |
| `contact_operator` | operator_id, message_type, message | {ticket_id, status} | Creates support ticket; no direct booking |
| `send_confirmation` | booking_id, contact_method (sms/whatsapp) | {status, message_id} | Twilio integration |

**Conversation Tools**:

| Tool | Input | Output | Safety |
|------|-------|--------|--------|
| `get_tourist_history` | tourist_id | {past_bookings, preferences} | Read-only; anonymized |
| `get_operator_info` | operator_id | {name, rating, reviews, cuisine_type} | Public data only |
| `ask_clarification` | question, options | {user_response} | Blocks booking until confirmed |
| `escalate_to_human` | reason, context | {support_ticket_id} | Manual review by human agent |

**Rules**:
- ✅ Tool list is **finite and predefined**
- ✅ Merve **cannot create custom tools** or execute arbitrary code
- ✅ New tools require **code deployment** (not prompt engineering)
- ✅ All tools return **structured data** (no free text from external APIs)

### 2.2 Tool Validation Layer (Before Execution)

**Every tool call is validated before execution.**

```python
class ToolValidator:
    def validate_tool_call(self, tool_name: str, args: dict) -> dict:
        """
        Returns:
        {
            "valid": bool,
            "approved": bool,
            "reason": str,
            "action": "execute" | "escalate" | "reject"
        }
        """
        
        # Rule 1: Tool must exist
        if tool_name not in ALLOWED_TOOLS:
            return {"valid": False, "reason": "Tool not in allowed set"}
        
        # Rule 2: Arguments must match schema
        schema = TOOL_SCHEMAS[tool_name]
        if not self.validate_schema(args, schema):
            return {"valid": False, "reason": "Arguments don't match schema"}
        
        # Rule 3: Business logic validation
        if tool_name == "create_reservation":
            if not self.validate_reservation_logic(args):
                return {"valid": False, "reason": "Invalid reservation logic"}
        
        # Rule 4: High-value operations require approval
        if tool_name == "process_payment":
            amount = args.get("amount", 0)
            if amount > PAYMENT_THRESHOLD:
                return {
                    "valid": True,
                    "approved": False,
                    "reason": "High-value payment requires human approval",
                    "action": "escalate"
                }
        
        # Rule 5: Check fraud signals
        if self.detect_fraud_signals(tool_name, args):
            return {"valid": True, "approved": False, "action": "escalate"}
        
        return {"valid": True, "approved": True, "action": "execute"}

    def validate_schema(self, args: dict, schema: dict) -> bool:
        """Ensure arguments match predefined schema."""
        for required_field, field_type in schema.items():
            if required_field not in args:
                return False
            if not isinstance(args[required_field], field_type):
                return False
        return True

    def validate_reservation_logic(self, args: dict) -> bool:
        """Business logic validation for reservations."""
        restaurant_id = args["restaurant_id"]
        time_slot = args["time"]
        party_size = args["party_size"]
        
        # Check if restaurant exists
        restaurant = firestore_db.collection("restaurants").document(restaurant_id).get()
        if not restaurant.exists:
            return False
        
        # Check if time slot is available
        availability = firestore_db.collection("availability").document(
            f"{restaurant_id}_{time_slot}"
        ).get()
        if not availability.exists or availability.data()["available_seats"] < party_size:
            return False
        
        return True
```

**Validation Outcomes**:
- ✅ **Valid + Approved**: Execute immediately
- ⚠️ **Valid + Not Approved**: Escalate to human review
- ❌ **Invalid**: Reject and explain why to Merve

### 2.3 Circuit Breaker Pattern (Fail-Safe Defaults)

**If anything breaks, the system defaults to safe behavior (escalate to human).**

```python
class CircuitBreaker:
    def __init__(self, failure_threshold: int = 3):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.state = "closed"  # closed | open | half_open
    
    def execute_with_safety(self, tool_call: dict) -> dict:
        """Execute tool with circuit breaker protection."""
        
        if self.state == "open":
            # Too many failures; escalate to human
            return {
                "status": "escalated",
                "reason": "Circuit breaker open; too many failures",
                "action": "contact_human_agent"
            }
        
        try:
            result = self.execute_tool(tool_call)
            self.failure_count = 0
            self.state = "closed"
            return result
        except Exception as e:
            self.failure_count += 1
            if self.failure_count >= self.failure_threshold:
                self.state = "open"
                return {
                    "status": "escalated",
                    "reason": f"Multiple failures: {e}",
                    "action": "contact_human_agent"
                }
            raise

class PaymentCircuitBreaker(CircuitBreaker):
    """Payment failures are extra critical; lower threshold."""
    def __init__(self):
        super().__init__(failure_threshold=1)  # One failure = escalate
```

---

## PART 3: HALLUCINATION PREVENTION

### 3.1 System Prompt Engineering (Enforce Tool Calling)

**Current Gemini Prompt** (Default):
```
You are Merve, an AI assistant for tourism bookings.
Help users find and book local services.
```
**Problem**: Gemini will respond with free text, hallucinating booking details.

**New Gemini Prompt** (Tool-Enforced):
```
You are Merve, an AI assistant for tourism bookings in destination cities.

CRITICAL RULES:
1. You ONLY use tools from this exact list:
   - search_restaurants, search_accommodations, search_activities
   - create_reservation, create_booking, create_activity_booking
   - process_payment, cancel_booking, contact_operator
   - send_confirmation, get_booking_details, ask_clarification
   - escalate_to_human

2. You NEVER:
   - Make up restaurant names, prices, or availability
   - Confirm bookings without using create_reservation tool
   - Process payments without using process_payment tool
   - Suggest options not returned by search tools
   - Promise features you can't verify

3. You MUST:
   - Call search_* tools BEFORE suggesting options
   - Validate availability BEFORE creating bookings
   - Ask for confirmation BEFORE processing payments
   - Use ask_clarification when uncertain
   - Use escalate_to_human for complex situations

4. If you cannot complete a task with available tools:
   - Explain what you can't do
   - Use escalate_to_human
   - DO NOT attempt workarounds

5. Tool calling format:
   <tool_call>
   {
     "tool": "tool_name",
     "arguments": {
       "arg1": "value1",
       "arg2": "value2"
     }
   }
   </tool_call>

EXAMPLE:
User: "Book me a table at Tony's for 2 people at 8pm"

You: "I'll search for available restaurants and check availability."
<tool_call>
{
  "tool": "search_restaurants",
  "arguments": {
    "name": "Tony's",
    "location": "your_location",
    "date": "today",
    "time": "20:00",
    "party_size": 2
  }
}
</tool_call>

[Search returns: Tony's Italian (ID: rest_123, availability: 20:00 ✓)]

You: "Found Tony's Italian Restaurant with availability at 8pm for 2 people.
Proceeding with reservation."
<tool_call>
{
  "tool": "create_reservation",
  "arguments": {
    "restaurant_id": "rest_123",
    "time": "20:00",
    "party_size": 2,
    "guest_phone": "user_phone"
  }
}
</tool_call>

[Reservation created: Confirmation #RES123]

You: "Reservation confirmed! Your booking reference is RES123. 
You'll receive a confirmation via WhatsApp."
```

### 3.2 Structured Output Enforcement (Gemini API)

**Use Gemini's structured output mode** to force tool calling:

```python
from google.generativeai.types import tool as Tool
import google.generativeai as genai

# Define tools with strict schema
tools = [
    Tool(
        function_declarations=[
            {
                "name": "search_restaurants",
                "description": "Search for restaurants with availability",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "location": {"type": "STRING", "description": "City or area"},
                        "cuisine": {"type": "STRING", "description": "Cuisine type"},
                        "party_size": {"type": "INTEGER", "minimum": 1},
                        "time": {"type": "STRING", "description": "ISO time format"}
                    },
                    "required": ["location", "party_size", "time"]
                }
            },
            {
                "name": "create_reservation",
                "description": "Create a restaurant reservation",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "restaurant_id": {"type": "STRING"},
                        "time": {"type": "STRING", "description": "ISO format"},
                        "party_size": {"type": "INTEGER"},
                        "guest_phone": {"type": "STRING"}
                    },
                    "required": ["restaurant_id", "time", "party_size", "guest_phone"]
                }
            }
            # ... more tools
        ]
    )
]

# Configure Gemini to ONLY return tool calls
model = genai.GenerativeModel(
    "gemini-2.0-flash",
    tools=tools,
    tool_config={
        "function_calling_config": "ANY"  # Force tool calling
    }
)

response = model.generate_content(
    "Book me a table at Tony's for 2 people at 8pm",
    tools=tools
)

# Response will ONLY contain tool_call objects, never free text
for part in response.content.parts:
    if part.function_call:
        print(f"Tool: {part.function_call.name}")
        print(f"Args: {part.function_call.args}")
```

### 3.3 MCP (Model Context Protocol) — When to Use

**MCP is useful but NOT a silver bullet for hallucination prevention.**

**What MCP Does**:
- Standardizes tool definition and calling conventions
- Provides automatic schema validation
- Enables better tool discoverability for LLMs
- Works with any LLM (Gemini, Claude, Llama, etc.)

**What MCP Doesn't Do**:
- Prevent LLMs from trying to use tools creatively
- Guarantee tool calling (still depends on model behavior)
- Handle business logic validation (that's your layer)
- Manage state or transactions

**When to Use MCP**:
- ✅ You have multiple AI models (Gemini, Claude, Llama)
- ✅ You want standardized tool definitions across services
- ✅ You're building a complex agent ecosystem

**When NOT to Use MCP** (for Easy Islanders v1):
- ❌ You're only using Gemini
- ❌ You have simple, fixed tool set
- ❌ You need tight coupling with Firestore/Stripe specifics
- ❌ You want maximum performance (MCP adds HTTP overhead)

**Recommendation for Easy Islanders**: **Skip MCP initially. Build a tight Gemini + custom validation layer. Add MCP if you expand to multi-model architecture later.**

---

## PART 4: VALIDATION & SAFETY LAYERS

### 4.1 Result Validation (Post-Execution)

**After a tool executes, validate the result makes sense.**

```python
class ResultValidator:
    def validate_result(self, tool_name: str, args: dict, result: dict) -> dict:
        """Validate tool result matches expected outcome."""
        
        if tool_name == "create_reservation":
            # Verify reservation was actually created
            if "reservation_id" not in result:
                return {"valid": False, "reason": "No reservation_id in result"}
            
            # Verify it matches the requested time
            reservation = firestore_db.collection("reservations").document(
                result["reservation_id"]
            ).get()
            if not reservation.exists:
                return {"valid": False, "reason": "Reservation not found in database"}
            
            res_time = reservation.data()["time"]
            requested_time = args["time"]
            if res_time != requested_time:
                return {
                    "valid": False,
                    "reason": f"Time mismatch: requested {requested_time}, got {res_time}"
                }
            
            return {"valid": True, "approved": True}
        
        elif tool_name == "process_payment":
            transaction_id = result.get("transaction_id")
            
            # Verify payment in Stripe
            stripe_charge = stripe.Charge.retrieve(transaction_id)
            if stripe_charge.status != "succeeded":
                return {
                    "valid": False,
                    "reason": f"Payment status: {stripe_charge.status}, not succeeded"
                }
            
            if stripe_charge.amount != args["amount"]:
                return {
                    "valid": False,
                    "reason": f"Amount mismatch: requested {args['amount']}, charged {stripe_charge.amount}"
                }
            
            return {"valid": True, "approved": True}
        
        return {"valid": True, "approved": True}
```

### 4.2 Confirmation Layer (For High-Risk Actions)

**Before irreversible actions, get explicit user confirmation.**

```python
class ConfirmationLayer:
    async def require_confirmation(
        self,
        action: str,
        details: dict,
        tourist_id: str
    ) -> bool:
        """Get explicit user confirmation before executing high-risk action."""
        
        high_risk_actions = {
            "process_payment": True,
            "create_booking": True,
            "cancel_booking": True,
            "request_refund": True
        }
        
        if action not in high_risk_actions:
            return True  # Low-risk; proceed
        
        # Build confirmation message
        confirmation_text = self.build_confirmation_message(action, details)
        
        # Send to user via WhatsApp
        message_id = await twilio_client.send_whatsapp_message(
            tourist_phone=self.get_tourist_phone(tourist_id),
            text=confirmation_text,
            quick_replies=["✅ Confirm", "❌ Cancel"]
        )
        
        # Wait for user response (timeout: 5 minutes)
        response = await self.wait_for_response(message_id, timeout=300)
        
        if response == "✅ Confirm":
            return True
        else:
            return False

    def build_confirmation_message(self, action: str, details: dict) -> str:
        if action == "process_payment":
            return f"""
🔐 Confirm Payment
Amount: €{details['amount']}
Restaurant: {details['restaurant_name']}
Time: {details['time']}

Reply ✅ to confirm or ❌ to cancel
            """
        elif action == "create_booking":
            return f"""
🏨 Confirm Booking
Hotel: {details['hotel_name']}
Check-in: {details['check_in']}
Check-out: {details['check_out']}
Total: €{details['total_price']}

Reply ✅ to confirm or ❌ to cancel
            """
        return "Please confirm this action: ✅ Yes or ❌ No"
```

---

## PART 5: COMPLETE AUDIT SYSTEM

### 5.1 Audit Event Structure

**Every action is logged as an immutable audit event.**

```python
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
import json

class ActionType(Enum):
    SEARCH = "search"
    BOOKING = "booking"
    PAYMENT = "payment"
    CANCELLATION = "cancellation"
    ESCALATION = "escalation"
    ERROR = "error"

class ActionStatus(Enum):
    INITIATED = "initiated"
    VALIDATED = "validated"
    APPROVED = "approved"
    EXECUTED = "executed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"

@dataclass
class AuditEvent:
    event_id: str  # UUID
    timestamp: datetime
    tourist_id: str
    agent_id: str  # "merve"
    action_type: ActionType
    action_status: ActionStatus
    
    # What Merve intended
    merve_intent: str  # Raw user request
    merve_tool_call: dict  # Tool name + args
    
    # Validation results
    validation_status: str  # "passed" | "escalated" | "rejected"
    validation_reason: str
    
    # Execution results
    tool_result: dict  # What the tool returned
    result_valid: bool
    result_reason: str
    
    # Human interactions
    escalated_to_human: bool
    human_decision: str  # If escalated
    human_timestamp: datetime
    
    # Outcome
    final_status: str  # "succeeded" | "failed" | "manual_review"
    error_message: str  # If failed
    
    # Metadata
    metadata: dict  # Custom fields for context

def create_audit_event(
    tourist_id: str,
    merve_intent: str,
    tool_call: dict,
    validation_result: dict,
    tool_result: dict = None,
    result_validation: dict = None,
    error: str = None
) -> AuditEvent:
    """Factory function to create audit events."""
    
    return AuditEvent(
        event_id=str(uuid.uuid4()),
        timestamp=datetime.utcnow(),
        tourist_id=tourist_id,
        agent_id="merve",
        action_type=ActionType[tool_call["tool"].split("_")[0].upper()],
        action_status=ActionStatus.INITIATED,
        
        merve_intent=merve_intent,
        merve_tool_call=tool_call,
        
        validation_status=validation_result.get("action", "unknown"),
        validation_reason=validation_result.get("reason", ""),
        
        tool_result=tool_result or {},
        result_valid=result_validation.get("valid", False) if result_validation else False,
        result_reason=result_validation.get("reason", "") if result_validation else "",
        
        escalated_to_human=validation_result.get("action") == "escalate",
        human_decision="",
        human_timestamp=None,
        
        final_status="",
        error_message=error or "",
        
        metadata={}
    )
```

### 5.2 Audit Storage (Immutable)

**Store audit events in Firestore with write-once, read-always access.**

```python
class AuditLogger:
    def __init__(self, firestore_client):
        self.db = firestore_client
        self.collection = "audit_events"
    
    async def log_event(self, event: AuditEvent) -> str:
        """Log event to immutable audit trail."""
        
        # Convert event to dict
        event_dict = {
            "event_id": event.event_id,
            "timestamp": event.timestamp,
            "tourist_id": event.tourist_id,
            "agent_id": event.agent_id,
            "action_type": event.action_type.value,
            "action_status": event.action_status.value,
            
            "merve_intent": event.merve_intent,
            "merve_tool_call": event.merve_tool_call,
            
            "validation_status": event.validation_status,
            "validation_reason": event.validation_reason,
            
            "tool_result": event.tool_result,
            "result_valid": event.result_valid,
            "result_reason": event.result_reason,
            
            "escalated_to_human": event.escalated_to_human,
            "human_decision": event.human_decision,
            "human_timestamp": event.human_timestamp,
            
            "final_status": event.final_status,
            "error_message": event.error_message,
            
            "metadata": event.metadata
        }
        
        # Write to Firestore with write-once semantics
        doc_ref = self.db.collection(self.collection).document(event.event_id)
        await doc_ref.set(event_dict, merge=False)
        
        return event.event_id
    
    async def get_audit_trail(self, tourist_id: str, days: int = 30):
        """Retrieve audit trail for a tourist."""
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        query = self.db.collection(self.collection) \
            .where("tourist_id", "==", tourist_id) \
            .where("timestamp", ">=", cutoff_date) \
            .order_by("timestamp", direction=firestore.Query.DESCENDING)
        
        docs = await query.stream()
        return [doc.to_dict() async for doc in docs]
    
    async def get_action_chain(self, booking_id: str):
        """Retrieve all actions related to a specific booking."""
        
        query = self.db.collection(self.collection) \
            .where("metadata.booking_id", "==", booking_id) \
            .order_by("timestamp")
        
        docs = await query.stream()
        return [doc.to_dict() async for doc in docs]
```

### 5.3 Audit Dashboard (Querying & Analysis)

**Query audit events to understand agent behavior.**

```python
class AuditDashboard:
    def __init__(self, firestore_client):
        self.db = firestore_client
    
    async def get_agent_stats(self, start_date: datetime, end_date: datetime) -> dict:
        """Get Merve's performance stats."""
        
        query = self.db.collection("audit_events") \
            .where("timestamp", ">=", start_date) \
            .where("timestamp", "<=", end_date)
        
        events = await query.stream()
        events_list = [doc.to_dict() async for doc in events]
        
        stats = {
            "total_actions": len(events_list),
            "by_action_type": {},
            "validation_pass_rate": 0,
            "escalation_rate": 0,
            "error_rate": 0,
            "success_rate": 0,
            "avg_time_to_execution": 0
        }
        
        for event in events_list:
            action_type = event["action_type"]
            stats["by_action_type"][action_type] = \
                stats["by_action_type"].get(action_type, 0) + 1
        
        passed = len([e for e in events_list if e["validation_status"] == "passed"])
        stats["validation_pass_rate"] = passed / len(events_list) if events_list else 0
        
        escalated = len([e for e in events_list if e["escalated_to_human"]])
        stats["escalation_rate"] = escalated / len(events_list) if events_list else 0
        
        errors = len([e for e in events_list if e["error_message"]])
        stats["error_rate"] = errors / len(events_list) if events_list else 0
        
        succeeded = len([e for e in events_list if e["final_status"] == "succeeded"])
        stats["success_rate"] = succeeded / len(events_list) if events_list else 0
        
        return stats
    
    async def get_failure_patterns(self, days: int = 7) -> dict:
        """Identify common failure patterns."""
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        query = self.db.collection("audit_events") \
            .where("timestamp", ">=", cutoff_date) \
            .where("error_message", "!=", "")
        
        events = await query.stream()
        events_list = [doc.to_dict() async for doc in events]
        
        patterns = {}
        for event in events_list:
            error = event["error_message"]
            tool = event["merve_tool_call"]["tool"]
            key = f"{tool}:{error}"
            patterns[key] = patterns.get(key, 0) + 1
        
        return sorted(patterns.items(), key=lambda x: x[1], reverse=True)
    
    async def get_hallucination_attempts(self) -> list:
        """Find instances where Merve tried to use invalid tools."""
        
        query = self.db.collection("audit_events") \
            .where("validation_reason", "==", "Tool not in allowed set")
        
        events = await query.stream()
        return [doc.to_dict() async for doc in events]
```

### 5.4 Audit for Compliance

**Use audit trail for regulatory compliance and dispute resolution.**

```python
class ComplianceAuditor:
    def __init__(self, firestore_client):
        self.db = firestore_client
    
    async def verify_payment_chain(self, booking_id: str) -> dict:
        """Verify payment transaction is legitimate and complete."""
        
        # Get all events for this booking
        query = self.db.collection("audit_events") \
            .where("metadata.booking_id", "==", booking_id)
        
        events = await query.stream()
        events_list = sorted(
            [doc.to_dict() async for doc in events],
            key=lambda x: x["timestamp"]
        )
        
        chain = {
            "booking_id": booking_id,
            "search_events": [],
            "booking_events": [],
            "payment_events": [],
            "confirmation_events": [],
            "is_legitimate": False,
            "issues": []
        }
        
        for event in events_list:
            action_type = event["action_type"]
            
            if action_type == "search":
                chain["search_events"].append(event)
            elif action_type == "booking":
                chain["booking_events"].append(event)
            elif action_type == "payment":
                chain["payment_events"].append(event)
            elif action_type == "confirmation":
                chain["confirmation_events"].append(event)
        
        # Validation rules
        if not chain["booking_events"]:
            chain["issues"].append("No booking event found")
        
        if not chain["payment_events"]:
            chain["issues"].append("No payment event found")
        
        # Payment must occur AFTER booking
        if chain["booking_events"] and chain["payment_events"]:
            booking_time = chain["booking_events"][0]["timestamp"]
            payment_time = chain["payment_events"][0]["timestamp"]
            if payment_time < booking_time:
                chain["issues"].append("Payment occurred before booking")
        
        # Payment must have succeeded
        if chain["payment_events"]:
            last_payment = chain["payment_events"][-1]
            if last_payment["final_status"] != "succeeded":
                chain["issues"].append("Payment did not succeed")
        
        chain["is_legitimate"] = len(chain["issues"]) == 0
        return chain
    
    async def dispute_resolution(self, booking_id: str, tourist_claim: str) -> dict:
        """Investigate dispute using audit trail."""
        
        chain = await self.verify_payment_chain(booking_id)
        
        resolution = {
            "booking_id": booking_id,
            "tourist_claim": tourist_claim,
            "investigation_findings": {},
            "recommended_action": ""
        }
        
        # Claim: "I never made this booking"
        if "never made" in tourist_claim.lower():
            # Check if user confirmed the booking
            booking_events = [e for e in chain["booking_events"] if e["action_type"] == "booking"]
            if booking_events:
                booking_event = booking_events[0]
                if booking_event["escalated_to_human"] and booking_event["human_decision"] == "confirmed":
                    resolution["investigation_findings"]["user_confirmed"] = True
                    resolution["recommended_action"] = "Deny refund; user confirmed booking"
                else:
                    resolution["investigation_findings"]["no_confirmation"] = True
                    resolution["recommended_action"] = "Issue full refund; no user confirmation"
        
        # Claim: "I was charged twice"
        elif "charged twice" in tourist_claim.lower():
            payment_events = [e for e in chain["payment_events"] if e["final_status"] == "succeeded"]
            if len(payment_events) > 1:
                resolution["investigation_findings"]["multiple_payments"] = len(payment_events)
                resolution["recommended_action"] = f"Issue refund for extra {len(payment_events) - 1} payment(s)"
            else:
                resolution["investigation_findings"]["single_payment"] = True
                resolution["recommended_action"] = "Deny claim; only one successful payment found"
        
        return resolution
```

---

## PART 6: PUTTING IT ALL TOGETHER

### 6.1 Complete Agent Flow

```python
class MerveAgent:
    def __init__(self, gemini_client, firestore_db, stripe_client, twilio_client):
        self.gemini = gemini_client
        self.db = firestore_db
        self.stripe = stripe_client
        self.twilio = twilio_client
        
        self.validator = ToolValidator()
        self.result_validator = ResultValidator()
        self.confirmation_layer = ConfirmationLayer()
        self.circuit_breaker = CircuitBreaker()
        self.audit_logger = AuditLogger(firestore_db)
    
    async def process_user_request(self, tourist_id: str, message: str) -> str:
        """Main entry point: user message → response."""
        
        # Step 1: Get Merve's tool call
        print(f"[1] Processing user request: {message}")
        response = self.gemini.generate_content(
            message,
            tools=[self.get_gemini_tools()]
        )
        
        tool_calls = [part.function_call for part in response.content.parts if part.function_call]
        
        if not tool_calls:
            # Gemini tried to respond in free text (bad!)
            await self.audit_logger.log_event(create_audit_event(
                tourist_id=tourist_id,
                merve_intent=message,
                tool_call={"tool": "no_tool_called"},
                validation_result={"action": "escalate", "reason": "No tool call in response"},
                error="Merve attempted free-text response"
            ))
            return "I need to escalate this to a human agent. One moment..."
        
        # Step 2: Validate tool call
        print(f"[2] Validating tool call")
        tool_call = tool_calls[0]
        validation_result = self.validator.validate_tool_call(
            tool_call.name,
            dict(tool_call.args)
        )
        
        if not validation_result["approved"]:
            if validation_result.get("action") == "escalate":
                # Escalate to human
                print(f"[2.5] Escalating to human: {validation_result['reason']}")
                await self.audit_logger.log_event(create_audit_event(
                    tourist_id=tourist_id,
                    merve_intent=message,
                    tool_call={"tool": tool_call.name, "args": dict(tool_call.args)},
                    validation_result=validation_result
                ))
                return await self.escalate_to_human(message, validation_result["reason"])
            else:
                # Reject and explain
                print(f"[2.5] Rejecting tool call: {validation_result['reason']}")
                await self.audit_logger.log_event(create_audit_event(
                    tourist_id=tourist_id,
                    merve_intent=message,
                    tool_call={"tool": tool_call.name, "args": dict(tool_call.args)},
                    validation_result=validation_result,
                    error=validation_result["reason"]
                ))
                return f"I can't help with that. {validation_result['reason']}"
        
        # Step 3: Check if confirmation needed
        print(f"[3] Checking if confirmation needed")
        if tool_call.name in ["process_payment", "create_booking", "cancel_booking"]:
            confirmed = await self.confirmation_layer.require_confirmation(
                action=tool_call.name,
                details=dict(tool_call.args),
                tourist_id=tourist_id
            )
            if not confirmed:
                await self.audit_logger.log_event(create_audit_event(
                    tourist_id=tourist_id,
                    merve_intent=message,
                    tool_call={"tool": tool_call.name, "args": dict(tool_call.args)},
                    validation_result={"action": "user_cancelled"},
                    error="User did not confirm action"
                ))
                return "Booking cancelled."
        
        # Step 4: Execute with circuit breaker
        print(f"[4] Executing tool call")
        try:
            tool_result = await self.circuit_breaker.execute_with_safety({
                "tool": tool_call.name,
                "args": dict(tool_call.args)
            })
        except Exception as e:
            await self.audit_logger.log_event(create_audit_event(
                tourist_id=tourist_id,
                merve_intent=message,
                tool_call={"tool": tool_call.name, "args": dict(tool_call.args)},
                validation_result=validation_result,
                error=str(e)
            ))
            return f"Error processing request: {e}"
        
        # Step 5: Validate result
        print(f"[5] Validating result")
        result_validation = self.result_validator.validate_result(
            tool_call.name,
            dict(tool_call.args),
            tool_result
        )
        
        if not result_validation["valid"]:
            await self.audit_logger.log_event(create_audit_event(
                tourist_id=tourist_id,
                merve_intent=message,
                tool_call={"tool": tool_call.name, "args": dict(tool_call.args)},
                validation_result=validation_result,
                tool_result=tool_result,
                result_validation=result_validation,
                error=result_validation["reason"]
            ))
            return f"Error: {result_validation['reason']}"
        
        # Step 6: Log success
        print(f"[6] Logging success")
        await self.audit_logger.log_event(create_audit_event(
            tourist_id=tourist_id,
            merve_intent=message,
            tool_call={"tool": tool_call.name, "args": dict(tool_call.args)},
            validation_result=validation_result,
            tool_result=tool_result,
            result_validation=result_validation
        ))
        
        # Step 7: Generate response
        print(f"[7] Generating response")
        return self.generate_response(tool_call.name, tool_result)
    
    def generate_response(self, tool_name: str, tool_result: dict) -> str:
        """Generate user-friendly response."""
        
        if tool_name == "create_reservation":
            return f"""
✅ Reservation Confirmed!
Confirmation #: {tool_result['reservation_id']}
Restaurant: {tool_result['restaurant_name']}
Time: {tool_result['time']}
Party Size: {tool_result['party_size']}

You'll receive a confirmation via WhatsApp.
            """
        elif tool_name == "process_payment":
            return f"""
✅ Payment Successful!
Transaction ID: {tool_result['transaction_id']}
Amount: €{tool_result['amount']}

Your booking is confirmed.
            """
        return "Action completed successfully."
    
    async def escalate_to_human(self, message: str, reason: str) -> str:
        """Create support ticket and notify human agent."""
        
        ticket_id = str(uuid.uuid4())[:8]
        
        # Create ticket
        await self.db.collection("support_tickets").document(ticket_id).set({
            "message": message,
            "reason": reason,
            "created_at": datetime.utcnow(),
            "status": "pending",
            "assigned_to": None
        })
        
        # Notify agent via Slack
        # (implementation depends on Slack integration)
        
        return f"""
I'm escalating this to a human agent.
Support Ticket: {ticket_id}
They'll reach out to you via WhatsApp shortly.
            """
```

### 6.2 Example Flow (Restaurant Booking)

```
User: "I want to book a table at Tony's for 2 people at 8pm tonight"

[1] Merve generates tool call:
    tool: search_restaurants
    args: {name: "Tony's", party_size: 2, time: "20:00"}

[2] Validator checks:
    ✓ Tool exists in allowed set
    ✓ Arguments match schema
    ✓ Logic validation passes
    → Approved

[3] Confirmation needed? No (search is read-only)

[4] Execute search_restaurants
    Result: [{id: "rest_123", name: "Tony's Italian", availability: ✓}]

[5] Result validation passes
    → Result makes sense

[6] Audit logged
    event_id: abc123
    status: succeeded

[7] Response to user:
    "Found Tony's Italian Restaurant with availability at 8pm!"
    "Ready to book? Please confirm via WhatsApp."

[User confirms via WhatsApp: ✅]

[Now process booking...]

[1] Merve generates:
    tool: create_reservation
    args: {restaurant_id: "rest_123", party_size: 2, time: "20:00"}

[2] Validator checks:
    ✓ Valid
    ✓ High-value operation detected

[3] Confirmation layer:
    Message to user: "Confirm reservation at Tony's for 2 at 8pm? ✅/❌"
    User responds: ✅

[4] Execute create_reservation
    Result: {reservation_id: "RES456", confirmation: "sent"}

[5] Result validation:
    ✓ Reservation created
    ✓ Time matches
    ✓ All checks pass

[6] Audit logged
    event_id: def456
    status: succeeded
    chain: [abc123, def456]

[7] Response:
    "✅ Reservation Confirmed!
     Reference: RES456
     Time: 8pm at Tony's Italian
     Party: 2 people"
```

---

## PART 7: IMPLEMENTATION CHECKLIST

### Phase 1: Foundation (Week 1–2)
- [ ] Define complete fixed tool set (see table in 2.1)
- [ ] Implement ToolValidator class
- [ ] Update Gemini system prompt with tool enforcement rules
- [ ] Test Gemini tool calling with structured output

### Phase 2: Safety Layers (Week 3)
- [ ] Implement CircuitBreaker class
- [ ] Implement ResultValidator class
- [ ] Implement ConfirmationLayer class
- [ ] Test all three with various scenarios

### Phase 3: Audit System (Week 4)
- [ ] Design AuditEvent data structure
- [ ] Implement AuditLogger with Firestore storage
- [ ] Implement AuditDashboard query functions
- [ ] Implement ComplianceAuditor for dispute resolution

### Phase 4: Integration (Week 5)
- [ ] Integrate MerveAgent with all layers
- [ ] Test end-to-end flow with restaurant booking
- [ ] Test error handling and escalations
- [ ] Set up monitoring and alerting

### Phase 5: Monitoring (Ongoing)
- [ ] Set up audit dashboard in web admin panel
- [ ] Create alerts for high escalation rates
- [ ] Create alerts for repeated failures
- [ ] Weekly review of hallucination attempts

---

## SUMMARY: ARCHITECTURE PRINCIPLES

| Principle | Implementation |
|-----------|-----------------|
| **No Freestyle** | Closed tool set; no free text from Merve |
| **Strict Validation** | Every tool call validated before execution |
| **Fail-Safe Defaults** | Errors escalate to humans, never silently fail |
| **User Confirmation** | High-risk actions require explicit user approval |
| **Complete Audit Trail** | Every action logged immutably |
| **Result Verification** | Validate outcomes match intent |
| **Compliance-Ready** | Dispute resolution via audit chain |

**This architecture makes hallucinations expensive (escalation) and correct behavior cheap (execution).**

