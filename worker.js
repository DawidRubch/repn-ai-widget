export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const key = url.pathname.slice(1);

    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const object = await env.BUCKET.get(key);

    if (!object) {
      return new Response("Object not found", { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", "application/javascript");
    //TODO: set cache to like 10 minutes
    headers.set("Cache-Control", "no-cache");
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(object.body, {
      headers,
    });
  },
};
