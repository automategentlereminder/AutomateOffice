# Advanced Renamer module

Self-contained tool package. Add future tools the same way under `src/modules/<tool-id>/`.

## Layout

```
src/modules/advanced-renamer/
  meta.ts                 # sidebar / registry entry
  page.tsx                # tool UI
  index.ts                # public exports
  components/             # UI pieces (guide, table, steps)
  lib/                    # pure logic + filesystem helpers
  api/                    # route handlers
```

App Router wiring stays thin:

- `src/app/(app)/tools/advanced-renamer/page.tsx` → re-exports the module page
- `src/app/api/tools/advanced-renamer/*/route.ts` → re-exports module handlers

## Adding another tool

1. Create `src/modules/<tool-id>/` with the same shape
2. Export meta from that module
3. Register it in `src/lib/tools/registry.ts`
4. Add thin `app` page + API route wrappers
