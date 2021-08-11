import assert from 'assert'
import crypto from 'crypto'

// Custom RPC commands added on top of c-lightning's built-in ones
// and exposed to the client side.
export const commands = {
  // Connect to node & fund channel in one go
  async _connectfund(peeruri, satoshi, feerate) {
    const peerid = peeruri.split('@')[0]
    await this.connect(peeruri)

    const res = await this.fundchannel(peerid, satoshi, feerate)
    assert(res && res.channel_id, 'cannot open channel')

    return getChannel(this, peerid, res.channel_id)
  }

  // Close channel and return its details
, async _close(peerid, chanid, force, timeout) {
    const res = await this.close(chanid, force, timeout)
    assert(res && res.txid, 'cannot close channel')

    const { peer, chan } = await getChannel(this, peerid, chanid)
    return { peer, chan, closing: res }
  }

  // `listpays` with the addition of metadata extracted from the BOLT11/BOLT12 invoice,
  // as well as a fix for payment hashes and timestamps which were missing in c-lightning v0.9.0
  // (and may still be missing in newer releases for old payments made with v0.9).
  // Returns completed payments only.
, async _listpays() {
    const res = await this.listpays()
    const pays = res.pays.filter(p => p.status == 'complete')
    if (!pays.length) return { pays }

    // Fix for payments made with c-lightning v0.9.0
    if (!pays[0].payment_hash) {
      pays.forEach(p => p.payment_hash = hash(p.preimage))
    }
    if (!pays[0].created_at) {
      const pay_parts = await Promise.all(
        pays.map(p => this.listsendpays(null, p.payment_hash)))
      pays.forEach((p, i) => p.created_at = pay_parts[i].payments[0].created_at )
    }

    // Extract additional metadata from the BOLT11/BOLT12 invoice
    await Promise.all(pays.map(pay => attachInvoiceMeta(this, pay)))

    return { pays }
  }

  // `listinvoices` with the addition of metadata extracted from the BOLT11/BOLT12 invoice,
  // Returns paid invoices only.
, async _listinvoices() {
    const res = await this.listinvoices()
    const invoices = res.invoices.filter(i => i.status == 'paid')

    await Promise.all(invoices.map(invoice => attachInvoiceMeta(this, invoice)))

    return { invoices }
  }
  // Wrapper for the 'decode'/'decodepay' commands with some convenience enchantments
, async _decode(paystr) {
    if (checkOffersEnabled(this)) {
      // 'decode' works for both BOLT11 and BOLT12, but is only available in v0.10.1+ (without enabling offers support)
      const decoded = await this.decode(paystr)
      assert(decoded.valid, "invalid payment string") // TODO add error description
      // make BOLT12 msat amounts available as an integer, as they are for BOLT11 invoices
      if (decoded.msatoshi == null && decoded.amount_msat) decoded.msatoshi = +decoded.amount_msat.slice(0, -4)
      return decoded
    } else {
      // 'decodepay' only supports BOLT11 invoices
      const decoded = await this.decodepay(paystr)
      // add 'type' and 'valid' fields to match the format returned by decode()
      return { ...decoded, type: 'bolt11 invoice', valid: true }
    }
  }

  // Fetch an invoice for the given offer, decode it and return the original offer alongside it
, async _fetchinvoice(bolt12_offer, ...args) {
    const { invoice: bolt12_invoice, changes } = await this.fetchinvoice(bolt12_offer, ...args)

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

    if (Object.keys(changes).length == 0) {
      // Nothing changed, go ahead and pay it
      const pay_result = await this.pay(invoice.paystr)
      extendInvoiceMeta(pay_result, invoice)
      return { action: 'paid', ...pay_result }
    } else {
      // Return the invoice for user confirmation
      return { action: 'reconfirm', changes, ...invoice }
    }
  }

  // `listconfigs` with caching
, _listconfigs() {
    return this._configs || (this._configs = this.listconfigs()
      .catch(err => { delete this._configs; return Promise.reject(err) }))
  }
}

async function getChannel(ln, peerid, chanid) {
  const peer = await ln.listpeers(peerid).then(r => r.peers[0])
  assert(peer, 'cannot find peer')

  const chan = peer.channels.find(chan => chan.channel_id == chanid)
  assert(chan, 'cannot find channel')

  delete peer.channels

  return { peer, chan }
}

// Check if experimental offers/bolt12 support is enabled
// Always considered off in c-lightning <=v0.10.0 because it used an incompatible spec.
async function checkOffersEnabled(ln) {
  const conf = await ln._listconfigs()
  return conf['experimental-offers'] && !/^0\.(9\.|10\.0)/.test(conf['# version'])
}

// Timestamp of the c-lightning v0.10.1 release. BOLT12 invoices created in v0.10.0 are
// incompatible and therefore ignored. Using the timestamp to detect them is prune to
// false positives/negatives, but its the best that can be done.
const CLN_0_10_1_TS = 1628557020

const isCompatibleBolt12 = obj =>
  obj.bolt12 && (obj.created_at || obj.paid_at) >= CLN_0_10_1_TS

// Get and attach metadata extracted from the bolt11/bolt12 of invoices/payments
export async function attachInvoiceMeta(ln, obj) {
  if (obj.bolt11 || isCompatibleBolt12(obj)) {
    try {
      const invoice = await ln._decode(obj.bolt11 || obj.bolt12)
      extendInvoiceMeta(obj, invoice)
    } catch (e) {
      // This can happen for BOLT12 invoices created with v0.10.0 after the v0.10.1 release date.
      // Report the error and ignore it.
      if (obj.bolt12) console.error('Failed decoding pay string, deprecated old-style bolt12?', obj)
      else throw e
    }
  }
}

const extendInvoiceMeta = (pay, invoice) =>
  [ 'description', 'vendor', 'quantity', 'payer_note', 'offer_id' ]
    .filter(k => invoice[k] != null && pay[k] == null)
    .forEach(k => pay[k] = invoice[k])

const hash = preimage =>
  crypto.createHash('sha256')
    .update(Buffer.from(preimage, 'hex'))
    .digest('hex')
