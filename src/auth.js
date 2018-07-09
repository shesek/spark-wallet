import basicAuth from 'basic-auth'
import nanoid from 'nanoid'
import nanogen from 'nanoid/generate'
import cookieParser from 'cookie-parser'
import {createHmac} from 'crypto'

const cookieOpt = { signed: true, httpOnly: true, sameSite: true
                  , maxAge: 2592000000/*1 month*/, secure: !process.env.NO_TLS }

const hmac = (key, data, enc='base64') => createHmac('sha256', key).update(data).digest(enc)

module.exports = (app, login) => {
  let username, password

  if (!login) {
    username = nanogen('abcdefghijklmnopqrstuvwxyz', 5)
    password = nanoid(10)
    console.log(`No LOGIN or --login specified, picked username "${username}" with password "${password}"`)
  } else {
    [ username, password ] = login.split(':', 2)
  }

  const encAuth     = [ username, password ].map(encodeURIComponent).join(':')
      , cookieKey   = hmac(encAuth, 'cookie-key')
      , manifestKey = hmac(encAuth, 'manifest-key').replace(/\W+/g, '').substr(0, 10)
      , accessKey   = hmac(encAuth, 'access-key').replace(/\W+/g, '')
      , manifestRe  = new RegExp(`^/manifest-${manifestKey}/`)

  Object.assign(app.settings, { manifestKey, accessKey })

  app.use(cookieParser(cookieKey))

  return (req, res, next) => {
    // The manifest.json file has to be accessible without basic auth headers and without cookies.
    // This allow accessing the /manifest/ directory by including the `manifestKey` in the path.
    // Note that the manifestKey grants access _only_ to the manifest.
    if (req.method === 'GET' && manifestRe.test(req.url)) {
      req.url = req.url.replace(manifestRe, '/manifest/')
      return next()
    }

    // Authenticate using the access key token, via the X-Access header or access-key query string argument.
    // This also marks the request as csrfSafe. Used for RPC API calls and for SSE requests.
    if (req.get('X-Access') === accessKey || req.query['access-key'] === accessKey) {
      req.csrfSafe =  true
      return next()
    }

    // Authenticate with HMAC-signed cookies
    if (req.signedCookies.user) {
      return next()
    }

    // HTTP basic authentication (username/password)
    const cred = basicAuth(req)
    if (cred && cred.name === username && cred.pass === password) {
      // Once the user authenticates with basic auth, set a signed cookie to authenticate future requests.
      // HTTP basic auth is quirky, this makes for a smoother experience.
      res.cookie('user', username, cookieOpt)
      return next()
    }

    res.set('WWW-Authenticate', 'Basic realm="Private Area"')
       .sendStatus(401)
  }
}
