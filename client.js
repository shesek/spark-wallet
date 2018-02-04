require('babel-polyfill')

const Instascan = require('instascan')

const approveView = require('./views/approve.pug')
    , successView = require('./views/success.pug')

const _csrf = $('meta[name=csrf]').attr('content')

const scanner = new Instascan.Scanner({ video: document.getElementById('cam') })

let cameras
Instascan.Camera.getCameras().then(_cameras => (cameras = _cameras, scan()))

const scan = (index=0) => ($('#cam').removeClass('d-none'), scanner.start(cameras[cameras.length-1]))

const stopscan = _ => ($('#cam').addClass('d-none'), scanner.stop())

const handleQR = async content => {
  if (content.substr(0, 10).toLowerCase() === 'lightning:')
    displayPay(content.substr(10))
}

const displayPay = async bolt11 => {
  stopscan()
  const payreq = await $.post('decodepay', { bolt11, _csrf })

  console.log('pay req', payreq)

  const diag = $(approveView(payreq)).modal()
    .find('.approve').click(e => (diag.remove(), pay(bolt11))).end()
    .on('hidden.bs.modal', scan)
}

const pay = async bolt11 => {
  const paid = await $.post('pay', { bolt11, _csrf })

  $(successView(paid)).modal()
    .on('hidden.bs.modal', scan)
}


scanner.addListener('scan', handleQR)
