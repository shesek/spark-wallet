(async function() { // IIFE
  const app = require('express')()
      , ln  = require('lightning-client')(process.env.LN_PATH)

  // Test connection
  function connFailed(err) {
    process.send && process.send({ error: err.toString() })
    throw err
  }
  ln.on('error', connFailed)
  const lninfo = await ln.getinfo().catch(connFailed)
  console.log(`Connected to c-lightning ${lninfo.version} with id ${lninfo.id} on network ${lninfo.network}`)
  ln.removeListener('error', connFailed)

  // Settings
  app.set('port', process.env.PORT || 9737)
  app.set('host', process.env.HOST || 'localhost')
  app.set('trust proxy', process.env.PROXIED || 'loopback')
  app.set('tls', !process.env.NO_TLS && (app.settings.host !== 'localhost' || process.env.FORCE_TLS))

  // Middlewares
  app.use(require('morgan')('dev'))
  app.use(require('./auth')(app, process.env.LOGIN, process.env.ACCESS_KEY))
  app.use(require('body-parser').json())
  app.use(require('helmet')({ contentSecurityPolicy: { directives: {
    defaultSrc: [ "'self'" ]
  , scriptSrc:  [ "'self'", "'unsafe-eval'" ]
  , fontSrc:    [ "'self'", 'data:' ]
  , imgSrc:     [ "'self'", 'data:' ]
  } }, ieNoOpen: false }))

  // CSRF protection. Require the X-Access header or access-key query string arg for POST requests.
  app.post('*', (req, res, next) => !req.csrfSafe ? res.sendStatus(403) : next())

  // RPC API
  app.post('/rpc', (req, res, next) =>
    ln.call(req.body.method, req.body.params)
      .then(r => res.send(r)).catch(next))

  // Streaming API
  app.get('/stream', require('./stream')(ln.rpcPath))

  // Frontend
  process.env.NO_WEBUI || require('./webui')(app)

  // Error handler
  app.use((err, req, res, next) => {
    console.error(err.stack || err.toString())
    res.status(err.status || 500).send(err.type && err || err.stack || err)
  })

  // HTTPS server (the default for non-localhost hosts)
  app.enabled('tls')
  ? require('./transport/tls')(app, process.env.TLS_NAME, process.env.TLS_PATH)
      .then(host => serviceReady('HTTPS server', `https://${host}/`))

  // HTTP server (for localhost or when --no-tls is specified)
  : require('./transport/http')(app).then(host => serviceReady('HTTP server', `http://${host}/`))

  // Tor Onion Hidden Service
  process.env.ONION && require('./transport/onion')(app, process.env.ONION_PATH)
    .then(host => serviceReady('Tor Onion Hidden Service v3', `http://${host}/`))

  const qrterm  = process.env.PRINT_QR && require('qrcode-terminal')
      , hashKey = process.env.QR_WITH_KEY ? `#access-key=${app.settings.accessKey}` : ''

  function serviceReady(name, url) {
    console.log(`${name} running on ${url}`)
    qrterm && qrterm.generate(`${url}${hashKey}`, { small: true })

    process.send && process.send({ serverUrl: url })
  }

  process.env.PRINT_KEY && console.log('Access key for remote API access:', app.settings.accessKey)
})()
