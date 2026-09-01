export default {
  async fetch(request, env) {
    try {
      return await env.ASSETS.fetch(request);
    } catch (err) {
      if (request.method === "HEAD") {
        const getReq = new Request(request.url, {
          method: "GET",
          headers: request.headers
        });
        const res = await env.ASSETS.fetch(getReq);
        return new Response(null, {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers
        });
      }
      return new Response("Internal Server Error", { status: 500 });
    }
  }
};
