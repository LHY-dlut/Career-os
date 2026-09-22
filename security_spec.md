# Security Specification: AI Career OS

## 1. Data Invariants
1. All application records (knowledge articles, questions, review histories, coding attempts, applications, interviews, and mock sessions) belong strictly to the authenticated `userId`.
2. Anonymous writes or writes with mismatched `userId` are rejected.
3. System-seeded records (if `userId == 'system'`) are readable by authenticated users for initial study materials, but immutable.
4. Review logs and interview logs cannot be tampered with or deleted by cross-user requests.

## 2. Tested Vectors
1. Cross-user reading of job applications CRM or interview retrospectives (`PERMISSION_DENIED`).
2. Spoofing `userId` in `request.resource.data` during question or review creation (`PERMISSION_DENIED`).
3. Updating another user's knowledge article or interview rounds (`PERMISSION_DENIED`).
4. Writing to `/users/{otherUserId}` (`PERMISSION_DENIED`).
