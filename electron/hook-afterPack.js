module.exports = context => {
  require('child_process').spawnSync('chmod', [ '-R', '755', context.appOutDir ])
}
