# PWA Usage

## What Users Get

Sierra Invoices can be installed as a Progressive Web App.

When installed:

- it appears on the home screen like an app
- it opens in a standalone app window
- core screens and the offline page are cached for weak connections

## Install Paths

### Chrome, Edge, and most Chromium browsers

Users can:

- click the in-app `Install App` button
- or use the browser install option

### Safari on iPhone or iPad

Safari does not always show the same install prompt event.

Users should:

1. open the Share menu
2. choose `Add to Home Screen`

## Good User Guidance

Tell users:

- the installed app is the same account and data as the web app
- they still need internet for live data, sending emails, and payments
- the offline screen is a fallback, not full offline editing

## Current Implementation Notes

- manifest is served from `/manifest.webmanifest`
- service worker is served from `/sw.js`
- install state is surfaced in the navbar and settings
