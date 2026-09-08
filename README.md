# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
pnpm dlx sv create --template minimal --types ts --add prettier eslint vitest="usages:unit,component" playwright tailwindcss="plugins:typography,forms" sveltekit-adapter="adapter:node" devtools-json drizzle="database:postgresql+postgresql:neon" mdsvex paraglide="languageTags:en, ja, my+demo:yes" mcp="ide:cursor+setup:local" --install pnpm heka
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
pnpm run build
```

You can preview the production build with `pnpm run preview`.

## Deploying to Netlify

This project uses [`@sveltejs/adapter-netlify`](https://svelte.dev/docs/kit/adapter-netlify) and `netlify.toml`.

1. Log in: `npx netlify login`
2. Link or create a site: `npx netlify init` (or connect the GitHub repo in the Netlify UI)
3. In **Site settings → Environment variables**, set at least:
   - `DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_BASE_URL` / `BETTER_AUTH_URL` (your `https://….netlify.app` or custom domain)
   - `BETTER_AUTH_TRUSTED_ORIGINS` (same origins, comma-separated)
   - `NODE_AUTH_TOKEN` — GitHub PAT with `read:packages` (private `@menzies-mariesta-com/*`)
   - Plus SMTP / Tigris / OpenAI vars from `.env.example` as needed
4. Deploy: `npx netlify deploy` (draft) then `npx netlify deploy --prod`

Continuous deploy: connect `menzies-mariesta-com/medora-web-menzies` in Netlify so pushes build automatically.
