import { test } from 'vitest';
import { getTableName, type Table } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

test('schema drift', async () => {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('no DATABASE_URL');
	const sql = neon(url);

	const dbTables = new Map<string, Set<string>>();
	const rows = (await sql`
		select table_name, column_name from information_schema.columns where table_schema = 'public'
	`) as { table_name: string; column_name: string }[];
	for (const r of rows) {
		if (!dbTables.has(r.table_name)) dbTables.set(r.table_name, new Set());
		dbTables.get(r.table_name)!.add(r.column_name);
	}

	const missingTables: string[] = [];
	const missingCols: string[] = [];
	const seen = new Set<string>();

	for (const value of Object.values(schema)) {
		if (typeof value !== 'object' || value === null) continue;
		let tableName: string | undefined;
		try {
			tableName = getTableName(value as Table);
		} catch {
			continue;
		}
		if (!tableName || seen.has(tableName)) continue;
		seen.add(tableName);
		const cols = dbTables.get(tableName);
		if (!cols) {
			missingTables.push(tableName);
			continue;
		}
		for (const key of Object.keys(value as Record<string, unknown>)) {
			const col = (value as Record<string, unknown>)[key];
			if (typeof col !== 'object' || col === null) continue;
			const name = (col as { name?: unknown }).name;
			if (typeof name !== 'string') continue;
			if (!cols.has(name)) missingCols.push(`${tableName}.${name}`);
		}
	}

	console.log('MISSING TABLES', missingTables.length, missingTables.join(' '));
	console.log('MISSING COLS', missingCols.length, missingCols.join(' '));
});
