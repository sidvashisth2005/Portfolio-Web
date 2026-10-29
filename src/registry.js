// 住人台帳 · The village registry: the rules every house in the residents' quarter is held to. The browser
// (src/world/residents.js) and the server (api/house.js) both read this file, so a house the form accepts is a
// house the server stores, and the server never trusts the form.
export const PLOTS = 24;
// the noren (door curtain) and roof colours a resident can choose from
export const NOREN = ['#1f3a5f', '#b8232c', '#2f5d3a', '#4a2c5e', '#c27b1a', '#1a1214', '#2b6f74', '#8e2a4a'];
export const NOREN_NAMES = ['Indigo', 'Crimson', 'Pine', 'Violet', 'Amber', 'Ink', 'Teal', 'Plum'];
export const ROOFS = ['#4a4552', '#b3262e', '#3f7f7a', '#3f6fae', '#5b6b4a', '#8e5a2a'];
export const ROOF_NAMES = ['Slate', 'Vermilion', 'Copper green', 'Blue glaze', 'Moss', 'Cedar'];
// what a resident can keep in the house: each is a thing on the shelves, with a kanji, a name and what it is for
export const KINDS = {
  scroll: ['巻', 'Scroll', 'A note or a story'],
  letter: ['文', 'Letter', 'A message to visitors'],
  tag: ['札', 'Ema plaque', 'A link worth visiting'],
  book: ['本', 'Books', 'Something worth reading'],
  blade: ['刀', 'Blade', 'A project or a skill'],
  cup: ['杯', 'Cup', 'A win or a milestone'],
  lantern: ['灯', 'Lantern', 'An idea'],
  plant: ['盆', 'Bonsai', 'Something still growing'],
  pot: ['壺', 'Jar', 'A keepsake'],
  box: ['箱', 'Lacquer box', 'A treasure'],
};
export const LIMITS = { name: 32, crest: 2, motto: 90, items: 12, title: 60, text: 500, url: 300, sealed: 2400, from: 40, note: 280, notes: 40 };

const CTRL = /[\u0000-\u001f\u007f​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;
// one line of text: no control or direction characters, spaces collapsed
export const line = (s, n) => String(s ?? '').replace(CTRL, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
// a paragraph: line breaks kept (at most one blank line in a row), everything else as above
export const para = (s, n) => String(s ?? '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(CTRL, ' ').replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, n);
// user-perceived characters, so a crest of one emoji or one kanji counts as one
export function graphemes(s) {
  try { return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)].map((x) => x.segment); } catch { return [...s]; }
}
// a link: http(s) only, a real host, no credentials in it. '' for none, null for one that isn't allowed
export function cleanUrl(u) {
  u = line(u, LIMITS.url);
  if (!u) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = `https://${u}`;
  try {
    const x = new URL(u);
    if (!/^https?:$/.test(x.protocol) || !/\.[a-z]{2,}$/i.test(x.hostname) || x.username || x.password) return null;
    return x.href.slice(0, LIMITS.url);
  } catch { return null; }
}
const choice = (v, n) => (Number.isInteger(+v) && +v >= 0 && +v < n ? +v : 0);
const ID = /^[a-z0-9]{6,12}$/;
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

// a house's face to the street: its resident's name, crest, colours and motto
export function normProfile(p = {}) {
  const errors = {};
  const name = line(p.name, LIMITS.name);
  const crest = graphemes(line(p.crest, 16).replace(/\s/g, '')).slice(0, LIMITS.crest).join('');
  const motto = line(p.motto, LIMITS.motto);
  if (graphemes(name).length < 2) errors.name = 'Your name needs at least two characters';
  if (/siddhant\s*vashisth/i.test(name)) errors.name = 'That name belongs to the village’s founder';
  if (!crest) errors.crest = 'Pick a crest: one or two characters';
  return { value: { name, crest, color: choice(p.color, NOREN.length), roof: choice(p.roof, ROOFS.length), motto }, errors };
}

// one thing on the shelves. Public: what visitors see. Private: sealed in the owner's browser before it is sent
// (AES-GCM, see src/world/registry.js), so the server only ever holds ciphertext: kind and id stay readable so the
// owner's room can show it, nothing else does.
export function normItem(it = {}) {
  const id = ID.test(it.id) ? it.id : null;
  const kind = Object.hasOwn(KINDS, it.kind) ? it.kind : null;
  if (!id || !kind) return { error: 'An item is missing its kind' };
  if (it.pub === false) {
    const sealed = String(it.sealed || ''), iv = String(it.iv || '');
    if (!B64.test(sealed) || sealed.length > LIMITS.sealed || !B64.test(iv) || iv.length !== 16) return { error: 'A private item couldn’t be sealed' };
    return { value: { id, kind, pub: false, sealed, iv } };
  }
  const title = line(it.title, LIMITS.title), text = para(it.text, LIMITS.text), url = cleanUrl(it.url);
  if (!title) return { error: 'Every item needs a title' };
  if (url === null) return { error: `“${title}”: that link isn’t a web address (http or https)` };
  return { value: { id, kind, pub: true, title, text, url } };
}
export function normItems(list) {
  if (!Array.isArray(list)) return { value: [] };
  if (list.length > LIMITS.items) return { error: `A house holds ${LIMITS.items} things at most` };
  const out = [], seen = new Set();
  for (const it of list) {
    const r = normItem(it);
    if (r.error) return r;
    if (seen.has(r.value.id)) continue;
    seen.add(r.value.id);
    out.push(r.value);
  }
  return { value: out };
}
// a note slipped under the door: only the resident reads it
export function normNote(n = {}) {
  const from = line(n.from, LIMITS.from) || 'A visitor', text = para(n.text, LIMITS.note);
  if (text.length < 2) return { error: 'Write a little more' };
  return { value: { from, text } };
}
// the texts a visitor could see, for moderation
export const publicText = (profile, items = []) => [profile.name, profile.motto, ...items.filter((i) => i.pub).flatMap((i) => [i.title, i.text, i.url])].filter(Boolean);
