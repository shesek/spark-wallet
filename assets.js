import { join } from 'path'

import stylus from 'stylus'
import express from 'express'
import browserify from 'browserify-middleware'
import compression from 'compression'

module.exports = app => {

  const compileStyl = (str, filename) => stylus(str)
    .set('filename', filename)
    .set('include css', true)
    .set('compress', app.settings.env == 'production')
    .use(require('nib')())
    .import('nib')

  if (app.settings.env == 'production' && !process.env.NO_GZIP)
    app.use('/assets', compression())

  app.get('/app.js', browserify(join(__dirname, 'client/app.js')))
  app.use('/assets', stylus.middleware({ src: join(__dirname, 'www'), serve: true, compile: compileStyl }))
  app.use('/assets', express.static(join(__dirname, 'www'), { /* maxAge: '30d', immutable: true */ }))
}
