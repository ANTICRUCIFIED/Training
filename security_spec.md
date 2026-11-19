# Security Specification (Phase 0)

## 1. Data Invariants
1. **Identity & Verification**: Every read/write on user-scoped or admin-scoped collections requires `request.auth != null` and `request.auth.token.email_verified == true`.
2. **No Self-Assigned Roles**: Non-admin users cannot create or modify documents in `admins/` or `teamAccess/`, and `users/{userId}` carries zero RBAC/role fields.
3. **PII Isolation**: `teamAccess/{emailId}` and `users/{userId}` contain email PII. A regular user can only `get` their own `teamAccess/{myEmail}` and `users/{myUid}` documents; `list` on `teamAccess` and `users` (other than own UID) is strictly restricted to Admins.
4. **Segment Access Enforcement**: A learner can only read `videos/{videoId}` if they are an Admin OR their `teamAccess/{email}` grants access to `sales`, `operations`, or `both`.
5. **Relational Integrity on Progress & Telemetry**: `progress/{progressId}` and `engagementEvents/{eventId}` require `incoming().uid == request.auth.uid`, `incoming().userEmail == request.auth.token.email.lower()`, and `exists(/databases/$(database)/documents/videos/$(incoming().videoId))`.
6. **Temporal Integrity**: All `createdAt` and `updatedAt` fields must equal `request.time`; `createdAt` and `uid`/`createdBy` fields are immutable on update.
7. **Strict Key & Size Bounds**: Every collection enforces `keys().hasAll(...) && keys().hasOnly(...)` on create, `affectedKeys().hasOnly(...)` on update, and explicit `.size()` bounds on every string and array.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unverified Email Spoof**: User with `email_verified: false` and `email: "sankhyayan@gmail.com"` attempts to write to `videos/vid1`. -> **Expected: PERMISSION_DENIED**.
2. **Self-Promotion to Admin**: Non-admin user attempts `setDoc(doc(db, 'admins', 'attacker@evil.com'), { email: 'attacker@evil.com', ... })`. -> **Expected: PERMISSION_DENIED**.
3. **Self-Grant Team Access**: Non-admin user attempts `setDoc(doc(db, 'teamAccess', 'attacker@evil.com'), { salesAccess: true, operationsAccess: true, ... })`. -> **Expected: PERMISSION_DENIED**.
4. **PII Directory Scraping**: Sales user runs `getDocs(collection(db, 'teamAccess'))` to enumerate all team member emails. -> **Expected: PERMISSION_DENIED**.
5. **Cross-Segment Video Leak**: Operations-only user attempts `getDoc(doc(db, 'videos', 'sales_only_video'))`. -> **Expected: PERMISSION_DENIED**.
6. **Shadow Field Injection on Profile**: User updates `users/{uid}` adding `{ isAdmin: true }` alongside `displayName`. -> **Expected: PERMISSION_DENIED**.
7. **Progress Impersonation**: User A attempts to write `progress/{userB_vid1}` with `uid: userB`. -> **Expected: PERMISSION_DENIED**.
8. **Orphaned Progress Write**: User attempts to write `progress/{uid}_nonexistent` referencing a `videoId` that does not exist in `videos/`. -> **Expected: PERMISSION_DENIED**.
9. **Immutable Timestamp Forgery**: User submits `createdAt: new Date(0)` instead of `serverTimestamp()` on `progress`. -> **Expected: PERMISSION_DENIED**.
10. **Regressive Pass Lockout Tampering**: Learner tries to modify `uid` or `videoId` or `createdAt` on an existing `progress` doc during update. -> **Expected: PERMISSION_DENIED**.
11. **1MB String Resource Poisoning**: Admin or user submits a `title` or `description` exceeding the `maxLength` bound (e.g., 50,000 characters). -> **Expected: PERMISSION_DENIED**.
12. **Telemetry Mutation**: Learner attempts to `updateDoc` or `deleteDoc` an existing record in `engagementEvents/`. -> **Expected: PERMISSION_DENIED**.
