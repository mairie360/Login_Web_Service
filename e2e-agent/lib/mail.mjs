#!/usr/bin/env node
/**
 * E-mails envoyés par staging (core-api et Keycloak passent par Resend), lus via l'API Resend.
 *
 *   node lib/mail.mjs wait --to vous+e2e-abc-newcomer@gmail.com [--subject "mot de passe"] [--after 2026-10-12T10:00:00Z] [--timeout 90]
 *
 * Imprime { id, to, subject, created_at, last_event, links[], text } du plus récent e-mail correspondant,
 * ou sort en erreur au bout du délai. `last_event` (delivered, bounced…) dit si Resend l'a réellement remis.
 * Limite de l'API Resend: 2 requêtes/s, on interroge toutes les 3 s.
 */
import { pathToFileURL } from 'node:url';
import { arg, cfg } from './config.mjs';

const API = 'https://api.resend.com';
const headers = () => ({ authorization: `Bearer ${cfg.resendKey}` });

async function get(path) {
  const res = await fetch(`${API}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`Resend ${path} -> ${res.status}`);
  return res.json();
}

function linksOf(email) {
  const source = `${email.html ?? ''}\n${email.text ?? ''}`;
  const found = new Set();
  for (const m of source.matchAll(/https?:\/\/[^\s"'<>)]+/g)) found.add(m[0].replace(/&amp;/g, '&'));
  return [...found];
}

export async function waitForMail({ to, subject, after, timeoutS = 90 }) {
  const since = after ? new Date(after).getTime() : Date.now() - 15 * 60_000;
  const deadline = Date.now() + timeoutS * 1000;
  const wanted = to.toLowerCase();
  const pattern = subject ? new RegExp(subject, 'i') : null;
  while (Date.now() < deadline) {
    const list = await get('/emails?limit=50');
    const hit = (list.data ?? [])
      .filter((m) => (m.to ?? []).some((t) => t.toLowerCase().includes(wanted)))
      .filter((m) => new Date(m.created_at).getTime() >= since)
      .filter((m) => !pattern || pattern.test(m.subject ?? ''))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    if (hit) {
      const full = await get(`/emails/${hit.id}`);
      return {
        id: full.id,
        to: full.to,
        from: full.from,
        subject: full.subject,
        created_at: full.created_at,
        last_event: full.last_event,
        links: linksOf(full),
        text: (full.text ?? (full.html ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, 1500),
      };
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`Aucun e-mail pour ${to} après ${timeoutS}s`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  try {
    if (argv[0] !== 'wait' || !arg('to', argv)) throw new Error('usage: mail.mjs wait --to <adresse> [--subject <regex>] [--after <ISO>] [--timeout <s>]');
    const mail = await waitForMail({
      to: arg('to', argv),
      subject: arg('subject', argv),
      after: arg('after', argv),
      timeoutS: Number(arg('timeout', argv) ?? 90),
    });
    console.log(JSON.stringify(mail, null, 2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
