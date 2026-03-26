import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type InvokeBody = {
	module?: string;
	fn?: string;
	args?: unknown[];
};

// Eagerly load all remote modules so we can invoke them by (module suffix + export name).
// This keeps client-side code simple: pages call `/api/remote/invoke` and provide `module` + `fn`.
const remoteModules = import.meta.glob('$lib/remote/**/*.remote.ts', {
	eager: true
}) as Record<string, Record<string, unknown>>;

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const body: InvokeBody = await request.json().catch(() => ({}));
	const moduleSuffix = body.module ?? '';
	const fnName = body.fn ?? '';
	const args = Array.isArray(body.args) ? body.args : [];

	if (!moduleSuffix || !fnName) {
		throw error(
			400,
			'Expected `{ module, fn, args }` in request body'
		);
	}

	const matchKey = Object.keys(remoteModules).find((k) =>
		k.endsWith(moduleSuffix)
	);
	if (!matchKey) {
		throw error(404, `Unknown remote module: ${moduleSuffix}`);
	}

	const mod = remoteModules[matchKey] as any;
	const fn = mod?.[fnName];
	if (typeof fn !== 'function') {
		throw error(404, `Unknown remote function: ${fnName}`);
	}

	const ret = fn(...args);

	// Do NOT call `.refresh()` here.
	// SvelteKit remote-query `.refresh()` is only valid when executed inside the
	// command/form remote function context. In our setup, the client-side wrapper
	// re-invokes `/api/remote/invoke` when a `.refresh()` is requested.
	return json(await ret);
};
