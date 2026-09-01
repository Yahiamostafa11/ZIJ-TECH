# ZIJ Technologies

Marketing website for ZIJ Technologies, built with Next.js, React, TypeScript, and Tailwind CSS.

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

## Environment variables

The contact endpoint requires the SMTP values documented in `.env.example`. `SMTP_FROM` must be an address authorized by the configured SMTP provider. Visitor addresses are placed in `Reply-To` to preserve SPF and DMARC alignment.

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
```

Keep the values in hPanel across deployments and never commit `.env.local`. After adding or changing an environment variable, save it and redeploy the application so the Node.js runtime loads the new value.
