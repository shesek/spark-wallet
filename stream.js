import LightningClient from 'lightning-client'

module.exports = lnPath => {
  const ln = LightningClient(lnPath)

  async function waitany(last_index) {
    console.log('waitany', last_index)
    const inv = await ln.waitanyinvoice(last_index)
    ln.emit('waitany', inv)
    waitany(inv.pay_index)
  }

  ln.listinvoices()
    .then(r => Math.max(...r.invoices.map(inv => inv.pay_index || 0)))
    .then(waitany)

  return (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }).flushHeaders()

    const onPay = inv => res.write(`event:waitany\ndata:${ JSON.stringify(inv) }\n\n`)
    ln.on('waitany', onPay)

    const keepAlive = setInterval(_ => res.write(': keepalive\n\n'), 25000)

    req.on('close', _ => (ln.removeListener('waitany', onPay), clearInterval(keepAlive)))
  }
}
