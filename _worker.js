export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/ads.txt") {
      return new Response(
        'google.com, pub-8017094594733668, DIRECT, f08c47fec0942fa0',
        {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=86400'
          }
        }
      );
    }
    return env.ASSETS.fetch(request);
  }
};
