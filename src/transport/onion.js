import path from 'path'
import http from 'http'
import fs   from 'fs'

const defaultDir = path.join(require('os').homedir(), '.spark-wallet', 'tor')

module.exports = async (app, dir=defaultDir, hs_dir=path.join(dir, 'hidden_service')) => {
  // Start HTTP server (non TLS) on a random port
  const httpPort = await new Promise(resolve => {
    const httpSrv = http.createServer(app).listen(0, '127.0.0.1', _ =>
      resolve(httpSrv.address().port))
  })

  // Get the hsv3 lib, install on demand if its the first time we're using it.
  const hsv3 = await require('./hsv3-dep')()

  // Setup an hidden service over the HTTP server
  return new Promise((resolve, reject) =>
    hsv3([ { dataDirectory: hs_dir, virtualPort: 80, localMapping: '127.0.0.1:' + httpPort  } ]
       , { DataDirectory: dir })
      .on('error', reject)
      .on('ready', _ => resolve(`http://${getHost(hs_dir)}`))
  )
}

const getHost = dir => fs.readFileSync(path.join(dir, 'hostname')).toString().trim()
