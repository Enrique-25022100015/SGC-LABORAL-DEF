const CACHE_NAME = 'sgc-laboral-v1';
const ARCHIVOS_CACHE = [
  './',
  './index.html',
  './empresas.html',
  './admin.html',
  './manifest.json',
  './css/estilos.css',
  './js/supabase-config.js',
  './js/app.js',
  './js/empresas.js',
  './js/admin.js',
  './assets/Trabajo.jpg',
  './assets/trabajo2.jpg'
];

// Instalar y guardar archivos estáticos en caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_CACHE))
  );
  self.skipWaiting();
});

// Limpiar versiones viejas de caché
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategia Network-First (prioriza datos vivos de Supabase, si no hay red usa caché)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});