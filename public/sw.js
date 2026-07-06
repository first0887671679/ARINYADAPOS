// Self-destruct SW: clear all caches, unregister, and force refresh all clients
const CACHE_NAME = "arinyadapos-DESTROY";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => {
      // Unregister this service worker
      return self.registration.unregister();
    }).then(() => {
      // Force reload all open pages to get fresh content
      return self.clients.matchAll({ type: "window" });
    }).then((clients) => {
      clients.forEach((client) => client.navigate(client.url));
    })
  );
});

// Do not intercept any fetch - let everything go to network
self.addEventListener("fetch", () => {});
