import path from 'path'
import fs   from 'fs'
import cp   from 'child_process'

// Install the granax (Tor Control Protocol library) package on demand.
//
// Installing granax downloads the Tor Browser Bundle, which results in about 250mb of
// extra storage space, which we want to avoid if the user isn't using the Tor onion feature.


// Prefer the npm executable is in the same dir as our nodejs executable,
// fallback to searching in $PATH otherwise.
let npmExe = path.join(path.dirname(process.argv[0]), 'npm')
fs.existsSync(npmExe) || (npmExe = 'npm')

module.exports = async _ => {
  // check if we have it already
  try { return require('@deadcanaries/granax') } catch (_) {}

  console.log('\nTor Hidden Service enabled (via --onion) for the first time, downloading the Tor Bundle...'
            + '\nThe Spark .onion server will start automatically when its ready.'
            + '\n\nIn the meanwhile, you can access the local HTTP server directly.\n')

  // trigger an "npm install" for granax-dep/package.json
  const installer = cp.spawn(npmExe, [ 'install' ], { cwd: __dirname, stdio: 'inherit' })

  await new Promise((resolve, reject) => {
    installer.on('error', reject)
    installer.on('close', code =>
      code == 0 ? resolve() : reject(new Error('Tor installation failed, exited with code '+code)))
  })

  return require('@deadcanaries/granax')
}
