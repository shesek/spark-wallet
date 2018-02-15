const lnPath = process.env.LN_PATH || require('path').join(require('os').homedir(), '.lightning')

const app = require('express')()
    , ln  = require('lightning-client')(lnPath)

app.set('port', process.env.PORT || 9117)
app.set('host', process.env.HOST || 'localhost')
app.set('url', process.env.URL || `http://${app.settings.host}:${app.settings.port}`)
app.set('views', __dirname)
app.set('trust proxy', process.env.PROXIED || 'loopback')

app.use(require('cookie-parser')())
app.use(require('body-parser').json())
app.use(require('body-parser').urlencoded({ extended: true }))
app.use(require('morgan')('dev'))
app.use(require('csurf')({ cookie: true }))

require('./assets')(app)

app.get('/', (req, res) => res.render('index.pug', { req }))

app.post('/rpc', (req, res, next) =>
  ln.call(req.body.method, req.body.params)
  //.then(r => new Promise(resolve => setTimeout(_ => resolve(r), 3000)))
  .then(r => res.send(r)).catch(next))

app.get('/stream', require('./stream')(lnPath))

app.use((err, req, res, next) => {
  console.error(err.stack || err.toString())
  res.status(err.status || 500).send(err.type && err || err.stack || err)
})


import fs from 'fs'

const sslOpt = { key: fs.readFileSync('key.pem'), cert: fs.readFileSync('cert.pem') }

require('https').createServer(sslOpt, app).listen(app.settings.port, app.settings.host, _ =>
  console.log(`HTTP server running on ${ app.settings.host }:${ app.settings.port }`))
