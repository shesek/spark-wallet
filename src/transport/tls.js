import selfsigned from 'selfsigned'
import forge      from 'node-forge'
import path       from 'path'
import https      from 'https'
import isIp       from 'is-ip'
import fs         from 'fs'

const defaultExt = [
  { name: 'basicConstraints', cA: true }
, { name: 'keyUsage', keyCertSign: true, digitalSignature: true , nonRepudiation: true, keyEncipherment: true, dataEncipherment: true }
]


module.exports = (app, name=app.settings.host, dir='./spark-tls') => {
  const pems   = makePems(name, dir)
      , tlsOpt = { key: pems.private, cert: pems.cert }
      , server = https.createServer(tlsOpt, app)

  return new Promise(resolve =>
    server.listen(app.settings.port, app.settings.host, _ =>
      resolve({ cert: pems.cert, host: `${server.address().address}:${server.address().port}` })
    )
  )
}

const makePems = (name, dir) => {
  if (fs.existsSync(path.join(dir, 'key.pem'))) {
    const keyPem  = fs.readFileSync(path.join(dir, 'key.pem'))
        , certPem = fs.readFileSync(path.join(dir, 'cert.pem'))
        , cert    = forge.pki.certificateFromPem(certPem)
        , certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()
        , fprint  = forge.md.sha1.create().update(certDer).digest().toHex()

    console.log(`Loaded TLS certificate with fingerprint ${hexColon(fprint)} from ${ dir }`)
    return { private: keyPem, cert: certPem, fingerprint: fprint }
  }

  const extensions = [ ...defaultExt, {
    name: 'subjectAltName'
  , altNames: [ isIp(name) ? { type: 7, ip: name }
                           : { type: 2, value: name } ]
  } ]

  const pems = selfsigned.generate([ { name: 'commonName', value: name } ], { extensions })

  !fs.existsSync(dir) && fs.mkdirSync(dir)
  fs.writeFileSync(path.join(dir, 'key.pem'), pems.private)
  fs.writeFileSync(path.join(dir, 'cert.pem'), pems.cert)

  console.log(`Created TLS certificate with fingerprint ${ pems.fingerprint } at ${ dir }`)
  return { ...pems, fingerprint: pems.fingerprint.replace(/:/g, '') }
}

const hexColon = hex => hex.match(/../g).join(':')
