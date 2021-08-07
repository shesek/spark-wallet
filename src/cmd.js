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

  // `listpays` with the addition of metadata extracted from the BOLT11/BOLT12 invoice,
  // as well as a fix for payment hashes and timestamps which were missing in c-lightning v0.9.0
  // (and may still be missing in newer releases for old payments made with v0.9).
  // Returns completed payments only.
, async _listpays() {
    const res = await ln.listpays()
    const pays = res.pays.filter(p => p.status == 'complete')

    if (!pays.length) return { pays }

    // Fix for payments made with c-lightning v0.9.0
    if (!pays[0].payment_hash) {
      pays.forEach(p => p.payment_hash = hash(p.preimage))
    }
    if (!pays[0].created_at) {
      const pay_parts = await Promise.all(
        pays.map(p => ln.listsendpays(null, p.payment_hash)))
      pays.forEach((p, i) => p.created_at = pay_parts[i].payments[0].created_at )
    }

    // Extract additional metadata from the BOLT11/BOLT12 invoice
    await Promise.all(pays.map(async pay => {
      if (pay.bolt11 || isCompatibleBolt12(pay)) {
        try {
          const invoice = await this._decode(pay.bolt11 || pay.bolt12)
          attachInvoiceMeta(pay, invoice)
        } catch (e) {
          // This can happen for BOLT12 invoices created with v0.10.0 after the v0.10.1 release date.
          // Report the error and ignore it.
          if (pay.bolt12) console.error('Failed decoding pay string, deprecated old-style bolt12?', pay)
          else throw e
        }
      }
    }))

    return { pays }
  }

  // Wrapper for the 'decode'/'decodepay' commands with some convenience enchantments
, async _decode(paystr) {
    const offersEnabled = (await this._listconfigs())['experimental-offers']
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

  // Fetch an invoice for the given offer, decode it and return the original offer alongside it
, async _fetchinvoice(bolt12_offer, ...args) {
    const { invoice: bolt12_invoice, changes } = await ln.fetchinvoice(bolt12_offer, ...args)

    const invoice = await this._decode(bolt12_invoice)
    assert(invoice.type == 'bolt12 invoice', `Unexpected invoice type ${invoice.type}`)

    const offer = await this._decode(bolt12_offer)

    return { paystr: bolt12_invoice, offer, changes, ...invoice }
  }

  // Decode the payment string and verify that it is supported by Spark
, async _decodecheck(paystr) {
    const decoded = await this._decode(paystr)

    switch (decoded.type) {
      case 'bolt12 offer':
        assert(!decoded.recurrence, 'Offers with recurrence are unsupported')
        assert(decoded.quantity_min == null || decoded.msatoshi || decoded.amount, 'Offers with quantity but no payment amount are unsupported')
        assert(!decoded.send_invoice || decoded.msatoshi, 'send_invoice offers with no amount are unsupported')
        assert(!decoded.send_invoice || decoded.min_quantity == null, 'send_invoice offers with quantity are unsupported')
        break
      case 'bolt11 invoice':
      case 'bolt12 invoice':
        break
      default: throw new Error(`Unhandled payment string type: ${decoded.type}`)
    }

    return decoded
  }

  // Fetch an invoice for the given offer, and immediately pay it if it matches the offer
  // Some parameters are unsupported (recurrence/timeout)
, async _fetchinvoicepay(bolt12_offer, msatoshi, quantity, payer_note) {
    const { changes, ...invoice } = await this._fetchinvoice(bolt12_offer, msatoshi, quantity, null, null, null, null, payer_note)

    // Don't consider the `msat` amount as changed if the user provided an explicit amount and it matches it
    if (msatoshi != null && changes.msat == `${msatoshi}msat`) {
      delete changes.msat
    }

    if (Object.keys(changes).length == 0) {
      // Nothing changed, go ahead and pay it
      const pay_result = await ln.pay(invoice.paystr)
      attachInvoiceMeta(pay_result, invoice)
      return { action: 'paid', ...pay_result }
    } else {
      // Return the invoice for user confirmation
      return { action: 'reconfirm', changes, ...invoice }
    }
  }

  // `listconfigs` with caching
, _listconfigs() {
    return this._configs || (this._configs = ln.listconfigs()
      .catch(err => { delete this._configs; return Promise.reject(err) }))
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


// Timestamp of the c-lightning v0.10.1 release. BOLT12 invoices created in prior releases
// used an incompatible encoding format and are therefore ignored. Using the timestamp to
// detect them is prune to false positives/negatives, but there is no better way to do that.
//
// TODO: update with the actual release timestamp
const CLN_0_10_1_TS = 1628294840

const isCompatibleBolt12 = pay =>
  pay.bolt12 && pay.created_at >= CLN_0_10_1_TS

const attachInvoiceMeta = (pay, invoice) =>
  [ 'description', 'vendor', 'quantity', 'payer_note', 'offer_id' ]
    .filter(k => invoice[k] != null && pay[k] == null)
    .forEach(k => pay[k] = invoice[k])

const hash = preimage =>
  crypto.createHash('sha256')
    .update(Buffer.from(preimage, 'hex'))
    .digest('hex')
