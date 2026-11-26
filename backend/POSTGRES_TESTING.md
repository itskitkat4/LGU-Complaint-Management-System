# PostgreSQL integration tests

The ordinary backend command remains `composer test`; `backend/phpunit.xml` forces an in-memory SQLite connection. PostgreSQL-only migration and catalog tests run separately with `composer test:postgres` and `backend/phpunit.pgsql.xml`.

The PostgreSQL command is deliberately restricted to a local database named `lgu_complaint_test` on `127.0.0.1:5432`, owned by the `postgres` test role. It refuses a missing or mismarked database, verifies the connected server identity, clears Laravel's cached configuration, checks Laravel's resolved connection, then runs `migrate:fresh`. That command resets the schema, so never mark a development or production database as the disposable test target.

Create a dedicated local PostgreSQL database once:

```powershell
createdb -h 127.0.0.1 -p 5432 -U postgres lgu_complaint_test
psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "COMMENT ON DATABASE lgu_complaint_test IS 'Codex disposable backend test database';"
```

Set the explicit target and credentials in the current PowerShell session, then run the suite:

```powershell
$env:FINDING30_PG_HOST = '127.0.0.1'
$env:FINDING30_PG_PORT = '5432'
$env:FINDING30_PG_DATABASE = 'lgu_complaint_test'
$env:FINDING30_PG_USERNAME = 'postgres'
$env:FINDING30_PG_PASSWORD = '' # Set the local test role password here if required.
composer test:postgres
```

The runner first executes the Finding 27 complaint-status migration test, Finding 28 feedback-ownership test, and Finding 29 PostgreSQL index-catalog test. It then resets the verified disposable schema and runs `DashboardSummaryTest`, `FeedbackMonitoringTest`, and `StaffReportTest` against PostgreSQL to exercise controller aggregation and grouping queries. PHPUnit fails if any selected test is skipped. The suite verifies Laravel itself resolved the `pgsql` driver and the marked loopback database. No `.env` values are used for the PostgreSQL connection, and credentials are never printed.
