const app = require('express')()
    , ln  = require('lightning-client')(process.env.LN_PATH)

// Settings
app.set('port', process.env.PORT || 9117)
app.set('host', process.env.HOST || 'localhost')
app.set('trust proxy', process.env.PROXIED || 'loopback')

// Middlewares
app.use(require('./auth')(app, process.env.LOGIN))
app.use(require('body-parser').json())
app.use(require('morgan')('dev'))

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

// HTTPS Server
process.env.NO_TLS || require('./tls')(app, process.env.TLS_PATH).then(({ host, pems, fpUrl }) => {
  app.get('/server.cer', (req, res) => res.type('cer').send(pems.cert))
  printService('HTTPS server', 'https', host, `/#/?KP=${fpUrl}`)
})

// HTTP Server
process.env.NO_TLS && require('./http')(app).then(host =>
  printService('HTTP server', 'http', host))

// Tor Onion Hidden Service
process.env.ONION && require('./onion')(app, process.env.ONION_PATH).then(host =>
  printService('Tor Onion Hidden Service v3', 'http', host))


const qrterm = process.env.PRINT_QR && require('qrcode-terminal')

function printService(name, proto, host, qr_data='') {
  console.log(`${name} running on ${proto}://${host}`)
  qrterm && qrterm.generate(`${proto}://${app.settings.encAuth}@${host}${qr_data}`, { small: true })
}
