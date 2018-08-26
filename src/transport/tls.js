import forge  from 'node-forge'
import path   from 'path'
import https  from 'https'
import http   from 'http'
import net    from 'net'
import isIp   from 'is-ip'
import fs     from 'fs'
import mkdirp from 'mkdirp'

const defaultDir = path.join(require('os').homedir(), '.spark-wallet', 'tls')

module.exports = (app, name=app.settings.host, dir=defaultDir, leEmail) => {
  const tlsOpt = leEmail ? letsencrypt(name, dir, leEmail) : selfsigned(name, dir)
      , redir  = (req, res) => (res.writeHead(301, { Location: `https://${ req.headers.host || name }/` }), res.end())
      , server = createMultiServer(tlsOpt, app, redir)

  tlsOpt.cert && app.get('/cert.pem', (req, res) => res.type('pem').send(tlsOpt.cert))
  // @TODO allow downloading letsencrypt's cert

  return new Promise(resolve =>
    server.listen(app.settings.port, app.settings.host, _ =>
      resolve(`https://${app.settings.host}:${server.address().port}`)
    )
  )
}

// Self-signed certificate (no CA)
const selfsigned = (name, dir) => {
  if (fs.existsSync(path.join(dir, 'key.pem'))) {
    const keyPem  = fs.readFileSync(path.join(dir, 'key.pem'))
        , certPem = fs.readFileSync(path.join(dir, 'cert.pem'))
        , cert    = forge.pki.certificateFromPem(certPem)
        , certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()
        , fprint  = forge.md.sha1.create().update(certDer).digest().toHex().match(/../g).join(':')

    console.log(`Loaded TLS certificate with fingerprint ${fprint} from ${ dir }`)
    return { key: keyPem, cert: certPem }
  }

  const extensions = [ ...defaultExt, {
    name: 'subjectAltName'
  , altNames: [ isIp(name) ? { type: 7, ip: name }
                           : { type: 2, value: name } ]
  } ]

  const pems = require('selfsigned').generate([ { name: 'commonName', value: name } ]
    , { extensions, keySize: 2048, algorithm: 'sha256' })

  !fs.existsSync(dir) && mkdirp.sync(dir)
  fs.writeFileSync(path.join(dir, 'key.pem'), pems.private)
  fs.writeFileSync(path.join(dir, 'cert.pem'), pems.cert)

  console.log(`Created TLS certificate with fingerprint ${ pems.fingerprint } in ${ dir }`)

  return { key: pems.private, cert: pems.cert }
}

const defaultExt = [
  { name: 'basicConstraints', cA: true }
, { name: 'keyUsage', keyCertSign: true, digitalSignature: true , nonRepudiation: true, keyEncipherment: true, dataEncipherment: true }
]

// Automatic CA-signed TLS certificate registration via LetsEncrypt
const letsencrypt = (name, dir, email) => {
  console.log(`Setting up LetsEncrypt CA-signed TLS cert for ${name} with email ${email} in ${dir}`)

  const gl = require('greenlock').create({
    version: 'draft-12'
  , server: 'https://acme-v02.api.letsencrypt.org/directory'
  , configDir: path.join(dir, 'letsencrypt')
  , approveDomains: [ name ]
  , email: email
  , agreeTos: true
  , debug: !!process.env.LE_DEBUG
  })

  if (!process.env.LE_NOVERIFY) {
    console.log('Starting LetsEncrypt verification server')

    const noCon = (req, res) => (res.writeHead(204), res.end()) // 204 No Content

    http.createServer(gl.middleware(noCon)).listen(process.env.LE_PORT || 80)
    .on('error', err => {
      console.error(`ERROR: ${err.code} while starting vertification server on ${err.address}:${err.port}`)
      console.error(err.stack || err)

      if (err.errno == 'EACCES') {
        console.error(`\nYou don't have prmission to bind on ${err.address}:${err.port}.`);
        console.error('See https://github.com/shesek/spark-wallet/blob/master/doc/tls.md#letsencrypt-integration for advice.');
      } else if (err.errno == 'EADDRINUSE') {
        console.error(`\n${err.address}:${err.port} is already being used by some other program. Stop it and try again.`);
      }

      process.exit(1)
    })
  }

  return gl.tlsOptions
}

// Create a server capable of handling both TLS and plain HTTP requests
// This is done to redirect users accessing the TLS server without using 'https://'
// Protocol detection/delegation based on https://stackoverflow.com/a/42019773/865693
const createMultiServer = (tlsOpt, tlsHandler, plainHandler) => {
  const server = net.createServer(socket =>
    socket.once('data', buff => {
      socket.pause()

      // Determine if this is a TLS or plain HTTP request
      const byte  = buff[0]
          , proto = byte === 22 ? 'https' : (32 < byte && byte < 127) ? 'http' : null

      if (!proto) {
        console.error(new Error('Cannot detect HTTP/TLS request').stack)
        return socket.destroy()
      }

      // Push the buffer back onto the front of the data stream
      socket.unshift(buff)

      // Delegate the socket to the appropriate handler
      server[proto].emit('connection', socket)

      socket.resume()
    })
  )

  server.http = http.createServer(plainHandler)
  server.https = https.createServer(tlsOpt, tlsHandler)
  return server
}
