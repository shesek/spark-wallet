import dropRepeats from 'xstream/extra/dropRepeats'
import { dbg } from '../util'

// @XXX the code below mixes rxjs and xstream observables together, normalize them?
// (cyclejs provides conf$ as an xstream, while the storage driver returns rxjs streams)

module.exports = storage => conf$ =>
  storage(conf$.map(JSON.stringify).compose(dropRepeats()).map(conf => ({ key: 'conf', value: conf })))
  .local.getItem('conf').distinctUntilChanged().map(JSON.parse).map(conf => conf || {}).shareReplay(1)
