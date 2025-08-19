export class RiftError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'RiftError';
	}
}

/**
 * options for the database connection.
 * authentication can alternatively be provided via environment variables, see {@link https://www.postgresql.org/docs/9.1/libpq-envars.html}
 */
export interface RiftConfigAuth {
	/** The host of the database */
	host?: string;
	/** The port of the database */
	port?: number;
	/** The name of the database */
	database?: string;
	/** The username of the database */
	user?: string;
	/** The password of the database */
	password?: string | (() => string | Promise<string>);
}

export interface RiftConfig {
	/** The name of the database, used for logging */
	name: string;
	/** The authentication details for the database */
	auth?: RiftConfigAuth;
	/** The maximum number of connections to the database */
	max?: number;
	/** The initial script to run when connecting to the database */
	initial_script?: string;
}

/** a generic object where the values can be anything */
// biome-ignore lint/suspicious/noExplicitAny: an object where the values can be anything
export type RiftObjectAny = Record<string, any>;
