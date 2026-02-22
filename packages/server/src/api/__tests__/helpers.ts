import { IncomingMessage, ServerResponse } from 'http';
import { EventEmitter } from 'events';

export function createMockReq(method: string, url: string, headers: Record<string, string> = {}): IncomingMessage {
  const req = new EventEmitter() as IncomingMessage;
  req.method = method;
  req.url = url;
  req.headers = headers;
  return req;
}

export function createMockRes(): ServerResponse & { _status: number; _body: string; _headers: Record<string, string> } {
  const res = new EventEmitter() as any;
  res._status = 0;
  res._body = '';
  res._headers = {};
  res.setHeader = (key: string, value: string) => { res._headers[key.toLowerCase()] = value; };
  res.writeHead = (status: number, headers?: Record<string, string>) => {
    res._status = status;
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        res._headers[k.toLowerCase()] = v;
      }
    }
  };
  res.end = (body?: string) => { res._body = body || ''; };
  return res;
}

export function parseBody(res: ReturnType<typeof createMockRes>): any {
  return JSON.parse(res._body);
}
