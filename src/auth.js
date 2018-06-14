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
  app.settings.manifestKey = base64u.escape(createHmac('sha256', app.settings.encAuth).update('manifest-key').digest('base64'))

  return (req, res, next) => {
    // The manifest.json file has to be accessible without basic auth headers,
    // allow authenticating via query string instead
    if (req.method === 'GET' && req.path === '/manifest.json' && req.query.key === app.settings.manifestKey)
      return next()

    const cred = basicAuth(req)
    if (cred && cred.name === username && cred.pass === password)
      return next()

    res.set('WWW-Authenticate', 'Basic realm="Private Area"')
       .sendStatus(401)
  }
}
