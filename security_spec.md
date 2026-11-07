# Security Specification: KarRooz Zero-Trust Firestore Security

## Data Invariants
1. **Default-Deny Catch-All**: Any collection or path not explicitly granted is denied by default (`match /{document=**} { allow read, write: if false; }`).
2. **Strict User Scoping & Partitioning**: All application records (`projects`, `items`, `user profile`) reside strictly within the `/users/{userId}` path hierarchy.
3. **Strict Identity Binding**: A user with `request.auth.uid != userId` is mathematically prohibited from reading, listing, creating, modifying, or deleting any documents inside another user's path.
4. **Unauthenticated Denial**: Any request with `request.auth == null` is denied for all data operations.
5. **Path & Payload ID Integrity**: Document path variable `{userId}` must match `request.auth.uid`. Path variables `{projectId}` and `{itemId}` must pass strict ID validation regex `^[a-zA-Z0-9_\-]+$` and length constraints (<= 128 characters).
6. **Strict Field Validation & Anti-Update Gaps**:
   - For `create`: Required fields must be present and shadow/ghost fields are prohibited.
   - For `update`: Ownership and ID fields (`id`, `userId`, `createdAt`) are strictly immutable (`incoming().userId == existing().userId`, `incoming().id == existing().id`).
7. **Volume & Size Bounds**: All string fields and array sizes are capped to prevent Denial of Wallet attacks.

---

## The "Dirty Dozen" Malicious Payloads

1. **Payload 1: Cross-User Read/List Attack**
   - Attacker (`uid: user_bob`) attempts `get` or `list` on `/users/user_alice/items`.
   - Expected Result: `PERMISSION_DENIED` (auth.uid != path.userId).

2. **Payload 2: Cross-User Item Injection**
   - Attacker (`uid: user_bob`) attempts `set` or `create` on `/users/user_alice/items/malicious_item`.
   - Expected Result: `PERMISSION_DENIED` (auth.uid != path.userId).

3. **Payload 3: Unauthenticated Data Scraping**
   - Unauthenticated client (`request.auth: null`) attempts `get` on `/users/user_alice/projects/proj1`.
   - Expected Result: `PERMISSION_DENIED` (not signed in).

4. **Payload 4: Identity Spoofing in Document Body**
   - User `user_alice` creates item with body `{ userId: "user_bob", title: "Impersonation", ... }`.
   - Expected Result: `PERMISSION_DENIED` (payload userId must match request.auth.uid).

5. **Payload 5: Shadow/Ghost Field Injection (Privilege Escalation)**
   - User `user_alice` attempts to write an unexpected field `{ title: "Task", isAdmin: true, role: "admin", ... }`.
   - Expected Result: `PERMISSION_DENIED` (strict schema keys validation).

6. **Payload 6: Path Traversal / Poisoned ID Attack**
   - Attacker attempts to target document with ID containing `../` or a 10KB string `proj_AAAA...`.
   - Expected Result: `PERMISSION_DENIED` (regex guard and 128-char limit fail).

7. **Payload 7: Ownership Tampering on Update**
   - User `user_alice` attempts to update an existing item to change `userId` to `user_bob`.
   - Expected Result: `PERMISSION_DENIED` (userId is immutable).

8. **Payload 8: Creation Timestamp Manipulation**
   - User attempts to overwrite `createdAt` with a backdated or altered timestamp during update.
   - Expected Result: `PERMISSION_DENIED` (createdAt is immutable).

9. **Payload 9: Excessive Payload (Denial of Wallet Attack)**
   - Attacker sends an item with a 500,000-character description or 10,000 tags.
   - Expected Result: `PERMISSION_DENIED` (description size <= 2000, tags list size <= 50).

10. **Payload 10: Invalid Type Injection (Type Confusion)**
    - Attacker sends boolean `completed: "not_a_boolean"` or numeric title `{ title: 12345 }`.
    - Expected Result: `PERMISSION_DENIED` (type checks fail).

11. **Payload 11: Cross-User Project Mutation**
    - Attacker (`uid: user_bob`) attempts `delete` on `/users/user_alice/projects/proj_secret`.
    - Expected Result: `PERMISSION_DENIED` (request.auth.uid != userId).

12. **Payload 12: Root-Level Document Hijacking**
    - Attacker attempts to write directly to `/randomCollection/doc1` or `/items/item1`.
    - Expected Result: `PERMISSION_DENIED` (global catch-all default deny).
