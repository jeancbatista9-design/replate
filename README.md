# RePlate

A polished household food-waste demo rebuilt from the supplied single-file prototype. Starts with a three-second food-and-plate launch animation, followed by username/password signup or sign-in. Continue as a guest to open **The Green Kitchen** with the existing sample groceries and profiles. No external API key is required.

## Run

Requires Node.js 24 or later. There are no dependencies to install.

```sh
npm start
# Open http://localhost:3000
npm test
```

If Node isn't on your PATH on this Mac, use the bundled runtime:

```sh
/Users/alexarias/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node server/index.js
/Users/alexarias/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/*.test.js
```

## Demo walkthrough

1. Open Smart Scan and choose peanut butter to see Sam's allergy warning, or spinach to see duplicate detection.
2. Add a sample product to the shopping list.
3. Check off purchased groceries, then put them away with a storage location and date.
4. Edit quantities, prices, known allergens, and package dates in My Kitchen.
5. Open a meal idea, add missing ingredients, and plan it for a day.
6. Mark food used, wasted, or set aside for donation; see the impact report and undo status changes.
7. Edit household dietary profiles and see recommendations change.

All these workflows save in a local SQLite database. Sample scans and nutrition values are clearly identified as demo data. Native camera detection is optional and browser-dependent; manual real-product lookup uses Open Food Facts with an eight-second timeout and a one-day cache. Network outages do not affect sample products.

## Structure

```text
server/index.js      HTTP server, REST endpoints, static hosting
server/db.js         SQLite schema and database connection
server/auth.js       Password hashing and cookie sessions
server/domain.js     Food validation and recipe recommendations
public/index.html    Application entry
public/styles.css    Responsive design system
public/js/app.js     Navigation, forms, and user interactions
public/js/views.js   Screen and component templates
public/js/api.js     API client
public/js/ui.js      Formatting, icons, dialogs, and toasts
tests/app.test.js    Workflow and authorization tests
reference/original.html  Unmodified source prototype
data/replate.sqlite  Generated persistent database (ignored)
```

## Configuration and deployment

`PORT` defaults to 3000, `HOST` to 0.0.0.0, and `DB_PATH` to `data/replate.sqlite`. Run from this repository directory. Set `HOST=0.0.0.0` inside a container or host environment. Use a persistent disk for the SQLite database and HTTPS through a reverse proxy. Back up the database using SQLite's backup facilities; do not copy only the main database while WAL writes are active.

`NODE_ENV=production` adds Secure to session cookies, requiring HTTPS. `DEMO_MODE=false` disables creation of public demo sessions. The UI provides username/password signup and sign-in alongside guest entry. Guest entry and simulated paid membership changes require demo mode.

**This is a demo, not a public multi-tenant launch.** Visitors share the demo household. The backend includes account/session and household invitation primitives for future expansion, with signup, sign-in, sign-out, and session restoration. There is no password reset, email verification, subscription billing, actual donation coordination, video feed, push notifications, or AI image recognition. Recipe ideas are curated fixtures. Profile and nutrition checks are incomplete and do not certify allergen or food safety. Prices measure recorded food value, not proven savings. Freeze dates must be supplied by the user.

Before a public release: disable shared guest entry for production and review account onboarding; deploy with HTTPS, access controls, durable backups, and persistent rate limiting; add operational monitoring and reviewed dietary matching. This version deliberately focuses on the household demo requested.

API references: [Open Food Facts](https://openfoodfacts.github.io/openfoodfacts-server/api/) and [Node.js SQLite](https://nodejs.org/api/sqlite.html). Product lookup data is attributed to Open Food Facts contributors under ODbL; sample product values are illustrative.

## Membership and app demo

RePlate Free includes the everyday kitchen, dates, unrestricted basic barcode nutrition and allergy warnings, manual shopping, recipes, basic impact, and 2 profiles. RePlate+ is $4.99/month or $39.99/year and unlocks unlimited personalized Smart Scan reviews, illustrative 0–100 scores, sample alternatives, a seven-day assistant planner, grocery generation, expiration meal ideas, monthly insights, and up to 6 profiles. Family is $7.99/month with up to 12 profiles and the shared household tools.

Membership selection is simulated and persisted; no payment processor, payment details, charges, or renewals exist. Cancellation returns to Free immediately without deleting inventory, plans, lists, or existing profiles. Paid endpoints reject Free requests. Planner and personalized reviews use deterministic demo logic, not an external AI or validated health model. Basic allergy information is always available.

The app includes a web app manifest, PNG icons, a standalone display mode, mobile bottom navigation, safe-area padding, and a service worker for the app shell. Install from the Household screen or a supported browser's install menu. On iOS, use Safari → Share → Add to Home Screen. This is a progressive web app, not an App Store native binary. Installation on other devices requires a reachable HTTPS host. Offline shell caching does not make the database workflows offline; the backend must be running.

## iPhone testing over Wi-Fi

The development server now binds to `0.0.0.0` by default. Run `npm start` (or the bundled Node command above); startup prints both localhost and available LAN URLs. Keep the Mac and iPhone on the same Wi-Fi and open the printed LAN URL in Safari. The current Wi-Fi URL is `http://10.53.129.236:3000`; this address can change when you reconnect. Keep the Mac awake and the server running. Guest/campus Wi-Fi may isolate devices; if the URL does not load, use a private network and allow the Node process through the Mac firewall if prompted.

In Safari, choose Share → Add to Home Screen → enable Open as Web App where offered → Add. RePlate includes an opaque 180px Apple icon, separate maskable icon, manifest with standalone mode, 22 portrait/landscape iPhone startup images, a branded loading screen, safe-area padding, and mobile input sizes that avoid focus zoom. Actual launch-image behavior depends on iOS and the device size. Existing installations may need to be removed and re-added to refresh icon and startup metadata.

The HTTP LAN URL is for interface and demo workflow testing. Service workers/offline shell caching and camera permission APIs require a secure context on the iPhone: HTTPS with a trusted certificate or HTTPS hosting. A localhost exception on the Mac does not extend to the Mac's Wi-Fi IP address. No HTTPS certificate has been installed or device trust settings changed. Database workflows require the backend even when the shell is cached. Use `HOST=127.0.0.1` to return to Mac-only access.

PWA references: [Apple web-app configuration](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) and [MDN service-worker secure contexts](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).

## Plate branding and first-open experience

The logo, favicon, PWA icons, Apple icon, and all launch images now use a plate with a leaf and a warm food accent. The app plays a roughly three-second CSS animation placing vegetables onto a plate on launch. Reduced-motion users get a still composition. Returning users with a valid session go to their kitchen after the animation; first-time users see signup, sign-in, and Continue as a guest. Username/password accounts use server-side salted scrypt hashes and HTTP-only sessions. Usernames are case-insensitive, 3–24 characters; passwords require 10–128 characters. Guest uses the existing shared demo household. Accounts receive a separate sample-filled kitchen. Sign out or switch accounts from Household. Re-add existing home-screen installations to refresh the platform-cached app icon and launch images.

## Button feedback and real phone scanning

All enabled buttons receive delegated touch/mouse/keyboard press feedback. A pulse persists across screen re-renders and tab/page transitions are subtle. Reduced-motion preferences disable movement. Labels use consistent capitalization while submitted storage, diet, and allergen values stay unchanged.

The current real-camera path still relies on native `BarcodeDetector`. For dependable iPhone grocery-store use, add a bundled cross-browser UPC/EAN decoder (for example `@zxing/browser`), serve the app and backend over trusted HTTPS accessible through cellular data, and keep the product lookup integration. The existing local Wi-Fi development URL is not accessible after leaving that network. Open Food Facts can resolve many food barcodes, but missing products, connectivity, camera focus, and label data coverage must be handled. A typical grocery barcode identifies the product; package-specific expiry and store prices still need separate entry or another data source. This change adds interaction polish, not an untested claim of universal iPhone camera support.


### Real phone scanning
The locally bundled ZXing Browser 0.1.5 decoder reads grocery UPC/EAN barcodes in Safari using the rear camera. Video stays on the device; only the decoded barcode goes to the RePlate server for Open Food Facts lookup. Camera access requires HTTPS and permission from the user. Stop Camera, page navigation, and leaving the app release the camera. Product coverage depends on Open Food Facts. Physical iPhone scanning still needs device testing.

For an isolated phone test, run `HOST=127.0.0.1 PORT=3001 DB_PATH=/private/tmp/replate-phone-demo.sqlite TRUST_PROXY=1 NODE_ENV=production node server/index.js`, then `cloudflared tunnel --url http://127.0.0.1:3001 --protocol http2`. TRUST_PROXY is only for the loopback server behind the trusted tunnel. Use the generated HTTPS URL. Both processes and the Mac must stay running. The link is temporary and changes after restarting the tunnel. The default port 3000 database remains separate.

Nutrition goals are saved separately per household profile. The demo compares protein, fiber, total/added sugar, saturated fat and sodium per 100 g using explicit comparison rules. It does not call an AI service. Display values round to whole numbers while assessment uses the original precision. Unknown foods show a package instead of a random produce emoji. Guidance on nutrients to compare: https://www.fda.gov/food/nutrition-facts-label/how-understand-and-use-nutrition-facts-label . Comparison cutoffs are demo heuristics, not FDA per-serving Daily Value classifications.


Serving-based nutrition supersedes the earlier demo score: the app prefers supplied per-serving facts, scales per-100 values only with a known serving quantity, and explicitly labels per-100 fallback data. Calories per serving use US nutrition-label rounding (above 50: nearest 10; 5–50: nearest 5; below 5: zero). FDA Daily Values provide nutrient comparisons (sodium 2300 mg, saturated fat 20 g, added sugar 50 g, fiber 28 g); 5% or less is low and 20% or more is high. Protein uses an explicit demo comparison target of 10 g per serving. The app no longer invents an overall /100 health score. Missing serving sizes or nutrients prevent affirmative overall conclusions. Shopping duplicates do not affect nutritional fit. Product databases may differ from a particular package; use the package label to verify.

Consistency checks compare kcal against kJ and approximate macronutrient energy. Significant conflicts withhold other nutrient displays and personalized judgments; reported calories remain explicitly unverified. Re-scan previously saved products that lack serving metadata. No database can guarantee every package is current or correctly entered.

RePlate now displays an explicit five-level Nutrition Index mapped from the provider's Nutri-Score grade: A90/B70/C50/D30/E10. This is a coarse display conversion, not a validated precise /100 health model and not Yuka's 60/30/10 methodology. Grades missing or facts failing consistency checks remain unrated. Goal-fit and household allergy/diet checks influence buying guidance independently of the nutrition index. Grades persist with saved scans; re-scan legacy saved products that lack grade metadata.

The latest scoring and lookup pipeline is documented in [docs/nutrition-method.md](docs/nutrition-method.md). It supersedes earlier grade-to-index implementations. Native macOS OCR requires the compiled scripts/read-label executable (npm run build:ocr). USDA fallback accepts only exact barcode matches, using the rate-limited DEMO_KEY by default; configure USDA_API_KEY for sustained testing. Same-flavor manufacturer references are visibly marked and require label confirmation.
