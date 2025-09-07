# Generative World Explorer (Learning Project)

This is a personal / exploratory sandbox for learning about procedural generation, WebGL rendering (PixiJS), real‑time streaming patterns, and backend data persistence. It’s not a polished product or a production-ready game—just a pet project that grew while experimenting with ideas. If anything here helps you learn too: awesome.

> Disclaimer
> Expect rough edges, rewrites, dead ends, and over‑engineering in places where I was exploring trade‑offs. APIs, structures, and naming may change without warning. Performance claims are context-specific and mostly measured locally.

---

## 🙋 Why This Exists

I wanted to answer a few questions for myself:

- How far can a browser reasonably go with chunked procedural terrain + WebGL?
- How to layer caching (memory → Redis → persistence) without overcomplicating the flow?
- What’s a clean-ish way to stream world data via WebSockets while avoiding flooding?
- How to evolve a prototype into something slightly more structured without killing iteration speed?

This repository is the evolving answer.

---

## 🧪 What This Project Is (and Isn’t)

| This Project IS | This Project is NOT |
|-----------------|---------------------|
| A learning playground | A finished game |
| An experiment in architectural patterns | A framework |
| A place to try ideas (sometimes twice) | Security audited |
| Procedural rendering + streaming exploration | Guaranteed stable |
| A reference for some implementation approaches | The “right” way to do it |

Use anything here at your own risk; feel free to adapt or simplify.

---

## ✨ Current Features (Experimental)

### 🌍 Procedural World (Chunked)
- Infinite-style grid concept (tested up to ~10,000 × 10,000 logical coordinates)
- Simplex/Perlin-inspired noise layers (terrain + biome placeholders)
- 16×16 chunk architecture (tunable)
- Multi-pass generation pipeline (still evolving)

### 🚀 Rendering
- PixiJS (WebGL) renderer replacing earlier Canvas prototype
- Zoom-based Level of Detail (early experiments)
- Hybrid layering: GPU for terrain, DOM/UI for overlays
- Target: smooth feel on modest hardware (not “guaranteed 60 FPS everywhere”)

### 🔄 Streaming & Caching
- WebSocket channel for prioritized chunk delivery
- Basic priority queue: center → adjacent → prefetch ring
- Memory cache (browser) + Redis (optional) + persistence (WIP structure)
- Graceful fallback when Redis is absent

### 🎮 Interactivity (Basic)
- Pan + zoom camera
- “Fog” style undiscovered state rendering
- (WIP) Resource / scanning systems (early scaffolding)

---

## 🏗️ Architecture Overview

### Tech Stack (Pragmatic Choices)
- **Frontend**: Nuxt 4, Vue 3, TypeScript, PixiJS 8, Tailwind
- **Backend**: Nitro (server runtime), WebSockets, Redis (optional)
- **Data / Validation**: Zod, chunk-based world model
- **Infra (dev)**: Docker Compose (for Redis, DB experiments)
- **Testing**: Vitest + Playwright (selective)

### Design Notes
- “Services” used to isolate rendering + socket logic
- Explicit separation of generation vs streaming vs rendering concerns
- Favor small utility functions over large monolith classes
- Some code purposely verbose for clarity while learning

---

## ⚙️ Performance Notes (Contextual)
These numbers are rough, local, and situational—they’re here as a snapshot of experiments, not guarantees:

| Aspect | Observed (Local) |
|--------|------------------|
| WebGL vs old Canvas | 10–100x improvement in large views |
| Chunk generation | ~1ms (simple noise pass) |
| Serialized chunk payload | ~1KB (varies) |
| WebSocket latency (loopback) | <10ms typical |
| Cache hit rate (with Redis active) | >90% after movement |

---

## 🚧 Roadmap (Exploratory / Subject to Deletion)
- [ ] Resource vein generation & spatial extraction rules
- [ ] Scanning mechanic (area-based reveal)
- [ ] Extractor placement + passive resource trickle
- [ ] Upgrade / tech progression prototype
- [ ] Spatial persistence experiments (PostGIS / geometry indexes)
- [ ] Experiment: move heavy generation to a Go microservice
- [ ] Biome layering & climate gradients
- [ ] Event-driven streaming refinements

Later / Maybe:
- Multiplayer sync experiments
- Height maps / pseudo-3D shading
- Touch/mobile control adaptation

---

## 🧩 Implementation Highlights

### Rendering Pipeline (Simplified)
1. Compute viewport world bounds
2. Determine required chunk keys
3. Resolve from in-memory → Redis → generate
4. Stream + render prioritized center-first
5. Prefetch surrounding ring opportunistically

### Chunk Generation (Current Pass)
- Noise sampling → terrain band mapping
- Color mapping via utility tables
- Room to add: moisture, temperature, classification richness

### WebSocket Flow
- Client: sends viewpoint updates (throttled)
- Server: enqueues required chunks by priority
- Delivery: small batches to avoid frame drops
- Retries: basic reconnect / resync (primitive but functional)

---

## 🛠️ Scripts

```bash
# Development
pnpm dev
pnpm dev:full          # Starts Redis + dev server

# Redis helpers
pnpm redis:start
pnpm redis:stop
pnpm redis:logs

# Production build preview
pnpm build
pnpm preview
```

---

## 🗂️ Project Structure (Excerpt)

```
app/
  components/
  composables/
  services/
  pages/
server/
  api/
  routes/
  utils/
  services/
shared/
  types/
  utils/
drizzle/
  migrations/
scripts/
```

---

## 🧭 Environment

Create a `.env` if customizing Redis:

```bash
REDIS_URL=redis://localhost:6379
```

Everything should still run (with reduced features) if Redis is unavailable.

---

## 🙌 Contributing (Totally Optional)
If you want to poke around or improve something:

```bash
git checkout -b tweak/something
git commit -m "tweak: improve X"
git push origin tweak/something
```

No formal process—open a PR if you think it helps learning or clarity.

---

## 🔒 Production Disclaimer
This code hasn’t been hardened for:
- Security threats
- Multi-tenant isolation
- Resource abuse
- Persistence integrity under load

Treat it as educational reference only.

---

## 📄 License
MIT — feel free to reuse pieces, but validate approaches for your context.

---

Built as an evolving learning journey. If you find mistakes or a better pattern, that’s the point—iterate and improve.
