if (process.env.NODE_ENV != 'development') {
  const cacheName = 'spark-assets-' + process.env.VERSION

  const cachePath = [ '', 'style.css', 'app.js', 'load-theme.js'
                    , 'lib/instascan.js'
                    , 'swatch/darkly/bootstrap.min.css'
                    , 'fonts/typeface-open-sans/index.css'
                    , 'fonts/typeface-open-sans/files/open-sans-latin-300.woff2'
                    , 'fonts/typeface-open-sans/files/open-sans-latin-400.woff2'
                    ].map(path => `../${path}`)

  const cacheRegex = /\.(js|css|woff2?)$/

  self.addEventListener('install', e => e.waitUntil(
    caches.open(cacheName).then(cache =>
      cache.addAll(cachePath.map(p => new Request(p, { credentials: 'same-origin' }))))
  ))

  self.addEventListener('activate', e => e.waitUntil(
    caches.keys().then(names => Promise.all(
      names.filter(name => name !== cacheName)
           .map   (name => caches.delete(name))
    ))
  ))

  const reqOpt = req => req.mode == 'navigate' ? null : { mode: 'same-origin', credentials: 'same-origin' }

  const shouldCache = (req, res) =>
    (req.method == 'GET' && cacheRegex.test(req.url)
      && res && res.type == 'basic' && res.status == 200)

  self.addEventListener('fetch', e => e.respondWith(
    caches.match(e.request).then(res =>
      res || fetch(e.request.clone(), reqOpt(e.request)).then(res =>
        shouldCache(e.request, res)
          ? caches.open(cacheName).then(cache => cache.put(e.request, res.clone())).then(_ => res)
          : res
      )
    )
  ))
}

self.addEventListener('notificationclick', e => {
  // close notification and open our web page
  e.notification.close()
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins =>
      wins.length ? wins[0].focus() : clients.openWindow('.')
    )
  )
})
