import basicAuth from 'basic-auth'
import nanoid from 'nanoid'

module.exports = (app, password) => {
  if (!password) {
    password = nanoid()
    console.log(`No --password specified, picked a random one: ${password}`)
  }

  app.set('urlAuth', `w:${encodeURIComponent(password)}`)

  return (req, res, next) => {
    const cred = basicAuth(req)
    if (cred && cred.pass === password) return next()

    res.set('WWW-Authenticate', 'Basic realm="Private Area"')
       .sendStatus(401)
  }
}
