/**
 * The bench's static server (docs/adr/0046-viewer-spike.md decision 1): bound to 127.0.0.1 on a
 * free port, it serves a fixed map of paths and nothing else (no folder is listed or walked), and
 * records every request it answers. It sends the cross-origin isolation headers, so the page can
 * read its own memory (`performance.measureUserAgentSpecificMemory`).
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname } from 'node:path';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.frag': 'application/octet-stream',
};

export interface BenchServer {
  readonly origin: string;
  readonly served: string[];
  readonly refused: string[];
  /** Adds or replaces one served path (a model, typically). */
  route(path: string, file: string): void;
  close(): Promise<void>;
}

export async function startBenchServer(routes: Record<string, string>): Promise<BenchServer> {
  const table = new Map(Object.entries(routes));
  const served: string[] = [];
  const refused: string[] = [];
  const server: Server = createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    const file = table.get(path);
    if (request.method !== 'GET' || file === undefined) {
      refused.push(`${request.method ?? '?'} ${path}`);
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('not served');
      return;
    }
    stat(file).then(
      (info) => {
        served.push(path);
        response.writeHead(200, {
          'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
          'Content-Length': `${info.size}`,
          'Cache-Control': 'no-store',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Resource-Policy': 'same-origin',
        });
        createReadStream(file).pipe(response);
      },
      () => {
        refused.push(`GET ${path} (missing)`);
        response.writeHead(404).end();
      },
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    origin: `http://127.0.0.1:${port}`,
    served,
    refused,
    route: (path, file) => table.set(path, file),
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
