# راهنمای استقرار ورکر تلگرام کار روز (KarRooz Telegram Worker)

این ورکر یک درگاه ارتباطی سرورلس و مستقل (Serverless Gateway) مبتنی بر **Cloudflare Workers** برای اتصال ربات تلگرام به پایگاه داده ابری کار روز است.

---

## ۱. ویژگی‌های امنیتی و معماری پیاده‌سازی‌شده
- **پایداری داده‌ها در Firestore:** ثبت واقعی وظایف و یادداشت‌ها در پایگاه داده اشتراکی کار روز (`ai-studio-karrooz-88dd94b4-bce7-4ddc-8723-1bca334db048`) در مسیر اختصاصی کاربر احراز هویت شده (`users/{userId}/items/{itemId}`).
- **اعتبارسنجی اتصال (Pairing) واقعی:** کدهای اتصال با فرمت `KR-XXXX-XXXX` دارای مهلت زمانی ۱۰ دقیقه و تک‌کاربره/یک‌بارمصرف بوده و در پایگاه داده ثبت و ابطال می‌شوند؛ هیچ کد جعلی یا شبیه‌سازی محلی وجود ندارد.
- **تفکیک و احراز مالکیت سرور:** نگاشت شناسه چت تلگرام به UID کاربر وب به صورت امن در سرور انجام شده و دسترسی کلاینت به این مسیر مسدود است.
- **تأیید پس از ثبت:** دکمه‌های اقدام و پیام تأیید تنها **پس از** اطمینان از ثبت موفقیت‌آمیز در پایگاه داده ارسال می‌شوند.
- **امنیت وب‌هوک Fail-Closed:** در صورت عدم تنظیم متغیرهای محرمانه وب‌هوک یا عدم تطابق هدر `X-Telegram-Bot-Api-Secret-Token`، درخواست بلافاصله مسدود می‌شود.
- **شناسایی تکرار پایدار (Durable Idempotency):** ردیابی `update_id`ها در Firestore انجام شده و وضعیت اتمام فقط پس از پردازش موفق ذخیره می‌گردد تا در صورت بروز خطا، تلگرام امکان تلاش مجدد امن را داشته باشد.
- **محدودیت چت خصوصی:** پردازش دستورات و کلیک دکمه‌ها منحصراً به چت‌های خصوصی محدود است.
- **کدگذاری امن متن (HTML Escaping):** جلوگیری از بروز خطاهای نحوی یا تزریق کد در قالب پیام‌های ارسالی تلگرام.
- **دستور /today زنده:** استخراج وظایف باز، تکمیل‌شده و یادداشت‌های امروز بر اساس منطقه زمانی `Asia/Tehran`.

---

## ۲. متغیرهای محرمانه مورد نیاز (Secret Names)

این متغیرها باید در داشبورد کلودفلر یا از طریق دستور `wrangler secret put <NAME>` تنظیم شوند:

| نام متغیر محرمانه | نوع | توضیحات |
| :--- | :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | Secret | توکن دریافتی از @BotFather در تلگرام |
| `TELEGRAM_WEBHOOK_SECRET` | Secret | رشته تصادفی و امن برای اعتبارسنجی هدر `X-Telegram-Bot-Api-Secret-Token` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Secret | متن کامل JSON کلید حساب سرویس فایربیس با دسترسی `Cloud Datastore User` |

### متغیرهای عمومی محیطی (Public Variables در wrangler.jsonc):
- `FIREBASE_PROJECT_ID`: `gen-lang-client-0985101866`
- `FIRESTORE_DATABASE_ID`: `ai-studio-karrooz-88dd94b4-bce7-4ddc-8723-1bca334db048`
- `TIMEZONE`: `Asia/Tehran`
- `APP_URL`: آدرس برنامه وب کار روز (`https://ais-dev-lpx6szyiww3uh6hos3kj3p-307986322384.europe-west1.run.app`)

---

## ۳. راهنمای گام‌به‌گام استقرار در داشبورد کلودفلر (بدون نیاز به خط فرمان)

### گام ۱: ساخت ورکر جدید
1. به حساب کاربری خود در [dash.cloudflare.com](https://dash.cloudflare.com) وارد شوید.
2. از منوی سمت چپ به مسیر **Compute (Workers) > Workers & Pages** بروید.
3. دکمه **Create Application** و سپس **Create Worker** را انتخاب کنید.
4. نام ورکر را مشخص کرده (مانند `karrooz-bot`) و روی **Deploy** کلیک کنید.

### گام ۲: قرار دادن کد کامپایل‌شده
1. روی دکمه **Edit Code** (ویرایش آنلاین کد) کلیک کنید.
2. محتویات فایل باندل‌شده `worker/dist/index.js` را کپی کرده و جایگزین محتوای ادیتور نمایید.
3. روی **Deploy** در بالای صفحه کلیک کنید.

### گام ۳: تنظیم متغیرها و کلیدهای محرمانه
1. در صفحه ورکر، به تب **Settings > Variables and Secrets** بروید.
2. در بخش **Secrets**، سه کلید محرمانه را به صورت رمزنگاری‌شده اضافه کنید:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`
   - `FIREBASE_SERVICE_ACCOUNT_JSON`
3. در بخش **Variables**، مقادیر `FIREBASE_PROJECT_ID` ،`FIRESTORE_DATABASE_ID` و `APP_URL` را بررسی یا اضافه فرمایید.

### گام ۴: ثبت وب‌هوک در سرورهای تلگرام
آدرس ورکر خود را (مثلاً `https://karrooz-bot.yourname.workers.dev`) در دستور زیر جایگزین کرده و اجرا کنید:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://karrooz-bot.yourname.workers.dev/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>"
  }'
```

پاسخ تلگرام باید به صورت `{"ok":true,"result":true,"description":"Webhook was set"}` بازگردد.

### گام ۵: بررسی سلامت و آزمون
1. با باز کردن آدرس `/health` در مرورگر، تفکیک وضعیت‌های پیکربندی و اتصال دیتابیس را مشاهده فرمایید:
   `https://karrooz-bot.yourname.workers.dev/health`
2. در تلگرام به ربات پیام `/start` یا عنوان یک وظیفه را ارسال کنید.
