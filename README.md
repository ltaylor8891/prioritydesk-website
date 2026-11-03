# PriorityDesk website

A standalone, responsive product website. This folder is separate from the PriorityDesk app; the website does not read or change app data.

## Preview locally

From this folder, run `python -m http.server 4173 --directory dist`, then open http://localhost:4173. The static files also work by opening `dist/index.html` directly.

## Contents

- `dist/index.html`: product page and accessible FAQ.
- `dist/privacy.html`: PriorityDesk privacy policy, linked from the website footer, with Taynium as the developer and prioritydesk.app@outlook.com as the contact email. Covers the Windows and Android apps. Last updated 15 October 2026.
- `dist/privacy.css`: privacy page typography and layout.
- `dist/styles.css`: responsive layout, colours, and typography.
- `dist/launch.css`: store availability, Windows screenshot gallery and Android preview layouts.
- `dist/images/`: unmodified copies of the supplied Windows Store and Google Play screenshots.
- `dist/script.js`: example task preview with filtering, completion, task selection, adding, and resetting. Sample tasks only exist in page memory.
- `dist/mark.svg`: website favicon based on the current app's square check-mark branding.

The website reflects the Windows Microsoft Store launch and the Android companion's progress through Google Play testing. Android is marked coming soon, without a promised release date or public download link. Copy and screenshots come from the app project's Store listing assets. The interactive task demo is an illustrative example, separate from the real app screenshots. Google Fonts supplies DM Sans and Manrope; system fonts are the fallback.

## Publishing

Repository: https://github.com/ltaylor8891/prioritydesk-website

Website: https://ltaylor8891.github.io/prioritydesk-website/

GitHub Pages publishes `dist` through `.github/workflows/pages.yml` whenever website changes are pushed to `main`. Only website files are published. Local `.openai` metadata is excluded from Git.

See [DOMAIN-SETUP.md](DOMAIN-SETUP.md) for the exact IONOS DNS records and steps for connecting `prioritydesk.co.uk` and enabling HTTPS.

## LockTied support pages

The LockTied Android app is also developed by Taynium. Its standalone support pages are hosted under the existing custom domain:

- https://prioritydesk.co.uk/locktied/ — support landing page.
- https://prioritydesk.co.uk/locktied/privacy.html — privacy policy.
- https://prioritydesk.co.uk/locktied/rules.html — sharing rules and reporting contact.
- https://prioritydesk.co.uk/locktied/delete.html — data deletion request instructions.

These pages are static HTML in `dist/locktied/`, deployed by the same Pages workflow. They do not collect form submissions or load tracking scripts. Support/deletion requests use the public support email and require manual handling.

## LockTied product website (20 October 2026)

`dist/locktied/index.html` is the full LockTied product landing page, with local styles, a progressively enhanced screenshot switcher, setup steps, native FAQ disclosures, and an eligibility-labelled Google Play link. The four images are unmodified sample-artwork screenshots from the LockTied project; the logo is its existing brand SVG. No external fonts, analytics, cookies, forms, or dependencies are added.

Preview at http://localhost:4173/locktied/ using the command above. The existing privacy, rules and deletion pages are retained as published; updating the held policy drafts is a separate task. The landing page reflects the deployed monthly limits (300 images and 20 four-minute live sessions per pair) and labels Play availability as testing.

## Graphical force calculator

Mechanism Lab is hosted at https://prioritydesk.co.uk/GFC/ (`/GFC` redirects to the directory URL). Its production bundle lives in `dist/GFC/`, including the calculation worker and locally bundled fonts. Projects and calculations stay in the visitor's browser; saved projects are not uploaded to the website.

To update it, run `npm.cmd run build -- --base=/GFC/` in the Geometry source project, then copy that project's `dist` contents into `dist/GFC/` here. Keep other website folders intact. Run the source project's `npm.cmd test` before publishing and verify the worker and assets load from `/GFC/assets/`. Commit the updated bundle and push to `main` to deploy through the existing Pages workflow.

## Dead Signal

The standalone 3D FPS is hosted at https://prioritydesk.co.uk/Deadsignal/ (case-sensitive). GitHub Pages redirects `/Deadsignal` to the directory URL. The dependency-free static game files live in `dist/Deadsignal/`; all asset and module URLs resolve relative to that directory.

Source: https://github.com/ltaylor8891/dead-signal. To update, run `npm test` in the game repository and copy its `dist` contents into this directory, then commit and push to `main`. The game uses real mouse capture; play in a standalone desktop browser and click **Enter the outpost**, with Escape releasing the pointer.

Dead Signal now uses original, smooth cartoon character cutouts: thick black outlines, oversized expressive heads, and olive, khaki, and blue clothing. View the animated lineup at https://prioritydesk.co.uk/Deadsignal/characters.html. The character drawing module is bundled locally; no external images or fonts are needed.
