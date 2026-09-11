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
