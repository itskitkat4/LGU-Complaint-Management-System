# BantaySerbisyo Backend

The BantaySerbisyo backend is a Laravel 13 JSON API for the citizen complaint and feedback system. It validates Supabase access tokens, applies role and record-level authorization, reads and writes the application database, stores private evidence in Supabase Storage, and provides optional Groq-powered complaint drafting.

The frontend is in `../frontend`. Run both projects for local development: Laravel serves the API on port 8000, and Vite proxies `/api` requests to it. Supabase Auth and the configured database and Storage project must also be reachable for the corresponding features.

## Stack and prerequisites

- PHP 8.3 or later within the PHP 8.x major version (the Composer constraint is `^8.3`), Composer, and PHP extensions required by Laravel and PostgreSQL (`pdo_pgsql` for a PostgreSQL connection).
- PostgreSQL for the migration-backed application schema. The project targets Supabase PostgreSQL; for local development, use a dedicated local database.
- Node.js and npm only if you also run the frontend.
- Access to a Supabase project for Auth and Storage. Groq credentials are needed only when using the AI complaint assistant.

Laravel's `config/database.php` also declares SQLite, MySQL/MariaDB, and SQL Server connections. The application schema migrations use PostgreSQL-specific SQL and PostgreSQL-specific constraints, so use PostgreSQL for the full schema and migration workflow. The backend test configuration separately uses in-memory SQLite for its ordinary suite.

## Local setup

From the repository root, install the PHP dependencies and enter the backend directory:

```sh
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

On PowerShell, use `Copy-Item .env.example .env` in place of `cp`.

Edit `backend/.env` for a dedicated local PostgreSQL database and the required Supabase settings described below. Do not point a local migration command at a production database. The default `.env.example` is Laravel's template and sets `DB_CONNECTION=sqlite`; change it for PostgreSQL before migrating.

Install PostgreSQL and make sure its service is running. Connect with a PostgreSQL account that has permission to create databases. For example, using the local default host and port, open `psql` as your PostgreSQL administrator account:

```sh
psql -h 127.0.0.1 -p 5432 -U your_postgres_admin_user -d postgres
```

At the `psql` prompt, create a dedicated local development database and exit:

```sql
CREATE DATABASE lgu_complaint_local;
\q
```

These commands are for your local PostgreSQL service; do not use them to create a database on Supabase. Database creation and Laravel migrations are separate steps: creating the empty database does not create the application tables.

Configure the `.env` connection to match the new database. For example, use `DB_CONNECTION=pgsql`, `DB_HOST=127.0.0.1`, `DB_PORT=5432`, `DB_DATABASE=lgu_complaint_local`, `DB_USERNAME=your_postgres_admin_user` (or another local account with database access), `DB_PASSWORD=your_local_postgres_password`, and `DB_SSLMODE=disable`. The `DB_DATABASE` value must match the database name created above. Then run the schema migrations against that local database:

```sh
php artisan migrate
```

This command only acts on the database selected by the backend environment. It does not deploy migrations automatically to Supabase. Review the target connection carefully before every migration; production schema changes require the project's separate deployment process.

### Seed development reference data

The available seeders contain Tagoloan barangays, departments, and complaint categories. `DatabaseSeeder` calls `BarangaySeeder` and also creates a default Laravel `User` test record; it does not seed departments or complaint categories. For a fresh local database, run only the needed seeders:

```sh
php artisan db:seed --class=BarangaySeeder
php artisan db:seed --class=DepartmentSeeder
php artisan db:seed --class=ComplaintCategorySeeder
```

Use these only in a local development database. In particular, `DepartmentSeeder` upserts department rows with newly generated IDs, so do not rerun it against a database with existing references. No seeder provisions Supabase Auth users or application staff accounts.

Start the API:

```sh
php artisan serve --host=127.0.0.1 --port=8000
```

In another terminal, start the frontend using the instructions in `../frontend/README.md`. Laravel exposes routes under `/api`; the Vite development proxy forwards those requests to this local server.

## Environment configuration

The committed `backend/.env.example` contains standard Laravel variables but omits the project-specific Supabase and Groq variables. Add the names below to your private local `.env`; never commit that file or paste credentials into source control.

| Variable | Required when | Purpose |
|---|---|---|
| `APP_KEY` | Every Laravel run | Laravel application encryption key; generate with `php artisan key:generate`. |
| `APP_ENV`, `APP_DEBUG`, `APP_URL` | Local configuration | Laravel environment, debug behavior, and backend base URL. Keep debug disabled outside local development. |
| `DB_CONNECTION` | Database access | Select the configured connection; use `pgsql` for the application schema. |
| `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | PostgreSQL | Connection settings for the selected database. These names are supported by `config/database.php`; values belong only in `.env`. |
| `DB_SSLMODE` | PostgreSQL when needed | PostgreSQL SSL mode; configuration defaults to `require`. A local PostgreSQL connection may use `disable`. |
| `DB_URL` | Optional | Connection URL alternative supported by the database configuration. |
| `SUPABASE_URL` | Auth, Admin API, or Storage | Supabase project URL used by token verification and server-side Supabase calls. |
| `SUPABASE_PUBLISHABLE_KEY` | Backend token verification | Key sent with Supabase Auth user verification. This is not a substitute for the bearer access token. |
| `SUPABASE_SECRET_KEY` | Storage and staff account administration | Server-side key used for private Storage operations and Supabase Auth Admin operations. Keep it server-side and secret. |
| `SUPABASE_STORAGE_BUCKET` | Optional; defaults to `complaint-attachments` | Bucket for complaint and resolution evidence. |
| `SUPABASE_REPORTS_STORAGE_BUCKET` | Optional; defaults to `reports` | Bucket for staff report PDFs. |
| `FRONTEND_URL` | CORS and staff invitation links | Frontend origin allowed by backend CORS and redirect base for staff password setup. The invitation service requires a public HTTPS URL and its `/set-password` path must be allowed in Supabase Auth redirect settings; local HTTP is rejected for invitations. |
| `GROQ_API_KEY` | AI assistant only | Server-side Groq API key. Do not expose it to Vite or the browser. |
| `GROQ_MODEL` | Optional; defaults to `openai/gpt-oss-20b` | Groq chat model name. |
| `GROQ_MAX_CONVERSATION_CHARACTERS` | Optional; defaults to `20000` | Maximum conversation input size used by the AI service. |

Other Laravel settings such as `LOG_CHANNEL`, `CACHE_STORE`, `SESSION_DRIVER`, `QUEUE_CONNECTION`, and `MAIL_MAILER` are available in `.env.example` and Laravel config. The template defaults to database-backed cache, sessions, and queue; the migration set includes the corresponding Laravel support tables.

## Supabase, authentication, and files

The browser signs users in through Supabase Auth. Google OAuth must be enabled and configured in Supabase Auth and its Google provider settings. The frontend returns to `/login?auth=google`; allow the matching frontend redirect URL in Supabase Auth. Citizen profile creation is restricted to eligible Google OAuth identities. Staff accounts use the Supabase Auth Admin invitation/password-setup flow.

For API calls, the frontend sends the Supabase access token as a bearer token. Laravel verifies it against Supabase Auth and uses the matching application profile for role and account checks. The API does not use Laravel Sanctum as its authentication mechanism.

Evidence and report files are stored in private Supabase Storage buckets. The Laravel Storage service uses `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and the configured bucket names to upload, remove, and sign private object URLs. Never put the secret key in frontend configuration.

## Groq AI

The citizen complaint assistant calls Groq from the Laravel backend. Configure `GROQ_API_KEY` to enable it; `GROQ_MODEL` and `GROQ_MAX_CONVERSATION_CHARACTERS` are optional overrides. Without valid Groq configuration the assistant reports that the service is unavailable; ordinary complaint workflows do not depend on AI.

## Useful commands

Run these from `backend/`:

```sh
php artisan route:list --path=api
php artisan migrate:status
php artisan config:clear
composer test
```

`composer test` runs the regular Laravel test suite configured for in-memory SQLite. PostgreSQL-specific migration/catalog and SQL compatibility tests are available as:

```sh
composer test:postgres
```

That command is intentionally guarded to a specially marked local database named `lgu_complaint_test` on loopback PostgreSQL and resets its schema with `migrate:fresh`. Follow `POSTGRES_TESTING.md` exactly and use only the disposable test database; never point this test command at development or production data.

## Troubleshooting

- **Composer reports missing PHP extensions:** check `php -v`, `php -m`, and `composer check-platform-reqs`; install the required extension, especially `pdo_pgsql` when using PostgreSQL.
- **Database connection or migration errors:** confirm the selected `DB_CONNECTION` and credentials, verify PostgreSQL is running, and ensure the database is local and disposable before running migrations. The template's SQLite default is not the project schema target.
- **API returns an authentication configuration error:** check that `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are configured and that the Supabase project is reachable.
- **Evidence upload or signed URL fails:** check `SUPABASE_URL`, the server-only `SUPABASE_SECRET_KEY`, and the relevant private bucket names and policies.
- **Staff invitation or password setup redirect fails:** set `FRONTEND_URL` to the allowed public HTTPS frontend origin and add its `/set-password` URL to Supabase Auth redirect URLs.
- **AI assistant is unavailable:** verify `GROQ_API_KEY`, the configured model, and outbound access to Groq. Complaint submission itself remains available.

## Security

Keep `.env` private and out of version control. Treat `SUPABASE_SECRET_KEY`, `GROQ_API_KEY`, and database credentials as secrets. Frontend variables are bundled into browser assets and must contain only public configuration such as the Supabase publishable key. Use production-safe `APP_DEBUG=false`, HTTPS URLs, restricted CORS, private Storage buckets, and reviewed database migrations in production.
