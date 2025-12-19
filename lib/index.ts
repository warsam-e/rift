import pg, { type PoolClient } from 'pg';
import { type RiftConfig, RiftError, type RiftObjectAny } from './types.ts';

declare module 'pg' {
	interface ClientBase {
		[Symbol.dispose](): void;
	}
}

pg.Client.prototype[Symbol.dispose] = function () {
	if ('release' in this) (this as pg.PoolClient).release(true);
};

export let pool: pg.Pool;
export type { PoolClient };

export async function init_pool(conf: RiftConfig) {
	if (pool) return;
	const { name, auth } = conf;
	pool = new pg.Pool({
		host: auth?.host,
		port: auth?.port,
		database: auth?.database,
		user: auth?.user,
		password: auth?.password,
		max: conf.max,
	});

	pool.on('connect', () => console.log(`[${name} DB] new connection: ${pool.totalCount}`));
	pool.on('remove', () => console.log(`[${name} DB] removed connection: ${pool.totalCount}`));

	if (!conf.initial_script) return;
	console.time(`[${name} DB] Init`);
	using conn = await pool.connect();
	await query(conn, conf.initial_script);
	console.timeEnd(`[${name} DB] Init`);
}

/**
 * Run a query on the database.
 * @example
 * ```ts
 * using conn = await pool.connect();
 * const res = await query(conn, "select * from users where id = any($1)", [[1, 2, 3]]);
 * ```
 * @param conn - The connection to the database
 * @param query - The query to run
 * @param values - The values to pass to the query
 * @returns The result of the query
 * @throws {RiftError} - If for some reason the query fails
 */
export async function query<T extends RiftObjectAny, V = unknown>(
	conn: pg.PoolClient,
	query: string,
	values: Array<V> = [],
): Promise<T[]> {
	let res: pg.QueryResult<T>;
	try {
		res = await conn.query<T, typeof values>(query, values);
	} catch (e) {
		// console.error(e);
		if (e instanceof pg.DatabaseError)
			throw new RiftError(
				[
					`Database Error: ${e.message}`,
					'',
					`Code: ${e.code ?? 'N/A'}`,
					`Detail: ${e.detail ?? 'N/A'}`,
					`Hint: ${e.hint ?? 'N/A'}`,
					`Position: ${e.position ?? 'N/A'}`,
					`Query: ${query}`,
					`Values: ${JSON.stringify(values)}`,
				].join('\n'),
			);
		throw new RiftError(`Query failed: ${e instanceof Error ? e.message : 'unknown error'}`);
	}
	return res.rows;
}

/**
 * Run an insert query on the database.
 * @example
 * ```ts
 * using conn = await pool.connect();
 * const res = await insert(conn, "users", { name: "John Doe" });
 * ```
 * @param conn - The connection to the database
 * @param table - The table to insert into
 * @param data - The data to insert
 * @param conflict - The columns to check for conflicts, if any
 * @returns The inserted row
 * @throws {RiftError} - If for some reason the query fails and the row does not exist
 */
export async function insert<T extends RiftObjectAny, V extends RiftObjectAny>(
	conn: pg.PoolClient,
	table: string,
	data: T[],
	conflict?: Array<keyof T>,
): Promise<V[]> {
	if (!data.length) return [];

	const keys = Object.keys(data[0]);
	const values: Array<unknown> = [];
	const valuePlaceholders: Array<string> = [];

	for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
		const row = data[rowIndex];
		const rowValues = keys.map((key) => row[key]);
		values.push(...rowValues);
		const placeholders = rowValues.map((_, i) => `$${rowIndex * keys.length + i + 1}`).join(', ');
		valuePlaceholders.push(`(${placeholders})`);
	}

	const updateClause = conflict?.length
		? `ON CONFLICT (${conflict.join(', ')}) DO UPDATE SET ${keys.map((k) => `${k} = EXCLUDED.${k}`).join(', ')}`
		: '';

	const queryText = `
    INSERT INTO ${table} (${keys.join(', ')})
    VALUES ${valuePlaceholders.join(', ')}
    ${updateClause}
    RETURNING *;
  `;

	return query(conn, queryText, values);
}

/**
 * Run an update query on the database.
 * @example
 * ```ts
 * using conn = await pool.connect();
 * const res = await update(conn, "users", { id: 1 }, { name: "John Doe" });
 * ```
 * @param conn - The connection to the database
 * @param table - The table to update
 * @param where - The where clause
 * @param data - The data to update
 * @returns The updated row
 * @throws {RiftError} - If for some reason the query fails and the row does not exist
 */
export async function update<
	T extends RiftObjectAny,
	Data extends Record<string, unknown>,
	V extends Record<string, unknown>,
>(
	conn: pg.PoolClient,
	table: string,
	where: {
		[K in keyof T]: T[K];
	},
	data: Data,
): Promise<V> {
	const keys = Object.keys(data);
	const values = Object.values(data);
	const where_keys = Object.keys(where);
	const where_values = Object.values(where);
	const res = await query<V>(
		conn,
		`update ${table} set ${keys.map((k, i) => `${k} = $${i + 1}`).join(', ')} where ${where_keys
			.map((k, i) => `${k} = $${i + 1 + keys.length}`)
			.join(' and ')} returning *`,
		[...values, ...where_values],
	);

	if (!res[0]) throw new RiftError('Update failed: no rows affected');

	return res[0];
}

/**
 * Run a remove query on the database.
 * @example
 * ```ts
 * using conn = await pool.connect();
 * await remove(conn, "users", { id: 1 });
 * ```
 * @param conn - The connection to the database
 * @param table - The table to remove from
 * @param where - The where clause
 */
export async function remove<T extends RiftObjectAny>(
	conn: pg.PoolClient,
	table: string,
	where: {
		[K in keyof T]?: T[K];
	},
): Promise<void> {
	const keys = Object.keys(where);
	const values = Object.values(where);
	await query(conn, `delete from ${table} where ${keys.map((k, i) => `${k} = $${i + 1}`).join(' and ')}`, values);
}

export * from './types.ts';
