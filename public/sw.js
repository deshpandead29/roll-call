// Roll Call service worker: shows Roll Call notifications and opens the
// event when one is tapped. No offline caching yet.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    data = { title: e.data ? e.data.text() : "Roll Call" };
  }
  e.waitUntil(
    self.registration.showNotification(data.title || "Roll Call", {
      body: data.body || "",
      tag: data.tag,
      renotify: !!data.tag,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "/", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => w.url === url) || wins[0];
      if (open) return open.focus().then((w) => (w && w.url !== url ? w.navigate(url) : w));
      return self.clients.openWindow(url);
    }),
  );
});
