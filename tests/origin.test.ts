import {describe, expect, it} from 'vitest';
import {NextRequest} from 'next/server';
import {checkOrigin} from '../src/lib/origin';

describe('mutation origin policy', () => {
  it('accepts the public host when Next uses an internal listener hostname', () => {
    const req = new NextRequest('http://0.0.0.0:3001/api/books', {headers: {host: 'localhost:3001', origin: 'http://localhost:3001'}});
    expect(checkOrigin(req)).toBeNull();
  });
  it('accepts HTTPS origins behind the deployment proxy', () => {
    const req = new NextRequest('http://internal:3000/api/books', {headers: {host: 'library.vercel.app', 'x-forwarded-proto': 'https', origin: 'https://library.vercel.app'}});
    expect(checkOrigin(req)).toBeNull();
  });
  it('rejects unrelated origins and explicit cross-site requests', () => {
    const req = new NextRequest('http://internal:3000/api/books', {headers: {host: 'library.vercel.app', origin: 'https://attacker.example'}});
    expect(checkOrigin(req)?.status).toBe(403);
    const crossSite = new NextRequest('https://library.vercel.app/api/books', {headers: {'sec-fetch-site': 'cross-site'}});
    expect(checkOrigin(crossSite)?.status).toBe(403);
  });
});
