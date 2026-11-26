# BantaySerbisyo Frontend

The BantaySerbisyo frontend is a React web application for citizens and local government staff. It provides Google sign-in, citizen complaint submission and tracking, staff review and assignment workflows, resolution and feedback screens, and administrative dashboards. It calls the Laravel API for application data and uses Supabase Auth for browser sign-in and sessions.

The Laravel backend is in `../backend`. The frontend is not a standalone application: protected features require the backend API and a configured Supabase project. The AI complaint assistant additionally requires the backend's Groq configuration.

## Stack and prerequisites

- Node.js `^20.19.0` or `>=22.12.0` (Vite 8 requirement) and npm.
- React 19, React Router 7, Vite 8, and Supabase JS 2.
- Tailwind CSS 4 through `@tailwindcss/vite`.
- A reachable BantaySerbisyo Laravel API and Supabase project.

The repository includes `package-lock.json`; use `npm ci` to install the locked dependency tree.

## Local setup

From the repository root:

```sh
cd frontend
npm ci
```

There is no committed frontend `.env.example`. Create an untracked `.env.local` with the required public Supabase settings and optional API URL described below. Do not add secrets to this file; Vite variables are exposed to browser code.

Start the Laravel backend in a separate terminal first, following `../backend/README.md`. Then run the frontend development server:

```sh
npm run dev
```

Vite opens the site automatically. The Vite configuration proxies `/api` to `http://127.0.0.1:8000`; run Laravel on that host and port, or set `VITE_API_URL` to the correct backend origin/API path.

## Frontend environment variables

| Variable | Required | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL used by the browser Auth client. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Public Supabase publishable key used to initialize the browser client. It is designed for frontend use; never use a Supabase secret/service-role key here. |
| `VITE_API_URL` | No | Laravel API origin or API base. Defaults to `/api`; the client appends `/api` when the configured value does not already end with it. For local development, leave it unset to use the Vite proxy. |
| `DEV_ALLOWED_HOSTS` | No | Comma-separated exact hostnames Vite may accept for trusted remote development. Wildcard and suffix patterns are discarded by the project parser. Not a `VITE_` browser variable. |

Restart Vite after changing `.env.local`. Keep backend-only settings such as `SUPABASE_SECRET_KEY`, database credentials, and `GROQ_API_KEY` in the backend environment only.

## Authentication and API connection

Supabase Auth manages browser sessions. The login screen supports Google OAuth and password sign-in; Google OAuth must be enabled in Supabase Auth and configured with the provider credentials and redirect allow-list there. The application redirects Google sign-in back to `/login?auth=google` on the current frontend origin. Staff invite/password setup also uses Supabase Auth; configure the backend `FRONTEND_URL` and Supabase redirect allow-list as described in `../backend/README.md`.

For API requests, the frontend reads the current Supabase session and sends its access token in `Authorization: Bearer ...`. Laravel verifies the token and applies the application's profile, role, and record authorization. Complaint records and workflows are served by Laravel against the configured PostgreSQL database; they are not read directly from the browser through Supabase database queries.

The browser uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Private Storage operations, Auth Admin actions, and Groq requests are performed by the backend. Cross-origin API deployments must configure the backend's `FRONTEND_URL`/CORS and the appropriate Supabase Auth redirect URLs.

## Available npm scripts

Run these from `frontend/`:

```sh
npm run dev       # Start Vite development server
npm run build     # Create the production bundle in dist/
npm run preview   # Preview the built bundle locally
npm run lint      # Run ESLint
```

The frontend does not include an automated test runner. Use the role-by-role
manual walkthrough in `../docs/MANUAL-UAT-CHECKLIST.md` to verify the running
UI and its API workflows.

Build and preview:

```sh
npm run build
npm run preview
```

A production bundle still needs a reachable Laravel API and Supabase configuration. The repository does not specify a production hosting provider or URL.

## Troubleshooting

- **Vite refuses to start:** check Node with `node --version`; use a version supported by Vite 8, then rerun `npm ci`.
- **Supabase client initialization or sign-in fails:** check `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, confirm the project is reachable, and confirm Google is enabled with the correct callback allow-list.
- **API calls return connection errors:** start Laravel on `127.0.0.1:8000` when using the default development proxy. For a different origin, set `VITE_API_URL` and configure backend CORS.
- **API calls return 401/403:** sign in again and verify the Supabase session, backend Supabase Auth settings, and the account's active application profile and role.
- **Remote tunnel is blocked:** add only its exact hostname to `DEV_ALLOWED_HOSTS`, then restart Vite. Do not use wildcard host patterns.
- **AI assistant is unavailable:** verify the backend Groq configuration; the Groq key is not a frontend variable.

Do not commit `.env.local` or place database credentials, Supabase secret/service-role keys, or provider API keys in any `VITE_` variable.
