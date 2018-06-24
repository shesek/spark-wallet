import basicAuth from 'basic-auth'
import nanoid from 'nanoid'
import nanogen from 'nanoid/generate'
import base64u from 'base64-url'
import {createHmac} from 'crypto'

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
  app.settings.manifestKey = base64u.escape(createHmac('sha256', app.settings.encAuth)
                             .update('manifest-key').digest('base64').substr(0, 10))

  const reKey = new RegExp(`^/manifest-${app.settings.manifestKey}/`)

  return (req, res, next) => {
    // The manifest.json file has to be accessible without basic auth headers,
    // allow using an alternative URL-based authentication instead
    if (req.method === 'GET' && reKey.test(req.path)) {
      req.url = req.url.replace(reKey, '/manifest/')
      return next()
    }

    const cred = basicAuth(req)
    if (cred && cred.name === username && cred.pass === password)
      return next()

    res.set('WWW-Authenticate', 'Basic realm="Private Area"')
       .sendStatus(401)
  }
}
