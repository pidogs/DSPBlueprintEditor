function createCommonjsModule(fn, basedir, module) {
  return module = {
    path: basedir,
    exports: {},
    require: function(path, base) {
      return commonjsRequire(path, base === void 0 || base === null ? module.path : base);
    }
  }, fn(module, module.exports), module.exports;
}
function commonjsRequire() {
  throw new Error("Dynamic requires are not currently supported by @rollup/plugin-commonjs");
}
var crc32 = createCommonjsModule(function(module) {
  (function() {
    var table2 = [], poly = 3988292384;
    function makeTable() {
      var c, n, k;
      for (n = 0; n < 256; n += 1) {
        c = n;
        for (k = 0; k < 8; k += 1) {
          if (c & 1) {
            c = poly ^ c >>> 1;
          } else {
            c = c >>> 1;
          }
        }
        table2[n] = c >>> 0;
      }
    }
    function strToArr(str) {
      return Array.prototype.map.call(str, function(c) {
        return c.charCodeAt(0);
      });
    }
    function crcDirect(arr) {
      var crc = -1, i, j, l, temp;
      for (i = 0, l = arr.length; i < l; i += 1) {
        temp = (crc ^ arr[i]) & 255;
        for (j = 0; j < 8; j += 1) {
          if ((temp & 1) === 1) {
            temp = temp >>> 1 ^ poly;
          } else {
            temp = temp >>> 1;
          }
        }
        crc = crc >>> 8 ^ temp;
      }
      return crc ^ -1;
    }
    function crcTable(arr, append) {
      var crc, i, l;
      if (typeof crcTable.crc === "undefined" || !append || !arr) {
        crcTable.crc = 0 ^ -1;
        if (!arr) {
          return;
        }
      }
      crc = crcTable.crc;
      for (i = 0, l = arr.length; i < l; i += 1) {
        crc = crc >>> 8 ^ table2[(crc ^ arr[i]) & 255];
      }
      crcTable.crc = crc;
      return crc ^ -1;
    }
    makeTable();
    module.exports = function(val, direct2) {
      var val = typeof val === "string" ? strToArr(val) : val, ret = direct2 ? crcDirect(val) : crcTable(val);
      return (ret >>> 0).toString(16);
    };
    module.exports.direct = crcDirect;
    module.exports.table = crcTable;
  })();
});
export default crc32;
var direct = crc32.direct;
var table = crc32.table;
export {crc32 as __moduleExports, direct, table};
