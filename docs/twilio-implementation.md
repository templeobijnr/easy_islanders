Building a Comprehensive AI-Powered Messaging Agent
with TypeScript, Firebase & Twilio
Introduction
Modern customer engagement requires intelligent two-way communication over channels such
as SMS, WhatsApp or a web chat. By combining Firebase (serverless backend and realtime
database), TypeScript (type-safe Node.js runtime), Twilio (programmable messaging) and an AI
service (e.g., OpenAI), we can build an agent that:
• receives messages from users via Twilio webhooks
• stores the conversation history in Firestore
• generates contextual responses using an AI model
• sends replies back via Twilio and pushes them to the web or mobile chat interface
• notifies administrators or agents when a user responds
• monitors message delivery status and raises alerts if messages are undelivered.
This report describes a full implementation using TypeScript, Twilio’s Node SDK and Firebase
Cloud Functions. It includes data modelling, webhook handlers, asynchronous AI invocation,
delivery-status callbacks, push notifications and monitoring strategies.
1 Project Setup
1. Create a Firebase project and enable Cloud Functions/Firestore. Use the Firebase
CLI (firebase login, firebase projects:create, firebase init functions) and
select TypeScript support. Ensure the project is on the Blaze plan because outbound
HTTP calls (to Twilio or OpenAI) are not available on the free tier.
2. 3. 4. Install dependencies. In the functions directory install required packages:
npm install express twilio axios openai
npm install firebase-admin firebase-functions
npm install @types/express @types/node --save-dev
Configure environment variables. Use a .env file or Firebase Secrets Manager to store
sensitive keys:
◦ TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN – Twilio credentials.
◦ TWILIO_PHONE_NUMBER – the Twilio phone number you purchase for
sending/receiving messages.
◦ OPENAI_API_KEY – API key for the AI model.
◦ Optional: Slack webhook URL or other internal notification endpoints.
Purchase a Twilio number and configure messaging webhook. In the Twilio console,
buy a phone number that supports SMS. Under the phone number’s Messaging
configuration, set the A message comes in handler to your Cloud Function URL (for
local testing use ngrok). When you configure your webhook, Twilio asks for an HTTP
1
method—choose POST because Twilio sends callback requests as HTTP POST with
application/x-www-form-urlencoded【709966746761635†L315-L335】.
5. Initialize Firestore. Data will be stored in collections such as conversations, messages
and fcmTokens. The [Firestore data model guide] suggests using subcollections for
messages so each conversation document can grow indefinitely without hitting size limits
【311826164881025†L1985-L2004】.
2 Designing the Data Model
2.1 Conversations and Messages
Create a top-level conversations collection. Each conversation document contains metadata
(participants, lastUpdated) and has a subcollection messages to hold message documents. A
message document includes:
Field Type Description
sender string Phone number or user ID who
sent the message
text string Message content (plain text)
role string user for incoming messages,
agent for AI replies
channel string sms or app to differentiate
Twilio vs. in-app chat
timestamp timestamp serverTimestamp() when the
message was created
status string queued, sent, delivered,
undelivered, failed
errorCode number/null Error code returned by Twilio
when applicable
messageSid string/null Twilio SID for outbound
messages, used to track status
Using a subcollection avoids storing arrays of messages inside a single document (which would
have size limits)【311826164881025†L1985-L2004】. You can index messages.timestamp for
efficient querying.
2.2 Device Tokens for Push Notifications
To send push notifications when messages are updated, store each user’s FCM device token in a
fcmTokens collection keyed by the token. When the app loads, it registers the FCM token and
writes it to Firestore. The Cloud Function will later read these tokens to send notifications.
2
3 Handling Incoming Messages (Twilio Webhook)
When a user sends an SMS or WhatsApp message to your Twilio number, Twilio issues an HTTP
POST request to the configured webhook. The payload is form-encoded (application/x-www-
form-urlencoded)【709966746761635†L315-L335 】 and includes fields such as Body
(message text) and From (sender’s phone). Twilio may add new fields without advance notice, so
your handler should be resilient to extra parameters【709966746761635†L323-L337】. To
protect against spoofed requests, validate the Twilio signature using the SDK.
3.1 Express Setup
Create a TypeScript Express app with express.urlencoded({ extended: false }) to parse
Twilio’s form payload. Wrap the Express app in a Cloud Function:
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express, { Request, Response } from 'express';
import { twiml, validateRequest } from 'twilio';
import axios from 'axios';
admin.initializeApp();
const app = express();
app.use(express.urlencoded({ extended: false }));
// Middleware to validate Twilio signature
app.use((req, res, next) => {
const twilioSignature = req.headers['x-twilio-signature'] as string;
const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
const isValid = validateRequest(process.env.TWILIO_AUTH_TOKEN!,
twilioSignature, url, req.body);
if (!isValid) {
return res.status(403).send('Invalid signature');
}
});
next();
app.post('/', async (req: Request, res: Response) => {
const from = req.body.From as string;
const body = req.body.Body as string;
// Persist the incoming message to Firestore
const convoRef = admin.firestore().collection('conversations').doc(from);
await convoRef.set({ participants:
admin.firestore.FieldValue.arrayUnion(from), lastUpdated:
admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
const messageDoc = await convoRef.collection('messages').add({
sender: from,
text: body,
role: 'user',
channel: 'sms',
3
timestamp: admin.firestore.FieldValue.serverTimestamp(),
status: 'received'
});
// Optionally publish to Pub/Sub or another Firestore collection for async
processing
// ...
// Invoke the AI model to generate a reply
const aiReply = await callOpenAI(body);
// Save AI reply to Firestore
const replyDoc = await convoRef.collection('messages').add({
sender: 'agent',
text: aiReply,
role: 'agent',
channel: 'sms',
timestamp: admin.firestore.FieldValue.serverTimestamp(),
status: 'queued'
});
// Send the AI reply via Twilio (with StatusCallback URL)
await sendViaTwilio(from, aiReply, replyDoc.id);
// Respond to Twilio immediately with a simple acknowledgement
const twimlResponse = new twiml.MessagingResponse();
twimlResponse.message('Thank you, we will respond shortly.');
res.type('text/xml').send(twimlResponse.toString());
});
export const incomingSms = functions.https.onRequest(app);
// Helper to call OpenAI API
async function callOpenAI(userMessage: string): Promise<string> {
const apiKey = process.env.OPENAI_API_KEY!;
const payload = {
model: 'gpt-3.5-turbo',
messages: [ { role: 'user', content: userMessage } ],
max_tokens: 150,
temperature: 0.5
};
const res = await axios.post('https://api.openai.com/v1/chat/completions',
payload, {
headers: {
'Content-Type': 'application/json',
Authorization: `Bearer ${apiKey}`
}
});
return res.data.choices[0].message.content.trim();
}
// Helper to send SMS via Twilio with status callback
import twilio from 'twilio';
const client = twilio(process.env.TWILIO_ACCOUNT_SID,
4
process.env.TWILIO_AUTH_TOKEN);
async function sendViaTwilio(to: string, body: string, messageId: string) {
const callbackUrl =
`https://<region>-<project-id>.cloudfunctions.net/statusCallback`;
const msg = await client.messages.create({
from: process.env.TWILIO_PHONE_NUMBER!,
to: to,
body: body,
statusCallback: `${callbackUrl}?firebaseId=${messageId}`
});
// Update the Firestore message with the Twilio SID
await
admin.firestore().collection('conversations').doc(to).collection('messages').
doc(messageId).update({
messageSid: msg.sid,
status: msg.status
});
}
Explanation:
• The middleware validates the X-Twilio-Signature. Twilio recommends using signature
validation provided in their SDK because the set of parameters may evolve over time
【709966746761635†L323-L337】.
• When a user sends a message, we create or update the conversation document keyed by
the phone number and store the incoming message. A Firestore timestamp is added.
• We synchronously generate an AI reply and save it to Firestore. We then call Twilio’s
REST API using client.messages.create() with statusCallback. The Twilio guide
states that to track status you must provide the StatusCallback URL in each message
【709966746761635†L620-L699】.
• The callback URL includes a query parameter firebaseId which tells our status handler
which Firestore document to update. This avoids storing a separate lookup table.
• We respond to Twilio with a simple TwiML message acknowledging receipt so the user
doesn’t wait for the AI. You could also return an empty <Response/> and rely solely on
the follow-up message.
4 Delivery Status Callback and Message Monitoring
Twilio offers Status Callback webhooks so you can track the lifecycle of outbound messages.
When you supply the statusCallback parameter in client.messages.create, Twilio sends
POST requests to that URL whenever the message status changes (e.g., queued, sent,
delivered, undelivered, failed). Twilio’s documentation notes:
• Status callbacks are sent as HTTP POST requests with Content-Type: application/x-
www-form-urlencoded【709966746761635†L315-L335】.
• The payload includes MessageStatus and an optional ErrorCode for failures
【709966746761635†L335-L343】.
• Twilio may add new fields; implement signature validation and be tolerant of extra
5
parameters【709966746761635†L323-L337】.
4.1 Status Callback Handler
Implement another HTTP function statusCallback to process these events:
// functions/src/statusCallback.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import { validateRequest } from 'twilio';
const app = express();
app.use(express.urlencoded({ extended: false }));
// validate signature
app.use((req, res, next) => {
const signature = req.headers['x-twilio-signature'] as string;
const url = `${req.protocol}://${req.get('host')}$
{req.originalUrl.split('?')[0]}`;
if (!validateRequest(process.env.TWILIO_AUTH_TOKEN!, signature, url,
req.body)) {
return res.status(403).send('Forbidden');
}
});
next();
app.post('/', async (req, res) => {
const messageSid = req.body.MessageSid;
const messageStatus = req.body.MessageStatus;
const errorCode = req.body.ErrorCode ? Number(req.body.ErrorCode) : null;
const firebaseId = req.query.firebaseId as string;
const to = req.body.To as string; // phone number
// Update Firestore with the new status
const msgRef =
admin.firestore().collection('conversations').doc(to).collection('messages').
doc(firebaseId);
await msgRef.update({
status: messageStatus,
errorCode: errorCode,
updatedAt: admin.firestore.FieldValue.serverTimestamp()
});
// Optionally trigger notifications for failed or delivered messages
if (messageStatus === 'delivered') {
// Notify internal team or mark conversation as delivered
} else if (messageStatus === 'undelivered' || messageStatus === 'failed') {
// Send alert to Slack or email
}
res.status(200).send('OK');
});
6
export const statusCallback = functions.https.onRequest(app);
This handler:
• Parses MessageSid, MessageStatus and ErrorCode from Twilio’s POST data. Twilio’s
guide notes these properties are included in status callback requests
【709966746761635†L335-L343】. If using WhatsApp or RCS, additional properties
like RawDlrDoneDate may appear, but our code will simply ignore unknown fields.
• Uses the firebaseId query parameter to locate the Firestore document and updates its
status and errorCode fields.
• Optionally sends alerts to internal channels if a message fails.
4.2 Monitoring Delivery Status
Persisting every status event enables dashboards and reconciliation. Twilio’s best practices
recommend maintaining a persistent data store with all message SIDs and their statuses. If a
message hasn’t been updated to delivered or undelivered within 12 hours, Twilio suggests
polling the Programmable Messaging API to retrieve the status by SID
【414159488239028†L469-L481】. They also recommend reconciling message statuses at least
once per day to verify that no status events were missed【414159488239028†L480-L482】.
To automate reconciliation:
1. Store message SIDs and statuses in Firestore. Our statusCallback handler already
updates each message with its current status.
2. Schedule a Cloud Function (using Google Cloud Scheduler or Firebase’s scheduled
functions) to run daily. The function queries for messages where status is still queued or
sent and uses Twilio’s REST API (client.messages(messageSid).fetch()) to
retrieve the current status. Update the Firestore document accordingly.
3. Alert on failures. If errorCode is present (indicating failed or undelivered), send a
notification to Slack, email or a Firestore alerts collection. Twilio also provides a
debugger webhook that can notify you of errors【414159488239028†L509-L512】; you
can integrate this into your monitoring system.
By following this approach you ensure accurate records of message delivery and can respond
quickly to issues such as carriers blocking messages.
5 Push Notifications when Users Reply
In addition to replying via SMS, many applications also provide a web or mobile chat interface.
When a user sends an SMS reply, the in-app chat should update and notify the other participant.
Firebase Cloud Messaging (FCM) enables push notifications across platforms. The Firebase
“Send notifications for a web app” codelab outlines how to use Cloud Functions to send FCM
notifications when a Firestore document is created【359418467914993†L903-L954】. We adapt
that pattern for our chat application.
7
5.1 Collect Device Tokens
When the app loads, use the client FCM SDK to request notification permission and obtain the
device token. Write this token to the fcmTokens collection keyed by the token itself. Each token
document can store the associated user ID or phone number for targeted notifications.
5.2 Trigger Notification on New Messages
Create a background Cloud Function that triggers when a new message document is created in
any conversation. The codelab uses
functions.firestore.document('messages/{messageId}').onCreate to send notifications
【359418467914993†L919-L954】. In our case, we listen to all
conversations/*/messages/* documents and filter by channel and role to avoid notifying
the sender about their own messages.
export const notifyOnMessage = functions.firestore
.document('conversations/{conversationId}/messages/{messageId}')
.onCreate(async (snapshot, context) => {
const data = snapshot.data();
const conversationId = context.params.conversationId;
// Only send notifications for user messages or agent replies to the
other channel
if (data.role !== 'user' && data.role !== 'agent') return;
// Build notification payload
const payload = {
notification: {
title: `New message from ${data.role === 'user' ? 'customer' :
'agent'}`,
body: data.text && data.text.length <= 100 ? data.text :
data.text.substring(0, 97) + '...',
click_action: `https://<app-domain>/chat/${conversationId}`
}
};
// Collect FCM tokens for participants except the sender
const tokensSnap = await admin.firestore().collection('fcmTokens').get();
const tokens: string[] = [];
tokensSnap.forEach(doc => {
const tokenOwner = doc.data().userId;
if (tokenOwner !== data.sender) tokens.push(doc.id);
});
if (tokens.length > 0) {
const response = await admin.messaging().sendToDevice(tokens, payload);
await cleanUpInvalidTokens(response, tokens);
}
});
// Helper to remove invalid tokens (adapted from codelab)
function cleanUpInvalidTokens(response: any, tokens: string[]) {
const tasks: Promise<any>[] = [];
8
response.results.forEach((result: any, index: number) => {
const error = result.error;
if (error) {
// Remove invalid registration tokens
if (error.code === 'messaging/invalid-registration-token' || error.code
=== 'messaging/registration-token-not-registered') {
const deleteTask =
admin.firestore().collection('fcmTokens').doc(tokens[index]).delete();
tasks.push(deleteTask);
}
}
});
return Promise.all(tasks);
}
The codelab notes that the function uses
functions.firestore.document('messages/{messageId}').onCreate to trigger on new
messages, reads all tokens from the fcmTokens collection, and uses
admin.messaging().sendToDevice() to send notifications【359418467914993†L919-
L954】. It also provides a helper function to clean up tokens that are no longer valid
【359418467914993†L965-L993】.
5.3 In-App UI
On the client side, subscribe to Firestore’s messages subcollection for the current conversation.
When a new message arrives (e.g., snapshot.docChanges()), update the chat UI. When a push
notification is received while the user is offline, use the FCM service worker to display the
notification; clicking the notification should open the chat screen.
6 Monitoring and Alerting
Besides status callbacks and push notifications, building a production-grade messaging agent
requires ongoing monitoring:
1. Message Status Dashboard. Use Firestore data to create dashboards (e.g., with Google
Data Studio or Looker) showing counts of sent, delivered and failed messages by day,
carrier, or campaign. Persist messageSid, status and errorCode to support analytics.
2. Alerting on Failures. In the statusCallback handler, send an internal notification if
MessageStatus equals undelivered or failed. You can post to Slack using an
incoming webhook or send an email via SendGrid. Twilio’s best practices warn that
status callback requests may arrive out of order and new fields may appear
【709966746761635†L323-L343】, so design your alerting logic accordingly.
3. Daily Reconciliation. As recommended by Twilio, schedule a daily job that polls
Twilio’s API for messages that never reached a terminal state and updates Firestore
【414159488239028†L469-L481】. This ensures your data remains accurate even if a
callback is lost.
4. Monitoring Cloud Functions. Use Firebase console and Cloud Logging to track errors,
9
latency and invocations. Set up Google Cloud Monitoring alerts for high error rates or
slow response times.
7 Security and Compliance
1. Webhook security. Always validate the X-Twilio-Signature header using the Twilio
SDK to ensure requests originate from Twilio【709966746761635†L323-L337】.
2. Protect secrets. Store Twilio and AI API keys in Firebase Secret Manager or
environment variables. Do not expose them in client-side code. The OpenAI proxy
function pattern prevents exposing your AI key【604796862374761†L158-L199】.
3. Data privacy. Comply with data-protection laws by redacting personal data where
required. Twilio’s best practices for messaging logs include recommendations for
redacting message content【414159488239028†L469-L491】.
4. Firestore security rules. Write granular rules allowing only authenticated users to
read/write their own conversations. Use custom claims to distinguish admin users who
can view all messages.
Conclusion
Building an AI-powered messaging agent involves orchestrating multiple services. Firebase
provides scalable serverless functions and realtime storage; Twilio delivers the messaging
infrastructure; and an AI model generates personalized responses. Key lessons include:
• Use Firestore subcollections to store chat messages efficiently
【311826164881025†L1985-L2004】.
• Implement a Twilio webhook using Express and validate requests. Parse the Body and
From fields to persist incoming messages and generate AI replies.
• When sending outbound messages with Twilio, include a statusCallback URL to
monitor message delivery. Twilio sends POST requests with MessageStatus and
ErrorCode fields【709966746761635†L335-L343】; use a dedicated Cloud Function to
handle these events and update Firestore.
• Leverage Firebase Cloud Messaging and Firestore triggers to push notifications to clients
when new messages arrive【359418467914993†L919-L954】.
• Follow Twilio’s recommendation to reconcile message statuses daily and maintain
persistent records of message SIDs and statuses【414159488239028†L469-L481】.
• Implement robust monitoring and alerting to detect delivery failures and performance
issues.
By following the detailed implementation plan above, you can deploy a production-ready AI
agent that communicates via SMS, responds intelligently, keeps users and administrators
informed and maintains reliable operational visibility.