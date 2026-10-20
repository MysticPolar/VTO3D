/**
 * Runs the Web-standard handlers inside a Node `http` server (the Vite dev and preview servers),
 * so `pnpm dev` exercises exactly the code Vercel runs.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Handlers } from './handlers.js';

const ROUTES: Record<string, keyof Handlers> = {
  '/api/token': 'token',
  '/api/usage': 'usage',
  '/api/health': 'health',
};

const MAX_BODY = 16 * 1024;

async function toRequest(req: IncomingMessage, secure: boolean): Promise<Request> {
  const url = `${secure ? 'https' : 'http'}://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`;
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((v) => headers.append(name, v));
    else if (value !== undefined) headers.set(name, value);
  }
  let body: Uint8Array<ArrayBuffer> | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req as AsyncIterable<Buffer>) {
      size += chunk.length;
      if (size > MAX_BODY) throw new Error('Request body too large');
      chunks.push(chunk);
    }
    body = new Uint8Array(Buffer.concat(chunks));
  }
  return new Request(url, { method: req.method, headers, body });
}

/** Connect-style middleware: answers /api/* routes it knows, passes everything else on */
export function apiMiddleware(getHandlers: () => Handlers, secure = false) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const path = (req.url ?? '/').split('?')[0] ?? '/';
    const route = ROUTES[path];
    if (!route) {
      next();
      return;
    }
    void (async () => {
      try {
        const response = await getHandlers()[route](await toRequest(req, secure));
        res.statusCode = response.status;
        response.headers.forEach((value, name) => res.setHeader(name, value));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch (error) {
        // the page went away mid-request (a usage report as the tab closes): nobody to answer
        if (req.destroyed || (error as NodeJS.ErrnoException).code === 'ECONNRESET') return;
        console.error('[live-tryon]', error);
        res.statusCode = 500;
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: { code: 'upstream_error', message: 'Server error' } }));
      }
    })();
  };
}
