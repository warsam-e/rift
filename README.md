# @warsam-e/rift
<a href="https://www.npmjs.com/package/@warsam-e/rift"><img src="https://img.shields.io/npm/v/@warsam-e/rift?maxAge=300" alt="npm version" /></a>
<a href="https://www.npmjs.com/package/@warsam-e/rift"><img src="https://img.shields.io/npm/dt/@warsam-e/rift.svg?maxAge=300" alt="npm downloads" /></a>

### A lightweight postgres library for TypeScript

## Installation

```zsh
% bun i @warsam-e/rift
```

## Basic Usage

```ts
import { init_pool, pool, query } from '@warsam-e/rift';

const initial_script = `
create table if not exists list (
	id int not null primary key,
	value text not null
);
`;

await init_pool({
	auth: {
		host: 'localhost',
		port: 5432,
		user: 'test',
		password: 'test',
		database: 'test',
	},
	initial_script,
	max: 1000, // maximum number of clients in the pool
});

async function get_some(ids: number[]) {
	// `using` automatically releases the connection once the block is exited
	using conn = await pool.connect(); 
	
	return query(conn, 'select * from list where id = any($1)', [ids]);
}

let list = await get_some([1, 2, 3]);
console.log(list);
```
