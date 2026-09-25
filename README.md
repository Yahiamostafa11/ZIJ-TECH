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

### Academy modules

- **Groups** (`/admin/academy/groups`): level, branch or online, instructor, weekly schedule, size limits, price. Each group page lists its students with what they paid and still owe, and adds students directly.
- **Students and families**: siblings share a family, matched by parent phone. The student page records payments, voids them (admins only, with a reason), and edits guardians.
- **Payments and balances**: payments are never deleted, only voided. Outstanding balances link to a ready WhatsApp reminder.
- **Manual entry**: groups from "New group", students from "New student" (full profile, both parents, optional group; branch admins must choose one of their groups).
- **Excel export** (`/admin/academy/export`, buttons on the groups list and each group page): one tab per group in the academy's own layout plus a summary tab. An exported file can be edited and uploaded again.
- **Excel import** (`/admin/academy/import`): one tab per group. A tab can go into an existing group or create a new one (level, branch or online, instructor, price pre-filled from the sheet). Header names are matched in Arabic or English, merged cells (siblings sharing a phone) are followed, and phones that lost their leading zero are repaired. "Check" runs the full import inside a transaction and rolls it back, so the preview is exactly what will be saved. Re-importing the same file adds nothing new; if the sheet's "paid" grew, only the difference is recorded.
- **Users and roles** (`/admin/academy/users`): create accounts with a one-time temporary password; everyone changes their own password at `/account`.
- **Audit log**: every change is recorded with who made it.

### Themes

The site and portal have a dark theme and a light theme (cream, deep teal and gold, from the Zij Academy slides). Visitors get the one matching their device; the sun/moon button overrides it and the choice is remembered per browser. All colours are tokens in `app/globals.css`, exposed to Tailwind in `tailwind.config.ts`: use `text-danger`, `text-success`, `bg-field`, `bg-hover`, `shadow-card` and the `bg-*`/`text-*`/`gold-*` tokens instead of fixed colours such as `text-red-300` or `rgba(0,0,0,…)`, which only suit one theme.

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
