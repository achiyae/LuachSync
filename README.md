<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# HC4GC
Hebrew Calendar for Google Calendar


## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` and set your keys:
   ```bash
   VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
   ```
3. `VITE_GOOGLE_CLIENT_ID` is required for automatic Google Calendar sync (create new calendar + upload events).
4. Do not put OAuth Client Secret or service-account private keys in this project.
3. Run the app:
   `npm run dev`

## Google Calendar Auto Sync Setup

This app can create a new Google Calendar programmatically and upload events into it.

### 1. Google Cloud Console

1. Create or select a Google Cloud project.
2. Enable Google Calendar API.
3. Create OAuth 2.0 Client ID of type Web application.

### 2. OAuth Allowed Origins

Add these under Authorized JavaScript origins:

1. Local dev: `http://localhost:3000`
2. GitHub Pages origin: `https://achiyae.github.io`
3. Your app URL `https://achiyae.github.io/HebrewCalendar/` is covered by that origin (path is not added in origin settings).

### 2.1 Existing Calendar Behavior

1. The app now asks for a custom target calendar name.
2. If a calendar with that exact name already exists in the signed-in account, you will get a confirmation warning.
3. If you approve, all existing events in that calendar are deleted first, then the new sync is uploaded.

### 3. Security Notes

1. Safe in frontend: OAuth Client ID.
2. Never expose in frontend: OAuth Client Secret, service-account JSON private key.
3. API key is not needed for this write flow.

## Deploy to GitHub Pages

1. Build:
   `npm run build`
2. Deploy:
   `npm run deploy`
3. In repository settings, enable GitHub Pages from the `gh-pages` branch if not already enabled.
