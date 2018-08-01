import http from 'http'

module.exports = app => new Promise(resolve => {
  const httpSrv = http.createServer(app).listen(app.settings.port, app.settings.host, _ =>
    resolve(`http://${app.settings.host}:${httpSrv.address().port}`))
})
