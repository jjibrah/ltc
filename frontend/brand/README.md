# Living The Charge logo assets

The owner-supplied original is retained at `source/logo.jpeg`. The active logo is
the LTC tree mark from that artwork; its former crest has been removed from the
served frontend. Historical preservation manifests are retained as evidence.

Public exports live in `frontend/public/brand/`:

| Asset | Use |
| --- | --- |
| `ltc-logo-white.svg` | Transparent white mark for hero navigation, footer, dark admin, profile submission and unsubscribe pages |
| `ltc-logo-navy.svg` | Transparent navy mark for scrolled/mobile navigation, login/password pages and light admin |
| `ltc-logo-white.png`, `ltc-logo-navy.png` | 512 × 512 raster exports; the navy version also supplies structured-data branding |
| `ltc-social-preview.png` | 1200 × 630 opaque sharing card with centered logo, organization name and existing tagline |
| `ltc-icon-32.png`, `ltc-icon-192.png` | Browser icon fallbacks |
| `ltc-apple-touch-icon.png` | 180 × 180 Apple touch icon |

`frontend/public/favicon.svg` and `favicon.ico` use the same mark. The ICO includes
16, 32 and 48 pixel images. The navy `#0d304b` comes from the supplied artwork.
SVG silhouettes were traced from the JPEG, rather than creatively redrawn.

The shared `frontend/index.html` declares the sharing card in Open Graph and
Twitter/X metadata before JavaScript runs. Public SPA routes inherit that HTML.
Existing robots settings and authentication protections are unchanged.

`AppLoadingScreen` shares the navy mark across route, session and permission
loading states. CSS reveals the logo, gently pulses it and sweeps an indeterminate
line. On each full application opening, the logo screen remains visible for at
least one second while route code loads concurrently. Later SPA navigation uses
the existing loading states without another minimum delay. Reduced-motion
preferences show a static version. Loading timers are cleared on unmount;
session and permission checks keep their existing behavior.

Deploy the reviewed frontend build through the existing owner-managed release
process. Check root/deep-link HTML and `/brand/ltc-social-preview.png` after
deployment, and refresh relevant CDN/platform preview caches. Platforms control
whether they show previews and when they recrawl them.

Do not delete old live hashed bundles until the release observation/rollback
window is accepted. Removing former source logo files does not authorize wiping
the production bucket or changing AWS settings.
