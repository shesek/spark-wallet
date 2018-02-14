import { Big as big } from 'big.js'
import debug        from 'debug'
import numbro from 'numbro'
import moveDec from 'move-decimal-point'
import { Observable as O } from 'rxjs'

const

  trim      = num => num.replace(/(\d)\1\1+$|0000+\d$/, '$1$1').replace(/\.?0+$/, '')

, formatAmt = (amt, rate, step) =>
    amt != null && ''+amt && rate && trim(numbro(big(amt).times(rate).toFixed(10))
      .format(`0,${step.toFixed(15).replace(/10*$/, '0')}`)) || ''

, combine = obj => {
    const keys = Object.keys(obj).map(k => k.replace(/\$$/, ''))
    return O.combineLatest(...Object.values(obj), (...xs) =>
      xs.reduce((o, x, i) => (o[keys[i]] = x, o), {}))
  }

, dropErrors = r$$ => r$$.flatMap(r$ => r$.catch(_ => O.empty()))

, extractErrors = r$$ =>
    r$$.flatMap(r$ => r$.flatMap(_ => O.empty()).catch(err => O.of(err)))
      .map(e => e.response && (e.response.body && e.response.body.message || e.response.body) || e)

, dbg = (obj, label='stream', dbg=debug(label)) =>
    Object.keys(obj).forEach(k => obj[k] && obj[k].subscribe(
      x   => dbg(`${k} ->`, x),
      err => dbg(`${k} \x1b[91mError:\x1b[0m`, err.stack || err),
      _   => dbg(`${k} completed`)))

module.exports = { combine, dropErrors, extractErrors, dbg
                 , formatAmt }
