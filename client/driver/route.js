import pathRegexp from 'path-to-regexp'
import { Observable as O } from 'rxjs'

module.exports = history => page$ => {
  const history$ = O.from(history(page$.map(pathname => ({ type: 'push', pathname }))))

  return (path, re=path && pathRegexp(path)) =>
    path ? history$.map(loc => ({ ...loc, params: loc.pathname.match(re) })).filter(loc => !!loc.params)
         : history$
}
