import { pathToRegexp } from 'path-to-regexp'
import { Observable as O } from '../rxjs'

const isStr = x => typeof x === 'string'

module.exports = history => goto$ => {
  const history$ = O.from(history(
    // default the `type` to push, but allow to override it
    goto$.map(goto => ({ type: 'push', ...goto }))
  ))

  return (path, re=path && pathToRegexp (path)) =>
    path ? history$.map(loc => ({ ...loc, params: loc.pathname.match(re) })).filter(loc => !!loc.params)
         : history$
}
