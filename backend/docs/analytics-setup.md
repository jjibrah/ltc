# GA4 setup and verification

The GA4 integration is implemented, but no Google account/property/service account was created or contacted. No credentials were read or edited. Public collection stays disabled by owner choice; no consent banner or public visual change was added. No SQL or database migration is required for the GA4 report endpoint.

## 1. Create the Google Analytics property

In [Google Analytics](https://analytics.google.com/), create an account/property for Living The Charge and a Web data stream for the public website. Choose the reporting timezone deliberately (for example Africa/Nairobi for the organisation) and record both IDs:

- **Property ID**: numeric; used only by the backend reporting API.
- **Measurement ID**: starts `G-`; a public frontend identifier used for future collection.

Follow [Google's property/data-stream setup](https://support.google.com/analytics/answer/9304153?hl=en). This app uses explicit manual SPA page views; disable **Enhanced Measurement** on the stream before any future tracking activation to avoid automatic history/form/click/download events or duplicate views. Do not paste Google's general-purpose snippet into index.html or use a second tracking tag alongside this integration. Google signals/ad personalisation are disabled in the tracker; leave advertising integrations off for this setup.

## 2. Configure read-only reporting

Create/select your Google Cloud project, enable **Google Analytics Data API**, create a service account and obtain its credential JSON locally. In GA4 **Property access management**, add its `client_email` with **Viewer** access. Cloud project access alone does not grant GA4 property access. Use [Google's API quickstart](https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart) and [service-account authentication documentation](https://developers.google.com/identity/protocols/oauth2/service-account).

Set these values in ignored `backend/.env`, locally; never paste credential JSON or private keys into chat:

```dotenv
GA4_ENABLED=true
GA4_PROPERTY_ID=YOUR_NUMERIC_PROPERTY_ID
GA4_CLIENT_EMAIL=YOUR_SERVICE_ACCOUNT_CLIENT_EMAIL
GA4_PRIVATE_KEY="YOUR_PKCS8_PRIVATE_KEY_WITH_ESCAPED_NEWLINES"
GA4_HOSTNAMES=livingthecharge.org,www.livingthecharge.org
```

`GA4_PRIVATE_KEY` is the JSON `private_key` value, including its BEGIN/END lines; represent newlines as literal `\n` in the quoted .env value. Use the actual deployed hostnames, without scheme/path/port. Do not put this key in frontend `.env`, VITE variables, source, images or browser storage. The backend uses read-only OAuth scope, bounded requests, token reuse, report coalescing, a five-minute per-process report cache and a 30-second failure backoff.

Restart the Node API using `cd backend` then `npm run dev`. Open Admin → Settings to check configuration status, then Dashboard → Website traffic to verify report access. A configured status means required values are present; it is not proof that Google granted access. Failed authorization, quota/network errors and malformed responses remain unavailable, never healthy or fabricated zeros.

Reports cover the last **7/30/90 complete days**, ending yesterday in the property's reporting timezone. Data is limited to configured hostnames and static public paths `/`, `/about`, `/mission`, `/impact`, `/stories`, `/team`, `/donate`, `/mentor`. Users are GA4 identifiers, not verified people. Popular pages/sources/countries are top-five lists. Daily records only contain dates Google returned; zero-only dates can be absent. Google thresholding/sampling/other-row limitations are announced when reported.

## 3. Keep public collection OFF now

Owner instruction: preserve the public design and connect consent later. Configure ignored `frontend/.env` for preparation only:

```dotenv
VITE_GA4_ENABLED=false
VITE_GA4_MEASUREMENT_ID=YOUR_G_MEASUREMENT_ID
VITE_ANALYTICS_HOSTNAMES=livingthecharge.org,www.livingthecharge.org
```

Leave `VITE_GA4_ENABLED=false`. A new property will have no traffic from this implementation while collection is off. Existing historical data from that property can still be read if any exists. The optional analytics dashboard link in Settings is a shortcut only; it neither configures credentials nor enables collection.

A later separately scoped consent control can set `localStorage['ltc-analytics-consent']` to `granted`/`denied` and dispatch `window.dispatchEvent(new Event('ltc:analytics-consent'))`. Integrate grant, decline, withdrawal and cookie cleanup with that control before changing the frontend build flag to true. Do not silently grant consent in startup or use developer-tools consent as a production solution. Tracking also honours Global Privacy Control/Do Not Track and excludes localhost, private/admin/portal/authentication/token/confirmation paths. Query strings, fragments, form data and payment data are never explicitly sent by this tracker. External referrers are restricted to origins; in-app referrers use the previous allowed public path. Disabling tracking sets GA4's suppression flag on private entry and consent withdrawal; Enhanced Measurement must remain off in the property.

## 4. AWS configuration (prepare only)

No resources were created or deployed. By default the CDK API has `GA4_ENABLED=false` and receives no Google credential fields. For a future owner-approved reporting deployment, add `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY`, `GA4_HOSTNAMES` to the existing environment-specific Secrets Manager JSON secret, then review synthesis using `cd infra` and `npm run synth -- --context ga4Reporting=true`. Only the API gets those fields; workers do not. Keep the service account Viewer-only. Frontend build variables remain public and collection stays false.

If the host adds a Content Security Policy, future collection requires the appropriate Google tag/connect origins; this task does not broaden an existing CSP. Confirm the actual deployed policy manually before activation. Backend Google API access needs outbound HTTPS. No database, Redis or billing-table dependency is added to GA4 reporting.

## 5. Verification and rollback

Automated mocked tests cover disabled/incomplete setup without provider calls, read-only JWT scope, filters, report parsing, concurrent/cache behaviour, invalid report ranges, provider/malformed failures, empty responses, authorization and private/no-consent tracking. Browser fixtures check populated/unconfigured/error reports and no Google script in collection-off builds. Real Google access, property configuration, data arrival and deployed CSP remain unverified until owner setup.

Manual checklist:

- Configure property ID and service account locally; Settings shows required reporting values present.
- Dashboard reports either verified Google data or a specific configuration/access error.
- Compare 7/30/90-day reports against the same GA4 property, timezone and hostname/path filters; allow processing delay.
- Confirm website requests contain no Google tracking script while the build flag is false.
- Confirm denied/private routes cannot read reports without dashboard permission.
- Before future activation, test actual consent grant/decline/withdrawal, route exclusions, no duplicate SPA views, no query/hash/form/payment details and no unexpected automatic events.

Rollback: set backend `GA4_ENABLED=false` and restart the API; keep frontend `VITE_GA4_ENABLED=false` and rebuild/release only through the owner's deployment process. Remove service-account property access/revoke credentials if required. Revert only analytics integration files if needed; preserve unrelated admin/migration work. No database cleanup or migration is involved.
