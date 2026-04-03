# AC2 🚀

AC2 is a template-driven image generation platform designed for:

- Instagram-style content creation
- API-first automation workflows (n8n, agents)
- Visual template editing
- Server-side deterministic rendering

---

## ✨ Features

- 🎨 Template-based image generation
- 🧩 Dynamic variables (text, images, styles)
- 🖥️ Visual editor (React + Konva)
- ⚡ Fast backend (Fastify)
- 🧠 API-first design (automation ready)
- 🖼️ Server-side rendering (skia-canvas)
- 🧱 Monorepo architecture (Turborepo)

---

## 🏗️ Tech Stack

### Frontend

- Next.js
- React
- Tailwind CSS
- shadcn/ui
- React Konva

### Backend

- Fastify
- TypeScript
- Zod validation

### Infrastructure

- Turborepo
- pnpm workspaces
- Postgres (planned)

---

## 📁 Project Structure

```
ac2/
├─ apps/
│  ├─ web/       # Next.js frontend
│  └─ api/       # Fastify backend
├─ packages/
│  ├─ contracts/ # shared schemas + types
│  ├─ config/
│  └─ sdk/
├─ infra/
├─ turbo.json
├─ pnpm-workspace.yaml
└─ package.json
```

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Run development

```bash
pnpm dev
```

This will start:

- frontend → http://localhost:3000
- backend → http://localhost:4000

---

## 🧠 Architecture Overview

### Frontend (`apps/web`)

- Template editor
- Dashboard UI
- User interactions

### Backend (`apps/api`)

- API endpoints
- Business logic
- Rendering engine
- Workflow integrations

### Shared (`packages/contracts`)

- Zod schemas
- API contracts
- Shared types

---

## 🎨 Rendering Flow

1. Template is stored as JSON
2. User/API sends input variables
3. Backend:
   - validates input (Zod)
   - builds composition
   - renders via skia-canvas
4. Image is returned or stored

---

## 🔌 API Example

### POST /render

```json
{
  "templateKey": "post_1",
  "inputs": {
    "title": "Hello World"
  }
}
```

---

## 📦 Scripts

```bash
pnpm dev        # run all apps
pnpm build      # build all apps
pnpm lint       # lint repo
pnpm typecheck  # type check
```

---

## 🧱 Monorepo Philosophy

- Apps are deployable units
- Packages are shared logic
- Contracts are the source of truth
- No duplication across layers

---

## 🛠️ Future Roadmap

- Advanced template engine
- Animation support
- AI-assisted template creation
- Workflow integrations (n8n)
- Multi-tenant support
- API key + rate limiting

---

## 🤝 Contributing

- Follow module-based architecture
- Use shared contracts
- Keep logic isolated and reusable
- Avoid introducing new patterns unnecessarily

---

## 🧩 Vision

AC2 aims to become a **programmable design system for content generation** — combining:

- visual editing
- API automation
- scalable rendering

---

## ⚡ Author Notes

This project is built with:

- performance in mind (Fastify)
- scalability in mind (stateless API)
- flexibility in mind (template-driven architecture)

---
