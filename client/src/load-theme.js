// quickly load the theme and set its primary theme-color, without requiring the whole app to load.
// post-load theme changes are handled by the app itself.

const theme = localStorage.conf && JSON.parse(localStorage.conf).theme || 'dark'

document.write('<link rel="stylesheet" href="swatch/'+theme+'/bootstrap.min.css">')

document.querySelector('meta[name=theme-color]').content = require('../theme-colors')[theme]
