import { Observable as O } from '../rxjs'
import { Subject, Observable } from 'rxjs';
const secp256k1 = require('secp256k1');
const sha256 = require('js-sha256');
const aes = require('@stablelib/chacha20poly1305');
var poly = require("@stablelib/hex");

const crypto = require('crypto');


function ecdh(pubkey, privkey){
    return Buffer.from(secp256k1.ecdh(pubkey,privkey));
}
function hmacHash(key, input, hash) {
    var hmac = crypto.createHmac(hash, key);
    hmac.update(input);
    return hmac.digest();
}
function hkdf(ikm, len, salt, info, hash) {
    if (salt === void 0) { salt = Buffer.alloc(0); }
    if (info === void 0) { info = Buffer.alloc(0); }
    if (hash === void 0) { hash = "sha256";}
    // extract step
    var prk = hmacHash(salt, ikm, hash);
    // expand
    var n = Math.ceil(len / prk.byteLength);
    if (n > 255)
        throw new Error("Output length exceeds maximum");
    var t = [Buffer.alloc(0)];
    for (var i = 1; i <= n; i++) {
        var tp = t[t.length - 1];
        var bi = Buffer.from([i]);
        t.push(hmacHash(prk, Buffer.concat([tp, info, bi]), hash));
    }
    return Buffer.concat(t.slice(1)).slice(0, len);
}

function getPublicKey(privKey, compressed = true){
    return Buffer.from(secp256k1.publicKeyCreate(privKey, compressed));
}
function ccpEncrypt(k, n, ad, plaintext) {
    const aead = new aes.ChaCha20Poly1305(poly.decode(k.toString('hex')))
    const seal = aead.seal(poly.decode(n.toString('hex')), poly.decode(plaintext.toString('hex')), poly.decode(ad.toString('hex')));
    return Buffer.from(seal);
}
function ccpDecrypt(k, n, ad, ciphertext) {
    const aead = new aes.ChaCha20Poly1305(poly.decode(k.toString('hex')))
    const open = aead.open(poly.decode(n.toString('hex')),
                           poly.decode(ciphertext.toString('hex')),
                           poly.decode(ad.toString('hex')))
    return Buffer.from(open);
}

class NoiseState{
    constructor(_a){
        var ls = _a.ls, es = _a.es;
        this.protocolName = Buffer.from("Noise_XK_secp256k1_ChaChaPoly_SHA256");
        this.prologue = Buffer.from("lightning");
        this.ls = ls;
        this.lpk = getPublicKey(ls);
        this.es = es;
        this.epk = getPublicKey(es);
    }
    initiatorAct1 (rpk) {
        this.rpk = rpk;
        this._initialize(this.rpk);
        // 2. h = SHA-256(h || epk)
        this.h = sha256(Buffer.concat([Buffer.from(this.h,'hex'), this.epk]));
        // 3. es = ECDH(e.priv, rs)
        var ss = ecdh(this.rpk, this.es);
        // 4. ck, temp_k1 = HKDF(ck, es)
        var tempK1 = hkdf(ss, 64, Buffer.from(this.ck,'hex'));
        this.ck = tempK1.slice(0, 32);
        this.tempK1 = tempK1.slice(32);
        // 5. c = encryptWithAD(temp_k1, 0, h, zero)
        
        var c = ccpEncrypt(this.tempK1, Buffer.alloc(12), Buffer.from(this.h,'hex'), Buffer.alloc(0));
        // 6. h = SHA-256(h || c)
        this.h = sha256(Buffer.concat([Buffer.from(this.h,'hex'), c]));
        // 7. m = 0 || epk || c
        var m = Buffer.concat([Buffer.alloc(1), this.epk, c]);
        console.log(m);
        return m;
    }
    initiatorAct2 (m) {
        if (m.length !== 50)
            throw new Error("ACT2_READ_FAILED");
        // 2. parse th read message m into v, re, and c
        var v = m.slice(0, 1)[0];
        var re = m.slice(1, 34);
        var c = m.slice(34);
        // 2a. convert re to public key
        this.repk = re;
        // 3. assert version is known version
        if (v !== 0)
            throw new Error("ACT2_BAD_VERSION");
        // 4. sha256(h || re.serializedCompressed');
        this.h = sha256(Buffer.concat([Buffer.from(this.h,'hex'), this.repk]));
        // 5. ss = ECDH(re, e.priv);
        var ss = ecdh(this.repk, this.es);
        // 6. ck, temp_k2 = HKDF(cd, ss)
        var tempK2 = hkdf(ss, 64, this.ck);
        this.ck = tempK2.slice(0, 32);
        this.tempK2 = tempK2.slice(32);
        // 7. p = decryptWithAD()
        this.p = ccpDecrypt(this.tempK2, Buffer.alloc(12), Buffer.from(this.h,'hex'), c);
        // 8. h = sha256(h || c)
        this.h = sha256(Buffer.concat([Buffer.from(this.h,'hex'), c]));
    }
    initiatorAct3 () {
        // 1. c = encryptWithAD(temp_k2, 1, h, lpk)
        var c = ccpEncrypt(this.tempK2, Buffer.from([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]), Buffer.from(this.h,'hex'), this.lpk);
        // 2. h = sha256(h || c)
        this.h = sha256(Buffer.concat([Buffer.from(this.h,'hex'), c]));
        // 3. ss = ECDH(re, s.priv)
        var ss = ecdh(this.repk, this.ls);
        // 4. ck, temp_k3 = HKDF(ck, ss)
        var tempK3 = hkdf(ss, 64, this.ck);
        this.ck = tempK3.slice(0, 32);
        this.tempK3 = tempK3.slice(32);
        // 5. t = encryptWithAD(temp_k3, 0, h, zero)
        var t = ccpEncrypt(this.tempK3, Buffer.alloc(12), Buffer.from(this.h,'hex'), Buffer.alloc(0));
        // 6. sk, rk = hkdf(ck, zero)
        var sk = hkdf(Buffer.alloc(0), 64, this.ck);
        this.rk = sk.slice(32);
        this.sk = sk.slice(0, 32);
        // 7. rn = 0, sn = 0
        this.sn = Buffer.alloc(12);
        this.rn = Buffer.alloc(12);
        // 8. send m = 0 || c || t
        var m = Buffer.concat([Buffer.alloc(1), c, t]);
        return m;
    }

    receiveAct1 (m) {
        this._initialize(this.lpk);
        // 1. read exactly 50 bytes off the stream
        if (m.length !== 50)
            throw new Error("ACT1_READ_FAILED");
        // 2. parse th read message m into v,re, and c
        var v = m.slice(0, 1)[0];
        var re = m.slice(1, 34);
        var c = m.slice(34);
        this.repk = re;
        // 3. assert version is known version
        if (v !== 0)
            throw new Error("ACT1_BAD_VERSION");
        // 4. sha256(h || re.serializedCompressed');
        this.h = sha256(Buffer.concat([Buffer.from(this.h,'hex'), re]));
        // 5. ss = ECDH(re, ls.priv);
        var ss = ecdh(re, this.ls);
        // 6. ck, temp_k1 = HKDF(cd, ss)
        var tempK1 = hkdf(ss, 64, Buffer.from(this.ck,'hex'));
        this.ck = tempK1.slice(0, 32);
        this.tempK1 = tempK1.slice(32);
        // 7. p = decryptWithAD(temp_k1, 0, h, c)
        ccpDecrypt(this.tempK1, Buffer.alloc(12), Buffer.from(this.h,'hex'), c);
        // 8. h = sha256(h || c)
        this.h = sha256(Buffer.concat([Buffer.from(this.h,'hex'), c]));
    }
    recieveAct2 () {
        // 1. e = generateKey() => done in initialization
        // 2. h = sha256(h || e.pub.compressed())
        this.h = sha256(Buffer.concat([Buffer.from(this.h,'hex'), this.epk]));
        // 3. ss = ecdh(re, e.priv)
        var ss = ecdh(this.repk, this.es);
        // 4. ck, temp_k2 = hkdf(ck, ss)
        var tempK2 = hkdf(ss, 64, this.ck);
        this.ck = tempK2.slice(0, 32);
        this.tempK2 = tempK2.slice(32);
        // 5. c = encryptWithAd(temp_k2, 0, h, zero)
        var c = ccpEncrypt(this.tempK2, Buffer.alloc(12), Buffer.from(this.h,'hex'), Buffer.alloc(0));
        // 6. h = sha256(h || c)
        this.h = sha256(Buffer.concat([Buffer.from(this.h,'hex'), c]));
        // 7. m = 0 || e.pub.compressed() Z|| c
        var m = Buffer.concat([Buffer.alloc(1), this.epk, c]);
        return m;
    }
    receiveAct3 (m) {
        // 1. read exactly 66 bytes from the network buffer
        if (m.length !== 66)
            throw new Error("ACT3_READ_FAILED");
        // 2. parse m into v, c, t
        var v = m.slice(0, 1)[0];
        var c = m.slice(1, 50);
        var t = m.slice(50);
        // 3. validate v is recognized
        if (v !== 0)
            throw new Error("ACT3_BAD_VERSION");
        // 4. rs = decryptWithAD(temp_k2, 1, h, c)
        var rs = ccpDecrypt(this.tempK2, Buffer.from("000000000100000000000000", "hex"), Buffer.from(this.h,'hex'), c);
        this.rpk = rs;
        // 5. h = sha256(h || c)
        this.h = sha256(Buffer.concat([Buffer.from(this.h,'hex'), c]));
        // 6. ss = ECDH(rs, e.priv)
        var ss = ecdh(this.rpk, this.es);
        // 7. ck, temp_k3 = hkdf(cs, ss)
        var tempK3 = hkdf(ss, 64, this.ck);
        this.ck = tempK3.slice(0, 32);
        this.tempK3 = tempK3.slice(32);
        // 8. p = decryptWithAD(temp_k3, 0, h, t)
        ccpDecrypt(this.tempK3, Buffer.alloc(12), Buffer.from(this.h,'hex'), t);
        // 9. rk, sk = hkdf(ck, zero)
        var sk = hkdf(Buffer.alloc(0), 64, this.ck);
        this.rk = sk.slice(0, 32);
        this.sk = sk.slice(32);
        // 10. rn = 0, sn = 0
        this.rn = Buffer.alloc(12);
        this.sn = Buffer.alloc(12);
    }
    encryptMessage (m) {
        // step 1/2. serialize m length into int16
        var l = Buffer.alloc(2);
        l.writeUInt16BE(m.length, 0);
        // step 3. encrypt l, using chachapoly1305, sn, sk)
        var lc = ccpEncrypt(this.sk, this.sn, Buffer.alloc(0), l);
        // step 3a: increment sn
        if (this._incrementSendingNonce() >= 1000)
            this._rotateSendingKeys();
        // step 4 encrypt m using chachapoly1305, sn, sk
        var c = ccpEncrypt(this.sk, this.sn, Buffer.alloc(0), m);
        // step 4a: increment sn
        if (this._incrementSendingNonce() >= 1000)
            this._rotateSendingKeys();
        // step 5 return m to be sent
        return Buffer.concat([lc, c]);
    }
    decryptLength (lc) {
        var l = ccpDecrypt(this.rk, this.rn, Buffer.alloc(0), lc);
        if (this._incrementRecievingNonce() >= 1000)
            this._rotateRecievingKeys();
        return l.readUInt16BE(0);
    }
    decryptMessage (c) {
        var m = ccpDecrypt(this.rk, this.rn, Buffer.alloc(0), c);
        if (this._incrementRecievingNonce() >= 1000)
            this._rotateRecievingKeys();
        return m;
    }
    
    // Initializes the noise state prior to Act1.
    
    _initialize (pubkey) {
        // 1. h = SHA-256(protocolName)
        this.h = sha256(Buffer.from(this.protocolName));
        // 2. ck = h
        this.ck = this.h;
        // 3. h = SHA-256(h || prologue)
        this.h = sha256(Buffer.concat([Buffer.from(this.h,'hex'), Buffer.from(this.prologue)]));
        // 4. h = SHA-256(h || pubkey)
        this.h = sha256(Buffer.concat([Buffer.from(this.h,'hex'), pubkey]));
    }
    _incrementSendingNonce () {
        var newValue = this.sn.readUInt16LE(4) + 1;
        this.sn.writeUInt16LE(newValue, 4);
        return newValue;
    }
    _incrementRecievingNonce () {
        var newValue = this.rn.readUInt16LE(4) + 1;
        this.rn.writeUInt16LE(newValue, 4);
        return newValue;
    }
    _rotateSendingKeys () {
        var result = hkdf(this.sk, 64, this.ck);
        this.sk = result.slice(32);
        this.ck = result.slice(0, 32);
        this.sn = Buffer.alloc(12);
    }
    _rotateRecievingKeys () {
        var result = hkdf(this.rk, 64, this.ck);
        this.rk = result.slice(32);
        this.ck = result.slice(0, 32);
        this.rn = Buffer.alloc(12);
    }
};

function makeWebSocketDriver(peerId, lpk) {
    const addr = peerId.split('@')
    let ws = new WebSocket('ws://'+addr[1]);
    function sockDriver(outgoing$){
        var ls=Buffer.from(lpk,'hex');
        
        var es;
        
        do {
        es = crypto.randomBytes(32)
        } while (!secp256k1.privateKeyVerify(es))
        
        let vals = {ls,es};
        
        let noise = new NoiseState(vals);
        
        let rpk = Buffer.from(addr[0],'hex');
        let actions = {
            1: res => {
                var arr = new Uint8Array(res);
                arr = Buffer.from(arr);
                noise.initiatorAct2(arr);
                console.log('initiatorAct2!');
                var last = noise.initiatorAct3();
                ws.send(last);
                console.log('Connection Established');
            },
            2: res => {
                var init = new Uint8Array(res);
                init = Buffer.from(init)
                var len = noise.decryptLength(init.slice(0,18));
                var inti = init.slice(18,18+len+16);
                let init_msg = noise.decryptMessage(inti);
                var pref = init_msg.slice(0,2).toString('hex');
                init_msg = init_msg.slice(2);
                if(pref == '0010'){
                    ws.send(noise.encryptMessage(Buffer.from('00100000000580082a6aa201206fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000','hex')));
                    console.log('sent init message with features "80082a6aa2"!');
                }
                else if(pref == '0011'){alert('Something went wrong (init message)')}
            },
            3: res => {
                var init = new Uint8Array(res);
                init = Buffer.from(init) 
                var len = noise.decryptLength(init.slice(0,18));
                var msg = noise.decryptMessage(init.slice(18,18+len+16)).toString('hex');
                alert('Handshake Complete, Ready to send commands!!');
            },
            4: res => {
                var result = '';
                var init = new Uint8Array(res);
                init = Buffer.from(init)
                var len = noise.decryptLength(init.slice(0,18));
                var decr = noise.decryptMessage(init.slice(18,18+len+16));
                if(decr.slice(0,2).toString('hex')==='4c4f'){
                    result += decr.slice(2).toString();
                }
                else if(decr.slice(0,2).toString('hex')==='594d'){
                    result += decr.slice(2).toString();
                    // ws.close(1000,'Delibrate Closing');
                }
                // console.log(result);
                return result;

            }
            }, cnt = 0;
            ws.onopen = function(){
                ws.send(noise.initiatorAct1(rpk))
                console.log('initiatorAct1!')
                ws.onmessage = function (msg){
                    cnt = cnt + 1;
                    console.log(cnt);
                    msg.data.arrayBuffer()
                    .then(
                        actions[cnt]
                    )
                }
            }
            
            let incoming$ = new Subject();
            O.from(outgoing$).subscribe({
                next: msg=>{
                    var cmd={"method": msg, "rune":JSON.parse(localStorage.websocketinfo).commandorune, "params":[],"id":1}
                    ws.send(noise.encryptMessage(Buffer.concat([Buffer.from('4c4f','hex'),Buffer.from([0,0,0,0,0,0,0,0]) ,Buffer.from(JSON.stringify(cmd))])));
                    console.log('sent!');
                    ws.onmessage = function(msg){
                        var str = msg.data.arrayBuffer().then(
                            actions[4]
                        )
                        str.then(res=>
                            incoming$.next(res)
                        )
                    }
                }
            })
            let ans = incoming$.asObservable();
            return ans;
    }
    return sockDriver;
}
export default makeWebSocketDriver