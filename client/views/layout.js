import { h, div, link, nav, a, span, p, button } from '@cycle/dom'

const layout = ({ state, body }) =>
  div('.d-flex.flex-column', [
    ...header(state)
  , div({ props: { className: `content container flex-grow${state.loading?' disabled':'' }` } }, body)
  , footer(state)
  ])

const header = ({ loading, unitf, cbalance, alert, conf: { theme } }) => [
  nav(`.navbar.navbar-dark.bg-primary.mb-3`, div('.container', [
    a('.navbar-brand.full-screen', { attrs: { href: '#/' } }, 'nanopay')
  , cbalance != null ? span('.toggle-unit.navbar-brand.mr-0', unitf(cbalance)) : ''
  ]))
, loading ? div('#loader') :''
, alert ? div('.container', alertBox(alert)) : ''
]

const footer = ({ info, conf: { theme, expert } }) =>
  h('footer.container.clearfix.text-muted.border-top.pt-2.my-2', [
    info ? p('.info.toggle-exp.float-left.mb-0', `${info.version.replace(/-.*-g/, '-')} · ${info.network} #${info.blockheight} · id: ${info.id.substr(0,10)}${expert ? ' 🔧' : ''}`) : ''
  , p('.toggle-theme.float-right.mb-0', theme)
  ])

const alertBox = alert => div('.alert.alert-dismissable.alert-'+alert[0], [
  button('.close', { attrs: { type: 'button' }, dataset: { dismiss: 'alert' } }, '×')
, ''+alert[1]
])

module.exports = { layout }
