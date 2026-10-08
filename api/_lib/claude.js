// Thin client for the Claude Messages API (no SDK, so functions stay tiny and cold-start fast).
import { env } from './env.js';

const headers = () => ({
  'x-api-key': env.anthropicKey,
  'anthropic-version': '2023-06-01',
  'content-type': 'application/json',
});

export async function claude(body, { signal } = {}) {
  const res = await fetch(`${env.anthropicBase}/v1/messages`, {
    method: 'POST',
    signal,
    headers: headers(),
    body: JSON.stringify({ model: env.model, ...body }),
  });
  if (!res.ok) throw Object.assign(new Error(`claude ${res.status}: ${(await res.text()).slice(0, 300)}`), { status: res.status });
  return res.json();
}

// Streams only the text deltas, as a plain UTF-8 stream the browser can read chunk by chunk
export async function claudeTextStream(body) {
  const res = await fetch(`${env.anthropicBase}/v1/messages`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ model: env.model, stream: true, ...body }),
  });
  if (!res.ok || !res.body) throw Object.assign(new Error(`claude ${res.status}: ${(await res.text()).slice(0, 300)}`), { status: res.status });
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buf = '';
  return res.body.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      buf += decoder.decode(chunk, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, i);
        buf = buf.slice(i + 2);
        const data = block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
        if (!data) continue;
        try {
          const ev = JSON.parse(data);
          if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') controller.enqueue(encoder.encode(ev.delta.text));
          if (ev.type === 'error') controller.enqueue(encoder.encode('\n\n[The clone lost focus. Try again in a moment.]'));
        } catch { /* partial or keep-alive */ }
      }
    },
  }));
}

export const toolInput = (msg, name) => msg.content?.find((c) => c.type === 'tool_use' && c.name === name)?.input;
