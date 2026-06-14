# Vibecastly

An AI image studio where you **cast people into AI-generated scenes**. Upload photos of people, `@`-tag them in a prompt, and the model uses their photos as starting points. Work solo or invite teammates into a **shared workspace** with a collaborative gallery.

**Live demo:** https://vibecastly.vercel.app

Built entirely on the Neon backend platform — **Auth, Functions, Object Storage, AI Gateway, and Postgres** — with a Next.js front end on Vercel. Agents run on **Mastra** (traced via Mastra observability), and errors are captured with **Sentry**.

---

## Features

- **Prompt-to-image** generation via the Vercel AI SDK, streamed from a Neon Function.
- **People + `@`-mentions** — upload a person's photo, then type `@` to reference them (keyboard-navigable dropdown). Their photo becomes a reference/starting point for the generation.
- **Gallery CRUD** — every generated image is saved; rename the caption, download, or delete.
- **Team workspaces (organizations)** — an org switcher, invite teammates by email (in-app, no email sending), pending → accept invitation flow, and a **shared gallery + shared people** where every member sees each other's work with author attribution.
- **Auth + account management** via Neon Auth (Better Auth) with email/password, plus an account menu to edit your name/avatar and change your password.
- **Content-safety gatekeeper** — a strong moderation agent (Claude Sonnet 4.6) vets every prompt before generation and blocks sexual, harassment/bullying, hateful, or violent requests with a clear reason.
- **Per-user style memory** — a profile agent learns each creator's durable preferences from their prompts (stored in Postgres) and personalizes future generations.
- **Observability + monitoring** — every agent runs on Mastra with traces exported to a Mastra Studio project; runtime errors are captured with Sentry.

## Architecture

```
Browser (Next.js on Vercel)
  │  signs in with Neon Auth (proxy handler at /api/auth/[...path])
  │  mints a short-lived JWT from /api/auth/token
  ▼
Neon Function  (the long-running, JWT-protected backend — no Vercel timeout)
  • verifies the Neon Auth JWT against NEON_AUTH_JWKS_URL
  • verifies workspace membership against neon_auth.member
  • moderation gatekeeper (strong model) vets the prompt → reject or continue
  • generate + people/images CRUD, all scoped by organization_id
  • Mastra agents (imagegen, profile memory, moderation) → AI Gateway
  • Object Storage + Postgres (all in-region); traces → Mastra, errors → Sentry
```

Key decisions:

- **The browser calls the Neon Function directly** (not through a Next.js route) so the long image-generation stream isn't subject to a serverless host timeout. The JWT is minted on the Next.js backend and sent as a bearer token. See the [`neon-functions` agent skill](https://github.com/neondatabase/agent-skills/blob/main/skills/neon-functions/SKILL.md) for this pattern.
- **Agents run on Mastra through the Neon AI Gateway** — an image agent (OpenAI provider-executed image-generation tool, on the Responses route), a tool-less profile-memory agent, and a moderation gatekeeper (Claude Sonnet 4.6 on the gateway's chat-completions route). All three are registered on a single Mastra instance so their runs are traced by one Mastra platform exporter.
- **Prompts are moderated before any work is done** — the gatekeeper classifies each prompt and unsafe ones are rejected (HTTP 422) with a clear reason; it fails open on classifier errors so a transient outage can't block everyone (the image model is the backstop).
- **All object-storage access lives inside the Function**, where the platform injects valid S3 credentials at runtime. People photos and generated images are stored in Neon Object Storage buckets; the Function serves them via presigned URLs.
- **Multi-tenancy** is enforced server-side: the client sends the active workspace via `x-organization-id`, and the Function verifies membership (`neon_auth.member`) and scopes every query + bucket key by `organization_id`.

### Layout

```
.
├── neon.ts                 # Neon IaC: auth + AI Gateway + buckets + functions
├── src/                    # Neon Function (the backend)
│   ├── index.ts            # JWT-protected router: moderate + generate, people/images CRUD
│   ├── db/schema.ts        # Drizzle schema (people, images, creator_profiles) — org-scoped
│   └── lib/                # auth (JWKS verify), org (membership), storage (S3), db, mastra (agents)
└── web/                    # Next.js app (Vercel)
    └── src/
        ├── app/            # login + protected studio
        ├── components/app/ # org switcher, invitations, team, people, composer, gallery
        └── lib/            # Neon Auth client/server + agent API client
```

## Provisioned services (`neon.ts`)

```ts
export default defineConfig({
  auth: true,                         // Neon Auth (Better Auth) + organization plugin
  preview: {
    aiGateway: true,                  // model routing (image gen + Claude moderation via the gateway)
    buckets: { people: {}, generated: {} },
    functions: { imagegen: { source: 'src/index.ts' }, report: { source: 'src/report.ts' } },
  },
});
```

Provision with `neonctl deploy` (alias for `neonctl config apply`).

## Local development

> Object Storage currently only works inside a **deployed** Function: `neonctl env pull` injects a credential the storage data plane rejects, while the deployed runtime gets a valid one. So image generation/storage is best verified against the deployed Function. Auth and the UI work locally.

```bash
# Function
npm install
neon dev                  # serves the function locally with env injected

# Web
cd web
bun install
bun run dev               # http://localhost:3000
```

`web/.env.local` needs `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, and `NEXT_PUBLIC_AGENT_URL` (the Function URL).

## Deploy

```bash
neonctl deploy                                   # deploy the Function + apply neon.ts
cd web && vercel build --prod && vercel deploy --prebuilt --prod
```

Set on Vercel: `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `NEXT_PUBLIC_AGENT_URL` (and `DATABASE_URL` for schema migrations).

---

Made by [andrelandgraf](https://x.com/andrelandgraf) as a demo of the Neon backend platform (Auth · Functions · Object Storage · AI Gateway · Postgres).
