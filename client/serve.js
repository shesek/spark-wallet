import fs from 'fs'
import path from 'path'
import pug from 'pug'
import nib from 'nib'
import stylus from 'stylus'
import express from 'express'
import browserify from 'browserify-middleware'

const compileStyl = (str, filename) => stylus(str).set('filename', filename).use(nib())
    , bswatchPath = path.resolve(require.resolve('bootswatch/package'), '..', 'dist')
    , scanPath    = require.resolve('instascan/dist/instascan.min.js')
    , rpath       = p => path.join(__dirname, p)

process.env.BUILD_TARGET = 'web'

module.exports = app => {

  app.engine('pug', require('pug').__express)

  app.get('/', (req, res) => res.render(rpath('index.pug')))
  app.get('/app.js', browserify(rpath('src/app.js')))
  app.get('/style.css', stylus.middleware({ src: rpath('styl'), dest: rpath('www'), compile: compileStyl }))
  app.get('/lib/instascan.js', (req, res) => res.sendFile(scanPath))

  app.use('/', express.static(rpath('www')))
  app.use('/swatch', express.static(bswatchPath), express.static(rpath('swatch')))
  app.use('/fonts', express.static(rpath('fonts/node_modules')))
}
