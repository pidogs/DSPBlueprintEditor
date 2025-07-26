const base64map =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export const crypt = {
  // Bit-wise rotation left
  rotl: function(n, b) {
    return (n << b) | (n >>> (32 - b));
  },

  // Bit-wise rotation right
  rotr: function(n, b) {
    return (n << (32 - b)) | (n >>> b);
  },

  // Swap big-endian to little-endian and vice versa
  endian: function(n) {
    // If number given, swap endian
    if (n.constructor == Number) {
      return crypt.rotl(n, 8) & 0x00FF00FF | crypt.rotl(n, 24) & 0xFF00FF00;
    }

    // Else, assume array and swap all items
    for (var i = 0; i < n.length; i++) n[i] = crypt.endian(n[i]);
    return n;
  },

  // Generate an array of any length of random bytes
  randomBytes: function(n) {
    for (var bytes = []; n > 0; n--)
      bytes.push(Math.floor(Math.random() * 256));
    return bytes;
  },

  // Convert a byte array to big-endian 32-bit words
  bytesToWords: function(bytes) {
    for (var words = [], i = 0, b = 0; i < bytes.length; i++, b += 8)
      words[b >>> 5] |= bytes[i] << (24 - b % 32);
    return words;
  },

  // Convert big-endian 32-bit words to a byte array
  wordsToBytes: function(words) {
    for (var bytes = [], b = 0; b < words.length * 32; b += 8)
      bytes.push((words[b >>> 5] >>> (24 - b % 32)) & 0xFF);
    return bytes;
  },

  // Convert a byte array to a hex string
  bytesToHex: function(bytes) {
    for (var hex = [], i = 0; i < bytes.length; i++) {
      hex.push((bytes[i] >>> 4).toString(16));
      hex.push((bytes[i] & 0xF).toString(16));
    }
    return hex.join('');
  },

  // Convert a hex string to a byte array
  hexToBytes: function(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
      bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
  },

  // Convert a byte array to a base-64 string
  bytesToBase64: function(bytes) {
    for (var base64 = [], i = 0; i < bytes.length; i += 3) {
      var triplet = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
      for (var j = 0; j < 4; j++)
        if (i * 8 + j * 6 <= bytes.length * 8)
          base64.push(base64map.charAt((triplet >>> 6 * (3 - j)) & 0x3F));
        else
          base64.push('=');
    }
    return base64.join('');
  },

  // Convert a base-64 string to a byte array
  base64ToBytes: function(base64) {
    // Remove non-base-64 characters
    base64 = base64.replace(/[^A-Z0-9+\/]/ig, '');

    for (var bytes = [], i = 0, imod4 = 0; i < base64.length; imod4 = ++i % 4) {
      if (imod4 == 0) continue;
      bytes.push(
          ((base64map.indexOf(base64.charAt(i - 1)) &
            (Math.pow(2, -2 * imod4 + 8) - 1))
           << (imod4 * 2)) |
          (base64map.indexOf(base64.charAt(i)) >>> (6 - imod4 * 2)));
    }
    return bytes;
  }
};


const charenc = {
  // UTF-8 encoding
  utf8: {
    // Convert a string to a byte array
    stringToBytes: function(str) {
      return charenc.bin.stringToBytes(unescape(encodeURIComponent(str)));
    },

    // Convert a byte array to a string
    bytesToString: function(bytes) {
      return decodeURIComponent(escape(charenc.bin.bytesToString(bytes)));
    }
  },

  // Binary encoding
  bin: {
    // Convert a string to a byte array
    stringToBytes: function(str) {
      for (var bytes = [], i = 0; i < str.length; i++)
        bytes.push(str.charCodeAt(i) & 0xFF);
      return bytes;
    },

    // Convert a byte array to a string
    bytesToString: function(bytes) {
      for (var str = [], i = 0; i < bytes.length; i++)
        str.push(String.fromCharCode(bytes[i]));
      return str.join('');
    }
  }
};

const isBuffer = function(obj) {
  return obj != null && obj.constructor != null &&
      typeof obj.constructor.isBuffer === 'function' &&
      obj.constructor.isBuffer(obj)
}

// The core
export const md5 = function(message, options, Dyson) {
  // Convert to byte array
  if (message.constructor == String)
    if (options && options.encoding === 'binary')
      message = charenc.bin.stringToBytes(message);
    else
      message = charenc.utf8.stringToBytes(message);
  else if (isBuffer(message))
    message = Array.prototype.slice.call(message, 0);
  else if (!Array.isArray(message) && message.constructor !== Uint8Array)
    message = message.toString();
  // else, assume byte array already

  var m = crypt.bytesToWords(message), l = message.length * 8, a = 0x67452301,
      b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  if (Dyson) {
    a = 0x67452301;
    b = 0xefdcab89;
    c = 0x98badcfe;
    d = 0x10325746;
  }

  // Swap endian
  for (var i = 0; i < m.length; i++) {
    m[i] = ((m[i] << 8) | (m[i] >>> 24)) & 0x00FF00FF |
        ((m[i] << 24) | (m[i] >>> 8)) & 0xFF00FF00;
  }

  // Padding
  m[l >>> 5] |= 0x80 << (l % 32);
  m[(((l + 64) >>> 9) << 4) + 14] = l;

  // Method shortcuts
  var FF = md5._ff, GG = md5._gg, HH = md5._hh, II = md5._ii;

  for (var i = 0; i < m.length; i += 16) {
    var aa = a, bb = b, cc = c, dd = d;
    //=====================================================
    a = FF(a, b, c, d, m[i + 0], 7, 0xd76aa478);  // 0
    if (Dyson) {
      d = FF(d, a, b, c, m[i + 1], 12, 0xe8d7b756);  // 1-
    } else {
      d = FF(d, a, b, c, m[i + 1], 12, 0xe8c7b756);  // 1-
    }
    c = FF(c, d, a, b, m[i + 2], 17, 0x242070db);  // 2
    b = FF(b, c, d, a, m[i + 3], 22, 0xc1bdceee);  // 3
    a = FF(a, b, c, d, m[i + 4], 7, 0xf57c0faf);   // 4
    d = FF(d, a, b, c, m[i + 5], 12, 0x4787c62a);  // 5
    if (Dyson) {
      c = FF(c, d, a, b, m[i + 6], 17, 0xa8304623);  // 6-
    } else {
      c = FF(c, d, a, b, m[i + 6], 17, 0xa8304613);  // 6-
    }
    b = FF(b, c, d, a, m[i + 7], 22, 0xfd469501);   // 7
    a = FF(a, b, c, d, m[i + 8], 7, 0x698098d8);    // 8
    d = FF(d, a, b, c, m[i + 9], 12, 0x8b44f7af);   // 9
    c = FF(c, d, a, b, m[i + 10], 17, 0xffff5bb1);  // 10
    b = FF(b, c, d, a, m[i + 11], 22, 0x895cd7be);  // 11
    if (Dyson) {
      a = FF(a, b, c, d, m[i + 12], 7, 0x6b9f1122);  // 12-
    } else {
      a = FF(a, b, c, d, m[i + 12], 7, 0x6b901122);  // 12-
    }
    d = FF(d, a, b, c, m[i + 13], 12, 0xfd987193);  // 13
    c = FF(c, d, a, b, m[i + 14], 17, 0xa679438e);  // 14
    if (Dyson) {
      b = FF(b, c, d, a, m[i + 15], 22, 0x39b40821);  // 15-
    } else {
      b = FF(b, c, d, a, m[i + 15], 22, 0x49b40821);  // 15-
    }
    //================================================
    a = GG(a, b, c, d, m[i + 1], 5, 0xf61e2562);    // 16
    d = GG(d, a, b, c, m[i + 6], 9, 0xc040b340);    // 17
    c = GG(c, d, a, b, m[i + 11], 14, 0x265e5a51);  // 18
    if (Dyson) {
      b = GG(b, c, d, a, m[i + 0], 20, 0xc9b6c7aa);  // 19-
    } else {
      b = GG(b, c, d, a, m[i + 0], 20, 0xe9b6c7aa);  // 19-
    }
    a = GG(a, b, c, d, m[i + 5], 5, 0xd62f105d);  // 20
    if (Dyson) {
      d = GG(d, a, b, c, m[i + 10], 9, 0x2443453);  // 21-
    } else {
      d = GG(d, a, b, c, m[i + 10], 9, 0x2441453);  // 21-
    }
    c = GG(c, d, a, b, m[i + 15], 14, 0xd8a1e681);  // 22
    b = GG(b, c, d, a, m[i + 4], 20, 0xe7d3fbc8);   // 23
    if (Dyson) {
      a = GG(a, b, c, d, m[i + 9], 5, 0x21f1cde6);  // 24-
    } else {
      a = GG(a, b, c, d, m[i + 9], 5, 0x21e1cde6);  // 24-
    }
    d = GG(d, a, b, c, m[i + 14], 9, 0xc33707d6);  // 25
    c = GG(c, d, a, b, m[i + 3], 14, 0xf4d50d87);  // 26
    if (Dyson) {
      b = GG(b, c, d, a, m[i + 8], 20, 0x475a14ed);  // 27-
    } else {
      b = GG(b, c, d, a, m[i + 8], 20, 0x455a14ed);  // 27-
    }
    a = GG(a, b, c, d, m[i + 13], 5, 0xa9e3e905);   // 28
    d = GG(d, a, b, c, m[i + 2], 9, 0xfcefa3f8);    // 29
    c = GG(c, d, a, b, m[i + 7], 14, 0x676f02d9);   // 30
    b = GG(b, c, d, a, m[i + 12], 20, 0x8d2a4c8a);  // 31
    //================================================
    a = HH(a, b, c, d, m[i + 5], 4, 0xfffa3942);    // 32
    d = HH(d, a, b, c, m[i + 8], 11, 0x8771f681);   // 33
    c = HH(c, d, a, b, m[i + 11], 16, 0x6d9d6122);  // 34
    b = HH(b, c, d, a, m[i + 14], 23, 0xfde5380c);  // 35
    a = HH(a, b, c, d, m[i + 1], 4, 0xa4beea44);    // 36
    d = HH(d, a, b, c, m[i + 4], 11, 0x4bdecfa9);   // 37
    c = HH(c, d, a, b, m[i + 7], 16, 0xf6bb4b60);   // 38
    b = HH(b, c, d, a, m[i + 10], 23, 0xbebfbc70);  // 39
    a = HH(a, b, c, d, m[i + 13], 4, 0x289b7ec6);   // 40
    d = HH(d, a, b, c, m[i + 0], 11, 0xeaa127fa);   // 41
    c = HH(c, d, a, b, m[i + 3], 16, 0xd4ef3085);   // 42
    b = HH(b, c, d, a, m[i + 6], 23, 0x4881d05);    // 43
    a = HH(a, b, c, d, m[i + 9], 4, 0xd9d4d039);    // 44
    d = HH(d, a, b, c, m[i + 12], 11, 0xe6db99e5);  // 45
    c = HH(c, d, a, b, m[i + 15], 16, 0x1fa27cf8);  // 46
    b = HH(b, c, d, a, m[i + 2], 23, 0xc4ac5665);   // 47
    //===============================================
    a = II(a, b, c, d, m[i + 0], 6, 0xf4292244);    // 48
    d = II(d, a, b, c, m[i + 7], 10, 0x432aff97);   // 49
    c = II(c, d, a, b, m[i + 14], 15, 0xab9423a7);  // 50
    b = II(b, c, d, a, m[i + 5], 21, 0xfc93a039);   // 51
    a = II(a, b, c, d, m[i + 12], 6, 0x655b59c3);   // 52
    d = II(d, a, b, c, m[i + 3], 10, 0x8f0ccc92);   // 53
    c = II(c, d, a, b, m[i + 10], 15, 0xffeff47d);  // 54
    b = II(b, c, d, a, m[i + 1], 21, 0x85845dd1);   // 55
    a = II(a, b, c, d, m[i + 8], 6, 0x6fa87e4f);    // 56
    d = II(d, a, b, c, m[i + 15], 10, 0xfe2ce6e0);  // 57
    c = II(c, d, a, b, m[i + 6], 15, 0xa3014314);   // 58
    b = II(b, c, d, a, m[i + 13], 21, 0x4e0811a1);  // 59
    a = II(a, b, c, d, m[i + 4], 6, 0xf7537e82);    // 60
    d = II(d, a, b, c, m[i + 11], 10, 0xbd3af235);  // 61
    c = II(c, d, a, b, m[i + 2], 15, 0x2ad7d2bb);   // 62
    b = II(b, c, d, a, m[i + 9], 21, 0xeb86d391);   // 63

    a = (a + aa) >>> 0;
    b = (b + bb) >>> 0;
    c = (c + cc) >>> 0;
    d = (d + dd) >>> 0;
  }

  const finalhash = crypt.endian([a, b, c, d]);
  const digestBytes = new Uint8Array(16);
  new DataView(digestBytes.buffer).setUint32(0, finalhash[0], false);
  new DataView(digestBytes.buffer).setUint32(4, finalhash[1], false);
  new DataView(digestBytes.buffer).setUint32(8, finalhash[2], false);
  new DataView(digestBytes.buffer).setUint32(12, finalhash[3], false);
  return [...digestBytes]
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
};

// Auxiliary functions
md5._ff = function(a, b, c, d, x, s, t) {
  var n = a + (b & c | ~b & d) + (x >>> 0) + t;
  return ((n << s) | (n >>> (32 - s))) + b;
};
md5._gg = function(a, b, c, d, x, s, t) {
  var n = a + (b & d | c & ~d) + (x >>> 0) + t;
  return ((n << s) | (n >>> (32 - s))) + b;
};
md5._hh = function(a, b, c, d, x, s, t) {
  var n = a + (b ^ c ^ d) + (x >>> 0) + t;
  return ((n << s) | (n >>> (32 - s))) + b;
};
md5._ii = function(a, b, c, d, x, s, t) {
  var n = a + (c ^ (b | ~d)) + (x >>> 0) + t;
  return ((n << s) | (n >>> (32 - s))) + b;
};

// Package private blocksize
md5._blocksize = 16;
md5._digestsize = 16;
