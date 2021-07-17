import assert from 'assert'
import crypto from 'crypto'

// Custom RPC commands that are exposed on top of c-lightning's built-in ones
module.exports = ln => ({
  // connect & fund in one go
  async _connectfund(peeruri, satoshi, feerate) {
    const peerid = peeruri.split('@')[0]
    await ln.connect(peeruri)

    const res = await ln.fundchannel(peerid, satoshi, feerate)
    assert(res && res.channel_id, 'cannot open channel')

    return getChannel(ln, peerid, res.channel_id)
  }

  // close channel and return it
, async _close(peerid, chanid, force, timeout) {
    const res = await ln.close(chanid, force, timeout)
    assert(res && res.txid, 'cannot close channel')

    const { peer, chan } = await getChannel(ln, peerid, chanid)
    return { peer, chan, closing: res }
  }

  // `listpays` with the addition of payment hashes and timestamps, which are missing
  // in c-lightning v0.9.0 and expected to be added in the next release.
, async _listpays() {
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

  // Wrapper for the 'decode'/'decodepay' commands with some convenience enchantments
, async _decode(paystr) {
    const offersEnabled = (await getConfigs(ln))['experimental-offers']
    if (offersEnabled) {
      // 'decode' works for both BOLT11 and BOLT12, but is only available in v0.10+ when offers support is enabled
      const decoded = await ln.decode(paystr)
      // fix for https://github.com/ElementsProject/lightning/pull/4501
      if (decoded.valid == null) decoded.valid = true
      assert(decoded.valid, "invalid payment string") // TODO add error description
      // make BOLT12 msat amounts available as an integer, as they are for BOLT11 invoices
      if (decoded.msatoshi == null && decoded.amount_msat) decoded.msatoshi = +decoded.amount_msat.slice(0, -4)
      return decoded
    } else {
      // 'decodepay' only supports BOLT11 invoices
      const decoded = await ln.decodepay(paystr)
      // add 'type' and 'valid' fields to match the format returned by decode()
      return { ...decoded, type: 'bolt11 invoice', valid: true }
    }
  }

  // Fetch an invoice for the given offer and decode it in one go
, async _fetchinvoice(bolt12_offer) {
    const { invoice, changes } = await ln.fetchinvoice(bolt12_offer)
    const decoded = await this._decode(invoice)
    assert(decoded.type == 'bolt12 invoice')
    return { paystr: invoice, changes, ...decoded }
  }

  // Get payment details for the given BOLT11/BOLT12 payment string
, async _getpaydetail(paystr) {
    const decoded = await this._decode(paystr)

    switch (decoded.type) {
      case 'bolt11 invoice':
      case 'bolt12 invoice':
        return decoded

      case 'bolt12 offer':
        assert(!decoded.recurrence, 'Offers with recurrence are unsupported')
        assert(!decoded.currency, 'Offers with fiat amounts are unsupported')
        assert(!decoded.send_invoice, 'Offers to send payments are unsupported')
        assert(decoded.msatoshi || decoded.quantity_min == null, 'Offers with quantity but no payment amount are unsupported')

        if (!decoded.msatoshi || decoded.quantity_min != null) {
          // If user input is necessary (for the amount/quantity), return the offer to the user
          return decoded
        } else {
          // Otherwise, fetch the invoice straight ahead and return it
          const invoice = await this._fetchinvoice(paystr)
          invoice.changes = {} // the user never saw the original offer, no need to confirm changes
          return { ...invoice, origin_offer: decoded }
        }

      default: throw new Error(`Unhandled payment string type: ${decoded.type}`)
    }
  }

  // Fetch an invoice for the given offer, and immediately pay it if it matches the offer
, async _fetchinvoicepay(bolt12_offer, msatoshi, quantity) {
    const { invoice, changes } = await ln.fetchinvoice(bolt12_offer, msatoshi, quantity)

    // Don't consider the `msat` amount as changed if the user provided an explicit amount and it matches it
    if (msatoshi != null && changes.msat == `${msatoshi}msat`) {
      delete changes.msat
    }

    if (Object.keys(changes).length == 0) {
      // Nothing changed, go ahead and pay it
      const pay_result = await ln.pay(invoice)
      return { action: 'paid', ...pay_result }
    } else {
      // Return the invoice for user confirmation
      const decoded = await this._decode(invoice)
      assert(decoded.type == 'bolt12 invoice')
      return { action: 'reconfirm', paystr: invoice, changes, ...decoded }
    }
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

const getConfigs = ln =>
  ln._configs || (ln._configs = ln.listconfigs()
    .catch(err => { delete ln._configs; return Promise.reject(err) }))

const hash = preimage =>
  crypto.createHash('sha256')
    .update(Buffer.from(preimage, 'hex'))
    .digest('hex')
