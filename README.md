# PriorityDesk website

A standalone, responsive product website. This folder is separate from the PriorityDesk app; the website does not read or change app data.

## Preview locally

From this folder, run `python -m http.server 4173 --directory dist`, then open http://localhost:4173. The static files also work by opening `dist/index.html` directly.

## Contents

- `dist/index.html`: product page and accessible FAQ.
- `dist/privacy.html`: PriorityDesk privacy policy, linked from the website footer, with Taynium as the developer and prioritydesk.app@outlook.com as the contact email. Covers the Windows and Android apps. Last updated 15 October 2026.
- `dist/privacy.css`: privacy page typography and layout.
- `dist/styles.css`: responsive layout, colours, and typography.
- `dist/script.js`: example task preview with filtering, completion, task selection, adding, and resetting. Sample tasks only exist in page memory.
- `dist/mark.svg`: website favicon based on the current app's square check-mark branding.

The website describes features documented in the app README. OneDrive sync is labelled preview, Android is described as early development, and there is no public download or invented signup service. Add an approved release link when one is available. Google Fonts supplies DM Sans and Manrope; system fonts are the fallback.

## Publishing

Repository: https://github.com/ltaylor8891/prioritydesk-website

Website: https://ltaylor8891.github.io/prioritydesk-website/

GitHub Pages publishes `dist` through `.github/workflows/pages.yml` whenever website changes are pushed to `main`. Only website files are published. Local `.openai` metadata is excluded from Git.

See [DOMAIN-SETUP.md](DOMAIN-SETUP.md) for the exact IONOS DNS records and steps for connecting `prioritydesk.co.uk` and enabling HTTPS.
