# AGENTS.md

## Overview

This repository is a full-stack TypeScript monorepo built using:

- Turborepo (build orchestration)
- pnpm (workspace package manager)
- Next.js (frontend)
- Fastify (backend API)
- Zod (shared validation + contracts)
- Postgres (planned)
- skia-canvas (server-side rendering)

The system enables:

- Template-based image generation
- API-first workflows (n8n / agent integrations)
- Visual editing via React
- Server-side rendering of images

---

## Repository Structure

```
ac2/
├─ apps/
│ ├─ web/ # Next.js frontend
│ └─ api/ # Fastify backend
├─ packages/
│ ├─ contracts/ # shared Zod schemas + types
│ ├─ config/ # shared configs
│ └─ sdk/ # optional API client
├─ infra/ # docker, deployment, db setup
├─ turbo.json
├─ pnpm-workspace.yaml
└─ package.json
```

### Rules

- Apps = runnable services
- Packages = shared code only
- No business logic duplication across apps

---

## Core Architecture

### Frontend (apps/web)

Responsibilities:

- Template editor (React + Konva)
- Dashboard UI
- Auth UI
- Asset management UI
- Generation history

### Backend (apps/api)

Responsibilities:

- REST API (Fastify)
- Auth + authorization
- Template CRUD + versioning
- Generation orchestration
- Rendering images (skia-canvas)
- Workflow/API access

---

## Backend Design Principles

- Feature-based modular structure
- No global "services" folder
- Each module owns:
  - routes
  - logic
  - validation

Example:

```
modules/
├─ templates/
├─ assets/
├─ generations/
├─ rendering/
├─ auth/
├─ workspaces/
```

---

## Rendering System (CRITICAL)

Rendering is server-side only.

### DO NOT:

- Render final images in frontend
- Depend on DOM APIs

### ALWAYS:

- Use a rendering abstraction
- Keep renderer isolated

Interface example:

```ts
interface Renderer {
  render(input: RenderComposition): Promise<Buffer>;
}
```

### Current renderer:

- skia-canvas

## Future flexibility must be preserved.

### Contracts (packages/contracts)

This is the single source of truth for:

- API request schemas
- API response schemas
- Template schema
- Validation logic

### MUST RULES

- Always define schema using Zod
- Always export inferred TypeScript types
- Never duplicate types in apps

Example:

```ts
export const RenderRequestSchema = z.object({
  templateKey: z.string(),
  inputs: z.record(z.string(), z.any()),
});

export type RenderRequest = z.infer<typeof RenderRequestSchema>;
```

---

### API Design

- REST-based
- JSON only
- Stateless

#### Validation

- ALL inputs must be validated via Zod
- Never trust request.body directly

#### Error format

```json
{
  "error": "ValidationError",
  "message": "...",
  "details": {}
}
```

---

### Workspace Rules

Use pnpm workspace protocol:

```
"@ac2/contracts": "workspace:*"
```

### NEVER:

- import using relative paths across packages
- duplicate shared logic

---

### Turborepo Rules

- All apps must define:
  - dev
  - build
  - typecheck
- Build dependencies must respect graph

Example:

```json
"build": {
  "dependsOn": ["^build"]
}
```

## Turborepo optimizes builds using caching and dependency graphs.

### Coding Standards

#### TypeScript

- strict mode enabled
- no `any` unless absolutely necessary
- prefer inference from Zod

#### Backend

- no business logic inside route handlers
- use module-level separation
- avoid global state

#### Frontend

- feature-based structure
- no API calls directly in components (use hooks/lib)

---

### Future Extensions

This system is designed to support:

- Advanced templates (conditional logic, loops)
- AI-generated templates
- Workflow engines (n8n integration)
- API key-based automation
- Plugin-based renderers

---

### Important Constraints

- Rendering must remain deterministic
- Templates must be serializable (JSON-safe)
- Backend must be stateless (horizontal scaling ready)

---

### Agent Instructions (IMPORTANT)

When generating code:

1. Always check if logic belongs in:
   - app
   - package
   - module
2. Prefer extending existing modules over creating new patterns
3. Never:
   - introduce new architecture styles
   - bypass contracts
   - hardcode values
4. Always:
   - use shared contracts
   - validate inputs
   - maintain separation of concerns

---

### Philosophy

This repo prioritizes:

- clarity over cleverness
- scalability over shortcuts
- composability over tight coupling
