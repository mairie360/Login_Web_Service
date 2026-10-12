#!/usr/bin/env node
/**
 * Lecture seule de Redis de staging (via scripts/port-forward.sh).
 * Toutes les clés sont préfixées par le rôle de l'API: `core-api:…`; la liste de révocation `revoked:<sid>` ne l'est pas.
 *
 *   node lib/redis.mjs exists revoked:42
 *   node lib/redis.mjs ttl revoked:42
 *   node lib/redis.mjs get <clé>
 *   node lib/redis.mjs scan 'revoked:*'
 *
 * Seules ces quatre opérations sont exposées (pas de commande libre).
 */
import Redis from 'ioredis';
import { pathToFileURL } from 'node:url';
import { cfg } from './config.mjs';

export async function redis(command, arg) {
  const client = new Redis({ ...cfg.redis, lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 8000 });
  await client.connect();
  try {
    if (command === 'exists') return (await client.exists(arg)) === 1;
    if (command === 'ttl') return await client.ttl(arg);
    if (command === 'get') return await client.get(arg);
    if (command === 'scan') {
      const keys = [];
      let cursor = '0';
      do {
        const [next, batch] = await client.scan(cursor, 'MATCH', arg, 'COUNT', 200);
        cursor = next;
        keys.push(...batch);
      } while (cursor !== '0' && keys.length < 200);
      return keys;
    }
    throw new Error('commande: exists | ttl | get | scan');
  } finally {
    client.disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(JSON.stringify(await redis(process.argv[2], process.argv[3]), null, 2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
