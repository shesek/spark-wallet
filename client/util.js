import debug               from 'debug'
import numbro from 'numbro'
import moveDec from 'move-decimal-point'
import { Observable as O } from 'rxjs'

const

  btcUnit   = { sat: -3, bits: -5, milli: -8, btc: -11 }
, trim      = num => num.replace(/(\d)\1\1+$|0000+\d$/, '$1$1').replace(/\.?0+$/, '')
, formatUSD = (msat, rate) => trim(numbro(moveDec(msat, -11)*rate).format('0,0.0000'))
, formatBTC = (msat, unit) => trim(numbro(moveDec(msat, btcUnit[unit])).format('0,0.00000000000'))


, combine = obj => {
    const keys = Object.keys(obj).map(k => k.replace(/\$$/, ''))
    return O.combineLatest(...Object.values(obj), (...xs) =>
      xs.reduce((o, x, i) => (o[keys[i]] = x, o), {}))
  }

, extractErrors = r$$ =>
    r$$.flatMap(r$ => r$.flatMap(_ => O.empty()).catch(err => O.of(err)))
      .map(e => e.response && (e.response.body && e.response.body.message || e.response.body) || e)

, dbg = (obj, label='stream', dbg=debug(label)) =>
    Object.keys(obj).forEach(k => obj[k] && obj[k].subscribe(
      x   => dbg(`${k} ->`, x),
      err => dbg(`${k} \x1b[91mError:\x1b[0m`, err.stack || err),
      _   => dbg(`${k} completed`)))

module.exports = { combine, extractErrors, dbg
                 , formatUSD, formatBTC }
