/**
 * KarRooz (کار روز) - Telegram Integration Cloudflare Worker
 *
 * Serverless gateway bridging Telegram and KarRooz with:
 * - Shared Firestore persistence using exact app schema and named database
 * - Real server-validated, expiring, single-use pairing
 * - Server-side Telegram identity resolution to authenticated UID
 * - Persisted captures before reporting success
 * - Verified ownership on callbacks
 * - Live /today generation using Asia/Tehran date rules
 * - Fail-closed webhook security
 * - Durable atomic idempotency
 * - Private chat enforcement
 * - Safe HTML encoding
 */

import { FirestoreRestClient } from './firestore';
import {
  createPairingRecord,
  validateAndLinkPairing,
  getLinkedUserId,
} from './pairing';
import {
  escapeHtml,
  getTehranDateString,
  toPersianDigits,
  callTelegramApi,
  verifyFirebaseIdToken,
} from './utils';

export interface Env {
  ENVIRONMENT?: string;
  FIREBASE_PROJECT_ID?: string;
  FIRESTORE_DATABASE_ID?: string;
  APP_URL?: string;
  TIMEZONE?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  FIREBASE_SERVICE_ACCOUNT_JSON?: string;
}

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  first_name?: string;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

/**
 * Creates a Firestore client instance if service account credentials are provided
 */
function getFirestoreClient(env: Env): FirestoreRestClient | null {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return null;
  }
  const projectId = env.FIREBASE_PROJECT_ID || 'gen-lang-client-0985101866';
  const databaseId = env.FIRESTORE_DATABASE_ID || 'ai-studio-karrooz-88dd94b4-bce7-4ddc-8723-1bca334db048';
  try {
    return FirestoreRestClient.fromJson(projectId, databaseId, env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch (err) {
    console.error('Failed to initialize Firestore client:', err);
    return null;
  }
}

/**
 * Allowlist of valid frontend origins for KarRooz
 */
const ALLOWED_ORIGINS = [
  'https://ais-dev-lpx6szyiww3uh6hos3kj3p-307986322384.europe-west1.run.app',
  'https://ais-pre-lpx6szyiww3uh6hos3kj3p-307986322384.europe-west1.run.app',
  'http://localhost:3000',
  'http://localhost:5173',
];

/**
 * Derives CORS headers for requests from allowed origins
 */
function getCorsHeaders(request: Request, env?: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const appUrl = env?.APP_URL ? new URL(env.APP_URL).origin : null;

  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    (appUrl && origin === appUrl) ||
    (origin.endsWith('.run.app') && origin.includes('307986322384'));

  const allowOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request, env);

    // Handle OPTIONS Preflight for browser requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Helper to send json responses with CORS headers
    const jsonResponse = (data: any, status = 200) => {
      return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    };

    // 1. Health check and diagnostic endpoint
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      const isTelegramConfigured = Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_WEBHOOK_SECRET);
      const isFirebaseConfigured = Boolean(env.FIREBASE_SERVICE_ACCOUNT_JSON);
      const isAppUrlConfigured = Boolean(env.APP_URL);

      let authenticated = false;
      let databaseConnected = false;
      let firestoreError: string | undefined;

      const db = getFirestoreClient(env);
      if (db) {
        try {
          const test = await db.verifyConnection();
          databaseConnected = test.ok;
          authenticated = true;
          if (!test.ok) {
            firestoreError = test.error;
          }
        } catch (err: any) {
          authenticated = false;
          firestoreError = err.message || String(err);
        }
      }

      const allConfigured = isTelegramConfigured && isFirebaseConfigured && isAppUrlConfigured;

      return jsonResponse({
        service: 'karrooz-telegram-worker',
        status: allConfigured && databaseConnected ? 'healthy' : 'configuration_required',
        time: new Date().toISOString(),
        configured: {
          telegram: isTelegramConfigured,
          firestore: isFirebaseConfigured,
          appUrl: isAppUrlConfigured,
          projectId: env.FIREBASE_PROJECT_ID || 'gen-lang-client-0985101866',
          databaseId: env.FIRESTORE_DATABASE_ID || 'ai-studio-karrooz-88dd94b4-bce7-4ddc-8723-1bca334db048',
        },
        verified: {
          googleAuth: authenticated,
          firestoreDatabase: databaseConnected,
          error: firestoreError,
        },
        notes: 'Send POST requests to /webhook with X-Telegram-Bot-Api-Secret-Token header.',
      });
    }

    // 2. Authenticated Pairing Code Generation Endpoint (Called by Web App)
    if (request.method === 'POST' && url.pathname === '/api/pairing/generate') {
      const db = getFirestoreClient(env);
      if (!db) {
        return jsonResponse(
          {
            ok: false,
            code: 'FIREBASE_SERVICE_ACCOUNT_MISSING',
            error:
              'کلید سرویس فایربیس (FIREBASE_SERVICE_ACCOUNT_JSON) در تنظیمات Cloudflare Worker تنظیم نشده است. لطفاً متغیرهای محیطی ورکر را تکمیل فرمایید.',
          },
          503
        );
      }

      // Extract Firebase ID Token from Authorization header or body
      const authHeader = request.headers.get('Authorization') || '';
      let idToken = '';
      if (authHeader.startsWith('Bearer ')) {
        idToken = authHeader.substring(7).trim();
      }

      let payload: { idToken?: string; userEmail?: string } = {};
      try {
        payload = (await request.json()) as any;
        if (!idToken && payload.idToken) {
          idToken = payload.idToken;
        }
      } catch {
        // Body was either empty or invalid JSON; if no authHeader, fail
        if (!idToken) {
          return jsonResponse({ ok: false, error: 'Missing authentication credentials.' }, 401);
        }
      }

      if (!idToken) {
        return jsonResponse(
          {
            ok: false,
            error: 'Authentication required: Firebase ID Token must be provided in Authorization header or body.',
          },
          401
        );
      }

      const projectId = env.FIREBASE_PROJECT_ID || 'gen-lang-client-0985101866';
      const verifyResult = await verifyFirebaseIdToken(idToken, projectId);
      if (!verifyResult.valid) {
        return jsonResponse(
          {
            ok: false,
            error: `Identity verification failed: ${verifyResult.error}`,
          },
          401
        );
      }

      // Authenticated UID extracted securely from verified token claims - NEVER trust client-supplied UID
      const authenticatedUid = verifyResult.decoded.uid;
      const verifiedEmail = verifyResult.decoded.email || payload.userEmail;

      try {
        const pairing = await createPairingRecord(db, authenticatedUid, verifiedEmail);
        return jsonResponse(
          {
            ok: true,
            pairingCode: pairing.code,
            expiresAt: pairing.expiresAt,
            botUsername: 'KarRoozBot',
          },
          200
        );
      } catch (err: any) {
        console.error('Error generating pairing record:', err);
        return jsonResponse({ ok: false, error: err.message || 'Failed to create pairing.' }, 500);
      }
    }

    // 3. Telegram Webhook Endpoint
    if (request.method === 'POST' && url.pathname === '/webhook') {
      // REQUIRE webhook secret: fail-closed when configuration is missing
      if (!env.TELEGRAM_WEBHOOK_SECRET || !env.TELEGRAM_BOT_TOKEN) {
        return new Response(
          JSON.stringify({ error: 'Server configuration required: TELEGRAM_WEBHOOK_SECRET and TELEGRAM_BOT_TOKEN must be set.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Check header token match
      const receivedSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
      if (receivedSecret !== env.TELEGRAM_WEBHOOK_SECRET) {
        return new Response('Unauthorized secret token', { status: 401 });
      }

      const botToken = env.TELEGRAM_BOT_TOKEN;
      let update: TelegramUpdate;
      try {
        update = (await request.json()) as TelegramUpdate;
      } catch {
        return new Response('Invalid JSON payload', { status: 400 });
      }

      const db = getFirestoreClient(env);

      // Durable atomic idempotency check in Firestore
      if (db && update.update_id) {
        try {
          const updateRecord = await db.getDocument(`telegram_updates/${update.update_id}`);
          if (updateRecord && updateRecord.status === 'completed') {
            return new Response(JSON.stringify({ ok: true, deduplicated: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          // Mark as currently processing (preserving retry on hard failure)
          await db.setDocument(`telegram_updates/${update.update_id}`, {
            updateId: update.update_id,
            status: 'processing',
            receivedAt: new Date().toISOString(),
          }, true);
        } catch (idempErr) {
          console.warn('Idempotency check warning:', idempErr);
        }
      }

      try {
        // Handle Callback Queries (inline button clicks)
        if (update.callback_query) {
          await handleCallbackQuery(update.callback_query, botToken, env, db, update.update_id);
        } else if (update.message) {
          // Handle incoming messages with deterministic item creation keyed by message_id
          await handleMessage(update.message, botToken, env, db, update.update_id);
        }

        // Mark update as safely completed in durable store ONLY after success
        if (db && update.update_id) {
          await db.setDocument(`telegram_updates/${update.update_id}`, {
            status: 'completed',
            completedAt: new Date().toISOString(),
          }, true);
        }

        return new Response('OK', { status: 200 });
      } catch (procErr: any) {
        console.error('Error processing Telegram update:', procErr);
        // Do not mark completed so Telegram retries the update
        return new Response(JSON.stringify({ error: procErr.message || 'Processing failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders,
    });
  },
};

/**
 * Handle incoming user messages
 */
async function handleMessage(
  message: TelegramMessage,
  botToken: string,
  env: Env,
  db: FirestoreRestClient | null,
  updateId?: number
): Promise<void> {
  const chatId = message.chat.id;

  // 1. Enforce private-chat restrictions on messages
  if (message.chat.type !== 'private') {
    await callTelegramApi(botToken, 'sendMessage', {
      chat_id: chatId,
      text: '⚠️ ربات کار روز به دلیل حفظ محرمانگی وظایف، تنها در گفتگوهای خصوصی (Private Chat) قابل استفاده است.',
    });
    return;
  }

  const text = (message.text || '').trim();
  const appUrl = env.APP_URL;

  // 2. Command: /start [param]
  if (text.startsWith('/start')) {
    const parts = text.split(' ');
    const param = (parts[1] || '').trim();

    // Check for pairing code in /start parameter e.g. /start pair_KR-XXXX-XXXX or /start KR-XXXX-XXXX
    if (param) {
      const pairingCode = param.replace(/^pair_/, '').toUpperCase();

      if (!db) {
        await callTelegramApi(botToken, 'sendMessage', {
          chat_id: chatId,
          text:
            `⚠️ <b>پایگاه داده کار روز هنوز متصل نیست</b>\n\n` +
            `کلید سرویس فایربیس (FIREBASE_SERVICE_ACCOUNT_JSON) در تنظیمات ورکر ثبت نشده است.\n` +
            `لطفاً با مدیر سیستم تماس بگیرید.`,
          parse_mode: 'HTML',
        });
        return;
      }

      const result = await validateAndLinkPairing(
        db,
        pairingCode,
        chatId,
        message.from || { id: chatId, first_name: message.chat.first_name }
      );

      if (result.success) {
        await callTelegramApi(botToken, 'sendMessage', {
          chat_id: chatId,
          text:
            `✅ <b>اتصال موفقیت‌آمیز به کار روز!</b>\n\n` +
            `حساب تلگرام شما با موفقیت به حساب کاربری شما متصل گردید.\n\n` +
            `از این پس هر پیامی ارسال فرمایید، مستقیماً به عنوان وظیفه در کار روز ذخیره خواهد شد.`,
          parse_mode: 'HTML',
          reply_markup: appUrl
            ? {
                inline_keyboard: [[{ text: '🌐 باز کردن برنامه کار روز', url: appUrl }]],
              }
            : undefined,
        });
        return;
      }

      // Handle pairing failures explicitly
      let failureReason = 'کد اتصال نامعتبر است.';
      if (result.reason === 'expired') {
        failureReason = 'مهلت زمانی این کد اتصال (۱۰ دقیقه) به پایان رسیده است.';
      } else if (result.reason === 'already_used') {
        failureReason = 'این کد اتصال قبلاً استفاده شده است.';
      } else if (result.reason === 'rate_limited') {
        failureReason = 'به دلیل تلاش‌های ناموفق مکرر، ورود کد به مدت ۱۵ دقیقه مسدود شده است.';
      } else if (result.reason === 'already_linked_conflict') {
        failureReason = 'این چت تلگرام در حال حاضر به حساب کاربری دیگری متصل است. بازنویسی مجاز نیست.';
      }

      await callTelegramApi(botToken, 'sendMessage', {
        chat_id: chatId,
        text:
          `❌ <b>خطا در اتصال:</b>\n` +
          `${failureReason}\n\n` +
          `لطفاً در برنامه وب کار روز به بخش «تنظیمات > اتصال تلگرام» مراجعه کرده و کد اتصال جدیدی دریافت فرمایید.`,
        parse_mode: 'HTML',
      });
      return;
    }

    // Default /start welcome: check if user is already linked
    let isLinked = false;
    if (db) {
      const linkedUid = await getLinkedUserId(db, chatId);
      isLinked = Boolean(linkedUid);
    }

    if (isLinked) {
      await callTelegramApi(botToken, 'sendMessage', {
        chat_id: chatId,
        text:
          `سلام! به ربات <b>کار روز</b> خوش آمدید 🌱\n\n` +
          `حساب شما متصل و آماده است.\n` +
          `• هر متنی بفرستید بلافاصله در کارهای امروز ثبت می‌شود.\n` +
          `• دستور /today برای مشاهده لیست کارهای امروز.`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            ...(appUrl ? [[{ text: '🌐 باز کردن برنامه کار روز', url: appUrl }]] : []),
            [{ text: '📅 کارهای امروز (/today)', callback_data: 'cmd:today' }],
          ],
        },
      });
      return;
    }

    // Not linked yet
    await callTelegramApi(botToken, 'sendMessage', {
      chat_id: chatId,
      text:
        `سلام! به ربات <b>کار روز</b> خوش آمدید 🌱\n\n` +
        `⚠️ <b>حساب شما هنوز به برنامه کار روز متصل نشده است.</b>\n\n` +
        `جهت اتصال ایمن:\n` +
        `۱. در برنامه وب کار روز وارد حساب کاربری خود شوید.\n` +
        `۲. به بخش <b>تنظیمات > اتصال تلگرام</b> بروید و کد اتصال دریافت نمایید.\n` +
        `۳. کد اتصال را برای این ربات بفرستید.`,
      parse_mode: 'HTML',
      reply_markup: appUrl
        ? {
            inline_keyboard: [[{ text: '🌐 رفتن به برنامه کار روز', url: appUrl }]],
          }
        : undefined,
    });
    return;
  }

  // 3. Command: /today
  if (text === '/today') {
    await sendTodaySummary(chatId, botToken, env, db);
    return;
  }

  // 4. Command: /help
  if (text === '/help') {
    await callTelegramApi(botToken, 'sendMessage', {
      chat_id: chatId,
      text:
        `راهنمای ربات <b>کار روز</b>:\n\n` +
        `• <b>ثبت سریع:</b> هر پیامی بفرستید، به عنوان وظیفه در کارهای امروز ذخیره می‌شود.\n` +
        `• <b>زمان‌بندی:</b> با کلید «انتقال به فردا» یا «تبدیل به یادداشت» می‌توانید وضعیت آن را تغییر دهید.\n` +
        `• <b>دستور /today:</b> مشاهده خلاصه کارهای باز و انجام‌شده امروز.`,
      parse_mode: 'HTML',
    });
    return;
  }

  // 5. Free Text Capture
  if (text.length > 0) {
    if (!db) {
      await callTelegramApi(botToken, 'sendMessage', {
        chat_id: chatId,
        text: '⚠️ ارتباط با پایگاه داده Firestore برقرار نیست. لطفاً پیکربندی سرور را بررسی فرمایید.',
      });
      return;
    }

    // Resolve authenticated UID linked to this Telegram chat
    const userId = await getLinkedUserId(db, chatId);
    if (!userId) {
      await callTelegramApi(botToken, 'sendMessage', {
        chat_id: chatId,
        text:
          `⚠️ <b>حساب تلگرام شما متصل نیست</b>\n\n` +
          `برای ثبت وظایف، ابتدا در برنامه کار روز از بخش «تنظیمات > اتصال تلگرام» کد اتصال دریافت فرمایید.`,
        parse_mode: 'HTML',
        reply_markup: appUrl
          ? {
              inline_keyboard: [[{ text: '🌐 باز کردن برنامه کار روز', url: appUrl }]],
            }
          : undefined,
      });
      return;
    }

    const lines = text.split('\n');
    const title = lines[0].slice(0, 200).trim();
    const description = lines.slice(1).join('\n').trim();

    // Deterministic item identity:
    // Derives stable ID from message.chat.id and message.message_id.
    // If a crash occurs after item creation but before marking update completed,
    // the Telegram retry produces the EXACT same itemId and updates/idempotently writes
    // the document rather than creating a duplicate second task.
    const itemId = `task_tg_${chatId}_${message.message_id}`;
    const todayStr = getTehranDateString(0);

    // Schema compliant Item entity matching the web app
    const itemData = {
      id: itemId,
      userId,
      type: 'task',
      title,
      description: description || undefined,
      completed: false,
      status: 'todo',
      tags: ['تلگرام'],
      createdAt: new Date().toISOString(),
      plannedDate: todayStr,
      inToday: true,
      destination: 'today',
      sourceMessageId: message.message_id,
      sourceChatId: chatId,
    };

    // If updateId is available, atomically commit item creation AND update tracking in single batch
    if (updateId) {
      const docPrefix = `projects/${db.projectId}/databases/${db.databaseId}/documents`;
      const writes = [
        {
          update: {
            name: `${docPrefix}/users/${userId}/items/${itemId}`,
            fields: {
              id: { stringValue: itemId },
              userId: { stringValue: userId },
              type: { stringValue: 'task' },
              title: { stringValue: title },
              completed: { booleanValue: false },
              status: { stringValue: 'todo' },
              tags: { arrayValue: { values: [{ stringValue: 'تلگرام' }] } },
              createdAt: { stringValue: itemData.createdAt },
              plannedDate: { stringValue: todayStr },
              inToday: { booleanValue: true },
              destination: { stringValue: 'today' },
              sourceMessageId: { integerValue: String(message.message_id) },
              sourceChatId: { integerValue: String(chatId) },
              ...(description ? { description: { stringValue: description } } : {}),
            },
          },
        },
        {
          update: {
            name: `${docPrefix}/telegram_updates/${updateId}`,
            fields: {
              updateId: { integerValue: String(updateId) },
              status: { stringValue: 'item_persisted' },
              createdItemId: { stringValue: itemId },
              updatedAt: { stringValue: new Date().toISOString() },
            },
          },
          updateMask: {
            fieldPaths: ['status', 'createdItemId', 'updatedAt'],
          },
        },
      ];
      await db.commit(writes);
    } else {
      // Fallback single write if updateId not present
      await db.setDocument(`users/${userId}/items/${itemId}`, itemData, false);
    }

    // Offer action buttons only after persistence succeeds
    const inlineKeyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>> = [
      [
        { text: '⏳ انتقال به فردا', callback_data: `sched:tomorrow:${itemId}` },
        { text: '📝 تبدیل به یادداشت', callback_data: `type:note:${itemId}` },
      ],
    ];

    if (appUrl) {
      inlineKeyboard.push([{ text: '🌐 باز کردن در کار روز', url: appUrl }]);
    }

    await callTelegramApi(botToken, 'sendMessage', {
      chat_id: chatId,
      text:
        `📌 <b>وظیفه در کار روز ثبت شد:</b>\n` +
        `«${escapeHtml(title)}»` +
        (description ? `\n\n<i>${escapeHtml(description)}</i>` : '') +
        `\n\n📅 <i>زمان‌بندی اولیه: امروز (${toPersianDigits(todayStr)})</i>`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: inlineKeyboard,
      },
    });
  }
}

/**
 * Handle inline keyboard actions (Callback Queries)
 */
async function handleCallbackQuery(
  query: TelegramCallbackQuery,
  botToken: string,
  env: Env,
  db: FirestoreRestClient | null,
  updateId?: number
): Promise<void> {
  const data = query.data || '';
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;

  if (!chatId || !messageId) {
    await callTelegramApi(botToken, 'answerCallbackQuery', {
      callback_query_id: query.id,
      text: 'عملیات نامعتبر است.',
    });
    return;
  }

  // 1. Enforce private chat restrictions on callbacks
  if (query.message?.chat.type !== 'private') {
    await callTelegramApi(botToken, 'answerCallbackQuery', {
      callback_query_id: query.id,
      text: 'فقط در چت خصوصی قابل استفاده است.',
      show_alert: true,
    });
    return;
  }

  if (!db) {
    await callTelegramApi(botToken, 'answerCallbackQuery', {
      callback_query_id: query.id,
      text: 'پایگاه داده متصل نیست.',
      show_alert: true,
    });
    return;
  }

  // 2. Resolve linked user UID
  const userId = await getLinkedUserId(db, chatId);
  if (!userId) {
    await callTelegramApi(botToken, 'answerCallbackQuery', {
      callback_query_id: query.id,
      text: 'ابتدا حساب تلگرام خود را به کار روز متصل کنید.',
      show_alert: true,
    });
    return;
  }

  // Handle command from button: /today
  if (data === 'cmd:today') {
    await callTelegramApi(botToken, 'answerCallbackQuery', {
      callback_query_id: query.id,
    });
    await sendTodaySummary(chatId, botToken, env, db);
    return;
  }

  // Extract itemId and action prefix
  let targetItemId: string | undefined;
  if (data.startsWith('sched:today:')) targetItemId = data.replace('sched:today:', '');
  if (data.startsWith('sched:tomorrow:')) targetItemId = data.replace('sched:tomorrow:', '');
  if (data.startsWith('type:note:')) targetItemId = data.replace('type:note:', '');

  if (!targetItemId) {
    await callTelegramApi(botToken, 'answerCallbackQuery', {
      callback_query_id: query.id,
      text: 'شناسه مورد نامعتبر است.',
    });
    return;
  }

  // 3. Verify item existence and ownership
  const existingItem = await db.getDocument(`users/${userId}/items/${targetItemId}`);
  if (!existingItem || existingItem.userId !== userId) {
    await callTelegramApi(botToken, 'answerCallbackQuery', {
      callback_query_id: query.id,
      text: 'این مورد یافت نشد یا دسترسی به آن مجاز نیست.',
      show_alert: true,
    });
    return;
  }

  // 4. Perform update on the same stored item
  if (data.startsWith('sched:tomorrow:')) {
    const tomorrowStr = getTehranDateString(1);
    await db.setDocument(`users/${userId}/items/${targetItemId}`, {
      plannedDate: tomorrowStr,
      inToday: false,
      destination: null,
    }, true);

    await callTelegramApi(botToken, 'answerCallbackQuery', {
      callback_query_id: query.id,
      text: 'به فردا منتقل شد ✓',
    });

    const originalText = query.message?.text || '';
    await callTelegramApi(botToken, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: `${originalText}\n\n⏳ <b>زمان‌بندی شد برای فردا (${toPersianDigits(tomorrowStr)})</b>`,
      parse_mode: 'HTML',
    });
    return;
  }

  if (data.startsWith('sched:today:')) {
    const todayStr = getTehranDateString(0);
    await db.setDocument(`users/${userId}/items/${targetItemId}`, {
      plannedDate: todayStr,
      inToday: true,
      destination: 'today',
    }, true);

    await callTelegramApi(botToken, 'answerCallbackQuery', {
      callback_query_id: query.id,
      text: 'برای امروز زمان‌بندی شد ✓',
    });

    const originalText = query.message?.text || '';
    await callTelegramApi(botToken, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: `${originalText}\n\n📅 <b>برنامه‌ریزی شد برای امروز (${toPersianDigits(todayStr)})</b>`,
      parse_mode: 'HTML',
    });
    return;
  }

  if (data.startsWith('type:note:')) {
    await db.setDocument(`users/${userId}/items/${targetItemId}`, {
      type: 'note',
      status: null,
      completed: false,
    }, true);

    await callTelegramApi(botToken, 'answerCallbackQuery', {
      callback_query_id: query.id,
      text: 'به یادداشت‌ها تبدیل شد ✓',
    });

    const originalText = query.message?.text || '';
    await callTelegramApi(botToken, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: `${originalText}\n\n📝 <b>به عنوان یادداشت ذخیره گردید</b>`,
      parse_mode: 'HTML',
    });
    return;
  }

  await callTelegramApi(botToken, 'answerCallbackQuery', {
    callback_query_id: query.id,
    text: 'عملیات نامشخص است.',
  });
}

/**
 * Generates and sends today's tasks summary using real Firestore records
 */
async function sendTodaySummary(
  chatId: number,
  botToken: string,
  env: Env,
  db: FirestoreRestClient | null
): Promise<void> {
  const appUrl = env.APP_URL;
  const todayStr = getTehranDateString(0);

  if (!db) {
    await callTelegramApi(botToken, 'sendMessage', {
      chat_id: chatId,
      text: '⚠️ ارتباط با پایگاه داده ابری کار روز برقرار نیست.',
    });
    return;
  }

  const userId = await getLinkedUserId(db, chatId);
  if (!userId) {
    await callTelegramApi(botToken, 'sendMessage', {
      chat_id: chatId,
      text:
        `⚠️ حساب تلگرام شما هنوز به کار روز متصل نشده است.\n` +
        `برای اتصال، به بخش «تنظیمات > اتصال تلگرام» در برنامه وب مراجعه فرمایید.`,
      reply_markup: appUrl
        ? {
            inline_keyboard: [[{ text: '🌐 باز کردن برنامه کار روز', url: appUrl }]],
          }
        : undefined,
    });
    return;
  }

  // Fetch all real items from user's items collection (traversing all page tokens)
  const allUserItems = await db.listDocuments(`users/${userId}/items`);

  // Date-based Today semantics:
  // - Must belong to authenticated userId
  // - Exclude soft-deleted or archived items (deleted === true, isDeleted === true)
  // - Match app's active date semantics: plannedDate === todayStr OR dueDate === todayStr
  // - Or completed today (completed === true and completedAt starts with todayStr or plannedDate === todayStr)
  // - Note: permanent inToday === true fallback is removed from runtime selection to prevent stale yesterday tasks appearing in today
  const nonDeletedItems = allUserItems.filter((entry) => {
    const item = entry.data;
    if (item.userId && item.userId !== userId) return false;
    if (item.deleted === true || item.isDeleted === true) return false;
    return true;
  });

  const todayItems = nonDeletedItems.filter((entry) => {
    const item = entry.data;
    const isCompleted = item.completed === true || item.status === 'done';
    const isPlannedToday = item.plannedDate === todayStr;
    const isDueToday = item.dueDate === todayStr;
    const isCompletedToday = isCompleted && item.completedAt && String(item.completedAt).slice(0, 10) === todayStr;

    if (!isCompleted) {
      return isPlannedToday || isDueToday;
    } else {
      return isPlannedToday || isCompletedToday;
    }
  });

  // Distinguish incomplete tasks from notes
  const openTasks = todayItems.filter(
    (e) => (e.data.type || 'task') === 'task' && !e.data.completed && e.data.status !== 'done'
  );
  const doneTasks = todayItems.filter(
    (e) => (e.data.type || 'task') === 'task' && (e.data.completed || e.data.status === 'done')
  );
  const notes = todayItems.filter((e) => e.data.type === 'note');

  if (todayItems.length === 0) {
    await callTelegramApi(botToken, 'sendMessage', {
      chat_id: chatId,
      text:
        `📅 <b>کارهای امروز (${toPersianDigits(todayStr)}):</b>\n\n` +
        `هیچ کاری برای امروز شما ثبت نشده است 🌱\n` +
        `می‌توانید همینجا وظایف جدیدتان را بنویسید.`,
      parse_mode: 'HTML',
      reply_markup: appUrl
        ? {
            inline_keyboard: [[{ text: '🌐 باز کردن برنامه کار روز', url: appUrl }]],
          }
        : undefined,
    });
    return;
  }

  let summaryText = `📅 <b>کارهای امروز (${toPersianDigits(todayStr)}):</b>\n\n`;

  if (openTasks.length > 0) {
    summaryText += `📋 <b>وظایف باز (${toPersianDigits(openTasks.length)}):</b>\n`;
    for (const t of openTasks) {
      const isDue = t.data.dueDate === todayStr;
      summaryText += `▫️ ${escapeHtml(t.data.title)}${isDue ? ' <i>[مهلت: امروز]</i>' : ''}\n`;
    }
    summaryText += '\n';
  }

  if (notes.length > 0) {
    summaryText += `📝 <b>یادداشت‌ها (${toPersianDigits(notes.length)}):</b>\n`;
    for (const n of notes) {
      summaryText += `• ${escapeHtml(n.data.title)}\n`;
    }
    summaryText += '\n';
  }

  if (doneTasks.length > 0) {
    summaryText += `✅ <b>تکمیل‌شده (${toPersianDigits(doneTasks.length)}):</b>\n`;
    for (const d of doneTasks) {
      summaryText += `✓ <s>${escapeHtml(d.data.title)}</s>\n`;
    }
  }

  await callTelegramApi(botToken, 'sendMessage', {
    chat_id: chatId,
    text: summaryText.trim(),
    parse_mode: 'HTML',
    reply_markup: appUrl
      ? {
          inline_keyboard: [[{ text: '🌐 باز کردن برنامه کار روز', url: appUrl }]],
        }
      : undefined,
  });
}
