import { h, div, link, nav, a, span, p, button } from '@cycle/dom'

const layout = ({ state: S, body }) =>
  div({ props: { className: `d-flex flex-column theme-${S.conf.theme}${S.loading?' disabled':'' }` } }, [
    navbar(S)
  , S.loading ? div('#loader') : ''
  , S.alert ? div('.container', alertBox(S.alert)) : ''
  , div('.content.container.flex-grow', body)
  , footer(S)
  ])

const navbar = ({ unitf, cbalance, alert, page }) =>
  nav(`.navbar.navbar-dark.bg-primary.mb-3`, div('.container', [
    a('.navbar-brand.full-screen', { attrs: { href: '#/' } }, [
      page.pathname != '/' ? span('.icon.icon-left-open') : ''
    , 'nanopay'
    ])
  , cbalance != null && unitf ? span('.toggle-unit.navbar-brand.mr-0', unitf(cbalance)) : ''
  ]))

const footer = ({ info, conf: { theme, expert } }) =>
  h('footer.container.clearfix.text-muted.border-top.pt-2.my-2', [
    info ? p('.info.toggle-exp.float-left.mb-0'
    , [ info.version.replace(/-.*-g/, '-')
      ,`${info.network} #${info.blockheight}`
      , info.id.substr(0,14)
      , ...(expert ? '🔧' : '')
      ].join(' · ')) : ''
  , p('.toggle-theme.float-right.mb-0', theme)
  ])

const alertBox = alert => div('.alert.alert-dismissable.alert-'+alert[0], [
  button('.close', { attrs: { type: 'button' }, dataset: { dismiss: 'alert' } }, '×')
, ''+alert[1]
])

module.exports = { layout }
