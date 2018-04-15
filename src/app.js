const app = require('express')()
    , ln  = require('lightning-client')(process.env.LN_PATH)

// Settings
app.set('port', process.env.PORT || 9117)
app.set('host', process.env.HOST || 'localhost')
app.set('trust proxy', process.env.PROXIED || 'loopback')

// Middleware
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

import fs from 'fs'

const sslOpt = { key: fs.readFileSync('key.pem'), cert: fs.readFileSync('cert.pem') }

require('https').createServer(sslOpt, app).listen(app.settings.port, app.settings.host, _ =>
  console.log(`Spark wallet running on https://${ app.settings.host }:${ app.settings.port }`))
