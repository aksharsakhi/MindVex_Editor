import type { ServerBuild } from '@remix-run/cloudflare';
import { createPagesFunctionHandler } from '@remix-run/cloudflare-pages';

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);

  // Proxy API requests to the backend (bypass CORS and network issues)
  if (url.pathname.startsWith('/api/')) {
    // Target backend URL (Spring Boot running on port 8080)
    // We strip the /api prefix from the pathname because the backend might expect /api or not
    // But based on previous config, backend is at http://localhost:8080/api
    // So if request is /api/auth/login, we want http://localhost:8080/api/auth/login
    
    // Use 127.0.0.1 to avoid localhost resolution ambiguity in workerd
    const targetUrl = new URL(url.pathname + url.search, 'http://127.0.0.1:8080');
    
    // Create a new request with the same method, headers, and body
    const proxyRequest = new Request(targetUrl.toString(), context.request);
    
    // Forward the request
    try {
      return await fetch(proxyRequest);
    } catch (e) {
      return new Response(`Backend proxy error: ${e instanceof Error ? e.message : String(e)}`, { status: 502 });
    }
  }

  // @ts-ignore - Build server is generated at build time
  const serverBuild = (await import('../build/server')) as unknown as ServerBuild;

  const handler = createPagesFunctionHandler({
    build: serverBuild,
  });

  return handler(context);
};
