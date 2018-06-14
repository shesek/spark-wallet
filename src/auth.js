import basicAuth from 'basic-auth'
import nanoid from 'nanoid'
import nanogen from 'nanoid/generate'

module.exports = (app, login) => {
  let username, password

  if (!login) {
    username = nanogen('abcdefghijklmnopqrstuvwxyz', 3)
    password = nanoid()
    console.log(`No --login specified, picked a random one: ${username}:${password}`)
  } else {
    [ username, password ] = login.split(':', 2)
    password || ([ username, password ] = [ 'wallet', username ])
  }

  app.settings.encAuth = [ username, password ].map(encodeURIComponent).join(':')

  return (req, res, next) => {
    const cred = basicAuth(req)

    if (cred && cred.name === username && cred.pass === password)
      return next()

    res.set('WWW-Authenticate', 'Basic realm="Private Area"')
       .sendStatus(401)
  }
}
