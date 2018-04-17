import hsv3 from 'hsv3'
import path from 'path'
import http from 'http'
import fs from 'fs'

module.exports = (app, dir=path.resolve('nanopay-tor')) =>
  new Promise(resolve => {
    // Start HTTP server (non TLS) on a random port
    const httpSrv = http.createServer(app).listen(0, '127.0.0.1', _ =>
      resolve(httpSrv.address().port))
  }).then(httpPort => new Promise((resolve, reject) =>
    // Setup an hidden service over the HTTP server
    hsv3([ { dataDirectory: dir, virtualPort: 80, localMapping: '127.0.0.1:' + httpPort  }  ])
      .on('error', reject)
      .on('ready', _ => resolve(getHost(dir)))
  ))

const getHost = dir => fs.readFileSync(path.join(dir, 'hostname')).toString().trim()
