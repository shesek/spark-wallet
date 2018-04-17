import qrterm from 'qrcode-terminal'

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
require('./tls')(app, process.env.TLS_PATH).then(({ host, fingerprint, fpUrl }) => {
  const url = `https://${app.settings.urlAuth}@${host}`
  console.log(`HTTPS server running on ${url} (TLS fingerprint: ${fingerprint})`)
  qrterm.generate(`${url}#?KP=${fpUrl}`, { small: true })
})

// Tor Onion Hidden Service
process.env.ONION && require('./onion')(app, process.env.ONION_DIR).then(({ host, dir }) => {
  const url = `http://${app.settings.urlAuth}@${host}`
  console.log(`Tor Onion Hidden Service v3 running on ${url}`)
  qrterm.generate(url, { small: true })
})
