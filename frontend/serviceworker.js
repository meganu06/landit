const version = 2;
self.addEventListener('install', event => {
    // eslint-disable-next-line no-console
    console.log(`Service worker v${version} installed`);
});
self.addEventListener('activate', event => {
    // eslint-disable-next-line no-console
    console.log(`Service worker v${version} activated`);
});
self.addEventListener('fetch', event => {
    //No cache in service worker
    if (event.request.method === 'POST' || event.request.method === 'PUT' || event.request.method === 'DELETE') {
        return;
    }

    event.respondWith(fetch(event.request));
});
