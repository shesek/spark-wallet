import assert from 'assert'
import crypto from 'crypto'

// Custom RPC commands that are exposed on top of c-lightning's built-in ones
module.exports = ln => ({
  // connect & fund in one go
  connectfund: async (peeruri, satoshi, feerate) => {
    const peerid = peeruri.split('@')[0]
    await ln.connect(peeruri)

    const res = await ln.fundchannel(peerid, satoshi, feerate)
    assert(res && res.channel_id, 'cannot open channel')

    return getChannel(ln, peerid, res.channel_id)
  }

  // close channel and return its information
, closeget: async (peerid, chanid, force, timeout) => {
    const res = await ln.close(chanid, force, timeout)
    assert(res && res.txid, 'cannot close channel')

    const { peer, chan } = await getChannel(ln, peerid, chanid)
    return { peer, chan, closing: res }
  }

  // `listpays` with the addition of payment hashes and timestamps, which are missing
  // in c-lightning v0.9.0 and expected to be added in the next release.
, listpaysext: async () => {
    const res = await ln.listpays()
    // these are not currently available, but be prepared for when they are
    if (res.pays.length && res.pays[0].payment_hash && res.pays[0].created_at)
      return res

    const pays = res.pays
      .filter(p => p.status == 'complete')
      .map(p => ({ ...p, payment_hash: hash(p.preimage) }))

    const pay_parts = await Promise.all(
      pays.map(p => ln.listsendpays(null, p.payment_hash)))

    return { pays: pays.map((p, i) => {
      const pp = pay_parts[i].payments[0]
      return { ...p, created_at: pp.created_at }
    }) }
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

const hash = preimage =>
  crypto.createHash('sha256')
    .update(Buffer.from(preimage, 'hex'))
    .digest('hex')
