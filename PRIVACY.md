# HC4GC Privacy Policy

Effective date: April 6, 2026

This privacy policy explains how HC4GC handles data when you use the app.

## 1. What the app does

HC4GC helps you manage Hebrew calendar events and export/sync them to Google Calendar.

## 2. Data collected

HC4GC does not operate a backend server for storing your personal event data.

The app may process the following data in your browser:

1. Event information you enter (for example: title, event type, Hebrew date, reminder settings).
2. App settings (for example: export preferences).
3. Temporary Google OAuth access token during a sync session.

## 3. Where data is stored

1. Your event data and settings are stored locally in your browser (Local Storage).
2. Data stays on your device/browser unless you choose to export/sync.
3. If you clear browser storage, local app data may be deleted.

## 4. Google Calendar access

If you use automatic Google sync, HC4GC requests Google OAuth permission to manage calendars/events in your Google account.

1. OAuth scope used: https://www.googleapis.com/auth/calendar
2. Access is used only to perform actions you request (such as calendar creation and event import).
3. Google OAuth access tokens are kept only in memory for the active sync flow and are not stored in Local Storage, a backend database, or a server controlled by HC4GC.
4. OAuth Client Secret and service-account private keys are not used in this frontend app.

## 5. How Google user data is shared, transferred, or disclosed

HC4GC does not sell Google user data and does not share Google user data with advertisers, data brokers, or unrelated third parties.

1. Google user data is disclosed only to Google services that you explicitly use through the app, such as Google OAuth and the Google Calendar API, in order to authenticate you and create, update, or delete calendars/events that you request.
2. HC4GC does not operate its own backend for receiving or storing your Google Calendar data or Google OAuth access tokens.
3. If you export an ICS file or upload it to another service, that transfer happens only because you choose to export or upload the file.
4. HC4GC does not use Google user data for advertising, profiling, or any purpose unrelated to the user-facing features of the app.

## 6. Export and manual import

1. You can export events to an ICS file.
2. You can manually import the ICS file into Google Calendar.
3. Exported files are handled by your browser/device and any services you upload them to.

## 7. Existing calendar warning

When using auto sync with a calendar name that already exists in your Google account, the app warns you before deletion/recreation of that calendar. You are responsible for confirming this action.

## 8. Third-party services

HC4GC may interact with third-party services only when you explicitly choose features that require them, such as:

1. Google Calendar API
2. Google OAuth

Use of those services is also subject to their own terms and privacy policies.

## 9. Data protection and security measures

HC4GC is designed to minimize handling of Google user data.

1. HC4GC is a frontend-only app and does not send your Google OAuth access token or Google Calendar data to a backend server controlled by HC4GC.
2. Communication between your browser and Google OAuth / Google Calendar API endpoints is performed over HTTPS/TLS.
3. Google OAuth access tokens are used only for the active sync request and are held in memory rather than being intentionally persisted in Local Storage or a server-side database.
4. Local app data is stored in your browser's Local Storage on your device. You are responsible for securing access to your device and browser profile.
5. OAuth Client Secret and service-account private keys are not embedded in this app.

## 10. Children and sensitive data

Do not store highly sensitive personal information in event titles/descriptions. The app is intended for general calendar/life-cycle event management.

## 11. Data retention and deletion

1. Event data and app settings that you enter into HC4GC remain in your browser's Local Storage until you edit/delete them in the app or clear your browser storage.
2. Google OAuth access tokens are retained only for the active sync session in browser memory and are not intentionally stored after the sync flow ends, the page reloads, or the browser tab is closed.
3. Calendars and events written to your Google account through HC4GC remain in your Google account until you delete them from Google Calendar.
4. You can stop future access by not using Google sync and by revoking HC4GC access in your Google account permissions settings.
5. You can request deletion of local HC4GC data at any time by deleting events in the app or clearing your browser's Local Storage for the site.

## 12. Your controls and choices

You can:

1. Edit or delete events in the app.
2. Clear browser local storage.
3. Avoid Google sync and use only local/export workflows.

## 13. Security notice

No method of electronic storage/transmission is 100% secure. Keep your device and browser secure, and review data before syncing.

## 14. Changes to this policy

This policy may be updated from time to time. The effective date above reflects the latest version.

## 15. Contact and support

For privacy questions, bug reports, or support requests, open an issue:

https://github.com/achiyae/HebrewCalendar/issues
