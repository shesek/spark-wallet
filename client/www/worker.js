// served as-is (not browserified/babelified)

// @TODO versioned cache
const cacheName = 'spark-static-v1'

const cachePath = [ '', 'style.css', 'app.js', 'load-theme.js'
                  , 'lib/instascan.js'
                  , 'swatch/yeti/bootstrap.min.css'
                  , 'fonts/typeface-open-sans/index.css'
                  , 'fonts/typeface-open-sans/files/open-sans-latin-300.woff2'
                  , 'fonts/typeface-open-sans/files/open-sans-latin-400.woff2'
                  ].map(path => `../${path}`)

const cacheRegex = /\.(js|css|woff2?)$/

self.addEventListener('install', e => e.waitUntil(
  caches.open(cacheName).then(cache =>
    cache.addAll(cachePath.map(p => new Request(p, { credentials: 'same-origin' }))))
))

const reqOpt = req => req.mode == 'navigate' ? null : { mode: 'same-origin' }

const shouldCache = (req, res) =>
  (e.request.method == 'GET' && cacheRegex.test(e.request.url)
    && res && res.type == 'basic' && res.status == 200)

self.addEventListener('fetch', e => e.respondWith(
  caches.match(e.request).then(res =>
    res || fetch(e.request.clone(), reqOpt(req)).then(res =>
      shouldCache(e.request, res)
        ? caches.open(cacheName).then(cache => cache.put(e.request, res.clone())).then(_ => res)
        : res
    )
  )
))

self.addEventListener('notificationclick', e => {
  // close notification and open our web page
  e.notification.close()
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins =>
      wins.length ? wins[0].focus() : clients.openWindow('.')
    )
  )
})
