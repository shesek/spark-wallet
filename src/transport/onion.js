import hsv3 from 'hsv3'
import path from 'path'
import http from 'http'
import fs   from 'fs'

const defaultDir = path.join(require('os').homedir(), '.spark-wallet', 'tor')

module.exports = (app, dir=defaultDir, hs_dir=path.join(dir, 'hidden_service')) =>
  new Promise(resolve => {
    // Start HTTP server (non TLS) on a random port
    const httpSrv = http.createServer(app).listen(0, '127.0.0.1', _ =>
      resolve(httpSrv.address().port))
  }).then(httpPort => new Promise((resolve, reject) =>
    // Setup an hidden service over the HTTP server
    hsv3([ { dataDirectory: hs_dir, virtualPort: 80, localMapping: '127.0.0.1:' + httpPort  } ]
       , { DataDirectory: dir })
      .on('error', reject)
      .on('ready', _ => resolve(getHost(hs_dir)))
  ))

const getHost = dir => fs.readFileSync(path.join(dir, 'hostname')).toString().trim()
