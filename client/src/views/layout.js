import { h, div, link, nav, a, span, p } from '@cycle/dom'
import numbro from 'numbro'
import { formatAmt } from '../util'
import { alertBox } from './util'

const layout = ({ state: S, body }) =>
  div({ props: { className: `d-flex flex-column theme-${S.conf.theme}${S.loading?' loading':'' }` } }, [
    navbar(S)
  , S.loading ? div('#loader') : ''
  , S.alert ? div('.container', alertBox(S.alert, !!S.info)) : ''
  , div('.content.container', body)
  , S.info ? footer(S) : ''
  ])

const navbar = ({ unitf, cbalance, page }) =>
  nav(`.navbar.navbar-dark.bg-primary.mb-3`, div('.container', [
    a('.navbar-brand', { attrs: { href: '#/' } }, [
      page.pathname != '/' ? span('.icon.icon-left-open') : ''
    , 'Spark'
    ])
  , cbalance != null ? span('.toggle-unit.navbar-brand.mr-0', unitf(cbalance)) : ''
  ]))

const footer = ({ info, btcusd, msatusd, rate, conf: { unit, theme, expert } }) =>
  div('.main-bg',
    h('footer.container.clearfix.text-muted.border-top.border-light', [
      p('.info.float-left', [
        span('.toggle-exp', `${expert?'🔧 ':''} v${process.env.VERSION}`)

      , ` · ${info.network}`
      , ` · `, a({ attrs: { href: '#/node' } }, info.id.substr(0,10))

      , btcusd ? (
          [ 'usd', 'btc' ].includes(unit) ? ` · 1 btc = $${ numbro(btcusd).format(btcFormatOpt) }`
        : useCents(unit, btcusd) ? ` · 1 ${unitName(unit)} = ${formatAmt(1/rate*100, msatusd, 4, false)}¢`
        : ` · 1 ${unitName(unit)} = $${formatAmt(1/rate, msatusd, 3, false)}`
        ) : ''
      ])

    , p('.toggle-theme.float-right.btn-link', theme)
    ])
  )

// display sat and bits as cents if they're worth less than $0.01
, useCents = (unit, btcusd) => (unit == 'sat' && +btcusd < 1000000) || (unit == 'bits' && +btcusd < 10000)
, unitName = unit => unit.replace(/s$/, '')
, btcFormatOpt = { mantissa: 2, trimMantissa: true, optionalMantissa: true }

module.exports = { layout }
