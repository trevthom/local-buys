/* CRYPTO — real Nostr crypto, verified vs BIP-340 vectors. Do not edit.
   Part of LOCAL BUYS. Organized for easy editing — see README.md. */
const _P = 2n ** 256n - 2n ** 32n - 977n;

const _N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

const _Gx = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n;

const _Gy = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n;

const _enc = new TextEncoder();


function _hexToBytes(hex) { if (hex.length % 2) throw new Error("odd hex"); const a = new Uint8Array(hex.length / 2); for (let i = 0; i < a.length; i++) a[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16); return a; }

function _bytesToHex(b) { let s = ""; for (const x of b) s += x.toString(16).padStart(2, "0"); return s; }

function _bytesToBig(b) { let n = 0n; for (const x of b) n = (n << 8n) | BigInt(x); return n; }

function _bigToBytes32(n) { const b = new Uint8Array(32); for (let i = 31; i >= 0; i--) { b[i] = Number(n & 0xffn); n >>= 8n; } return b; }

function _cat(...arrs) { let len = 0; for (const a of arrs) len += a.length; const out = new Uint8Array(len); let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; } return out; }

function _mod(a, m = _P) { const r = a % m; return r >= 0n ? r : r + m; }

function _pow(b, e, m) { let r = 1n; b = _mod(b, m); while (e > 0n) { if (e & 1n) r = _mod(r * b, m); b = _mod(b * b, m); e >>= 1n; } return r; }

function _inv(a, m = _P) { return _pow(_mod(a, m), m - 2n, m); }

function _ptAdd(p1, p2) {
  if (p1 === null) return p2; if (p2 === null) return p1;
  const [x1, y1] = p1, [x2, y2] = p2;
  if (x1 === x2 && _mod(y1 + y2) === 0n) return null;
  let m; if (x1 === x2 && y1 === y2) m = _mod(3n * x1 * x1 * _inv(2n * y1)); else m = _mod((y2 - y1) * _inv(x2 - x1));
  const x3 = _mod(m * m - x1 - x2); return [x3, _mod(m * (x1 - x3) - y1)];
}

function _ptMul(k, p) { k = _mod(k, _N); let r = null, a = p; while (k > 0n) { if (k & 1n) r = _ptAdd(r, a); a = _ptAdd(a, a); k >>= 1n; } return r; }

const _G = [_Gx, _Gy];

function _liftX(x) { if (x >= _P) throw new Error("x>=P"); const c = _mod(x * x * x + 7n); const y = _pow(c, (_P + 1n) / 4n, _P); if (_mod(y * y) !== c) throw new Error("not on curve"); return [x, (y & 1n) === 0n ? y : _P - y]; }

async function _sha256(b) { return new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", b)); }

const _tagCache = {};

async function _tagged(tag, msg) { if (!_tagCache[tag]) { const t = await _sha256(_enc.encode(tag)); _tagCache[tag] = _cat(t, t); } return _sha256(_cat(_tagCache[tag], msg)); }


function nostrGetPublicKey(skHex) { const d = _bytesToBig(_hexToBytes(skHex)); if (d <= 0n || d >= _N) throw new Error("invalid secret key"); return _bytesToHex(_bigToBytes32(_ptMul(d, _G)[0])); }

function nostrGenerateSecretKey() { while (true) { const b = new Uint8Array(32); globalThis.crypto.getRandomValues(b); const n = _bytesToBig(b); if (n > 0n && n < _N) return _bytesToHex(b); } }

async function nostrSchnorrSign(msgHex, skHex, auxHex) {
  const m = _hexToBytes(msgHex); let d0 = _bytesToBig(_hexToBytes(skHex)); if (d0 <= 0n || d0 >= _N) throw new Error("bad sk");
  const Pt = _ptMul(d0, _G); const d = (Pt[1] & 1n) === 0n ? d0 : _N - d0; const px = _bigToBytes32(Pt[0]);
  const aux = auxHex ? _hexToBytes(auxHex) : (() => { const a = new Uint8Array(32); globalThis.crypto.getRandomValues(a); return a; })();
  const t = _bigToBytes32(d ^ _bytesToBig(await _tagged("BIP0340/aux", aux)));
  const rand = await _tagged("BIP0340/nonce", _cat(t, px, m)); let k0 = _mod(_bytesToBig(rand), _N); if (k0 === 0n) throw new Error("k=0");
  const R = _ptMul(k0, _G); const k = (R[1] & 1n) === 0n ? k0 : _N - k0; const rx = _bigToBytes32(R[0]);
  const e = _mod(_bytesToBig(await _tagged("BIP0340/challenge", _cat(rx, px, m))), _N);
  return _bytesToHex(_cat(rx, _bigToBytes32(_mod(k + e * d, _N))));
}

async function nostrSchnorrVerify(sigHex, msgHex, pubHex) {
  try { const sig = _hexToBytes(sigHex), m = _hexToBytes(msgHex), pub = _hexToBytes(pubHex);
    if (sig.length !== 64 || pub.length !== 32) return false;
    const P_ = _liftX(_bytesToBig(pub)); const r = _bytesToBig(sig.slice(0, 32)), s = _bytesToBig(sig.slice(32, 64));
    if (r >= _P || s >= _N) return false;
    const e = _mod(_bytesToBig(await _tagged("BIP0340/challenge", _cat(sig.slice(0, 32), pub, m))), _N);
    const R = _ptAdd(_ptMul(s, _G), _ptMul(_N - e, P_)); if (R === null || (R[1] & 1n) !== 0n) return false;
    return R[0] === r;
  } catch { return false; }
}

const _CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

function _polymod(values) { const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]; let chk = 1; for (const v of values) { const top = chk >> 25; chk = ((chk & 0x1ffffff) << 5) ^ v; for (let i = 0; i < 5; i++) if ((top >> i) & 1) chk ^= GEN[i]; } return chk; }

function _hrpExpand(hrp) { const out = []; for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) >> 5); out.push(0); for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) & 31); return out; }

function _checksum(hrp, data) { const values = _hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]); const mod_ = _polymod(values) ^ 1; const out = []; for (let i = 0; i < 6; i++) out.push((mod_ >> (5 * (5 - i))) & 31); return out; }

function _bech32Encode(hrp, data) { const c = data.concat(_checksum(hrp, data)); let s = hrp + "1"; for (const d of c) s += _CHARSET[d]; return s; }

function _bech32Decode(str) { str = str.toLowerCase(); const pos = str.lastIndexOf("1"); if (pos < 1) throw new Error("bad bech32"); const hrp = str.slice(0, pos); const data = []; for (const ch of str.slice(pos + 1)) { const v = _CHARSET.indexOf(ch); if (v === -1) throw new Error("bad char"); data.push(v); } if (_polymod(_hrpExpand(hrp).concat(data)) !== 1) throw new Error("bad checksum"); return { hrp, data: data.slice(0, -6) }; }

function _convertBits(data, from, to, pad) { let acc = 0, bits = 0; const out = []; const maxv = (1 << to) - 1; for (const value of data) { acc = (acc << from) | value; bits += from; while (bits >= to) { bits -= to; out.push((acc >> bits) & maxv); } } if (pad) { if (bits > 0) out.push((acc << (to - bits)) & maxv); } else if (bits >= from || ((acc << (to - bits)) & maxv)) throw new Error("bad padding"); return out; }

function nostrHexToNpub(hex) { return _bech32Encode("npub", _convertBits(Array.from(_hexToBytes(hex)), 8, 5, true)); }

function nostrHexToNsec(hex) { return _bech32Encode("nsec", _convertBits(Array.from(_hexToBytes(hex)), 8, 5, true)); }

function nostrDecodeBech32(str) { const { hrp, data } = _bech32Decode(str.trim()); return { type: hrp, hex: _bytesToHex(Uint8Array.from(_convertBits(data, 5, 8, false))) }; }


function _ecdhKey(skHex, pubHex) { const d = _bytesToBig(_hexToBytes(skHex)); const Ppt = _liftX(_bytesToBig(_hexToBytes(pubHex))); return _bigToBytes32(_ptMul(d, Ppt)[0]); }

function _b64e(bytes) { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); }

function _b64d(str) { const bin = atob(str); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }

async function nip04Encrypt(skHex, pubHex, text) { const key = _ecdhKey(skHex, pubHex); const iv = new Uint8Array(16); globalThis.crypto.getRandomValues(iv); const ck = await globalThis.crypto.subtle.importKey("raw", key, { name: "AES-CBC" }, false, ["encrypt"]); const ct = new Uint8Array(await globalThis.crypto.subtle.encrypt({ name: "AES-CBC", iv }, ck, _enc.encode(text))); return _b64e(ct) + "?iv=" + _b64e(iv); }

async function nip04Decrypt(skHex, pubHex, payload) { const [ctB64, ivB64] = payload.split("?iv="); const key = _ecdhKey(skHex, pubHex); const ck = await globalThis.crypto.subtle.importKey("raw", key, { name: "AES-CBC" }, false, ["decrypt"]); const pt = await globalThis.crypto.subtle.decrypt({ name: "AES-CBC", iv: _b64d(ivB64) }, ck, _b64d(ctB64)); return new TextDecoder().decode(pt); }


async function nostrEventHash(ev) { return _bytesToHex(await _sha256(_enc.encode(JSON.stringify([0, ev.pubkey, ev.created_at, ev.kind, ev.tags, ev.content])))); }

async function nostrFinalize(ev, skHex) { ev.pubkey = nostrGetPublicKey(skHex); ev.id = await nostrEventHash(ev); ev.sig = await nostrSchnorrSign(ev.id, skHex); return ev; }


function shortNpub(npub) { if (!npub) return "npub1..."; return npub.length > 18 ? npub.slice(0, 10) + "..." + npub.slice(-6) : npub; }

export { nostrGetPublicKey, nostrGenerateSecretKey, nostrSchnorrSign, nostrSchnorrVerify, nostrHexToNpub, nostrHexToNsec, nostrDecodeBech32, nip04Encrypt, nip04Decrypt, nostrEventHash, nostrFinalize, shortNpub };
