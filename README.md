# ⛳ Golf Vision Studio — گلف ویژن استودیو

تحلیل ضربه‌ی گلف، کاملاً داخل مرورگر و بدون هیچ سروری — در یک فایل HTML.

**[▶ اجرای زنده](https://abbasmvbaba-cyber.github.io/golf-vision-studio/)** — سایت روی GitHub Pages میزبانی می‌شود.

---

## ✨ چه می‌کند؟

| بخش | تکنولوژی مشابه | توضیح |
|---|---|---|
| ✨ ردیاب ضربه | Shot Tracer / Ace Trace | قفل روی توپ و رسم مسیر تلویزیونی + استروب مخصوص پات + آمار پرواز |
| 🤖 ضبط خودکار | Swing Profile / OnForm | تشخیص حرکت با تفاضل فریم، شروع/قطع خودکار ضبط و گالری کلیپ‌ها |
| 🎥 اپ دوربین زنده (AR) | Shot Tracer / Topgolf | تمام‌صفحه مثل اپ دوربین گوشی: شناسایی خودکار توپ (هسته‌ی روشن + حلقه‌ی تیره‌تر)، شناسایی ناحیه‌ی کلاب/ضربه با تشخیص حرکت، کالیبراسیون مسافت با قطر واقعی توپ (42.7mm)، ردیابی زنده‌ی پرواز + **عدد مسافت افزایشی زیر توپ** + ضبط ویدیوی ضربه |
| 🦴 اسکلت بدن | Sportsbox AI | ۳۳ نقطه‌ی بدن با MediaPipe + زاویه‌ی زانو و تمپوی تنه |
| 🧭 خواندن گرین | PuttView / PuttArc | حل‌کننده‌ی فیزیک غلتش توپ: خط ایده‌آل + نقطه‌ی نشانه‌گیری + فلش‌های شیب |
| 🧠 تب تکنولوژی | — | مقایسه‌ی فناوری اپ‌های تجاری گلف |

## 🚀 اجرا

هیچ نصب و بیلدی لازم نیست:

```bash
git clone https://github.com/USERNAME/REPO.git
# index.html را در مرورگر باز کنید
```

یا همان `index.html` را در کروم/اج باز کنید.

> 💡 برای دوربین زنده و اسکلت بدن، صفحه باید روی **HTTPS** باشد (همین GitHub Pages کافی است) یا فایل را محلی باز کنید.
> اسکلت بدن برای بار اول اینترنت می‌خواهد (بارگذاری مدل MediaPipe از CDN)؛ بقیه‌ی موتورها کاملاً آفلاین‌اند.

## 🧪 چطور کار می‌کند؟

- **ردیابی توپ:** آستانه‌ی روشنایی + شباهت رنگ به نقطه‌ی قفل + پیش‌بینی سرعت (کالمنِ ساده‌شده) روی تصویر 240×135.
- **ضبط خودکار:** تفاضل فریم خاکستری 128×72 + ماشین حالت `idle → recording → cooldown` + MediaRecorder.
- **فیزیک گرین:** انتگرال‌گیری عددی شتاب توپ (شیب × g − اصطکاکِ متناسب با Stimp) + جستجوی شبکه‌ای زاویه×سرعت برای یافتن خط سوراخ‌کننده.

## 📁 ساختار

```
index.html   ← کل اپ (HTML + CSS + JS در یک فایل)
.nojekyll    ← سرو شدن مستقیم فایل‌ها در GitHub Pages
```

## 📱 نصب به‌صورت اپ (تمام‌صفحه، بدون UI مرورگر)

سایت یک PWA است. برای تجربه‌ی تمام‌صفحه‌ی واقعی (بدون نوار آدرس و دکمه‌های سافاری):

- **iPhone:** در سافاری دکمه‌ی Share ← «Add to Home Screen» ← از هوم اسکرین باز کن
- **Android:** منوی کروم ← «Add to Home screen» / «Install app»

`manifest.json` با حالت `display: fullscreen` + service worker (network-first، همیشه نسخه‌ی تازه) + آیکون‌ها آماده است.

## 🎯 نکات استفاده (دقت حداکثری)

- **قفل دستی:** اگر شناسایی خودکار گیر کرد، **روی توپ در تصویر لمس کن** — فوری قفل می‌شود
- توپ را در فاصله‌ی ۱ تا ۳ متری دوربین روی زمین بگذار (نه خیلی نزدیک)
- پس‌زمینه‌ی تاریک‌تر = توپ روشن = ردیابی بی‌نقص (مثل رینگ واقعی)
- زاویه‌ی دوربین جانبی باشد تا مسیر پرواز در کادر بماند
- شناسایی توپ: بلاب روشنِ گردِ همبند + تست حلقه‌ی تیره‌تر در مقیاس خود توپ + فیلتر نسبت ابعاد و پرشدگی — لباس، دست و برق پوست رد می‌شوند
- پایان ضربه فقط وقتی: توپ از کادر خارج شود (~۱ ثانیه)، ۱.۵ ثانیه کامل گم شود، یا ۱.۳ ثانیه بی‌حرکت بماند

## 🏗 معماری علمی (بر اساس سند iOS Professional Tracking)

ماژول‌های سند در اپ وب پیاده شده‌اند (همان مرزهای ماژولی، داخل یک فایل برای پیش‌نمایش آفلاین):

| ماژول سند | در وب | وضعیت |
|---|---|---|
| BallDetector (§7) | بلاب همبند + حلقه مقیاس‌پذیر + فیلتر شکل | Measured |
| KalmanTracker (§8-9) | کالمن CA شش‌حالته [x,y,vx,vy,ax,ay] | Measured |
| ImpactDetector (§10) | جابه‌جایی خود توپ ×۲ فریم + پنجره زمانی | Measured |
| MultiFrameTracker (§11) | Least Squares چندفریمی برای v0 | Estimated |
| Launch Angle/Direction (§12-13) | atan2 از بردار v0 تصویری | Estimated |
| BallFlightModel (§14-17) | درگ Cd=0.24 + لیفت مگنوس Cl=0.21 | Estimated |
| Camera Calibration (§34) | خودکالیبراسیون با گرانش (scale=2a/g) + قطر توپ 42.67mm | Estimated |
| Carry (§20) | شبیه‌سازی تا فرود روی Ground Plane + خط‌چین پیش‌بینی (§44) | Estimated |
| Shot Classifier (§26-27) | STR / PUSH / PULL / FADE / DRAW / SLICE / HOOK | Estimated |
| Confidence (§33) | تشخیص × ردیابی × کالیبراسیون × فیزیک | Measured |
| Player Intelligence (§28-32,45) | میانه/بهترین/Safe(P20)/Consistency/الگوی خطا + خروجی JSON | Measured |
| Offline Storage + Sync (§36-38) | localStorage + Export JSON (آماده Supabase) | Measured |

اصل §46: هدف «Reliable Playing Distance» است نه Maximum — Safe Distance = صدک ۲۰.

**نیاز به iOS بومی (Phase بعدی):** 240fps با AVFoundation، YOLO CoreML، ARKit/LiDAR، و تست‌های XCTest فیزیک.

## 📱 نسخه‌ی بومی iOS

اسکلت کامل پروژه‌ی Xcode (Swift/SwiftUI — کالمن، فیزیک درگ+مگنوس، Player Intelligence، XCTest):
**[golf-vision-ios](https://github.com/abbasmvbaba-cyber/golf-vision-ios)**

## 📄 مجوز

MIT — آزاد برای استفاده، تغییر و انتشار.

---

## 🛰 v30 — معماری ردیابی (چرخه‌ی کلاسیک tracking)

بر اساس چرخه‌ی استاندارد: **detection → data association → Kalman → ballistic prediction**

| بلاک چرخه | پیاده‌سازی v30 |
|---|---|
| Target detection | `scanBallCands()` — لیست top-10 کاندیدای تمام‌کادر (قبلاً فقط یک argmax بود) |
| Data association | `GVS.associate()` — فاصله‌ی Mahalanobis با ماتریس P کالمن + دروازه‌ی χ² (99%)؛ مسیر پیکسلی قدیمی به‌عنوان fallback ماند (صفر regression) |
| State prediction / Update | همان کالمن ۶حالته (تغییر نکرده) + **motion model بالستیک**: وقتی کالیبراسیون گرانش معتبر است، گرانش + درگ به شتاب کالمن تزریق می‌شود |
| Reacquire | از لیست کاندیدای تمام‌کادر با دروازه‌ی شل‌شونده + حلقه‌ی annulus قدیمی به‌عنوان fallback |
| Ballistic prediction | `GVS.liveFit()` + `GVS.predictArc()` — از ۶ مشاهده‌ی اول، **هر فریم** قوس خط‌چین + نقطه‌ی فرود + عدد PRED رسم می‌شود و **بعد از گم‌شدن توپ ادامه دارد** (coast mode) |

- **math-core.js** — ریاضی خالص (PHYS، simCarry، quadFit، کالمن، associate، liveFit، predictArc، ballisticStep) با خروجی UMD (مرورگر + Node). بخش ریاضی mirror از index.html است؛ تست T0 تضمین می‌کند دو جا با هم انحراف نگیرند.
- **تست‌ها:** `node test/harness.js` — ۱۳ تست بدون وابستگی (فیزیک، کالمن، association، مدل بالستیک، liveFit، predictArc، mirror sync) + CI روی push/PR.

### v31 — AUTO-LOCK (قفل خودکار با کمکِ تاچ)

- **قفل خودکار:** وقتی دتکتور یک کاندیدای **۱۰ فریمِ پایدار** (موقعیت + اندازه) ببیند، خودش قفل می‌کند — بدون هیچ تاچی. حلقه‌ی زرد پیشرفت دور کاندیدا + چیپ `AUTO-LOCK` وضعیت را نشان می‌دهد.
- **تاچ = همیشه کمک/override:**
  - قبل از قفل: تاچ روی توپ = قفل فوری (خودِ قفل خودکار لغو می‌شود)
  - بعد از قفل (فاز armed): تاچ روی توپ = **قفل جدید** — اگر قفل خودکار اشتباه زده بود، با یک تاچ درست می‌شود
- **نگهبان‌های ضد خطا:** ثبات ۱۰ فریمی (شیء متحرک قفل نمی‌شود)، نگهبان اندازه با شعاعِ توپِ قفل‌شده‌ی قبل، cooldown ۱/۲ ثانیه بعد از هر ضربه.
- **تنظیمات:** `BALL LOCK` در پنل تنظیمات — `AUTO` (پیش‌فرض) یا `TAP` (فقط با لمس).
- تست‌های T13–T16 state machine قفل خودکار را می‌پوشانند (17 PASS / 0 FAIL).

### v32 — تاچ = راهنمای ناحیه (نه قفل مستقیم)

- **تاچ دیگر قفل نمی‌کند**؛ ناحیه‌ی ۵۶pxی دور لمس را برای ۴ ثانیه ثبت می‌کند (دایره‌ی سبزِ محوشونده روی تصویر):
  - **وقتی سیستم نمی‌تواند توپ را پیدا کند:** اسکنِ شل‌تر درون همان ناحیه فعال می‌شود → «ناحیه ثبت شد — دارم جستجو می‌کنم»
  - **کمک برای یافتن سریع‌تر:** کاندیدای پایدارِ داخل ناحیه با **۳ فریم** (به‌جای ۱۰) قفل می‌شود
- اگر کاندیدای **تأییدشده‌ی توپ** (سفید + گرد + سایه) دقیقاً نزدیک لمس باشد → قفل فوریِ تأییدشده (نه نقطه‌ی خام)
- قفل خودکارِ اشتباه (فاز armed): تاچ روی توپِ واقعی → اسکن ناحیه → اگر کاندیدای معتبر باشد، قفل عوض می‌شود
- حالت `TAP` در تنظیمات = بدون قفل خودکار (تاچ فقط راهنما)

### v33 — مدل ۳بعدی (فاز ۲)

- **کالیبراسیون خودکار**: هنگام قفل، اگر توپ نزدیک وسط کادر باشد، پوز دوربین (ارتفاع/شیب/فاصله) از اندازه و موقعیت توپ تخمین می‌شود (با prior ارتفاع دوربین + فیت هم‌زمان) → چیپ `3D CALIB ✓`
- **فیت هم‌زمان ۷پارامتری** (`GVS.fit3D`): سرعت ۳بعدی + spin + پوز دوربین با Gauss-Newton روی باقی‌مانده‌های (u,v) — زمان ضربه به‌صورت خودکار از داده تشخیص داده می‌شود (`findImpactTime`)
- **خروجی**: قوس ۳بعدی با عمق واقعی (پروژکشن مسیر با پوز جابه‌جاشده) + نقطه‌ی فرود 3D + سرعت/زاویه‌ی لانچ/کری/اورپیک واقعی با تگ **`3D`** روی کارت (وگرنه EST/MEAS مثل قبل)
- اگر فیت ۳بعدی همگرایی نداشت → fallback خودکار به مسیر ۲بعدی v30 (صفر regression)
- **تنظیمات FOCAL (FOV)**: ضریب فاصله‌ی کانونی (پیش‌فرض ×0.85) — اگر مسافت ۳بعدی کوتاه‌تر از واقعی بود × را کم کن
- دقت: تک‌دوربینی با فیزیک بالستیک — حدود ±۵-۱۰٪ سرعت (تست T20 با نویز 1.5px)؛ نسخه‌ی بومی iOS با ARKit (فاز ۴) دقت را کامل می‌کند

### v34 — تشخیص توپ در حالت portrait + قفل خودکار ضد خطا (بازگشانی کامل تشخیص)

مشکل: در موبایل (بوم عمودی) تصویر با `drawImage(cv,0,0,320,180)` به گرید 16:9 کچل می‌شد؛ توپ به بیضی کش‌دار ~×۳.۸ تبدیل می‌شد و فیلترهای شکل (`asp≤2.2`، `dcirc≥0.62`) آن را **در هر فاصله‌ای** رد می‌کردند — حتی ۳۰سانتی جلوی دوربین.

| تغییر | جزئیات |
|---|---|
| گرید تشخیص هم‌نسبت با بوم | `layoutDetect()`: `AH=round(320·cvH/cvW)` (باند ۹۶–۷۶۸) → `SCX≈SCY` (مقیاس ایزوتروپ). حالت 16:9 دقیقاً 320×180 قبلی است (صفر regression) |
| سقف شعاع ۳۰→۴۵ | توپِ نزدیک (۲۰–۵۰سانتی) دیگر رد نمی‌شود؛ حلقه‌ی تیره/گردی/پرشدگی همچنان محافظ هستند |
| بونوس اندازه در score | `+0.4·clamp((r-4)/8)` — توپِ واقعی (بلابِ بزرگ) از نویزِ روشنِ لبه‌ای (تلویزیون/بوق) برتر می‌شود |
| AUTO-LOCK چندفرضیه‌ای (`GVS.autoLockMulti`) | هر کاندیدا **ثبات خودش** را می‌شمارد (حداکثر ۴ فرضیه) — نویزِ روشنِ پایدار دیگر نمی‌تواند قفل را از توپ بدزدد. کاندیدای کوچک (r<8) دو برابر فریم می‌خواهد (۲۰ به‌جای ۱۰)؛ داخل ناحیه‌ی تاچ مثل قبل ۳ فریم |
| کالیبراسیون ۳بعدی برای توپِ نزدیک | سقف `tryCalib3D` از ۱۶ به ۴۵ (مدل `calibBallPose` تا r=60 معتبر است) |

- **تست‌ها:** T22–T27 (چندفرضیه‌ای، جیتر، تاچ، نگهبان اندازه، گرید ایزوتروپ + رگرسیون 16:9، توپِ نزدیک در مقابل نویز لبه‌ای) — 27 PASS / 0 FAIL.
- عملکرد: اسکن 320×670 ≈ ۳ms در فریم (داخل بودجه‌ی 60fps).

### v35 — تحلیل ویدیوی ذخیره‌شده (File Mode)

وقتی داخل محیط AR هستید، علاوه بر دوربین زنده می‌توانید **ویدیویی که قبلاً ضبط کرده‌اید** را از گالری باز کنید و **همان‌همه پایپ‌لاین** روی آن اجرا شود: قفل خودکار روی توپ → تشخیص ضربه → ردیابی پرواز → کارت نتیجه. هیچ سروری لازم نیست — ویدیو تماماً در دستگاه با `URL.createObjectURL` پخش می‌شود.

| بخش | رفتار در حالت File |
|---|---|
| ورودی | آیکون 🎬 در ستون بالای AR → انتخاب فایل `video/*` (mp4/mov/m4v/webm) از گالری |
| نمایش | ویدیو با `cover` روی همان بوم 780×1688 کشیده می‌شود (mirror می‌شود مثل دوربینِ front)؛ گرید تشخیص v34 بدون تغییر |
| زمان‌بندی | کاملاً **real-time** بر اساس `performance.now()` — همان‌طور که ویدیو پخش می‌شود، پایپ‌لاین لحظه‌به‌لحظه می‌چرخد (نه فریم‌به‌فریم) |
| شاتر (دکمه‌ی بزرگ) | در حالت File = **پخش/توقف** ویدیو (نه ضبط). وقتی کارت نتیجه باز است، شاتر = شروع دوباره (`resetShot`) |
| نوار ویدیو | زیر شاتر: `↺ از ابتدا` + اسلایدر **اسکرول** + تایم‌کد. اسکرول در میانه‌ی تحلیل به `detect` بازمی‌گردد تا از همان فریم دوباره قفل کند |
| ضربه | وقتی توپ قفل است و پخش فعال است، ضربه‌ی تشخیص‌داده‌شده **خودکار** ردیابی را شروع می‌کند — بدون دکمه‌ی ضبط (چون چیزی ضبط نمی‌شود) |
| خروجی | همان کارت نتیجه + تله‌متری + `saveShot` به history — دقیقاً مثل دوربین |
| خروج | بستن AR یا باز کردن ویدیوی جدید → `stopFile()` (revokeObjectURL + حذف src)؛ هیچ اثری روی حالت دوربین نمی‌گذارد |

- **تایمینگ real-time، نه فریم‌محور:** چون `tImpact` و همه‌ی `obs` با `performance.now()` پر می‌شوند، ویدیوی 30fps روی رندر 60fps از قبل توسط **PATCH 41** (skip فریم تکراری) پوشش می‌خورد — توقفِ موقتِ ویدیو هم به‌خوبی به‌جای `finishShot('stop'/'out')` ختم می‌شود، نه کرش.
- **صفر regression روی دوربین:** `mode='file'` کاملاً موازی با `mode='cam'` است؛ هرگز `startRec()` صدا نمی‌زنیم و هیچ مسیرِ ضبطی لمس نمی‌شود.
- **تست‌ها:** 27 PASS / 0 FAIL (تغییرات v35 سویی DOM/ویدیو هستند؛ موتور تشخیص/ردیابی دست‌نخورده). E2E روی فریم‌های واقعیِ رپو (ویدیوی 720×1280 پورت‌ریت 30fps) → قفل خودکار + ضربه + ۱۰۲ فریم تطبیق پرواز PASS.

### v35.1 — رفع «توپ پیدا نمی‌شود» در حالت ویدیو (File Mode)

اشکال کاربر: در حالت ویدیو، قفل خودکار روی توپ نمی‌نشست و توپ ردیابی نمی‌شد.

- **قفلِ شل‌تر در File Mode:** آستانه‌ی هم‌راستاییِ ردیاب‌های کاندیدا در `autoLockMulti` برای ویدیوی ذخیره‌شده شل‌تر شد (ویدیوی فشرده‌شده فریم‌های ضعیف/ریز دارد). حالا قفل خودکار روی توپ حتی با فریم‌های افتاده و توپِ کم‌کُنتراست قفل می‌کند.
- **جبران لرزشِ دوربین (`alignPrev`):** در File Mode، جابه‌جاییِ بین‌فریمیِ دوربین برآورد می‌شود (جستجوی جداسازِ تک‌محوره SAD با پالایش تک‌نقطه‌ای + بازپیمایشِ پنجره‌ایِ ۶ فریم برای حرکت‌های کند مثل تیلت) و موقعیتِ مورد انتظارِ توپ در فریمِ خام جبران می‌شود؛ لرزشِ دست دیگر به‌عنوان «حرکتِ توپ» تفسیر نمی‌شود.
- **تریگر ضربه در File Mode:** آستانه‌ی پرشِ سریع برای ویدیو بالاتر است (ضد چنگ‌های روشن داخل پنجره‌ی جستجو). برای توپِ کند (پات)، **امضای قله‌ای**: جابه‌جاییِ توپ در مختصاتِ پایدار (حالت‌یافته به دوربین) روی پنجره‌ی ۱۶ فریمی؛ قله ≥ ۵.۵ پیکسل بعد از ۱۰ فریمِ پایدار = ضربه. خزشِ دوربین/تیلت قله‌ی تند ندارد و خطا نمی‌دهد.
- **بازتطبیق پس از قفل:** `lastLockR` و شعاع‌های کهنه پس از قفلِ جدید بازنشانی می‌شوند؛ در ویدیوِ متوقف، جمعِ جابه‌جایی انجام نمی‌شود (جلوگیری از خزشِ دروغ هنگام Resume).
- **UX:** چیپ‌های وضعیت (قفل/ضربه/کلاب) در File Mode به‌روزرسانی می‌شوند تا کاربر بداند موتور در چه فاز است.

**تست‌ها:** 28 PASS / 0 FAIL (harness) + E2E روی ویدیوی واقعیِ پات:
- بدون لرزش: قفل فریم ۱۳، ضربه فریم ۶۸ (۶ فریم پس از ضربه‌ی واقعی ۶۲)، ۹۶ فریم تطبیق — ۳/۳.
- لرزش خفیف (شبیه دستِ واقعی): ۰ هشدار کاذب در ۸/۸ اجرا؛ ضربه در پنجره‌ی درست (۵۸–۶۸) یا کمی دیرتر در ۵/۸.
- لرزش شدید (استرس): قفل همیشه؛ تریگر گاه کاذب/دیر — محدودیتِ شناخته‌شده برای صحنه‌های کم‌کُنتراست (توپِ سفید کوچک روی چمنِ آفتاب‌گرفته).

---

## v35.2 — File-mode restructure + one-tap full-video export (ساختار ویدیو + خروجی)

File mode (ویدیوی ذخیره‌شده) reworked per request: **no shutter button** — instead
the video toolbar now has **play/pause**, restart, seek, and a new **export**
button that renders and saves the **entire uploaded video** with everything
burned in:

- the **ball trail / trajectory** in the user's chosen **tracer color**
  (TRACER COLOR setting — `tracerCol`);
- the **PuttClub logo watermark** (already drawn on every frame in file mode);
- the **final info card** (PUTTCLUB VISION + speed/carry/apex/… + PuttClub.ir)
  appended after the shot — the rest of the video keeps playing underneath the
  card so nothing is cut, then ~5s of card, then the file is finalized.

### How it works (reuses the camera-mode record chain)
`startFileExport()` = `resetShot()` + seek(0) + `startRec()` (canvas
`captureStream(60)` + MediaRecorder, 12 Mbps, mp4-preferred, **no mic track in
file mode**) + `vid.play()`. The normal detect→lock→impact→track pipeline runs
on the replayed video; `finishShot()` (on stop / out-of-frame / `ended`) draws
the end card onto the canvas; `finalizeRec()` now **waits for `vid.ended` in
file mode** before stopping the recorder, and then auto-offers save
(`navigator.share` sheet on iOS / download elsewhere). No-shot case: a simple
"NO SHOT DETECTED" card. Re-tap export = cancel. Seek/restart/play are locked
while building; the canvas freezes on the card after export.

### Tests
| Suite | Result |
|---|---|
| Syntax (node --check, all scripts) | OK |
| harness.js | 28/28 PASS |
| Shake E2E (clean, ×3) | 5/5 PASS each (lock f13, impact f68, 96 matched) |
| File-mode E2E (no shake) | lock f19, impact f62, 102 matched |

MediaRecorder/export path is browser-only — verify on device (iOS Safari
14.5+).

---

## v35.3 — File-mode "always lockable" (قفل تضمینی در ویدیو)

User report: ball never found in file mode (dark/low-contrast footage). Fixes
(file mode only — camera path untouched):

1. **Two-tap force lock** — tapping the ball twice in the same spot (≤5s, ≤48px
   apart) with no detected candidate now **locks directly at the tap point**
   with an estimated radius (`estimateBallR`: local peak + radius growth until
   brightness falls to background). Tracking then refines the lock itself.
2. **Faster threshold drop** — `lowThr` engages after 15 misses in file mode
   (was 40) so darker balls get a chance sooner.
3. **Looser tap-verified threshold** in file mode (score >0.8 instead of 0.9).
4. **Periodic hint** — if no ball signal for a while: «سیگنالِ توپ دیده نشد —
   دو بار روی توپ بزن تا دستی قفل شود».

| Test | Result |
|---|---|
| Syntax | OK |
| harness.js | 28/28 |
| Shake E2E ×2 | 5/5 each |
| File-mode E2E | lock f19, impact f62, 102 matched |
| estimateBallR unit (6 synthetic scenes incl. dark/low-contrast) | 6/6 |

## v35.4 — Ball detection for bright full-shot videos (توپ در ویدیوهای پرنورِ دوردست)

User report: in a distant full-shot video (bright castle/background, ball a tiny
dot in the lower frame), file mode never locked the ball. Root cause: the
ball's blob merges with the bright grass strip (bad compactness) so it never
reaches the candidate list, while castle windows / white gloves / white shoes
dominate the top scores.

Fixes (file mode only — camera path byte-identical):

1. **White-dot candidate source** (`scanWhiteDots`) — a second detector for
   compact bright-neutral dots (local max + ring-contrast gap ≥0.18 +
   measured radius). Scored on the same scale as blobs
   (`gray + gap·2.5 + y/AH·0.8`), NMS-merged with blob candidates.
   Gated: only runs when no solid ball-like blob (y>0.35, score≥1.85, r 3–10)
   is present — zero cost on normal footage. Scan is bottom-up on a 2px stride
   (worst case ≈ 8 ms, typically < 1 ms).
2. **Bottom-frame bias + sky penalty** in `scanBallCands` (file mode):
   `+ (y/AH)·0.8` score bonus and `−0.5` for y<26% (sky/building zone).
3. **Lock selection** (file mode) among full-frame stable hypotheses:
   - sky veto (y<26% never locks),
   - **dark-surround veto** (≥55% dark ring ⇒ on the player's body: gloves /
     shoes / torso — measured 0.83 for the glove vs ≤0.31 for every grass
     object in both test videos),
   - **rigidity** (`dr` = max |Δr| over the hypothesis lifetime, new additive
     field in `autoLockMulti`): the ball is a rigid sphere (dr≈0.2–0.4);
     club-head glints flicker r 2↔4.5 (dr≥2.5). Ties (|Δdr|≤0.35) fall back
     to larger r (v35.1 behavior).
4. **Impact trigger** (app `armedStep`): added the swing-burst path
   (`!found && dens>0.085`) — a full-frame swing moving the background around
   the lock point even when the ball pixel is momentarily lost.

No early lock: the ball accumulates its full frame budget naturally
(~f13–19), transient blobs (e.g. a 10-frame sparkle) can no longer win.

| Test | Result |
|---|---|
| Syntax (app + math-core) | OK |
| harness.js | 28/28 |
| OLD video (driving-range) faithful E2E ×2 | 5/5 each — lock f13 (158,307)=ball, impact f68, 96 matched |
| OLD video clean E2E | 3/3 — lock f13, impact f62, 102 matched |
| NEW video (user's full-shot, castle bg) faithful E2E ×2 | 5/5 each — lock f13 (246,575)=ball (truth 243,578), impact f60 (real swing), 275 matched |
| scanWhiteDots benchmark | worst ≈ 8 ms (washed-out bright scene), <1 ms typical |
| Camera mode | untouched (all changes behind `mode==='file'`; `dr` additive) |

Two-tap force lock (v35.3) remains the guaranteed manual fallback.

## v35.5 — Temporal tracker patch: tee leftover + single-frame drive impact (ثبات شعاع)

Patch only — no rebuild, no UI redesign, camera path byte-identical.

Night driving-range video (`7812815825833274980.mp4`): v35.4 **locked the
ball** at f13 (314,568) but impact fired **53 frames late** (f181 vs true f129)
because the **white tee stick** stayed in the local search window after the
ball left. `found=true` with jump≈0 blocked the swing-burst path
(`!found && dens>0.085`); the putt-drift path then false-fired at f181.

This is the temporal-tracking failure described in the tracker architecture
(§13 radius consistency, §16 ball lock, §18 impact, §4 reject tees): the
detector is not the problem — a stationary white object hijacked the locked
ball ID.

Fixes (file mode only):

1. **`filledRingR`** — filled-disk radius at a candidate pixel (20 angular
   samples per ring, stop at first ring with <50% bright). A golf ball is a
   filled sphere (`sr ≈ r`); a tee is a thin stick (`sr ≈ 1`).
2. **armedStep** — if `sr < ball.r·0.5`, `found=false` (tee leftover is not
   the ball). Unblocks swing-burst at the real impact frame.
3. **Single-frame drive burst** — a 30 fps drive is a **one-frame** event
   (`dens=0.104` at f129, `0.012` at f130). Requiring two consecutive high-dens
   frames reset `impactCnt`. File mode: `dens≥0.10 && !found` → `impactCnt=2`.
4. **trackStep** — drop candidates with `r < 0.5·ball.r`; local-pixel matches
   must pass `filledRingR` (tee cannot re-steal the track).
5. **File-mode tracer** slightly thicker (glow closer to broadcast overlays).
6. Trailing duplicate `</html>` junk removed.

| Test | Result |
|---|---|
| harness.js | 28/28 |
| OLD video (putt) SHAKE_STEP=0 | lock f13 (158,307), impact f68, 96 matched — no regression |
| PREV video (castle full-shot) | lock f13 (246,575), impact f60, 275 matched — no regression |
| NIGHT video (tee drive) | lock f13 (314,568)=**ball**, impact **f129** (true strike; was f181) |
| Camera mode | untouched (`mode==='file'` gates) |

Remaining limitation (architecture §29): this night drive at **30 fps** makes
the in-flight ball invisible after 1 frame (gone from the tee at f129, no
stable blob in the 320-wide grid). The tracer after impact is the ballistic
reconstruction from lock+impact, not a pixel track of a 1-px streak. Higher
frame-rate cameras (120/240) are required for in-flight pixels on a full
drive. Putts and slower chips remain pixel-tracked.
