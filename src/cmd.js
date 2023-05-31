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

  // `listpays` with the addition of metadata extracted from the BOLT11/BOLT12 invoice, the
  // paystatus of pending payments, and a fix for payment hashes and timestamps which were missing
  // in c-lightning v0.9.0 (and may still be missing in newer releases for old payments made with v0.9).
, async _listpays(...args) {
    const { pays } = await this.listpays(...args)
    if (!pays.length) return { pays }

    // Fix for payments made with c-lightning v0.9.0
    pays.filter(p => p.preimage && !p.payment_hash)
        .forEach(p => p.payment_hash = hash(p.preimage))
    await Promise.all(pays.filter(p => p.payment_hash && !p.created_at).map(async p => {
      const listpays = await this.listsendpays(null, p.payment_hash)
      p.created_at = listpays.payments[0].created_at
    }))

    // Extract additional metadata from the BOLT11/BOLT12 invoice
    await Promise.all(pays.map(pay => attachInvoiceMeta(this, pay)))

    // Attach the paystatus result of pending payments
    await Promise.all(pays.filter(p => p.status == 'pending' && (p.bolt11 || p.bolt12)).map(async p => {
      const paystatus = (await this.paystatus(p.bolt11 || p.bolt12)).pay[0]
      if (paystatus) p.attempts = paystatus.attempts
    }))

    truncatePayerNotes(pays)

    return { pays }
  }

  // `listinvoices` with the addition of metadata extracted from the BOLT11/BOLT12 invoice,
  // Returns paid invoices only.
, async _listinvoices() {
    const res = await this.listinvoices()
    const invoices = res.invoices.filter(i => i.status == 'paid')

    // Extract additional metadata from the BOLT12 invoice
    // Not needed for BOLT11 invoices, since the only relevant field they have is the 'description',
    // which c-lightning already makes available directly in the `listinvoices` reply.
    await Promise.all(invoices
      .filter(invoice => !!invoice.bolt12)
      .map(invoice => attachInvoiceMeta(this, invoice)))

    truncatePayerNotes(invoices)

    return { invoices }
  }
  // Wrapper for the 'decode'/'decodepay' commands with some convenience enhancements
, async _decode(paystr) {
    if (await checkOffersEnabled(this)) {
      // 'decode' works for both BOLT11 and BOLT12, but is only available in v0.10.1+ (without enabling offers support)
      const decoded = await this.decode(paystr)

      if (!decoded.valid) {
        const error_msg = extractWarnings(decoded).join(' · ')
        throw new Error(`Invalid payment string: ${ error_msg || 'unknown error' }`)
      }

      // Make BOLT12 msat amounts available as an integer, as they are for BOLT11 invoices
      if (decoded.amount_msat == null && decoded.amount_msat) decoded.amount_msat = +decoded.amount_msat

      return decoded
    } else {
      // 'decodepay' only supports BOLT11 invoices
      const decoded = await this.decodepay(paystr)
      // add 'type' and 'valid' fields to match the format returned by decode()
      return { ...decoded, type: 'bolt11 invoice', valid: true }
    }
  }

  // Pay the given invoice, emit an event that can be observed externally (by stream.js),
  // and return it with the invoice metadata.
, async _pay(paystr, ...args) {
    this.emit('paying', paystr)
    const pay_result = await this.pay(paystr, ...args)
    await attachInvoiceMeta(this, pay_result)
    return pay_result
  }

  // Fetch an invoice for the given offer, decode it and return the original offer alongside it
  // Some parameters are unsupported (recurrence/timeout).
, async _fetchinvoice(bolt12_offer, amount_msat, quantity, payer_note) {
    const { invoice: bolt12_invoice, changes } = await this.fetchinvoice(bolt12_offer, amount_msat, quantity, null, null, null, null, payer_note)

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
        assert(decoded.quantity_min == null || decoded.amount_msat || decoded.amount, 'Offers with quantity but no payment amount are unsupported')
        assert(!decoded.send_invoice || decoded.amount_msat, 'send_invoice offers with no amount are unsupported')
        assert(!decoded.send_invoice || decoded.min_quantity == null, 'send_invoice offers with quantity are unsupported')
        break
      case 'bolt11 invoice':
      case 'bolt12 invoice':
        break
      default: throw new Error(`Unhandled payment string type: ${decoded.type}`)
    }

    return decoded
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

  const channels = await ln.listpeerchannels(peerid).then(r => r.channels)
  assert(channels, 'cannot find channels')

  const chan = channels.find(chan => chan.channel_id == chanid)
  assert(chan, 'cannot find channel')

  return { peer, chan }
}

// Check if experimental offers/bolt12 support is enabled
// Always considered off in c-lightning <=v0.10.0 because it used an incompatible spec.
async function checkOffersEnabled(ln) {
  const conf = await ln._listconfigs()
  return conf['experimental-offers'] && !/(^v?|-v)0\.(9\.|10\.0)/.test(conf['# version'])
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
  [ 'description', 'vendor', 'quantity', 'payer_note', 'offer_id', 'amount_msat' ]
    .filter(k => invoice[k] != null && (pay[k] == null || possiblyBuggyAmount(pay, k)))
    .forEach(k => pay[k] = invoice[k])

// Pending multi-part payments sometimes report an incorrect amount,
// override it with the correct amount from the BOLT11/12 invoice.
// See https://github.com/ElementsProject/lightning/issues/4753
const possiblyBuggyAmount = (pay, k) =>
  k == 'amount_msat' && pay.status == 'pending' && pay.number_of_parts > 1 && pay.amount_msat == pay.amount_sent_msat

const extractWarnings = obj =>
  Object.entries(obj)
    .filter(([ k, _ ]) => k.startsWith('warning_'))
    .map(([ _, v ]) => v)

// Truncate long `payer_note`s. They can get pretty big - up to 32kb
const truncatePayerNotes = elements => elements
  .filter(el => el.payer_note && el.payer_note.length > 1024)
  .forEach(el => {
    el.payer_note = el.payer_note.substr(0, 1024) + '…'
    el.payer_note_truncated = true
  })

const hash = preimage =>
  crypto.createHash('sha256')
    .update(Buffer.from(preimage, 'hex'))
    .digest('hex')
