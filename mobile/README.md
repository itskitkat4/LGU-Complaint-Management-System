# BantaySerbisyo Mobile

React Native app built with Expo (SDK 58) and Expo Router. It uses the same Laravel API and Supabase project as the website.

## What works now
- Email/password sign in in Expo Go; Google sign in in an Android development or production build (Supabase Auth)
- Role-verified entry points for citizens, System Administrators, LGU Staff, Department Heads, Department Personnel, and Barangay Heads
- SecureStore-backed session persistence, with a one-time migration from the previous AsyncStorage session
- Citizen onboarding: choose a barangay
- Home with complaint counts
- Complaint list with paging
- New complaint with category, title, description and up to 5 photos
- Complaint details: photos, approved resolution, status history

The non-citizen role entry points are foundation screens; their complaint-management modules are part of Phase 3.

## Run it
1. Install Node 20 or newer. Expo Go can be used for general development and email/password sign in.
2. Copy `.env.example` to `.env`.
3. Fill `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with the values from `frontend/.env`.
4. Set `EXPO_PUBLIC_API_URL` to `http://<your laptop Wi-Fi IP>:8000/api`.
5. Start the API so your phone reaches it:
   `cd backend && php artisan serve --host=0.0.0.0 --port=8000`
6. Start the app for Expo Go:
   `cd mobile && npm install && npm run start:go:tunnel`
7. Scan the QR code with Expo Go. Phone and laptop must use the same Wi-Fi.

The Expo Go commands explicitly use `--go`, which is required because `expo-dev-client` is also installed in this project. A QR code beginning with `exp+bantayserbisyo://` is for the development client and cannot be opened by Expo Go. Stop any previous Expo server with Ctrl+C and scan the QR code from the new Expo Go server.

Android emulator: use `http://10.0.2.2:8000/api` as the API address.

Google sign-in uses Supabase Auth's PKCE flow and Expo Router deep links. Expo SDK 58 does not support reliable local OAuth testing in Expo Go because Expo Go cannot register this app's custom URL scheme. The app logs the runtime redirect URI and stops before opening the browser when run in Expo Go.

Configure redirects in the existing services:
- **Google Cloud OAuth client:** retain the existing Supabase Auth callback as an Authorized redirect URI (typically `https://<project-ref>.supabase.co/auth/v1/callback`). Do not replace it with the app's `bantayserbisyo://` URL.
- **Supabase Auth > URL Configuration > Redirect URLs:** allow `bantayserbisyo://login` for the installed development/production build. Expo Go generates a transient `exp(s)://<current-dev-server-host>/--/login` URL; an allowlist entry cannot make Expo Go reliably handle this OAuth callback.

The installed app uses the exact `bantayserbisyo://login` URL for Supabase `redirectTo` and `WebBrowser.openAuthSessionAsync`; Expo Router handles the `/login` deep link, and the callback exchanges Supabase's PKCE code for a session. The app logs callback URLs without query strings or fragments, so authorization codes and tokens are never written to logs.

## Android development build

The Android application ID is `com.bantayserbisyo.mobile`, and the `bantayserbisyo` URL scheme is registered by the Expo config. Generate and install a local development build with Android Studio, Android SDK/ADB, and a compatible JDK installed:

```powershell
npx expo install expo-dev-client
npx expo run:android
```

On Windows, install Android Studio with the Android SDK and platform tools, and install a compatible JDK before running the local build. Connect the phone with USB debugging enabled and accept its authorization prompt. The API URL in `.env` must use the laptop's Wi-Fi address so the phone can reach Laravel.

After the development build is installed, start the Metro server in development-client mode on the same Wi-Fi network:

```powershell
npm run start:dev-client -- --lan
```

Open the **installed BantaySerbisyo development app**, not Expo Go, and connect it to the running server. For Google sign-in, allow `bantayserbisyo://login` in Supabase Auth Redirect URLs.

For an internal APK using EAS Build, sign in to an EAS account and run:

```powershell
npx eas-cli@latest build --profile development --platform android
```

This command starts a cloud build and may use EAS build-plan quota; it is not run automatically by this project. Install the resulting APK from the EAS build page, then start the dev-client Metro command above. Keep Google Cloud's authorized redirect set to the existing Supabase Auth callback.

Run the mobile checks with `npm run lint` and `npx expo install --check`.

## Folder map
- `app/` screens and routes (Expo Router, one file per screen)
- `src/lib/api.js` all API calls (same routes as `frontend/src/lib/api.js`)
- `src/lib/supabase.js` Supabase client and encrypted session storage
- `src/context/AuthContext.jsx` session, profile and sign out
- `src/components/` shared UI pieces

## Not built yet
- Staff, Barangay Head and Department workflows and dashboards (Phase 3)
- Citizen notifications, feedback, and help/support
- Production build with EAS and an HTTPS API address
