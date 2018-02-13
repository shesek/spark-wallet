import fs from 'fs'
import path from 'path'
import { pwrap } from './util'
import LightningClient from 'lightning-client'

const rel = p => path.join(__dirname, p)

const lnPath = process.env.LN_PATH || path.join(require('os').homedir(), '.lightning')

const app = require('express')()
    , ln  = LightningClient(lnPath)

app.set('port', process.env.PORT || 9117)
app.set('host', process.env.HOST || 'localhost')
app.set('url', process.env.URL || `http://${app.settings.host}:${app.settings.port}`)
app.set('title', process.env.TITLE || 'Lightning Shop')
app.set('currency', process.env.CURRENCY || 'USD')
app.set('views', __dirname)
app.set('trust proxy', process.env.PROXIED || 'loopback')

app.use(require('cookie-parser')())
app.use(require('body-parser').json())
app.use(require('body-parser').urlencoded({ extended: true }))

app.use(require('morgan')('dev'))
app.use(require('csurf')({ cookie: true }))

app.get('/app.js', require('browserify-middleware')(rel('client/app.js'), { noParse: require.resolve('./client/node_modules/instascan/lib/vendor/zxing.js') }))
app.use('/assets', require('stylus').middleware({ src: rel('www'), serve: true }))
app.use('/assets', require('express').static(rel('www')))

app.get('/', (req, res) => res.render('index.pug', { req }))

app.post('/rpc', pwrap(async (req, res) =>
  res.send(await ln.call(req.body.method, req.body.params))))

app.get('/stream', require('./stream')(lnPath))

app.use((err, req, res, next) => {
  console.error(err.stack || err.toString())
  res.status(err.status || 500).send(err.type && err || err.stack || err)
})

const sslOpt = { key: fs.readFileSync(rel('key.pem')), cert: fs.readFileSync(rel('cert.pem')) }
require('https').createServer(sslOpt, app).listen(app.settings.port, app.settings.host, _ =>
  console.log(`HTTP server running on ${ app.settings.host }:${ app.settings.port }`))
