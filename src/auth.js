import basicAuth from 'basic-auth'
import nanoid from 'nanoid'
import nanogen from 'nanoid/generate'
import cookieParser from 'cookie-parser'
import {createHmac} from 'crypto'

const cookieAge = 2592000000 // 1 month

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

  app.settings.encAuth = [ username, password ].map(encodeURIComponent).join(':')
  app.settings.manifestKey = hmac(app.settings.encAuth, 'manifest-key').replace(/\W+/g, '').substr(0, 10)

  app.use(cookieParser(hmac(app.settings.encAuth, 'cookie-secret')))

  const reKey = new RegExp(`^/manifest-${app.settings.manifestKey}/`)

  return (req, res, next) => {
    // The manifest.json file should be accessible without basic auth headers and without cookies.
    // this allow accessing the /manifest/ directory by including the `manifestKey` in the path.
    if (req.method === 'GET' && reKey.test(req.url)) {
      req.url = req.url.replace(reKey, '/manifest/')
      return next()
    }

    if (req.signedCookies.user) return next();

    const cred = basicAuth(req)
    if (cred && cred.name === username && cred.pass === password) {
      // Once the user authenticates via basic auth, set a signed cookie to authenticate
      // future requests. HTTP basic auth is quirky, this makes for a smoother experience.
      res.cookie('user', username, { signed: true, httpOnly: true, sameSite: true
                                   , maxAge: cookieAge, secure: !process.env.NO_TLS })
      return next()
    }

    res.set('WWW-Authenticate', 'Basic realm="Private Area"')
       .sendStatus(401)
  }
}
