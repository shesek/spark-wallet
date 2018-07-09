const app = require('express')()
    , ln  = require('lightning-client')(process.env.LN_PATH)

// Settings
app.set('port', process.env.PORT || 9737)
app.set('host', process.env.HOST || 'localhost')
app.set('trust proxy', process.env.PROXIED || 'loopback')

// Middlewares
app.use(require('morgan')('dev'))
app.use(require('./auth')(app, process.env.LOGIN))
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

const { NO_TLS, TLS_NAME, TLS_PATH, ONION, ONION_PATH } = process.env

// HTTPS Server
NO_TLS || require('./transport/tls')(app, TLS_NAME, TLS_PATH).then(host =>
  printService('HTTPS server', 'https', host))

// HTTP Server
NO_TLS && require('./transport/http')(app).then(host =>
  printService('HTTP server', 'http', host))

// Tor Onion Hidden Service
ONION && require('./transport/onion')(app, ONION_PATH).then(host =>
  printService('Tor Onion Hidden Service v3', 'http', host))


const qrterm  = process.env.PRINT_QR && require('qrcode-terminal')
    , hashKey = process.env.QR_WITH_KEY ? `#access-key=${app.settings.accessKey}` : ''

function printService(name, proto, host) {
  console.log(`${name} running on ${proto}://${host}/`)
  qrterm && qrterm.generate(`${proto}://${host}/${hashKey}`, { small: true })
}

process.env.PRINT_KEY && console.log('Access key for remote API access:', app.settings.accessKey)
