import fs     from 'fs'
import path   from 'path'
import { pwrap } from './util'

const app = require('express')()
    , ln  = require('lightning-client')(process.env.LN_PATH)

app.set('port', process.env.PORT || 9117)
app.set('host', process.env.HOST || 'localhost')
app.set('url', process.env.URL || `http://${app.settings.host}:${app.settings.port}`)
app.set('title', process.env.TITLE || 'Lightning Shop')
app.set('currency', process.env.CURRENCY || 'USD')
app.set('views', path.join(__dirname, 'views'))
app.set('trust proxy', process.env.PROXIED || 'loopback')

app.use(require('cookie-parser')())
app.use(require('body-parser').json())
app.use(require('body-parser').urlencoded({ extended: true }))

app.use(require('morgan')('dev'))
app.use(require('csurf')({ cookie: true }))

app.use('/static', require('express').static(path.join(__dirname, 'www')))
app.get('/script.js', require('browserify-middleware')(__dirname+'/client.js'))

app.get('/', (req, res) => res.render('index.pug', { req }))

const handler = fn => pwrap(async (req, res) => res.send(await fn(req)))

app.get('/payments', handler(req => ln.listpayments()))
app.get('/invoicess', handler(req => ln.listpayments()))

app.post('/decodepay', handler(req => ln.decodepay(req.body.bolt11)))
app.post('/pay', handler(req => ln.pay(req.body.bolt11)))

app.listen(app.settings.port, app.settings.host, _ =>
  console.log(`HTTP server running on ${ app.settings.host }:${ app.settings.port }`))
