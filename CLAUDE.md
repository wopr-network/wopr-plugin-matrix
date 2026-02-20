# wopr-plugin-matrix

`@wopr-network/wopr-plugin-matrix` — Matrix channel plugin for WOPR with E2EE support.

## Commands

```bash
npm run build     # tsc
npm run dev       # tsc --watch
npm run check     # biome check + tsc --noEmit
npm run lint:fix  # biome check --fix src/
npm run format    # biome format --write src/
npm test          # vitest run
```

**Linter/formatter is Biome.** Never add ESLint/Prettier config.

## Architecture

```
src/
  index.ts              # Plugin entry — exports WOPRPlugin default
  types.ts              # Re-exports from @wopr-network/plugin-types + Matrix types
  logger.ts             # Winston logger instance
  matrix-client.ts      # Client creation, login, crypto init
  event-handlers.ts     # Room message handling, inject execution
  channel-provider.ts   # ChannelProvider implementation
  channel-queue.ts      # Per-room message queuing
  message-formatter.ts  # HTML/plain text formatting
  attachments.ts        # Media upload/download (mxc://)
  matrix-utils.ts       # Session keys, room name resolution
  matrix-extension.ts   # Cross-plugin API
```

## Plugin Contract

This plugin imports ONLY from `@wopr-network/plugin-types` — never from wopr core internals.

```typescript
import type { WOPRPlugin, WOPRPluginContext, ChannelProvider } from "@wopr-network/plugin-types";
```

The default export must satisfy `WOPRPlugin`. The plugin receives `WOPRPluginContext` at `init()` time.

## Key Conventions

- matrix-bot-sdk for Matrix protocol
- E2EE enabled by default via RustSdkCryptoStorageProvider
- Winston for logging (not console.log)
- Node >= 20, ESM (`"type": "module"`)
- Biome for lint/format (never ESLint/Prettier)
- Conventional commits with issue key: `feat: add room support (WOP-118)`
- `npm run check` must pass before every commit

## Issue Tracking

All issues in **Linear** (team: WOPR). No GitHub issues. Issue descriptions start with `**Repo:** wopr-network/wopr-plugin-matrix`.

## Session Memory

At the start of every WOPR session, **read `~/.wopr-memory.md` if it exists.** It contains recent session context: which repos were active, what branches are in flight, and how many uncommitted changes exist. Use it to orient quickly without re-investigating.

The `Stop` hook writes to this file automatically at session end. Only non-main branches are recorded — if everything is on `main`, nothing is written for that repo.