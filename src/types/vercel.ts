import type { IncomingHttpHeaders } from 'node:http';

export interface VercelRequest {
  method?: string;
  headers: IncomingHttpHeaders;
  body: unknown;
  query: Record<string, string | string[] | undefined>;
}

export interface VercelResponse {
  setHeader(name: string, value: string | number | readonly string[]): this;
  status(statusCode: number): this;
  json(body: unknown): this;
  send(body: unknown): this;
}