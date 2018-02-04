const pwrap = fn => (req, res, next) => fn(req, res).catch(next)

module.exports = { pwrap }
