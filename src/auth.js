import fs from 'fs'
import assert from 'assert'
import basicAuth from 'basic-auth'
import nanoid from 'nanoid'
import nanogen from 'nanoid/generate'
import cookieParser from 'cookie-parser'
import {createHmac} from 'crypto'

const cookieAge = 2592000000 // 1 month

const hmacStr = (key, data) => createHmac('sha256', key).update(data).digest('base64').replace(/\W+/g, '')

module.exports = (app, cookieFile, login, _accessKey) => {
  if (cookieFile && (login || _accessKey)) throw new Error('--cookie-file cannot be used with --login or --access-key')

  let username, password

  const hasFile = cookieFile && fs.existsSync(cookieFile)
  if (hasFile) {
    console.log(`Loading login credentials from ${cookieFile}`)
    ;[ username, password, _accessKey ] = fs.readFileSync(cookieFile).toString('utf-8').trim().split(':')
    assert(password, `Invalid login file at ${cookieFile}, expecting "username:pwd[:access-key]"`)
  } else if (login) { // provided via --login (or LOGIN)
    ;[ username, password ] = login.split(':', 2)
    assert(password, `Invalid login format, expecting "username:pwd"`)
  } else { // generate random
    username = nanogen('abcdefghijklmnopqrstuvwxyz', 5)
    password = nanoid(15)
    console.log(`No LOGIN or --login specified, picked username "${username}" with password "${password}"`)
  }

  // HMAC derive the access key from the user/pwd combo, if not explicitly defined
  const accessKey   = _accessKey || hmacStr(`${username}:${password}`, 'access-key')
      , manifestKey = hmacStr(accessKey, 'manifest-key').substr(0, 10)
      , manifestRe  = new RegExp(`^/manifest-${manifestKey}/`)
      , cookieKey   = hmacStr(accessKey, 'cookie-key')
      , cookieOpt   = { signed: true, httpOnly: true, sameSite: true, secure: app.enabled('tls'), maxAge: cookieAge }

  if (cookieFile && !hasFile) {
    console.log(`Writing login credentials to ${cookieFile}`)
    fs.writeFileSync(cookieFile, [ username, password, accessKey ].join(':'))
  }

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

    // Browser pairing using access-key in query string
    if (req.method == 'GET' && req.path == '/' && req.query['access-key'] === accessKey) {
      // issue a redirect to remove the access-key from the url and prevent it from being saved to the browser history.
      // the redirect is done to a page that issues a second <meta> redirect (below), to get the SameSite user cookie
      // sent properly when the pairing link is clicked on from a different site origin.
      res.cookie('user', username, cookieOpt)
      return res.redirect(301, 'redir')
    }
    if (req.url == '/redir') return res.type('text/html').end('<meta http-equiv="refresh" content="0; url=.">')

    // Authenticate using the access key token, via the X-Access header or using access-key on the body/query.
    // This also marks the request as csrfSafe. Used for RPC API calls and for SSE requests.
    if ((req.get('X-Access') || req.query['access-key'] || req.body['access-key']) === accessKey) {
      req.csrfSafe = true
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
