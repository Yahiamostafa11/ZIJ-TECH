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
- **Row colours**: in imported sheets a green name cell marks an attending student and red marks a lost one (recorded as withdrawn); exports use the same colours.
- **Excel import** (`/admin/academy/import`): one tab per group. A tab can go into an existing group or create a new one (level, branch or online, instructor, price pre-filled from the sheet). Header names are matched in Arabic or English, merged cells (siblings sharing a phone) are followed, and phones that lost their leading zero are repaired. "Check" runs the full import inside a transaction and rolls it back, so the preview is exactly what will be saved. Re-importing the same file adds nothing new; if the sheet's "paid" grew, only the difference is recorded.
- **Users and roles** (`/admin/academy/users`): create accounts with a one-time temporary password; everyone changes their own password at `/account`.
- **Audit log**: every change is recorded with who made it.

### Accounts

- Staff sign in with email. Students and parents sign in with a username shown as `name@zij-academy`; this is a login name, not a mailbox. Their accounts are created from the student's page ("Portal accounts"), which shows the temporary password once with a ready WhatsApp message to the parent.
- Every new account and every admin reset uses a temporary password that must be changed at first sign-in (`/account`).
- Each person may correct their Arabic and English name once; later changes go to Users & roles for approval. Approved names also update the linked student or parent record. Students keep their original name as a matching key so older Excel sheets still recognise them.
- People can add their own email at `/account`; it is used only after they confirm the link sent to it. Password reset links (`/forgot-password`) go only to a confirmed email; without one, an admin resets the password.
- Account emails use the same SMTP settings as the contact form, and links use `BETTER_AUTH_URL`.

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

The application needs a Node.js runtime (server rendering, the portal, `/api/contact` and account emails). `npm run build` first applies database migrations and creates the first super admin if needed (the `prebuild` step, skipped when `DATABASE_URL` is not set), then builds; `npm start` runs it.

### Hostinger hPanel

1. **Database** — hPanel → **Databases → MySQL Databases**: create a database and a user with a strong password. Note the database name, user and host that hPanel shows (Hostinger prefixes names, e.g. `u123456789_zij`).
2. **App** — hPanel → **Websites → Add website → Node.js Web App** (not a static site). Connect GitHub, pick this repository and the `main` branch.
3. **Build settings** — Node.js 22 (20.9+ works). Install command `npm ci`, build command `npm run build` (hPanel's default), start command `npm start`.
4. **Environment variables** — add these before the first deploy:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | `mysql://USER:PASSWORD@HOST:3306/DATABASE`. URL-encode special characters in the password (`@`→`%40`, `#`→`%23`, `:`→`%3A`, `/`→`%2F`). |
   | `BETTER_AUTH_SECRET` | 32+ random characters (`openssl rand -base64 32`). Never change it after launch; it signs sessions. |
   | `BETTER_AUTH_URL` | The site's public address, e.g. `https://zijtech.com` (no trailing slash). Used in email links. |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | A mailbox for sending, e.g. Hostinger Email: `smtp.hostinger.com`, `465`, `no-reply@yourdomain`, its password, same address. Needed for password-reset and confirmation emails. |
   | `CONTACT_EMAIL` | Where the website contact form is delivered. |
   | `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` | First deploy only: creates the super admin. Remove the password after the first sign-in. |

5. **Deploy**, then open `/login`. The super admin must choose a new password at first sign-in (or use "Forgot password?", which emails a link once SMTP is set).

Each later deploy re-runs `npm run build`, which applies any new migrations in `drizzle/` automatically. Keep variables in hPanel and never commit `.env.local`; after changing a variable, redeploy so the app picks it up.
