# BU University Digital Library

Multilingual university library built with Next.js 15, React 19, TypeScript, Prisma and PostgreSQL. Interface languages: Uzbek, Russian and English.

## What works

- Public home, searchable catalog, book details and language switching.
- Registration, password hashing, database-backed signed sessions, sign in and sign out.
- Staff sign-in redirects to `/uz/admin` (also `/ru/admin` and `/en/admin`). Student accounts cannot access management routes.
- Responsive administration dashboard with live statistics.
- Add and edit books: title, authors, slug, ISBN, description, language, publication year, pages, featured/download flags and publication status. Drafts and archived books stay out of the public catalog.
- Upload a PDF (up to 50 MB) and a JPG/PNG/WebP cover (up to 10 MB) while saving a new or existing book. Uploads go directly to private Vercel Blob storage, with staff-only scoped tokens and server-side file signature, size and SHA256 checks.
- Covers appear on the home page, catalog and detail pages. Signed-in readers can open published PDFs; the download button follows the book policy. Draft media requires staff access.
- Automatic slugs support Russian and Uzbek Cyrillic, and blank slugs are generated when saving.
- Search, status filters and pagination; validated forms, duplicate warnings, unsaved-change protection and keyboard-accessible dialogs.
- Administrators can view recent users and audit events. Librarians can view active/overdue loans. These are read-only lists, limited to the latest 50 records (loans by due date).
- Book changes and their audit records are committed in a single transaction.
- Same-origin checks on authentication and book mutations.

## Local setup

Use Node.js 22 LTS and PostgreSQL 16.

```bash
npm ci
cp .env.example .env
# Set DATABASE_URL and a unique AUTH_SECRET with at least 32 random characters.
docker compose up -d db
npm run db:generate
npm run db:deploy
npm run admin:create
npm run dev
```

Visit `http://localhost:3000/uz`. Run the admin creation script only in a trusted terminal; it creates or promotes a SUPER_ADMIN using the details you enter. Never commit credentials. To grant an existing active account administrator access without changing its password, run `npx tsx scripts/promote-admin.ts EMAIL` from a trusted terminal with the intended database configured.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

## GitHub and Vercel

Import `ooto0017-cloud/TOO` into Vercel. Select **Next.js**, repository root, and the existing `npm run build` command. Pushes to the production branch can deploy automatically through Vercel's Git integration.

Set these variables directly in Vercel:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Reachable managed PostgreSQL connection URL, with SSL as required by your provider |
| `AUTH_SECRET` | A unique random secret, at least 32 characters |
| `APP_URL` | The site's canonical HTTPS origin |

Keep preview and production databases separate. Before the first release, apply committed migrations to the intended database with `npm run db:deploy` from a trusted environment, then run `npm run admin:create` against that database. Builds generate Prisma Client but do not change the database. Check `/api/health` after deployment and verify sign-in → add draft → publish → catalog.

## API

- `POST /api/auth/register`, `/api/auth/login`, `/api/auth/logout`
- `GET /api/books?q=&language=&page=&limit=`: active public books only.
- `GET /api/books?manage=1&status=&q=&page=&limit=`: librarian-protected management listing.
- `POST /api/books`: librarian or higher; creates a book, defaulting to draft.
- `PATCH /api/books/:id`: librarian or higher; validates and updates book metadata.
- `DELETE /api/books/:id`: admin or higher; archives rather than deleting.

## Remaining scope

An annotated PDF reader with saved reading progress, loan issuing/return operations, user role/status editing, notifications, exports and content publishing are not implemented. PDFs open in the browser viewer; the download policy controls the application download endpoint and is not DRM. Add distributed authentication rate limiting and operational monitoring before a broad public launch. Use managed database backups and private Blob storage for library PDFs. Newly uploaded replacements supersede the old file after verification; old stored copies are cleaned up after the database transaction.

## Verification — 17 November 2026

TypeScript validation, 36 unit tests and the production build passed. An isolated PostgreSQL database accepted the initial migration. Chromium checks covered registration, staff sign-in, draft/create/edit/publish/archive, catalog and details, audit events, all three languages, mobile layouts, sign-out, duplicate/invalid input and student/librarian access restrictions. No browser runtime errors were observed in those flows. The production server also passed sign-in, dashboard rendering, draft creation and table refresh checks. The Vercel production site is available at https://bu-library.vercel.app/uz. PostgreSQL migrations and owner administrator setup have completed. Hosted health and catalog endpoints returned HTTP 200; anonymous management API access returned HTTP 403.

## Media storage setup

Connect a **private** Vercel Blob store to the project. The SDK reads `BLOB_READ_WRITE_TOKEN` (or supported OIDC configuration) server-side; never expose this value in client variables. `npx tsx scripts/check-media-storage.ts` verifies the real store using temporary files and removes those files afterward. For a local diagnostic, configure a development storage credential in an ignored environment file. Upload attempts that fail keep the saved book and let staff retry without creating duplicate records.
