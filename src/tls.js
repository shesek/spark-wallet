import selfsigned from 'selfsigned'
import {resolve}  from 'path'
import base64u    from 'base64-url'
import https      from 'https'
import fs         from 'fs'

module.exports = (app, path=resolve('nanopay-tls.json')) => {
  const pems   = makePems(app.settings.host, path)
      , tlsOpt = { key: pems.private, cert: pems.cert }
      , server = https.createServer(tlsOpt, app)

  return new Promise(resolve =>
    server.listen(app.settings.port, app.settings.host, _ =>
      resolve({ pems, fpUrl: encodeFp(pems.fingerprint)
              , host: `${server.address().address}:${server.address().port}` })
    )
  )
}

const makePems = (host, path) => {
  if (fs.existsSync(path))
    return JSON.parse(fs.readFileSync(path))

  const pems = selfsigned.generate([{ name: 'commonName', value: host }])

  fs.writeFileSync(path, JSON.stringify(pems))

  return pems
}

const encodeFp = fp => base64u.encode(fp.replace(/:/g, ''), 'hex')
