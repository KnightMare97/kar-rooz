/**
 * KarRooz Telegram Worker - Pairing & Identity Resolution
 *
 * Implements real, server-validated, expiring, single-use pairing codes
 * and maps Telegram Chat IDs to authenticated web app user IDs (UIDs).
 */

import { FirestoreRestClient } from './firestore';

export interface TelegramPairingRecord {
  code: string;
  userId: string;
  userEmail?: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
  usedAt?: string;
  linkedChatId?: number;
}

export interface TelegramUserMapping {
  chatId: number;
  userId: string;
  telegramUserId: number;
  telegramUsername?: string | null;
  telegramFirstName?: string | null;
  linkedAt: string;
}

/**
 * Generates an 8-character cryptographically random pairing code
 * Format: KR-XXXX-XXXX (e.g. KR-8F2A-4D9C)
 */
export function generatePairingCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex1 = bytes[0].toString(16).padStart(2, '0') + bytes[1].toString(16).padStart(2, '0');
  const hex2 = bytes[2].toString(16).padStart(2, '0') + bytes[3].toString(16).padStart(2, '0');
  return `KR-${hex1.toUpperCase()}-${hex2.toUpperCase()}`;
}

/**
 * Creates an expiring, single-use pairing code document in Firestore for an authenticated user
 */
export async function createPairingRecord(
  db: FirestoreRestClient,
  userId: string,
  userEmail?: string
): Promise<{ code: string; expiresAt: string }> {
  const code = generatePairingCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry

  const record: TelegramPairingRecord = {
    code,
    userId,
    userEmail: userEmail || undefined,
    createdAt: now.toISOString(),
    expiresAt,
    used: false,
  };

  await db.setDocument(`telegram_pairings/${code}`, record, false);
  return { code, expiresAt };
}

export type PairingResult =
  | { success: true; userId: string }
  | {
      success: false;
      reason:
        | 'not_found'
        | 'expired'
        | 'already_used'
        | 'rate_limited'
        | 'already_linked_conflict';
    };

/**
 * Checks and increments rate-limiting attempts for a chatId to prevent brute-force guessing
 * Max 5 failed attempts within a 15-minute rolling window
 */
export async function checkRateLimit(
  db: FirestoreRestClient,
  chatId: number
): Promise<{ allowed: boolean; remainingAttempts?: number }> {
  const attemptPath = `telegram_attempts/${chatId}`;
  const record = await db.getDocument(attemptPath);
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes

  if (record) {
    const firstAttemptAt = new Date(record.firstAttemptAt || record.updatedAt || now).getTime();
    if (now - firstAttemptAt < windowMs) {
      if ((record.failedCount || 0) >= 5) {
        return { allowed: false, remainingAttempts: 0 };
      }
    } else {
      // Window expired, reset
      await db.setDocument(attemptPath, {
        failedCount: 0,
        firstAttemptAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
      }, true);
      return { allowed: true, remainingAttempts: 5 };
    }
  }

  return { allowed: true, remainingAttempts: Math.max(0, 5 - ((record?.failedCount || 0))) };
}

export async function recordFailedAttempt(
  db: FirestoreRestClient,
  chatId: number
): Promise<void> {
  const attemptPath = `telegram_attempts/${chatId}`;
  const record = await db.getDocument(attemptPath);
  const now = Date.now();
  const count = (record?.failedCount || 0) + 1;
  await db.setDocument(attemptPath, {
    failedCount: count,
    firstAttemptAt: record?.firstAttemptAt || new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  }, true);
}

export async function resetFailedAttempts(
  db: FirestoreRestClient,
  chatId: number
): Promise<void> {
  await db.deleteDocument(`telegram_attempts/${chatId}`);
}

/**
 * Atomically validates a pairing code, ensures it is single-use, unexpired,
 * free of conflicts, and records the bidirectional link in Firestore using atomic writes.
 */
export async function validateAndLinkPairing(
  db: FirestoreRestClient,
  pairingCode: string,
  chatId: number,
  telegramUser: { id: number; username?: string; first_name?: string }
): Promise<PairingResult> {
  // 1. Check rate limits against brute force
  const rateLimit = await checkRateLimit(db, chatId);
  if (!rateLimit.allowed) {
    return { success: false, reason: 'rate_limited' };
  }

  const cleanCode = pairingCode.trim().toUpperCase();
  const doc = await db.getDocument(`telegram_pairings/${cleanCode}`);

  if (!doc) {
    await recordFailedAttempt(db, chatId);
    return { success: false, reason: 'not_found' };
  }

  if (doc.used) {
    await recordFailedAttempt(db, chatId);
    return { success: false, reason: 'already_used' };
  }

  const expiresAtEpoch = new Date(doc.expiresAt).getTime();
  if (Date.now() > expiresAtEpoch) {
    await recordFailedAttempt(db, chatId);
    return { success: false, reason: 'expired' };
  }

  const targetUserId = String(doc.userId);

  // 2. Conflict prevention:
  // If this Telegram chatId is already linked to ANOTHER user, reject rather than silently overwriting.
  const existingMapping = await db.getDocument(`telegram_users/${chatId}`);
  if (existingMapping && existingMapping.userId && existingMapping.userId !== targetUserId) {
    return { success: false, reason: 'already_linked_conflict' };
  }

  const nowIso = new Date().toISOString();

  // 3. Atomically write all records:
  // - Mark pairing record used
  // - Write telegram_users/${chatId} mapping
  // - Write users/${targetUserId}/telegram/status
  const docPrefix = `projects/${db.projectId}/databases/${db.databaseId}/documents`;
  const writes = [
    {
      update: {
        name: `${docPrefix}/telegram_pairings/${cleanCode}`,
        fields: {
          code: { stringValue: cleanCode },
          userId: { stringValue: targetUserId },
          userEmail: doc.userEmail ? { stringValue: doc.userEmail } : undefined,
          createdAt: { stringValue: doc.createdAt },
          expiresAt: { stringValue: doc.expiresAt },
          used: { booleanValue: true },
          usedAt: { stringValue: nowIso },
          linkedChatId: { integerValue: String(chatId) },
          linkedTelegramUsername: telegramUser.username ? { stringValue: telegramUser.username } : undefined,
        },
      },
      updateMask: {
        fieldPaths: ['used', 'usedAt', 'linkedChatId', 'linkedTelegramUsername'],
      },
    },
    {
      update: {
        name: `${docPrefix}/telegram_users/${chatId}`,
        fields: {
          chatId: { integerValue: String(chatId) },
          userId: { stringValue: targetUserId },
          telegramUserId: { integerValue: String(telegramUser.id) },
          telegramUsername: telegramUser.username ? { stringValue: telegramUser.username } : undefined,
          telegramFirstName: telegramUser.first_name ? { stringValue: telegramUser.first_name } : undefined,
          linkedAt: { stringValue: nowIso },
        },
      },
    },
    {
      update: {
        name: `${docPrefix}/users/${targetUserId}/telegram/status`,
        fields: {
          linked: { booleanValue: true },
          telegramChatId: { integerValue: String(chatId) },
          telegramUserId: { integerValue: String(telegramUser.id) },
          telegramUsername: telegramUser.username ? { stringValue: telegramUser.username } : undefined,
          linkedAt: { stringValue: nowIso },
          verified: { booleanValue: true },
        },
      },
      updateMask: {
        fieldPaths: ['linked', 'telegramChatId', 'telegramUserId', 'telegramUsername', 'linkedAt', 'verified'],
      },
    },
  ];

  await db.commit(writes);
  await resetFailedAttempts(db, chatId);

  return { success: true, userId: targetUserId };
}

/**
 * Resolves a Telegram Chat ID to the authenticated app user's UID
 */
export async function getLinkedUserId(
  db: FirestoreRestClient,
  chatId: number
): Promise<string | null> {
  const doc = await db.getDocument(`telegram_users/${chatId}`);
  if (doc && doc.userId) {
    return String(doc.userId);
  }
  return null;
}
