import { h, div, link, nav, a, span, p, button } from '@cycle/dom'

const layout = ({ state: S, body }) =>
  div({ props: { className: `d-flex flex-column theme-${S.conf.theme}${S.loading?' disabled':'' }` } }, [
    navbar(S)
  , S.loading ? div('#loader') : ''
  , S.alert ? div('.container', alertBox(S.alert)) : ''
  , div('.content.container', body)
  , footer(S)
  ])

const navbar = ({ unitf, cbalance, alert, page }) =>
  nav(`.navbar.navbar-dark.bg-primary.mb-3`, div('.container', [
    a('.navbar-brand.full-screen', { attrs: { href: '#/' } }, [
      page.pathname != '/' ? span('.icon.icon-left-open') : ''
    , 'Spark'
    ])
  , cbalance != null ? span('.toggle-unit.navbar-brand.mr-0', unitf(cbalance)) : ''
  ]))

const footer = ({ info, btcusd, conf: { theme, expert } }) =>
  div('.main-bg',
    h('footer.container.clearfix.text-muted.border-top.pt-2.my-2', [
      info ? p('.info.float-left.mb-0'
      , [ span('.toggle-exp', info.version.replace(/-.*-g/, '-') + (expert ? ' 🔧' : ''))
        , ` · ${info.network} #${info.blockheight}`
        , ` · ${info.id.substr(0,10)}`
        , btcusd ? ` · BTC = $${ Math.round(btcusd) }` : ''
        ]) : ''
    , p('.toggle-theme.float-right.mb-0', theme)
    ])
  )

const alertBox = alert => div('.alert.alert-dismissable.alert-'+alert[0], [
  button('.close', { attrs: { type: 'button' }, dataset: { dismiss: 'alert' } }, '×')
, ''+alert[1]
])

module.exports = { layout }
