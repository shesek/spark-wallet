import fs from 'fs'
import path from 'path'
import express from 'express'
import compression from 'compression'

const rpath = p => path.join(__dirname, p)

// when installed from npm, the "www" folder contains
// the pre-compiled assets
const preBuilt = fs.existsSync(rpath('www')) && rpath('www')

module.exports = app => {
  if (!process.env.NO_GZIP)
    app.use('/*.(css|js)', compression())

  if (preBuilt) app.use('/', express.static(preBuilt))
  else require('./client/serve')(app)
}
