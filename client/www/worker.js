// served as-is, not browserified/babelified

self.addEventListener('notificationclick', e => {
  // close notification and open our web page
  e.notification.close()
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins =>
      wins.length ? wins[0].focus() : clients.openWindow('.')
    )
  )
})
