Investigating Firestore permissions and
“Missing or insufficient permissions” errors
Why the FirebaseError: Missing or insufficient
permissions error occurs
Firebase’s Cloud Firestore protects data through security rules. When a client SDK (web, Flutter,
Android, etc.) sends a read or write request, Firestore evaluates the request against the rules file. If any
possible result of the request could be returned without satisfying a rule, Firestore rejects the entire
request. Common causes of the Missing or insufficient permissions error include:
• No authentication or incorrect user identity – Firestore security rules can require that
request.auth != null or that the user ID matches the document’s uid field. A read/write request
from an unauthenticated client will be rejected if the rules expect an authenticated user.
• Query does not match the rule’s constraints – Rules are not filters; they must exactly match the
query. For example, if the rule only allows reads of documents with visibility == 'public', a
broad collection('cities').get() query fails because Firestore cannot guarantee the result set
contains only public documents【38513905742967†L1651-L1694】. The query must include a
where clause that matches the rule.
• Rules do not permit access to the requested path – Each match block covers a specific
collection or document path. If your code tries to read or write to a collection that has no allow
rule, or the rule returns false, Firestore denies the request.
These principles are important when designing an admin panel; even an “admin” user in a client app
must satisfy the rules. The only way to bypass security rules is to use the Firebase Admin SDK or a
Google Cloud service account on a trusted server, as the Admin SDK is authenticated with a service
account and does not run client-side【945856330558859†L60-L79】.
Granting administrative privileges in Firestore
There are three common patterns for giving a user “admin” privileges:
1. Using custom claims (recommended)
• Set a custom claim (e.g., admin: true) on a user via the Admin SDK. Custom claims are stored
in the user’s ID token and cannot be modified from the client. For example, using Node.js on a
server:
import {getAuth} from 'firebase-admin/auth';
// Set admin privilege on user with specified UID
await getAuth().setCustomUserClaims(userId, { admin: true });
The new claim propagates to the user’s ID token the next time they sign in
【94200118548940†L1510-L1551】.
• Reference the claim in your Firestore rules. For example, to allow full read/write access for
admins while letting any authenticated user read:
service cloud.firestore {
match /databases/{database}/documents {
// Admins can read/write any document when `admin` claim is true
allow read, write: if request.auth.token.admin == true;
// Fallback: authenticated users can read
allow read: if request.auth != null;
}
}
The rules documentation shows how to check a custom claim using request.auth.token.admin
== true【290172365387766†L1580-L1591】.
• Use custom claims to implement role-based access. The Firebase blog demonstrates how to grant
roles (e.g., teacher or TA) and then write rules that only allow users with specific roles to write
while letting anyone read【945856330558859†L136-L180】.
Advantages: Custom claims are stored in the token and do not require extra Firestore reads, so rules
evaluation is fast and inexpensive. Only privileged servers can set claims【94200118548940†L1503-
L1559】, so clients cannot elevate their own privileges.
2. Checking an admin field in a user document
• Store an admin flag in each user’s document under a users collection. Then write rules that
grant writes if the flag is true:
service cloud.firestore {
match /databases/{database}/documents {
match /collection/{document} {
// Only allow writing if the user’s document has `admin == true`
allow write: if request.auth != null &&
get(/databases/$(database)/documents/users/$(request.auth.uid)).data.admin == true;
// Anyone can read
allow read: true;
}
}
}
The Firestore rules guide shows this attribute-based pattern: it calls get() on the user document
and checks that the admin field is true【506610824376992†L1614-L1621】. You can similarly
restrict deletes or other operations【38513905742967†L1564-L1569】.
• This pattern still requires that the requesting user be authenticated, because request.auth.uid is
used to look up the document. If the user isn’t signed in, the rule will deny access.
Caveats: Calling get() inside a rule counts as a Firestore read and is billed, even when the request is
rejected【38513905742967†L1599-L1603】. The rules engine can perform at most 10 document access
calls per single-document read/write【38513905742967†L1580-L1593】. For this reason, custom claims
are generally preferred for simple admin checks.
3. Keeping an admins collection
• Maintain a special collection (e.g., admins) with documents keyed by user ID. Each admin
document can include an admin: true flag or just exist as a placeholder.
• Write a reusable function in your rules to check membership:
service cloud.firestore {
match /databases/{database}/documents {
function isAdmin() {
return request.auth != null &&
exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}
}
match /{document=**} {
allow read, write: if isAdmin();
}
}
The pattern of checking a separate admins collection is recommended by Firestore experts as a
safe way to add or remove admins without redeploying rules【602761568888867†L1030-
L1043】.
• Because exists() also counts as a document access call, keep the admin list small and use custom
claims for large user bases.
When to use the Admin SDK instead of a client SDK
The Firebase Admin SDK uses a service account and therefore bypasses security rules entirely
【945856330558859†L60-L79】. If you are building an administrative tool (e.g., a booking processor
that runs on a server or in a Cloud Function) you should not grant client-side admin access. Instead:
1. 2. Deploy the admin tool in a trusted environment (e.g., Cloud Functions, your own server or CLI).
Initialize the Admin SDK with service-account credentials and perform Firestore operations there.
Because security rules are bypassed, you can keep your rules strict (deny all writes from clients) to
protect the data【945856330558859†L90-L112】.
For example, the blog shows how to keep a scores collection read-only in the rules and update it from a
backend using the Admin SDK【945856330558859†L93-L104】【945856330558859†L116-L130】.
Recommendations for fixing the error and implementing admin
access
1. 2. 3. Verify that users are authenticated. If your current rules require authentication
(request.auth != null), ensure the client is signed in before making any Firestore calls.
Anonymous users or unauthenticated sessions will always receive permission errors.
Simplify your rules during development, then tighten them. For quick prototyping you can
temporarily use allow read, write: if true; to verify that the rest of your code works
【506610824376992†L1503-L1513】. Never deploy this to production because it allows anyone
to read and write your database【506610824376992†L1504-L1514】.
Implement an admin role using custom claims:
• Use the Admin SDK to set admin: true on your admin users【94200118548940†L1506-
L1554】.
4. 5. 6. • Update your rules to allow reads and writes only when request.auth.token.admin ==
true【290172365387766†L1580-L1591】. Provide fallback rules (e.g., read-only) for
non-admin users.
• Have the users log out and log back in (or refresh their ID tokens) to receive the updated
claims【945856330558859†L184-L186】.
Alternatively, check the admin field in a user document or an admins collection. This can
be easier to manage but incurs extra reads【506610824376992†L1614-L1621】.
Ensure queries match the rule constraints. If your rules allow reads only on documents that
satisfy a condition (visibility == 'public', ownership checks, etc.), add corresponding where()
clauses to your queries so Firestore can prove compliance【38513905742967†L1651-L1694】.
Use the Firestore Rules playground** and emulator**. In the Firebase console, the Rules
playground lets you test specific read/write requests against your rules; the emulator allows local
testing. Use these tools to debug permission errors before deploying rules
【506610824376992†L1691-L1716】.
Summary
The Missing or insufficient permissions error usually indicates that a request violates your Firestore
security rules, that the user is unauthenticated, or that the query does not meet the rule’s constraints. To
build an admin panel that can read and write to all collections you should not relax your rules; instead
grant admin users special privileges:
• Use the Admin SDK on a trusted server to perform administrative operations. Requests from the
Admin SDK bypass security rules【945856330558859†L60-L79】.
• If admin access is needed in a client app, assign admins a custom claim via the Admin SDK and
check request.auth.token.admin in your rules【94200118548940†L1506-L1554】
【290172365387766†L1580-L1591】.
• Alternatively, store an admin flag in each user document or maintain an admins collection and
reference it in rules【506610824376992†L1614-L1621】.
By adopting these patterns and testing your security rules with the provided tools, you can resolve the
permission errors and ensure that only authorized administrators have write access to your Firestore
database.