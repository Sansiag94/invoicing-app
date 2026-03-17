# Native Readiness

## Current State

The app is in a good place to start discussing device-native usage:

- core payment flows are stable
- Stripe platform vs connected-account behavior is separated
- shared confirmations and toasts are consistent
- key screens have improved small-screen layouts
- focused unit tests cover core helper logic
- lint and production builds are green

## Best First Path

The best first "native" path is usually:

1. polish the mobile web experience further where real usage reveals friction
2. ship as a strong PWA
3. only then decide whether to wrap it or build true native screens

That keeps one codebase moving while validating how often users actually install and use it on phones.

## Things Already Friendly For Device Use

- responsive layouts for settings, clients, and public invoice payment
- authenticated app shell with mobile navigation
- installable web foundation through the existing manifest
- public payment pages that work outside the logged-in app

## Things To Review Before Wrapping As An App

- push notifications for reminders, due invoices, and payment updates
- upload behavior for receipts and logos from phone cameras
- offline and poor-connection behavior for dashboards and forms
- auth session handling during long-lived mobile usage
- deep linking from emails into invoices, reminders, and payment pages
- file download/open behavior for PDFs on iPhone and Android

## Packaging Options

### Option 1: PWA

Best when:

- you want the fastest path
- web and mobile should stay almost identical
- app-store distribution is not required yet

### Option 2: Wrapped Web App

Examples include Capacitor-style packaging.

Best when:

- you want app-store presence
- the app remains mostly web-based
- you need access to device APIs such as push notifications or camera flows

### Option 3: True Native App

Best when:

- the mobile app needs a clearly different UX
- offline-first behavior matters a lot
- device integrations become a major part of the product

## Recommended Next Discussion

When we discuss the device strategy, we should decide:

1. whether you want installable web only or app-store distribution
2. whether push notifications are required
3. whether receipt capture from camera is important
4. whether offline invoice viewing/editing matters
5. whether the phone app should be the same product as web, or a lighter companion app
