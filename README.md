# ZIJ Technologies

Marketing website and internal management portal for ZIJ Technologies, built with Next.js, React, TypeScript, Tailwind CSS, MariaDB (Drizzle ORM), Better Auth, and next-intl.

## Structure

| Path | Purpose |
| --- | --- |
| `/` | Public marketing site (static) |
| `/login` | Portal sign-in |
| `/admin` | Hub linking the portals a user can open |
| `/admin/academy/*` | Academy administration |
| `/admin/software`, `/admin/iot` | Division portals (placeholders) |
| `/instructor/*` | Instructor portal |

Access is role-based. Roles are defined in `lib/db/schema.ts` and their permissions in `lib/auth/permissions.ts`:

| Role | Scope |
| --- | --- |
| `super_admin` | Everything |
| `academy_admin` | The whole academy, including finance and users |
| `branch_admin` | One branch (`--branch <id>`); no finance reports, users, or audit log |
| `moderator` | Follow-up calls, notes, leads; read-only students, groups and payments |
| `instructor` | Instructor portal, own groups only |

Every protected page and server action must call `requirePermission()` from `lib/auth/session.ts`. The sidebar hides links a user cannot open, but that is not the security boundary.

The portal UI is bilingual. Strings live in `messages/ar.json` and `messages/en.json` (Arabic is the default); use logical Tailwind classes (`ms-`, `pe-`, `start-`, `border-e`) so layouts work right-to-left.

## Requirements

- Node.js 20.9 or newer
- npm 10 or newer

## Local development

```bash
npm ci
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Database and first user

1. Create a MariaDB/MySQL database (utf8mb4) and set `DATABASE_URL`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` in `.env.local`.
2. Apply migrations: `npm run db:migrate`
3. Create your account: `npm run user:create -- --email you@example.com --name "Your Name" --role super_admin`
   The command prints a temporary password once.

After changing `lib/db/schema.ts`, generate a migration with `npm run db:generate -- --name <change>` and commit the files in `drizzle/`.

## Environment variables

All variables are documented in `.env.example`. The contact endpoint requires the SMTP values. `SMTP_FROM` must be an address authorized by the configured SMTP provider. Visitor addresses are placed in `Reply-To` to preserve SPF and DMARC alignment.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Deployment

Build with `npm run build` and run with `npm start`. The application requires a Node.js runtime because `/api/contact` sends email through SMTP.

### Hostinger hPanel

Deploy this project as a **Node.js Web App**, not as a static website. Select Node.js 20 or newer and configure these environment variables in hPanel before building:

```text
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
CONTACT_EMAIL
DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
```

Set `BETTER_AUTH_URL` to the public site URL (for example `https://zijtech.com`). Create the database in hPanel under **Databases**. Run `npm run db:migrate` whenever a deployment adds files to `drizzle/`, either over SSH on the server or from your machine after allowing your IP under **Remote MySQL**. The migration and user scripts need dev dependencies installed.

Keep the values in hPanel across deployments and never commit `.env.local`. After adding or changing an environment variable, save it and redeploy the application so the Node.js runtime loads the new value.
