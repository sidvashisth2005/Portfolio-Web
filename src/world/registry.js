// The village registry, from the browser: talking to api/house.js, the house key, and sealing private things.
//
// The house key is the only way into a house: no account, no email, no password. It is 20 random bytes written in
// Crockford base32 behind the house's number ("07-K3QF-…"), so it opens the right house on any device. The key
// itself never leaves the browser. The server is sent auth = SHA-256("auth|" + key) and keeps only a hash of
// that; private things are sealed here with AES-GCM under SHA-256("seal|" + key), so the server holds ciphertext
// it has no way to open.
//
// Without a registry (no Redis on the server, or a static preview) everything still works in this browser only,
// kept in localStorage, and the UI says so.
import { PLOTS, LIMITS, normProfile, normItems, normNote } from '../registry.js';

const API = 'api/house';
const MINE = 'sv-house', LOCAL = 'sv-house-local';
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* nothing kept */ } },
};
const enc = new TextEncoder(), dec = new TextDecoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const sha = (s) => crypto.subtle.digest('SHA-256', enc.encode(s));

export function newKey(id) {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let v = 0, bits = 0, out = '';
  for (const b of bytes) { v = ((v << 8) | b) & 0xffff; bits += 8; while (bits >= 5) { out += B32[(v >>> (bits - 5)) & 31]; bits -= 5; } }
  return `${String(id + 1).padStart(2, '0')}-${out.match(/.{4}/g).join('-')}`;
}
// a key as typed or pasted: case, spaces and the look-alike letters forgiven
export function parseKey(s) {
  const t = String(s || '').toUpperCase().replace(/[\s_]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0').replace(/-/g, '');
  const m = t.match(/^(\d{2})([0-9A-Z]{32})$/);
  if (!m || /[U]/.test(m[2])) return null;
  const id = +m[1] - 1;
  if (id < 0 || id >= PLOTS) return null;
  return { id, key: `${m[1]}-${m[2].match(/.{4}/g).join('-')}` };
}
async function derive(key) {
  const auth = hex(await sha(`auth|${key}`));
  const seal = await crypto.subtle.importKey('raw', await sha(`seal|${key}`), 'AES-GCM', false, ['encrypt', 'decrypt']);
  return { auth, seal };
}
async function sealItem(k, it) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body = enc.encode(JSON.stringify({ title: it.title, text: it.text, url: it.url }));
  const sealed = b64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, body));
  if (sealed.length > LIMITS.sealed) throw new Error(`“${it.title}” is too long to seal: shorten its text`);
  return { id: it.id, kind: it.kind, pub: false, sealed, iv: b64(iv) };
}
async function openItem(k, it) {
  try {
    const plain = JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(it.iv) }, k, unb64(it.sealed))));
    return { id: it.id, kind: it.kind, pub: false, title: String(plain.title || ''), text: String(plain.text || ''), url: String(plain.url || '') };
  } catch { return { id: it.id, kind: it.kind, pub: false, title: 'Sealed', text: 'This was sealed with another key and can’t be opened here.', url: '', broken: true }; }
}
export const newItemId = () => [...crypto.getRandomValues(new Uint8Array(8))].map((b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b & 31]).join('');

// ---------- this browser only: the same answers as the server, kept in localStorage ----------
const day = () => new Date().toISOString().slice(0, 10);
const summary = (h, lanterns) => h && { id: h.id, name: h.name, crest: h.crest, color: h.color, roof: h.roof, motto: h.motto, since: h.since, items: h.items.filter((i) => i.pub).length, lanterns };
const local = {
  db() { return store.get(LOCAL) || { houses: {}, lanterns: {}, notes: {}, lit: {} }; },
  async handle(method, id, body, auth) {
    const db = this.db(), save = () => store.set(LOCAL, db);
    const authHash = auth ? hex(await sha(auth)) : '';
    const owns = (h) => h && auth && h.auth === authHash;
    const fail = (status, message, extra) => { throw Object.assign(new Error(message), { status, data: { ok: false, message, ...extra } }); };
    if (method === 'GET') {
      if (id == null) return { ok: true, houses: Array.from({ length: PLOTS }, (_, i) => summary(db.houses[i], db.lanterns[i] || 0) || null) };
      const h = db.houses[id];
      if (!h) return { ok: true, house: null };
      const own = owns(h);
      return { ok: true, house: { ...h, auth: undefined, items: own ? h.items : h.items.filter((i) => i.pub), lanterns: db.lanterns[id] || 0, owner: own, notes: own ? db.notes[id] || [] : undefined } };
    }
    const h = db.houses[body.id];
    switch (body.action) {
      case 'claim': {
        if (h) fail(409, 'Someone moved in just before you. Pick another house.');
        const p = normProfile(body.profile);
        if (Object.keys(p.errors).length) fail(422, 'Check the form', { errors: p.errors });
        db.houses[body.id] = { id: body.id, ...p.value, since: new Date().toISOString(), items: [], auth: hex(await sha(body.auth)) };
        save(); return { ok: true };
      }
      case 'save': {
        if (!owns(h)) fail(403, 'That key doesn’t open this house');
        const p = normProfile(body.profile), it = normItems(body.items);
        if (Object.keys(p.errors).length) fail(422, 'Check the form', { errors: p.errors });
        if (it.error) fail(422, it.error);
        Object.assign(h, p.value, { items: it.value, updated: new Date().toISOString() });
        save(); return { ok: true };
      }
      case 'lantern': {
        if (!h) fail(404, 'Nobody lives there yet');
        const k = `${body.id}:${day()}`;
        if (!db.lit[k]) { db.lit[k] = true; db.lanterns[body.id] = (db.lanterns[body.id] || 0) + 1; save(); return { ok: true, lanterns: db.lanterns[body.id] }; }
        return { ok: true, lanterns: db.lanterns[body.id] || 0, already: true };
      }
      case 'note': {
        if (!h) fail(404, 'Nobody lives there yet');
        const n = normNote(body.note);
        if (n.error) fail(422, n.error);
        (db.notes[body.id] ||= []).unshift({ ...n.value, at: new Date().toISOString() });
        db.notes[body.id] = db.notes[body.id].slice(0, LIMITS.notes);
        save(); return { ok: true };
      }
      case 'notes-clear': if (!owns(h)) fail(403, 'That key doesn’t open this house'); db.notes[body.id] = []; save(); return { ok: true };
      case 'leave': if (!owns(h)) fail(403, 'That key doesn’t open this house'); delete db.houses[body.id]; delete db.notes[body.id]; delete db.lanterns[body.id]; save(); return { ok: true };
      default: fail(400, 'Unknown action');
    }
    return null;
  },
};

// ---------- the registry ----------
let offline = false;
async function call(method, { id, body, auth } = {}) {
  if (offline) return local.handle(method, id, body, auth);
  let res;
  try {
    res = await fetch(method === 'GET' ? `${API}${id != null ? `?id=${id}` : ''}` : API, {
      method, cache: 'no-store',
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch { throw Object.assign(new Error('Couldn’t reach the village registry. Check your connection and try again.'), { status: 0 }); }
  const data = (res.headers.get('content-type') || '').includes('json') ? await res.json().catch(() => null) : null;
  // no registry behind this site: the village keeps houses in this browser instead
  if (!data || res.status === 404 || data.error === 'offline') { offline = true; return local.handle(method, id, body, auth); }
  if (!res.ok || !data.ok) {
    const msg = data.message || (res.status === 429 ? 'That’s a lot at once. Try again in a while.' : 'The registry couldn’t do that just now. Try again in a moment.');
    throw Object.assign(new Error(msg), { status: res.status, data });
  }
  return data;
}

let mine = store.get(MINE); // { id, key }
let keys = null; // derived from mine
async function myKeys() {
  if (!mine) return null;
  if (!keys || keys.for !== mine.key) keys = { for: mine.key, ...(await derive(mine.key)) };
  return keys;
}

export const registry = {
  get offline() { return offline; },
  get mine() { return mine; },
  async list() { return (await call('GET')).houses; },
  // one house; with all its things (private ones opened) when it is yours
  async house(id) {
    const k = mine?.id === id ? await myKeys() : null;
    const { house } = await call('GET', { id, auth: k?.auth });
    if (!house) return null;
    if (house.owner && k) house.items = await Promise.all(house.items.map((it) => (it.pub ? it : openItem(k.seal, it))));
    return house;
  },
  async claim(id, profile) {
    const key = newKey(id), { auth } = await derive(key);
    await call('POST', { body: { action: 'claim', id, profile, auth } });
    mine = { id, key };
    store.set(MINE, mine);
    return key;
  },
  // items in the clear, each with pub: true or false; the private ones are sealed before they go
  async save(profile, items) {
    const k = await myKeys();
    if (!k) throw new Error('You don’t hold a key to a house');
    const out = await Promise.all(items.map((it) => (it.pub ? { id: it.id, kind: it.kind, pub: true, title: it.title, text: it.text, url: it.url } : sealItem(k.seal, it))));
    return call('POST', { body: { action: 'save', id: mine.id, profile, items: out }, auth: k.auth });
  },
  lantern(id) { return call('POST', { body: { action: 'lantern', id } }); },
  note(id, note) { return call('POST', { body: { action: 'note', id, note } }); },
  async clearNotes() { const k = await myKeys(); return call('POST', { body: { action: 'notes-clear', id: mine.id }, auth: k.auth }); },
  async leave() {
    const k = await myKeys();
    await call('POST', { body: { action: 'leave', id: mine.id }, auth: k.auth });
    this.forget();
  },
  forget() { mine = null; keys = null; store.del(MINE); },
  // a key typed in on another device: it is kept only if it really opens its house
  async adopt(text) {
    const p = parseKey(text);
    if (!p) throw new Error('That doesn’t look like a house key. It starts with the house number, like 07-…');
    const { auth } = await derive(p.key);
    const { house } = await call('GET', { id: p.id, auth });
    if (!house?.owner) throw new Error('That key doesn’t open any house in the quarter.');
    mine = p; keys = null;
    store.set(MINE, mine);
    return p.id;
  },
};
