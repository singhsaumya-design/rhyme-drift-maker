# Deploying Rhyme Drift to Vercel

This project is built on **TanStack Start** and ships configured for Cloudflare Workers
(via Lovable's preview sandbox). To deploy to Vercel, export the repo to GitHub from
Lovable first, then apply the changes below on a new branch (e.g. `vercel`).

> Do NOT apply these changes inside the Lovable editor — they will break the
> in-editor preview, which depends on `@lovable.dev/vite-tanstack-config`.

---

## 1. Replace `vite.config.ts`

```ts
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({ target: "vercel" }),
    viteReact(),
  ],
});
```

## 2. Delete Cloudflare-only files

```
rm wrangler.jsonc
rm src/server.ts
```

## 3. Update `package.json`

Remove these dependencies:

- `@cloudflare/vite-plugin`
- `@lovable.dev/vite-tanstack-config` (devDependencies)

Then reinstall:

```
bun install
```

## 4. Set the environment variable on Vercel

In **Vercel Project → Settings → Environment Variables**, add for
Production, Preview, and Development:

| Key                | Value                                                         |
| ------------------ | ------------------------------------------------------------- |
| `LOVABLE_API_KEY`  | Copy from this project's Lovable Cloud → Secrets (this is a   |
|                    | gateway key tied to your Lovable workspace; AI calls still    |
|                    | route through `ai.gateway.lovable.dev`, free tier applies).   |

## 5. Import the repo into Vercel

1. Vercel → **Add New → Project** → pick your GitHub repo.
2. Framework preset: **Other** (auto-detected from `vite.config.ts`).
3. Build command: `vite build` (default).
4. Output: leave default — the TanStack Start Vercel target writes the correct
   `.vercel/output/` structure automatically.
5. Click **Deploy**.

## 6. After deploy

- Server functions (`createServerFn`) become Vercel Functions automatically.
- The Lovable AI Gateway call in `src/lib/drift.functions.ts` runs server-side
  and reads `process.env.LOVABLE_API_KEY` — no client exposure.
- If you later want to rotate the key, do it in Lovable → Cloud → Secrets,
  then update the value in Vercel and redeploy.

---

## Optional: drop Lovable entirely

If you want zero Lovable dependency, swap `src/lib/ai-gateway.server.ts` to call
Google's Gemini API directly with `GEMINI_API_KEY` instead of the Lovable
gateway. The rest of the app stays the same.
