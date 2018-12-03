import assert from 'assert'

// Custom RPC commands that are exposed on top of c-lightning's built-in ones
module.exports = ln => ({
  connectfund: async (peeruri, msatoshi, feerate) => {
    const peerid = peeruri.split('@')[0]
    await ln.connect(peeruri)

    const res = await ln.fundchannel(peerid, msatoshi, feerate)
    assert(res && res.channel_id, 'cannot open channel')

    return getChannel(ln, peerid, res.channel_id)
  }

, closeget: async (peerid, chanid, force, timeout) => {
    const res = await ln.close(chanid, force, timeout)
    assert(res && res.txid, 'cannot close channel')

    const { peer, chan } = await getChannel(ln, peerid, chanid)
    return { peer, chan, closing: res }
  }

})

const getChannel = async (ln, peerid, chanid) => {
  const peer = await ln.listpeers(peerid).then(r => r.peers[0])
  assert(peer, 'cannot find peer')

  const chan = peer.channels.find(chan => chan.channel_id == chanid)
  assert(chan, 'cannot find channel')

  delete peer.channels

  return { peer, chan }
}
