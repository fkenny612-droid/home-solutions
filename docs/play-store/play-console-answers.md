# Easyfix — Google Play Console answers (draft)

Prepared 2026-10-18 from the code in this repo, not from memory. Anything marked **CONFIRM** needs a human decision or a
fact only you have. Re-check this against the app before every submission: if a feature changes, the answers change.

Package: `co.za.homesolutions.app` · Version 1.0.0 (versionCode 1) · Account type: organisation

---

## 1. Store listing

**App name** (max 30): `Easyfix: Home Services`

**Short description** (max 80):
`Book trusted home service providers in Durban. Pay when the job is done.`

**Full description** (max 4000):

```
Easyfix connects Durban homeowners with home service providers — plumbers, electricians, cleaners, handymen and more — and with equipment hire.

BOOK IN MINUTES
Pick a service, answer a few questions about the job, and see the price before you pay. Choose a provider and send your request. Your booking is confirmed when the provider accepts it.

PAY WHEN THE JOB IS DONE
Your card is held, not charged, when you book. The payment is only taken once your provider marks the job complete. If the booking is cancelled, or nobody accepts in time, the hold is released.

EMERGENCY CALL-OUT
Burst pipe? Request an emergency technician for a flat R850 call-out fee. A technician has to confirm your request. If nobody confirms within 15 minutes, the request is cancelled and your card is not charged.

PROVIDERS YOU CAN CHECK
Service providers are reviewed and approved by our team before they appear in the app. You can see each provider's rating, reviews and completed jobs, and message them from the booking.

MARKETPLACE
Buy, sell, rent and find work locally: goods, property and jobs. Sellers verify their identity first, and you can report any listing.

FOR SERVICE PROVIDERS
Get job requests near you, accept the jobs you want, and build your rating. Earnings are added to your balance when a job is completed, and you can request a payout to your bank account.

EASY-HIRE
Hire event equipment, plant, transport and security guards.

Serving Durban, Umhlanga, Pinetown and surrounding areas. Questions? hello@easyfix.co.za
```
*(Do not add claims about live tracking, plan discounts, warranties or response times until they exist — see section 9.)*

**Category:** House & Home · **Tags:** home services, handyman, plumbing (pick what the console offers)
**Contact email:** hello@easyfix.co.za — **CONFIRM** the mailbox works (due within 2 days)
**Website:** https://web-three-black-11.vercel.app now → `https://easyfix.co.za` once the domain points at Vercel
**Contact phone:** optional — leave blank until a real support number exists

**Graphics you still need to produce:** icon 512×512 (adaptive icon assets already exist in `apps/mobile/assets`), feature graphic
1024×500, at least 2 phone screenshots (take them from the app with real data, see section 10).

---

## 2. Policy URLs

| Field | URL (until easyfix.co.za is connected) |
|---|---|
| Privacy policy | https://web-three-black-11.vercel.app/privacy |
| Account deletion (web) | https://web-three-black-11.vercel.app/delete-account |
| Terms | https://web-three-black-11.vercel.app/terms |

In-app deletion path (tell Google): **Profile → Delete account**.

---

## 3. App access (reviewers must be able to use the app)

Google reviewers need working logins for every role. **TODO — nothing exists yet; do not use the old demo accounts
(their passwords were disabled).** Create on production:

1. A **customer** account with a saved nothing, plus a **provider** account that is *approved* (KYC approved, skills set,
   emergency on, a trade-certificate document) so the booking flow has someone to book.
2. Give Google the two phone numbers + passwords in *App content → App access* (not in this repo).
3. Payments: say in the instructions how reviewers can pay safely. **CONFIRM** production `PEACH_MODE` — if it is `live`,
   a reviewer's card would really be held; use Peach test mode or tell them to use a test card.

Suggested instruction text:
> Sign in with the customer account. Tap Plumbing, choose "Blocked drain" and "Standard", enter any address, tap Find providers,
> then request the listed provider. Sign in as the provider account (second login) to accept the request. The Marketplace tab and
> Profile → Delete account can be tried with any account.

---

## 4. Ads, audience, content

- **Contains ads:** No.
- **Target audience:** 18 and over only. Not designed for children. (Terms require 18+; marketplace sellers are age-checked.)
- **Government app / health app / news app:** No.
- **Financial features:** none of the listed types (no banking, loans, trading, crypto, money transfer). The app takes
  payment for services through Peach Payments and pays providers out by EFT. **CONFIRM** this reading when you fill the form.
- **In-app purchases / subscriptions:** see section 8 — currently none can be bought.

### Content rating (IARC questionnaire) — expected answers
| Question | Answer | Why |
|---|---|---|
| Violence, sexual content, profanity, drugs, gambling | No | none in the app |
| User-generated content / users can interact | **Yes** | marketplace listings, booking chat |
| Shares user's location with other users | **Yes (conservative)** | the service address and booking location go to the assigned provider |
| Allows purchases of digital goods | No | payments are for real-world services |
| Unrestricted web access | No | |

Expect a rating that reflects user interaction and location sharing. Answer honestly; do not select "No" to get a lower rating.

---

## 5. Data safety form

No analytics, advertising, crash-reporting or attribution SDKs are in the app (checked `package.json`). All traffic to our API
and Cloudinary is over HTTPS.

**Does the app collect or share user data?** Yes · **Is all data encrypted in transit?** Yes ·
**Can users request data deletion?** Yes — in-app (Profile → Delete account) and web URL above.

"Shared" below means sent to someone outside Easyfix. Providers who are given a customer's details to do a job are
independent contractors, so they are declared as sharing to be safe. Payment, hosting, image, push and SMS vendors act on our
behalf. **CONFIRM** with Google's current definitions when filling the form.

| Data type | Collected | Shared with | Optional? | Purpose |
|---|---|---|---|---|
| Name | Yes | Assigned service provider | No | Account, app functionality |
| Email address | Yes | — | No (register form asks for it) | Account, communications |
| Phone number | Yes | Assigned service provider (after they accept) | No | Account/login, app functionality |
| User IDs (account id) | Yes | — | No | Account |
| Address (service and saved addresses) | Yes | Assigned service provider | No | App functionality |
| Other personal info — SA ID number | Entered by marketplace sellers; checked on our server for validity and age, **not stored** | — | Yes (only to sell) | Fraud prevention / compliance. (Likely "ephemeral" and exempt, but declaring is the cautious choice) |
| Payment info (card details) | Yes — pass through our servers to Peach Payments, **not stored by us**; we keep brand, last 4, expiry for saved cards | Peach Payments | Yes (only to book) | Payments |
| Other financial info — bank account (providers) | Yes | — (our staff use it to pay out) | Yes (only to be paid) | Payouts |
| Purchase history (bookings) | Yes | — | No | App functionality |
| Approximate + precise location | Yes — foreground only, when booking, emergency or tracking distance | Booking location goes to the assigned provider | **Yes** (can type an address instead) | App functionality |
| Photos | Yes — job photos, listing photos, chat attachments | Cloudinary (storage); provider/other party who views them | Yes | App functionality |
| Files and docs | Yes — provider ID/trade documents, chat files | Cloudinary (storage) | Yes (providers need them to be approved) | App functionality, verification |
| Messages (in-app) | Yes — booking chat | The other party in the booking | Yes | App functionality |
| Device or other IDs | Yes — push notification token | Expo (push delivery) | Yes (can decline notifications) | App functionality |

**Not collected:** contacts, calendar, call/SMS logs, health, audio, web browsing, app activity/analytics, crash logs, advertising ID.

**Security practices:** encrypted in transit — Yes · deletion mechanism — Yes · Play Families — No · independent security review — No.

> Keep this table identical to the privacy policy. If one changes, change the other.

---

## 6. Permissions the built app will request

From the module manifests actually installed in the app (before Play merges the final manifest — re-check the merged
`AndroidManifest.xml` after the first EAS build):

| Permission | Why (use this in any justification) | Notes |
|---|---|---|
| `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` | Foreground only: find nearby providers and fill in the service address | No background location → **no** Location Permissions Declaration form needed |
| `CAMERA` | Take a photo of the problem or of a document | |
| `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` | Added by the image-picker library; the app only picks photos | Not needed on modern Android; consider adding both to `android.blockedPermissions` in `app.json` to avoid review questions (untested — try it in a build) |
| `POST_NOTIFICATIONS` | Job and booking alerts | Requires Firebase set up first (section 9) |
| `RECEIVE_BOOT_COMPLETED`, `VIBRATE` | Notifications | |
| `ACCESS_NETWORK_STATE`, `INTERNET` | Connectivity | |

No SMS, call-log, contacts, background-location or "all files" permissions, so no sensitive-permission declarations are expected.

---

## 7. User-generated content (marketplace and chat)

| Play requirement | Status |
|---|---|
| Terms prohibit objectionable content | Yes — Terms sections 5 and 6 (prohibited items, harassment, fake listings) |
| In-app way to report content | **Yes** — "Report listing or block seller" on a listing, and long-press a chat message to report or block its sender |
| Reports are reviewed and acted on | **Yes** — the admin portal has a Reports screen (open reports first, with the reported content). An admin can remove a listing or message, and the person who posted it is notified in the app with the reason and an appeal email |
| Block abusive users | **Yes** — block from a chat (ban icon in the header, or long-press a message) or from a listing; manage under Profile → Blocked users. Blocking hides both people from each other in chat, the marketplace, provider search and new job requests. It does not cancel a booking already in progress |
| Age-restricted: only adults | Yes — marketplace sellers need an age-checked SA ID |

---

## 8. Subscriptions and Google Play Billing

- Customer and provider plans exist in the app, but **paid plans cannot currently be activated** (server refuses them until
  payment is built — commit "Stop paid plans activating for free"). So there are no in-app purchases today.
- When you launch paid plans: they would charge for discounts/commission/warranty tied to **real-world services**. Play Billing
  is generally required for digital goods and not for physical goods and services, but that line is a judgement call.
  **CONFIRM against the current Play payments policy before enabling paid plans**, and reflect the answer in the Terms.

---

## 9. Must be done before you can submit (blockers)

1. **Firebase / FCM:** `apps/mobile/google-services.json` is a placeholder (`home-solutions-placeholder`). Create a Firebase
   project for `co.za.homesolutions.app`, replace the file, and upload the FCM service-account key to EAS. Without it, Android push
   notifications (provider job alerts) do not work.
2. **Real support details:** set phone/WhatsApp/hours in `apps/mobile/constants/support.ts` when they exist; confirm hello@easyfix.co.za.
3. **Domain:** point easyfix.co.za at the Vercel project, then swap the URLs in section 2.
4. **Card handling:** card numbers still pass through our server to Peach. Moving to Peach's hosted checkout would take card data
   out of our systems entirely and simplify the Data safety answers (needs your Peach account details).
5. **Reviewer accounts** (section 3) and the **admin screen for reports** (section 7).
6. **Release signing / submission:** a Google service-account key for `eas submit` (the track is set to `internal`).
7. **Screenshots and graphics** (section 1).

## 10. Suggested rollout

1. Build a `preview` APK (`eas build -p android --profile preview`) and test on a real Android phone: login, a booking end to end,
   emergency request, listing + photo upload, push notification, delete account.
2. Production AAB to the **internal testing** track; invite your own testers.
3. Because the account is an organisation account you may be able to go straight to production — **CONFIRM** in the console
   (personal accounts need a 14-day closed test first). A closed test with real providers is still the safest first release.
4. Seed real providers first; an app with no approved providers shows "No providers available yet".
