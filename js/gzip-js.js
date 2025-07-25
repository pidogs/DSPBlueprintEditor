import require$$0 from './crc32.js';
import require$$1 from './deflate-js.js';
function createCommonjsModule(fn, basedir, module) {
  return module = {
    path: basedir,
    exports: {},
    require: function(path, base) {
      return commonjsRequire(
          path, base === void 0 || base === null ? module.path : base);
    }
  },
         fn(module, module.exports), module.exports;
}
function commonjsRequire() {
  throw new Error(
      'Dynamic requires are not currently supported by @rollup/plugin-commonjs');
}
var gzip = createCommonjsModule(function(module) {
  (function() {
    var crc322 = require$$0, deflate = require$$1, ID1 = 31, ID2 = 139,
        compressionMethods = {deflate: 8},
        possibleFlags = {FTEXT: 1, FHCRC: 2, FEXTRA: 4, FNAME: 8, FCOMMENT: 16},
        osMap = {
          fat: 0,
          amiga: 1,
          vmz: 2,
          unix: 3,
          'vm/cms': 4,
          atari: 5,
          hpfs: 6,
          macintosh: 7,
          'z-system': 8,
          cplm: 9,
          'tops-20': 10,
          ntfs: 11,
          qdos: 12,
          acorn: 13,
          vfat: 14,
          vms: 15,
          beos: 16,
          tandem: 17,
          theos: 18
        },
        os = 'unix', DEFAULT_LEVEL = 6;
    function putByte(n, arr) {
      arr.push(n & 255);
    }
    function putShort(n, arr) {
      arr.push(n & 255);
      arr.push(n >>> 8);
    }
    function putLong(n, arr) {
      putShort(n & 65535, arr);
      putShort(n >>> 16, arr);
    }
    function putString(s, arr) {
      var i, len = s.length;
      for (i = 0; i < len; i += 1) {
        putByte(s.charCodeAt(i), arr);
      }
    }
    function readByte(arr) {
      return arr.shift();
    }
    function readShort(arr) {
      return arr.shift() | arr.shift() << 8;
    }
    function readLong(arr) {
      var n1 = readShort(arr), n2 = readShort(arr);
      if (n2 > 32768) {
        n2 -= 32768;
        return (n2 << 16 | n1) + 32768 * Math.pow(2, 16);
      }
      return n2 << 16 | n1;
    }
    function readString(arr) {
      var charArr = [];
      while (arr[0] !== 0) {
        charArr.push(String.fromCharCode(arr.shift()));
      }
      arr.shift();
      return charArr.join('');
    }
    function readBytes(arr, n) {
      var i, ret = [];
      for (i = 0; i < n; i += 1) {
        ret.push(arr.shift());
      }
      return ret;
    }
    function zip2(data, options) {
      var flags = 0, level, out = [];
      if (!options) {
        options = {};
      }
      level = options.level || DEFAULT_LEVEL;
      if (typeof data === 'string') {
        data = Array.prototype.map.call(data, function(char) {
          return char.charCodeAt(0);
        });
      }
      putByte(ID1, out);
      putByte(ID2, out);
      putByte(compressionMethods['deflate'], out);
      if (options.name) {
        flags |= possibleFlags['FNAME'];
      }
      putByte(flags, out);
      putLong(options.timestamp || parseInt(Date.now() / 1e3, 10), out);
      if (level === 1) {
        putByte(4, out);
      } else if (level === 9) {
        putByte(2, out);
      } else {
        putByte(0, out);
      }
      if (options.os) {
        putByte(options.os, out);
      } else {
        putByte(osMap[os], out);
      }
      if (options.name) {
        putString(
            options.name.substring(options.name.lastIndexOf('/') + 1), out);
        putByte(0, out);
      }
      deflate.deflate(data, level).forEach(function(byte) {
        putByte(byte, out);
      });
      putLong(parseInt(crc322(data), 16), out);
      putLong(data.length, out);
      return out;
    }
    function unzip2(data, options) {
      var arr = Array.prototype.slice.call(data, 0), t, compressionMethod,
          flags, crc, size, res;
      if (readByte(arr) !== ID1 || readByte(arr) !== ID2) {
        throw 'Not a GZIP file';
      }
      t = readByte(arr);
      t = Object.keys(compressionMethods).some(function(key) {
        compressionMethod = key;
        return compressionMethods[key] === t;
      });
      if (!t) {
        throw 'Unsupported compression method';
      }
      flags = readByte(arr);
      readLong(arr);
      readByte(arr);
      t = readByte(arr);
      Object.keys(osMap).some(function(key) {
        if (osMap[key] === t) {
          return true;
        }
      });
      if (flags & possibleFlags['FEXTRA']) {
        t = readShort(arr);
        readBytes(arr, t);
      }
      if (flags & possibleFlags['FNAME']) {
        readString(arr);
      }
      if (flags & possibleFlags['FCOMMENT']) {
        readString(arr);
      }
      if (flags & possibleFlags['FHCRC']) {
        readShort(arr);
      }
      if (compressionMethod === 'deflate') {
        res = deflate.inflate(arr.splice(0, arr.length - 8));
      }
      if (flags & possibleFlags['FTEXT']) {
        res = Array.prototype.map
                  .call(
                      res,
                      function(byte) {
                        return String.fromCharCode(byte);
                      })
                  .join('');
      }
      crc = readLong(arr);
      if (crc !== parseInt(crc322(res), 16)) {
        throw 'Checksum does not match';
      }
      size = readLong(arr);
      if (size !== res.length) {
        throw 'Size of decompressed file not correct';
      }
      return res;
    }
    module.exports = {
      zip : zip2,
      unzip : unzip2,
            get DEFAULT_LEVEL() {
              return DEFAULT_LEVEL;
            }
    };
  })();
});
export default gzip;
var get = gzip.get;
var unzip = gzip.unzip;
var zip = gzip.zip;
export {gzip as __moduleExports, get, unzip, zip};
