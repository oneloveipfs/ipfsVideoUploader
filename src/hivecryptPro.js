// Hivecrypt Pro
const CryptoJS = require('crypto-js')
const bs58 = require('bs58')
const secp256k1 = require('secp256k1')
const hivecrypt = require('./hivecrypt/src')

/**
 * Network id used in WIF-encoding.
 */
const NETWORK_ID = Buffer.from([0x80]);

/**
 * Return ripemd160 hash of input.
 */
function ripemd160(input) {
    if (typeof input !== 'string')
        input = CryptoJS.lib.WordArray.create(input)
    const hash = Buffer.from(CryptoJS.RIPEMD160(input).toString(CryptoJS.enc.Hex),'hex')
    return hash
}

/**
 * Return sha256 hash of input.
 */
function sha256(input) {
    if (typeof input !== 'string')
        input = CryptoJS.lib.WordArray.create(input)
    const hash = Buffer.from(CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex),'hex')
    return hash
}

/**
 * Return 2-round sha256 hash of input.
 */
function doubleSha256(input) {
    return sha256(sha256(input));
}

/**
 * Encode bs58+ripemd160-checksum encoded public key.
 */
function encodePublic(key, prefix) {
    const checksum = ripemd160(key)
    return prefix + bs58.encode(Buffer.concat([key, checksum.slice(0, 4)]))
}

/**
 * Decode bs58+ripemd160-checksum encoded public key.
 */
function decodePublic(encodedKey) {
    const prefix = encodedKey.slice(0, 3);
    encodedKey = encodedKey.slice(3);
    const buffer = bs58.decode(encodedKey);
    const key = buffer.slice(0, -4);
    return { key, prefix };
}

/**
 * Encode bs58+doubleSha256-checksum private key.
 */
function encodePrivate(key) {
    const checksum = doubleSha256(key);
    return bs58.encode(Buffer.concat([key, checksum.slice(0, 4)]));
}

/**
 * Decode bs58+doubleSha256-checksum encoded private key.
 */
function decodePrivate(encodedKey) {
    const buffer = bs58.decode(encodedKey);
    const key = buffer.slice(0, -4);
    return key;
}

/**
 * Crypto-JS AES encrypt
 */
function aesEncrypt(data,key) {
    return CryptoJS.AES.encrypt(data,key).toString()
}

/**
 * Crypto-JS AES decrypt to UTF-8 format
 */
function aesDecrypt(data,key) {
    return CryptoJS.AES.decrypt(data,key).toString(CryptoJS.enc.Utf8)
}

/**
 * ECDSA (secp256k1) public key.
 */
 class PublicKey {
    constructor(key, prefix = 'STM') {
        this.key = key;
        this.prefix = prefix;
        this.uncompressed = Buffer.from(secp256k1.publicKeyConvert(key, false));
    }
    /**
     * Create a new instance from a WIF-encoded key.
     */
    static fromString(wif) {
        const { key, prefix } = decodePublic(wif);
        return new PublicKey(key, prefix);
    }
    /**
     * Creates a new PublicKey instance from an Avalon public key
     * @param {String} pub base58 encoded Avalon public key string
     * @param {String} prefix prefix for graphene public keys
     * @returns a new PublicKey instance
     */
    static fromAvalonString(pub, prefix = 'STM') {
        return new PublicKey(bs58.decode(pub),prefix)
    }
    /**
     * Convert public key buffer to WIF encoding
     */
    toString() {
        return encodePublic(this.key,this.prefix)
    }
    /**
     * Returns an Avalon public key
     * @returns {String} base58 encoded Avalon public key string
     */
    toAvalonString() {
        return bs58.encode(this.key)
    }
    /**
     * Create a new instance.
     */
    static from(value) {
        if (value instanceof PublicKey) {
            return value;
        }
        else {
            return PublicKey.fromString(value);
        }
    }
}

/**
 * ECDSA (secp256k1) private key.
 */
class PrivateKey {
    constructor(key) {
        if (!secp256k1.privateKeyVerify(key))
            throw new Error ("invalid private key")
        this.key = key
    }
    /**
     * Create a new instance from a WIF-encoded key.
     */
    static fromString(wif) {
        return new PrivateKey(decodePrivate(wif).slice(1));
    }

    /**
     * Create a new instance from Avalon private key.
     * @param {String} wif base58 encoded Avalon private key
     * @returns a new PrivateKey instance
     */
    static fromAvalonString(wif) {
        return new PrivateKey(bs58.decode(wif))
    }
    
    /**
     * Derive the public key for this private key.
     */
    createPublic(prefix) {
        return new PublicKey(secp256k1.publicKeyCreate(this.key), prefix);
    }

    /** Return a WIF-encoded representation of the key. */
    toString () {
        return encodePrivate(Buffer.concat([NETWORK_ID, this.key]))
    }

    /**
     * Returns an Avalon private key
     * @returns {String} base58 encoded Avalon private key string
     */
    toAvalonString() {
        return bs58.encode(this.key)
    }
}

/** ECDSA (secp256k1) signature. */
// https://github.com/mahdiyari/hive-tx-js/blob/master/helpers/Signature.js
class Signature {
    constructor(data, recovery) {
        this.data = data
        this.recovery = recovery
    }

    static fromBuffer(buffer) {
        if (buffer.length !== 65)
            throw new Error('invalid signature')
        const recovery = buffer.readUInt8(0) - 31
        const data = buffer.slice(1)
        return new Signature(data, recovery)
    }

    /**
     * Creates a Signature instance from string.
     * @param {String} string graphene signature
     * @returns a new Signature instance
     */
    static fromString(string) {
        return Signature.fromBuffer(Buffer.from(string, 'hex'))
    }

    /**
     * Creates an Avalon ECDSA signature from a given 32-byte message using an secp256k1 private key.
     * @param {UInt8Array} message 
     * @param {String} key 
     * @returns a new Signature instance
     */
    static avalonCreate(message,key) {
        let {signature, recid} = secp256k1.ecdsaSign(message,bs58.decode(key))
        return new Signature(signature,recid)
    }

    /**
     * Recover public key from signature by providing original signed message.
     * @param message 32-byte message that was used to create the signature.
     */
    recover(message, prefix = 'STM') {
        return encodePublic(secp256k1.ecdsaRecover(this.data, this.recovery, message),prefix)
    }

    toBuffer () {
        const buffer = Buffer.alloc(65)
        buffer.writeUInt8(this.recovery + 31, 0)
        Buffer.from(this.data,'hex').copy(buffer, 1)
        return buffer
    }

    /**
     * Retrieves an Avalon multisig object for this signature.
     * @returns {Array} the Avalon signature that may be appended to Avalon multisig transactions
     */
    toAvalonSignature() {
        return [bs58.encode(this.data),this.recovery]
    }

    customToString () {
        return this.toBuffer().toString('hex')
    }
}

if (typeof window !== 'undefined')
    window.hivecryptpro = {
        PrivateKey,
        PublicKey,
        Signature,
        aes: {
            encrypt: aesEncrypt,
            decrypt: aesDecrypt
        },
        sha256,
        hivecrypt
    }

module.exports = {
    PrivateKey,
    PublicKey,
    Signature,
    aes: {
        encrypt: aesEncrypt,
        decrypt: aesDecrypt
    },
    sha256,
    hivecrypt
}
