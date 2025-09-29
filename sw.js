const CACHE_NAME = 'hello-world-pwa-v1';
const urlsToCache = [
  './',
  './index.html'
  // './styles.css', './script.js' 等があればここに追加
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const results = await Promise.allSettled(
      urlsToCache.map(async url => {
        try {
          const res = await fetch(url, {cache: 'no-store'});
          if (!res.ok) throw new Error(`${url} fetch failed: ${res.status}`);
          await cache.put(url, res.clone());
          return { url, ok: true };
        } catch (err) {
          // 開発中はコンソールで何が失敗したか分かるようにする
          console.warn('sw install cache fail:', url, err);
          return { url, ok: false, err: String(err) };
        }
      })
    );
    // 任意: 失敗が多ければログを残す
    const failed = results.filter(r => r.status === 'fulfilled' && !r.value.ok);
    if (failed.length) {
      console.warn('Some resources failed to cache during install:', failed);
    }
    // ここで skipWaiting を呼ぶかは開発方針次第
    // await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  // 古いキャッシュを削除する処理（必要なら）
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => {
      if (key !== CACHE_NAME) return caches.delete(key);
    }));
    // clients.claim() でページを直ちにコントロール可
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const networkResponse = await fetch(event.request);
      // 任意で動的キャッシュをするならここで cache.put
      return networkResponse;
    } catch (err) {
      // ネットワーク失敗時、ナビゲーション要求ならキャッシュされた index.html を返す
      if (event.request.mode === 'navigate') {
        const index = await caches.match('./index.html');
        if (index) return index;
      }
      // その他はエラーを投げてブラウザのデフォルト動作に
      throw err;
    }
  })());
});
