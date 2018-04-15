import hsv3 from 'hsv3'
import path from 'path'
import http from 'http'
import fs from 'fs'

module.exports = (app, dir=path.resolve('nanopay-tor')) =>
  new Promise(resolve => {
    const httpSrv = http.createServer(app).listen(0, '127.0.0.1', _ =>
      resolve(httpSrv.address().port))
  }).then(httpPort => new Promise((resolve, reject) =>
    hsv3([ { dataDirectory: dir, virtualPort: 80, localMapping: '127.0.0.1:' + httpPort  }  ])
      .on('error', reject)
      .on('ready', _ => resolve({ dir, host: getHost(dir) }))
  ))

const getHost = dir => fs.readFileSync(path.join(dir, 'hostname')).toString().trim()
