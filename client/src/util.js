import debug   from 'debug'
import numbro  from 'numbro'
import moveDec from 'move-decimal-point'

import { Big as big }      from 'big.js'
import { Observable as O } from './rxjs'

const

  formatAmt = (amt, rate, step, comma=true) =>
    amt != null && ''+amt && rate && trim(numbro(big(amt).times(rate).toFixed(15))
      .format(`${comma?'0,':''}${step.toFixed(15).replace(/10*$/, '0')}`)) || ''
, trim = num => num.replace(/\.?0+$/, '')

, parseUri = uri => {
    const m = uri.match(reUri)
    return m && (m[1] || m[2])
  }
, reUri = /^lightning:([a-z0-9]+)|^bitcoin:.*[?&]lightning=([a-z0-9]+)/i

// returns the expected invoice amount when its <0.5% different from the actual amount paid,
// or the actual amount paid otherwise. this is done to make the UX less confusing when the
// sender uses overpayment randomization (https://github.com/ElementsProject/lightning/issues/1089)
, recvAmt = ({ msatoshi: expected, msatoshi_received: actual }) =>
    (expected && (actual-expected)/expected<0.005) ? expected : actual

, combine = obj => {
    const keys = Object.keys(obj).map(k => k.replace(/\$$/, ''))
    return O.combineLatest(...Object.values(obj), (...xs) =>
      xs.reduce((o, x, i) => (o[keys[i]] = x, o), {}))
  }

, combineAvail = obj => combine(Object.entries(obj).reduce((o, [ k, v ]) => (o[k]=v.startWith(null), o), {}))

, toObs = x => (x.subscribe || x.then) ? O.from(x) : O.of(x)

, dropErrors = r$$ => r$$.flatMap(r$ => r$.catch(_ => O.empty()))

, extractErrors = r$$ =>
    r$$.flatMap(r$ => r$.flatMap(_ => O.empty()).catch(err => O.of(err)))
      .map(e => e.response && (e.response.body && e.response.body.message || e.response.body) || e)

, dbg = (obj, label='stream', dbg=debug(label)) =>
    Object.keys(obj).forEach(k => obj[k] && obj[k].subscribe(
      x   => dbg(`${k} ->`, x),
      err => dbg(`${k} \x1b[91mError:\x1b[0m`, err.stack || err),
      _   => dbg(`${k} completed`)))

module.exports = { combine, combineAvail, toObs, dropErrors, extractErrors, dbg
                 , formatAmt, parseUri, recvAmt }
