import pathRegexp from 'path-to-regexp'
import { Observable as O } from '../rxjs'

const isStr = x => typeof x === 'string'

module.exports = history => goto$ => {
  const history$ = O.from(history(
    goto$.map(goto => isStr(goto) ? { type: 'push', pathname: goto } : goto)
  ))

  return (path, re=path && pathRegexp(path)) =>
    path ? history$.map(loc => ({ ...loc, params: loc.pathname.match(re) })).filter(loc => !!loc.params)
         : history$
}
