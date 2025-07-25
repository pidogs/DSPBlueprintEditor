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
var rawinflate = createCommonjsModule(function(module) {
  (function() {
    var WSIZE = 32768, STORED_BLOCK = 0, STATIC_TREES = 1, DYN_TREES = 2, lbits = 9, dbits = 6, slide, wp, fixed_tl = null, fixed_td, fixed_bl, fixed_bd, bit_buf, bit_len, method, eof, copy_leng, copy_dist, tl, td, bl, bd, inflate_data, inflate_pos, MASK_BITS = [
      0,
      1,
      3,
      7,
      15,
      31,
      63,
      127,
      255,
      511,
      1023,
      2047,
      4095,
      8191,
      16383,
      32767,
      65535
    ], cplens = [
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      13,
      15,
      17,
      19,
      23,
      27,
      31,
      35,
      43,
      51,
      59,
      67,
      83,
      99,
      115,
      131,
      163,
      195,
      227,
      258,
      0,
      0
    ], cplext = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      2,
      2,
      2,
      2,
      3,
      3,
      3,
      3,
      4,
      4,
      4,
      4,
      5,
      5,
      5,
      5,
      0,
      99,
      99
    ], cpdist = [
      1,
      2,
      3,
      4,
      5,
      7,
      9,
      13,
      17,
      25,
      33,
      49,
      65,
      97,
      129,
      193,
      257,
      385,
      513,
      769,
      1025,
      1537,
      2049,
      3073,
      4097,
      6145,
      8193,
      12289,
      16385,
      24577
    ], cpdext = [
      0,
      0,
      0,
      0,
      1,
      1,
      2,
      2,
      3,
      3,
      4,
      4,
      5,
      5,
      6,
      6,
      7,
      7,
      8,
      8,
      9,
      9,
      10,
      10,
      11,
      11,
      12,
      12,
      13,
      13
    ], border = [
      16,
      17,
      18,
      0,
      8,
      7,
      9,
      6,
      10,
      5,
      11,
      4,
      12,
      3,
      13,
      2,
      14,
      1,
      15
    ];
    function HuftList() {
      this.next = null;
      this.list = null;
    }
    function HuftNode() {
      this.e = 0;
      this.b = 0;
      this.n = 0;
      this.t = null;
    }
    function HuftBuild(b, n, s, d, e, mm) {
      this.BMAX = 16;
      this.N_MAX = 288;
      this.status = 0;
      this.root = null;
      this.m = 0;
      var a;
      var c = [];
      var el;
      var f;
      var g;
      var h;
      var i;
      var j;
      var k;
      var lx = [];
      var p;
      var pidx;
      var q;
      var r = new HuftNode();
      var u = [];
      var v = [];
      var w;
      var x = [];
      var xp;
      var y;
      var z;
      var o;
      var tail;
      tail = this.root = null;
      for (i = 0; i < this.BMAX + 1; i++) {
        c[i] = 0;
      }
      for (i = 0; i < this.BMAX + 1; i++) {
        lx[i] = 0;
      }
      for (i = 0; i < this.BMAX; i++) {
        u[i] = null;
      }
      for (i = 0; i < this.N_MAX; i++) {
        v[i] = 0;
      }
      for (i = 0; i < this.BMAX + 1; i++) {
        x[i] = 0;
      }
      el = n > 256 ? b[256] : this.BMAX;
      p = b;
      pidx = 0;
      i = n;
      do {
        c[p[pidx]]++;
        pidx++;
      } while (--i > 0);
      if (c[0] === n) {
        this.root = null;
        this.m = 0;
        this.status = 0;
        return;
      }
      for (j = 1; j <= this.BMAX; j++) {
        if (c[j] !== 0) {
          break;
        }
      }
      k = j;
      if (mm < j) {
        mm = j;
      }
      for (i = this.BMAX; i !== 0; i--) {
        if (c[i] !== 0) {
          break;
        }
      }
      g = i;
      if (mm > i) {
        mm = i;
      }
      for (y = 1 << j; j < i; j++, y <<= 1) {
        if ((y -= c[j]) < 0) {
          this.status = 2;
          this.m = mm;
          return;
        }
      }
      if ((y -= c[i]) < 0) {
        this.status = 2;
        this.m = mm;
        return;
      }
      c[i] += y;
      x[1] = j = 0;
      p = c;
      pidx = 1;
      xp = 2;
      while (--i > 0) {
        x[xp++] = j += p[pidx++];
      }
      p = b;
      pidx = 0;
      i = 0;
      do {
        if ((j = p[pidx++]) !== 0) {
          v[x[j]++] = i;
        }
      } while (++i < n);
      n = x[g];
      x[0] = i = 0;
      p = v;
      pidx = 0;
      h = -1;
      w = lx[0] = 0;
      q = null;
      z = 0;
      for (null; k <= g; k++) {
        a = c[k];
        while (a-- > 0) {
          while (k > w + lx[1 + h]) {
            w += lx[1 + h];
            h++;
            z = (z = g - w) > mm ? mm : z;
            if ((f = 1 << (j = k - w)) > a + 1) {
              f -= a + 1;
              xp = k;
              while (++j < z) {
                if ((f <<= 1) <= c[++xp]) {
                  break;
                }
                f -= c[xp];
              }
            }
            if (w + j > el && w < el) {
              j = el - w;
            }
            z = 1 << j;
            lx[1 + h] = j;
            q = [];
            for (o = 0; o < z; o++) {
              q[o] = new HuftNode();
            }
            if (!tail) {
              tail = this.root = new HuftList();
            } else {
              tail = tail.next = new HuftList();
            }
            tail.next = null;
            tail.list = q;
            u[h] = q;
            if (h > 0) {
              x[h] = i;
              r.b = lx[h];
              r.e = 16 + j;
              r.t = q;
              j = (i & (1 << w) - 1) >> w - lx[h];
              u[h - 1][j].e = r.e;
              u[h - 1][j].b = r.b;
              u[h - 1][j].n = r.n;
              u[h - 1][j].t = r.t;
            }
          }
          r.b = k - w;
          if (pidx >= n) {
            r.e = 99;
          } else if (p[pidx] < s) {
            r.e = p[pidx] < 256 ? 16 : 15;
            r.n = p[pidx++];
          } else {
            r.e = e[p[pidx] - s];
            r.n = d[p[pidx++] - s];
          }
          f = 1 << k - w;
          for (j = i >> w; j < z; j += f) {
            q[j].e = r.e;
            q[j].b = r.b;
            q[j].n = r.n;
            q[j].t = r.t;
          }
          for (j = 1 << k - 1; (i & j) !== 0; j >>= 1) {
            i ^= j;
          }
          i ^= j;
          while ((i & (1 << w) - 1) !== x[h]) {
            w -= lx[h];
            h--;
          }
        }
      }
      this.m = lx[1];
      this.status = y !== 0 && g !== 1 ? 1 : 0;
    }
    function GET_BYTE() {
      if (inflate_data.length === inflate_pos) {
        return -1;
      }
      return inflate_data[inflate_pos++] & 255;
    }
    function NEEDBITS(n) {
      while (bit_len < n) {
        bit_buf |= GET_BYTE() << bit_len;
        bit_len += 8;
      }
    }
    function GETBITS(n) {
      return bit_buf & MASK_BITS[n];
    }
    function DUMPBITS(n) {
      bit_buf >>= n;
      bit_len -= n;
    }
    function inflate_codes(buff, off, size) {
      var e;
      var t;
      var n;
      if (size === 0) {
        return 0;
      }
      n = 0;
      for (; ; ) {
        NEEDBITS(bl);
        t = tl.list[GETBITS(bl)];
        e = t.e;
        while (e > 16) {
          if (e === 99) {
            return -1;
          }
          DUMPBITS(t.b);
          e -= 16;
          NEEDBITS(e);
          t = t.t[GETBITS(e)];
          e = t.e;
        }
        DUMPBITS(t.b);
        if (e === 16) {
          wp &= WSIZE - 1;
          buff[off + n++] = slide[wp++] = t.n;
          if (n === size) {
            return size;
          }
          continue;
        }
        if (e === 15) {
          break;
        }
        NEEDBITS(e);
        copy_leng = t.n + GETBITS(e);
        DUMPBITS(e);
        NEEDBITS(bd);
        t = td.list[GETBITS(bd)];
        e = t.e;
        while (e > 16) {
          if (e === 99) {
            return -1;
          }
          DUMPBITS(t.b);
          e -= 16;
          NEEDBITS(e);
          t = t.t[GETBITS(e)];
          e = t.e;
        }
        DUMPBITS(t.b);
        NEEDBITS(e);
        copy_dist = wp - t.n - GETBITS(e);
        DUMPBITS(e);
        while (copy_leng > 0 && n < size) {
          copy_leng--;
          copy_dist &= WSIZE - 1;
          wp &= WSIZE - 1;
          buff[off + n++] = slide[wp++] = slide[copy_dist++];
        }
        if (n === size) {
          return size;
        }
      }
      method = -1;
      return n;
    }
    function inflate_stored(buff, off, size) {
      var n;
      n = bit_len & 7;
      DUMPBITS(n);
      NEEDBITS(16);
      n = GETBITS(16);
      DUMPBITS(16);
      NEEDBITS(16);
      if (n !== (~bit_buf & 65535)) {
        return -1;
      }
      DUMPBITS(16);
      copy_leng = n;
      n = 0;
      while (copy_leng > 0 && n < size) {
        copy_leng--;
        wp &= WSIZE - 1;
        NEEDBITS(8);
        buff[off + n++] = slide[wp++] = GETBITS(8);
        DUMPBITS(8);
      }
      if (copy_leng === 0) {
        method = -1;
      }
      return n;
    }
    function inflate_fixed(buff, off, size) {
      if (!fixed_tl) {
        var i;
        var l = [];
        var h;
        for (i = 0; i < 144; i++) {
          l[i] = 8;
        }
        for (null; i < 256; i++) {
          l[i] = 9;
        }
        for (null; i < 280; i++) {
          l[i] = 7;
        }
        for (null; i < 288; i++) {
          l[i] = 8;
        }
        fixed_bl = 7;
        h = new HuftBuild(l, 288, 257, cplens, cplext, fixed_bl);
        if (h.status !== 0) {
          console.error("HufBuild error: " + h.status);
          return -1;
        }
        fixed_tl = h.root;
        fixed_bl = h.m;
        for (i = 0; i < 30; i++) {
          l[i] = 5;
        }
        fixed_bd = 5;
        h = new HuftBuild(l, 30, 0, cpdist, cpdext, fixed_bd);
        if (h.status > 1) {
          fixed_tl = null;
          console.error("HufBuild error: " + h.status);
          return -1;
        }
        fixed_td = h.root;
        fixed_bd = h.m;
      }
      tl = fixed_tl;
      td = fixed_td;
      bl = fixed_bl;
      bd = fixed_bd;
      return inflate_codes(buff, off, size);
    }
    function inflate_dynamic(buff, off, size) {
      var i;
      var j;
      var l;
      var n;
      var t;
      var nb;
      var nl;
      var nd;
      var ll = [];
      var h;
      for (i = 0; i < 286 + 30; i++) {
        ll[i] = 0;
      }
      NEEDBITS(5);
      nl = 257 + GETBITS(5);
      DUMPBITS(5);
      NEEDBITS(5);
      nd = 1 + GETBITS(5);
      DUMPBITS(5);
      NEEDBITS(4);
      nb = 4 + GETBITS(4);
      DUMPBITS(4);
      if (nl > 286 || nd > 30) {
        return -1;
      }
      for (j = 0; j < nb; j++) {
        NEEDBITS(3);
        ll[border[j]] = GETBITS(3);
        DUMPBITS(3);
      }
      for (null; j < 19; j++) {
        ll[border[j]] = 0;
      }
      bl = 7;
      h = new HuftBuild(ll, 19, 19, null, null, bl);
      if (h.status !== 0) {
        return -1;
      }
      tl = h.root;
      bl = h.m;
      n = nl + nd;
      i = l = 0;
      while (i < n) {
        NEEDBITS(bl);
        t = tl.list[GETBITS(bl)];
        j = t.b;
        DUMPBITS(j);
        j = t.n;
        if (j < 16) {
          ll[i++] = l = j;
        } else if (j === 16) {
          NEEDBITS(2);
          j = 3 + GETBITS(2);
          DUMPBITS(2);
          if (i + j > n) {
            return -1;
          }
          while (j-- > 0) {
            ll[i++] = l;
          }
        } else if (j === 17) {
          NEEDBITS(3);
          j = 3 + GETBITS(3);
          DUMPBITS(3);
          if (i + j > n) {
            return -1;
          }
          while (j-- > 0) {
            ll[i++] = 0;
          }
          l = 0;
        } else {
          NEEDBITS(7);
          j = 11 + GETBITS(7);
          DUMPBITS(7);
          if (i + j > n) {
            return -1;
          }
          while (j-- > 0) {
            ll[i++] = 0;
          }
          l = 0;
        }
      }
      bl = lbits;
      h = new HuftBuild(ll, nl, 257, cplens, cplext, bl);
      if (bl === 0) {
        h.status = 1;
      }
      if (h.status !== 0) {
        if (h.status !== 1) {
          return -1;
        }
      }
      tl = h.root;
      bl = h.m;
      for (i = 0; i < nd; i++) {
        ll[i] = ll[i + nl];
      }
      bd = dbits;
      h = new HuftBuild(ll, nd, 0, cpdist, cpdext, bd);
      td = h.root;
      bd = h.m;
      if (bd === 0 && nl > 257) {
        return -1;
      }
      if (h.status !== 0) {
        return -1;
      }
      return inflate_codes(buff, off, size);
    }
    function inflate_start() {
      if (!slide) {
        slide = [];
      }
      wp = 0;
      bit_buf = 0;
      bit_len = 0;
      method = -1;
      eof = false;
      copy_leng = copy_dist = 0;
      tl = null;
    }
    function inflate_internal(buff, off, size) {
      var n, i;
      n = 0;
      while (n < size) {
        if (eof && method === -1) {
          return n;
        }
        if (copy_leng > 0) {
          if (method !== STORED_BLOCK) {
            while (copy_leng > 0 && n < size) {
              copy_leng--;
              copy_dist &= WSIZE - 1;
              wp &= WSIZE - 1;
              buff[off + n++] = slide[wp++] = slide[copy_dist++];
            }
          } else {
            while (copy_leng > 0 && n < size) {
              copy_leng--;
              wp &= WSIZE - 1;
              NEEDBITS(8);
              buff[off + n++] = slide[wp++] = GETBITS(8);
              DUMPBITS(8);
            }
            if (copy_leng === 0) {
              method = -1;
            }
          }
          if (n === size) {
            return n;
          }
        }
        if (method === -1) {
          if (eof) {
            break;
          }
          NEEDBITS(1);
          if (GETBITS(1) !== 0) {
            eof = true;
          }
          DUMPBITS(1);
          NEEDBITS(2);
          method = GETBITS(2);
          DUMPBITS(2);
          tl = null;
          copy_leng = 0;
        }
        switch (method) {
          case STORED_BLOCK:
            i = inflate_stored(buff, off + n, size - n);
            break;
          case STATIC_TREES:
            if (tl) {
              i = inflate_codes(buff, off + n, size - n);
            } else {
              i = inflate_fixed(buff, off + n, size - n);
            }
            break;
          case DYN_TREES:
            if (tl) {
              i = inflate_codes(buff, off + n, size - n);
            } else {
              i = inflate_dynamic(buff, off + n, size - n);
            }
            break;
          default:
            i = -1;
            break;
        }
        if (i === -1) {
          if (eof) {
            return 0;
          }
          return -1;
        }
        n += i;
      }
      return n;
    }
    function inflate2(arr) {
      var buff = [], i;
      inflate_start();
      inflate_data = arr;
      inflate_pos = 0;
      do {
        i = inflate_internal(buff, buff.length, 1024);
      } while (i > 0);
      inflate_data = null;
      return buff;
    }
    module.exports = inflate2;
  })();
});
var rawdeflate = createCommonjsModule(function(module) {
  (function() {
    var WSIZE = 32768, STORED_BLOCK = 0, STATIC_TREES = 1, DYN_TREES = 2, DEFAULT_LEVEL = 6, OUTBUFSIZ = 1024 * 8, window_size = 2 * WSIZE, MIN_MATCH = 3, MAX_MATCH = 258, LIT_BUFSIZE = 8192, HASH_BITS = 15, DIST_BUFSIZE = LIT_BUFSIZE, HASH_SIZE = 1 << HASH_BITS, HASH_MASK = HASH_SIZE - 1, WMASK = WSIZE - 1, NIL = 0, TOO_FAR = 4096, MIN_LOOKAHEAD = MAX_MATCH + MIN_MATCH + 1, MAX_DIST = WSIZE - MIN_LOOKAHEAD, SMALLEST = 1, MAX_BITS = 15, MAX_BL_BITS = 7, LENGTH_CODES = 29, LITERALS = 256, END_BLOCK = 256, L_CODES = LITERALS + 1 + LENGTH_CODES, D_CODES = 30, BL_CODES = 19, REP_3_6 = 16, REPZ_3_10 = 17, REPZ_11_138 = 18, HEAP_SIZE = 2 * L_CODES + 1, H_SHIFT = parseInt((HASH_BITS + MIN_MATCH - 1) / MIN_MATCH, 10), free_queue, qhead, qtail, initflag, outbuf = null, outcnt, outoff, complete, window, d_buf, l_buf, prev, bi_buf, bi_valid, block_start, ins_h, hash_head, prev_match, match_available, match_length, prev_length, strstart, match_start, eofile, lookahead, max_chain_length, max_lazy_match, compr_level, good_match, nice_match, dyn_ltree, dyn_dtree, static_ltree, static_dtree, bl_tree, l_desc, d_desc, bl_desc, bl_count, heap, heap_len, heap_max, depth, length_code, dist_code, base_length, base_dist, flag_buf, last_lit, last_dist, last_flags, flags, flag_bit, opt_len, static_len, deflate_data, deflate_pos;
    function DeflateCT() {
      this.fc = 0;
      this.dl = 0;
    }
    function DeflateTreeDesc() {
      this.dyn_tree = null;
      this.static_tree = null;
      this.extra_bits = null;
      this.extra_base = 0;
      this.elems = 0;
      this.max_length = 0;
      this.max_code = 0;
    }
    function DeflateConfiguration(a, b, c, d) {
      this.good_length = a;
      this.max_lazy = b;
      this.nice_length = c;
      this.max_chain = d;
    }
    function DeflateBuffer() {
      this.next = null;
      this.len = 0;
      this.ptr = [];
      this.off = 0;
    }
    var extra_lbits = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
    var extra_dbits = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
    var extra_blbits = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7];
    var bl_order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
    var configuration_table = [
      new DeflateConfiguration(0, 0, 0, 0),
      new DeflateConfiguration(4, 4, 8, 4),
      new DeflateConfiguration(4, 5, 16, 8),
      new DeflateConfiguration(4, 6, 32, 32),
      new DeflateConfiguration(4, 4, 16, 16),
      new DeflateConfiguration(8, 16, 32, 32),
      new DeflateConfiguration(8, 16, 128, 128),
      new DeflateConfiguration(8, 32, 128, 256),
      new DeflateConfiguration(32, 128, 258, 1024),
      new DeflateConfiguration(32, 258, 258, 4096)
    ];
    function deflate_start(level) {
      var i;
      if (!level) {
        level = DEFAULT_LEVEL;
      } else if (level < 1) {
        level = 1;
      } else if (level > 9) {
        level = 9;
      }
      compr_level = level;
      initflag = false;
      eofile = false;
      if (outbuf !== null) {
        return;
      }
      free_queue = qhead = qtail = null;
      outbuf = [];
      window = [];
      d_buf = [];
      l_buf = [];
      prev = [];
      dyn_ltree = [];
      for (i = 0; i < HEAP_SIZE; i++) {
        dyn_ltree[i] = new DeflateCT();
      }
      dyn_dtree = [];
      for (i = 0; i < 2 * D_CODES + 1; i++) {
        dyn_dtree[i] = new DeflateCT();
      }
      static_ltree = [];
      for (i = 0; i < L_CODES + 2; i++) {
        static_ltree[i] = new DeflateCT();
      }
      static_dtree = [];
      for (i = 0; i < D_CODES; i++) {
        static_dtree[i] = new DeflateCT();
      }
      bl_tree = [];
      for (i = 0; i < 2 * BL_CODES + 1; i++) {
        bl_tree[i] = new DeflateCT();
      }
      l_desc = new DeflateTreeDesc();
      d_desc = new DeflateTreeDesc();
      bl_desc = new DeflateTreeDesc();
      bl_count = [];
      heap = [];
      depth = [];
      length_code = [];
      dist_code = [];
      base_length = [];
      base_dist = [];
      flag_buf = [];
    }
    function reuse_queue(p) {
      p.next = free_queue;
      free_queue = p;
    }
    function new_queue() {
      var p;
      if (free_queue !== null) {
        p = free_queue;
        free_queue = free_queue.next;
      } else {
        p = new DeflateBuffer();
      }
      p.next = null;
      p.len = p.off = 0;
      return p;
    }
    function head1(i) {
      return prev[WSIZE + i];
    }
    function head2(i, val) {
      return prev[WSIZE + i] = val;
    }
    function put_byte(c) {
      outbuf[outoff + outcnt++] = c;
      if (outoff + outcnt === OUTBUFSIZ) {
        qoutbuf();
      }
    }
    function put_short(w) {
      w &= 65535;
      if (outoff + outcnt < OUTBUFSIZ - 2) {
        outbuf[outoff + outcnt++] = w & 255;
        outbuf[outoff + outcnt++] = w >>> 8;
      } else {
        put_byte(w & 255);
        put_byte(w >>> 8);
      }
    }
    function INSERT_STRING() {
      ins_h = (ins_h << H_SHIFT ^ window[strstart + MIN_MATCH - 1] & 255) & HASH_MASK;
      hash_head = head1(ins_h);
      prev[strstart & WMASK] = hash_head;
      head2(ins_h, strstart);
    }
    function SEND_CODE(c, tree) {
      send_bits(tree[c].fc, tree[c].dl);
    }
    function D_CODE(dist) {
      return (dist < 256 ? dist_code[dist] : dist_code[256 + (dist >> 7)]) & 255;
    }
    function SMALLER(tree, n, m) {
      return tree[n].fc < tree[m].fc || tree[n].fc === tree[m].fc && depth[n] <= depth[m];
    }
    function read_buff(buff, offset, n) {
      var i;
      for (i = 0; i < n && deflate_pos < deflate_data.length; i++) {
        buff[offset + i] = deflate_data[deflate_pos++] & 255;
      }
      return i;
    }
    function lm_init() {
      var j;
      for (j = 0; j < HASH_SIZE; j++) {
        prev[WSIZE + j] = 0;
      }
      max_lazy_match = configuration_table[compr_level].max_lazy;
      good_match = configuration_table[compr_level].good_length;
      {
        nice_match = configuration_table[compr_level].nice_length;
      }
      max_chain_length = configuration_table[compr_level].max_chain;
      strstart = 0;
      block_start = 0;
      lookahead = read_buff(window, 0, 2 * WSIZE);
      if (lookahead <= 0) {
        eofile = true;
        lookahead = 0;
        return;
      }
      eofile = false;
      while (lookahead < MIN_LOOKAHEAD && !eofile) {
        fill_window();
      }
      ins_h = 0;
      for (j = 0; j < MIN_MATCH - 1; j++) {
        ins_h = (ins_h << H_SHIFT ^ window[j] & 255) & HASH_MASK;
      }
    }
    function longest_match(cur_match) {
      var chain_length = max_chain_length;
      var scanp = strstart;
      var matchp;
      var len;
      var best_len = prev_length;
      var limit = strstart > MAX_DIST ? strstart - MAX_DIST : NIL;
      var strendp = strstart + MAX_MATCH;
      var scan_end1 = window[scanp + best_len - 1];
      var scan_end = window[scanp + best_len];
      var i, broke;
      if (prev_length >= good_match) {
        chain_length >>= 2;
      }
      do {
        matchp = cur_match;
        if (window[matchp + best_len] !== scan_end || window[matchp + best_len - 1] !== scan_end1 || window[matchp] !== window[scanp] || window[++matchp] !== window[scanp + 1]) {
          continue;
        }
        scanp += 2;
        matchp++;
        while (scanp < strendp) {
          broke = false;
          for (i = 0; i < 8; i += 1) {
            scanp += 1;
            matchp += 1;
            if (window[scanp] !== window[matchp]) {
              broke = true;
              break;
            }
          }
          if (broke) {
            break;
          }
        }
        len = MAX_MATCH - (strendp - scanp);
        scanp = strendp - MAX_MATCH;
        if (len > best_len) {
          match_start = cur_match;
          best_len = len;
          {
            if (len >= nice_match) {
              break;
            }
          }
          scan_end1 = window[scanp + best_len - 1];
          scan_end = window[scanp + best_len];
        }
      } while ((cur_match = prev[cur_match & WMASK]) > limit && --chain_length !== 0);
      return best_len;
    }
    function fill_window() {
      var n, m;
      var more = window_size - lookahead - strstart;
      if (more === -1) {
        more--;
      } else if (strstart >= WSIZE + MAX_DIST) {
        for (n = 0; n < WSIZE; n++) {
          window[n] = window[n + WSIZE];
        }
        match_start -= WSIZE;
        strstart -= WSIZE;
        block_start -= WSIZE;
        for (n = 0; n < HASH_SIZE; n++) {
          m = head1(n);
          head2(n, m >= WSIZE ? m - WSIZE : NIL);
        }
        for (n = 0; n < WSIZE; n++) {
          m = prev[n];
          prev[n] = m >= WSIZE ? m - WSIZE : NIL;
        }
        more += WSIZE;
      }
      if (!eofile) {
        n = read_buff(window, strstart + lookahead, more);
        if (n <= 0) {
          eofile = true;
        } else {
          lookahead += n;
        }
      }
    }
    function deflate_fast() {
      while (lookahead !== 0 && qhead === null) {
        var flush;
        INSERT_STRING();
        if (hash_head !== NIL && strstart - hash_head <= MAX_DIST) {
          match_length = longest_match(hash_head);
          if (match_length > lookahead) {
            match_length = lookahead;
          }
        }
        if (match_length >= MIN_MATCH) {
          flush = ct_tally(strstart - match_start, match_length - MIN_MATCH);
          lookahead -= match_length;
          if (match_length <= max_lazy_match) {
            match_length--;
            do {
              strstart++;
              INSERT_STRING();
            } while (--match_length !== 0);
            strstart++;
          } else {
            strstart += match_length;
            match_length = 0;
            ins_h = window[strstart] & 255;
            ins_h = (ins_h << H_SHIFT ^ window[strstart + 1] & 255) & HASH_MASK;
          }
        } else {
          flush = ct_tally(0, window[strstart] & 255);
          lookahead--;
          strstart++;
        }
        if (flush) {
          flush_block(0);
          block_start = strstart;
        }
        while (lookahead < MIN_LOOKAHEAD && !eofile) {
          fill_window();
        }
      }
    }
    function deflate_better() {
      while (lookahead !== 0 && qhead === null) {
        INSERT_STRING();
        prev_length = match_length;
        prev_match = match_start;
        match_length = MIN_MATCH - 1;
        if (hash_head !== NIL && prev_length < max_lazy_match && strstart - hash_head <= MAX_DIST) {
          match_length = longest_match(hash_head);
          if (match_length > lookahead) {
            match_length = lookahead;
          }
          if (match_length === MIN_MATCH && strstart - match_start > TOO_FAR) {
            match_length--;
          }
        }
        if (prev_length >= MIN_MATCH && match_length <= prev_length) {
          var flush;
          flush = ct_tally(strstart - 1 - prev_match, prev_length - MIN_MATCH);
          lookahead -= prev_length - 1;
          prev_length -= 2;
          do {
            strstart++;
            INSERT_STRING();
          } while (--prev_length !== 0);
          match_available = false;
          match_length = MIN_MATCH - 1;
          strstart++;
          if (flush) {
            flush_block(0);
            block_start = strstart;
          }
        } else if (match_available) {
          if (ct_tally(0, window[strstart - 1] & 255)) {
            flush_block(0);
            block_start = strstart;
          }
          strstart++;
          lookahead--;
        } else {
          match_available = true;
          strstart++;
          lookahead--;
        }
        while (lookahead < MIN_LOOKAHEAD && !eofile) {
          fill_window();
        }
      }
    }
    function init_deflate() {
      if (eofile) {
        return;
      }
      bi_buf = 0;
      bi_valid = 0;
      ct_init();
      lm_init();
      qhead = null;
      outcnt = 0;
      outoff = 0;
      if (compr_level <= 3) {
        prev_length = MIN_MATCH - 1;
        match_length = 0;
      } else {
        match_length = MIN_MATCH - 1;
        match_available = false;
      }
      complete = false;
    }
    function deflate_internal(buff, off, buff_size) {
      var n;
      if (!initflag) {
        init_deflate();
        initflag = true;
        if (lookahead === 0) {
          complete = true;
          return 0;
        }
      }
      n = qcopy(buff, off, buff_size);
      if (n === buff_size) {
        return buff_size;
      }
      if (complete) {
        return n;
      }
      if (compr_level <= 3) {
        deflate_fast();
      } else {
        deflate_better();
      }
      if (lookahead === 0) {
        if (match_available) {
          ct_tally(0, window[strstart - 1] & 255);
        }
        flush_block(1);
        complete = true;
      }
      return n + qcopy(buff, n + off, buff_size - n);
    }
    function qcopy(buff, off, buff_size) {
      var n, i, j;
      n = 0;
      while (qhead !== null && n < buff_size) {
        i = buff_size - n;
        if (i > qhead.len) {
          i = qhead.len;
        }
        for (j = 0; j < i; j++) {
          buff[off + n + j] = qhead.ptr[qhead.off + j];
        }
        qhead.off += i;
        qhead.len -= i;
        n += i;
        if (qhead.len === 0) {
          var p;
          p = qhead;
          qhead = qhead.next;
          reuse_queue(p);
        }
      }
      if (n === buff_size) {
        return n;
      }
      if (outoff < outcnt) {
        i = buff_size - n;
        if (i > outcnt - outoff) {
          i = outcnt - outoff;
        }
        for (j = 0; j < i; j++) {
          buff[off + n + j] = outbuf[outoff + j];
        }
        outoff += i;
        n += i;
        if (outcnt === outoff) {
          outcnt = outoff = 0;
        }
      }
      return n;
    }
    function ct_init() {
      var n;
      var bits;
      var length;
      var code;
      var dist;
      if (static_dtree[0].dl !== 0) {
        return;
      }
      l_desc.dyn_tree = dyn_ltree;
      l_desc.static_tree = static_ltree;
      l_desc.extra_bits = extra_lbits;
      l_desc.extra_base = LITERALS + 1;
      l_desc.elems = L_CODES;
      l_desc.max_length = MAX_BITS;
      l_desc.max_code = 0;
      d_desc.dyn_tree = dyn_dtree;
      d_desc.static_tree = static_dtree;
      d_desc.extra_bits = extra_dbits;
      d_desc.extra_base = 0;
      d_desc.elems = D_CODES;
      d_desc.max_length = MAX_BITS;
      d_desc.max_code = 0;
      bl_desc.dyn_tree = bl_tree;
      bl_desc.static_tree = null;
      bl_desc.extra_bits = extra_blbits;
      bl_desc.extra_base = 0;
      bl_desc.elems = BL_CODES;
      bl_desc.max_length = MAX_BL_BITS;
      bl_desc.max_code = 0;
      length = 0;
      for (code = 0; code < LENGTH_CODES - 1; code++) {
        base_length[code] = length;
        for (n = 0; n < 1 << extra_lbits[code]; n++) {
          length_code[length++] = code;
        }
      }
      length_code[length - 1] = code;
      dist = 0;
      for (code = 0; code < 16; code++) {
        base_dist[code] = dist;
        for (n = 0; n < 1 << extra_dbits[code]; n++) {
          dist_code[dist++] = code;
        }
      }
      for (dist >>= 7; code < D_CODES; code++) {
        base_dist[code] = dist << 7;
        for (n = 0; n < 1 << extra_dbits[code] - 7; n++) {
          dist_code[256 + dist++] = code;
        }
      }
      for (bits = 0; bits <= MAX_BITS; bits++) {
        bl_count[bits] = 0;
      }
      n = 0;
      while (n <= 143) {
        static_ltree[n++].dl = 8;
        bl_count[8]++;
      }
      while (n <= 255) {
        static_ltree[n++].dl = 9;
        bl_count[9]++;
      }
      while (n <= 279) {
        static_ltree[n++].dl = 7;
        bl_count[7]++;
      }
      while (n <= 287) {
        static_ltree[n++].dl = 8;
        bl_count[8]++;
      }
      gen_codes(static_ltree, L_CODES + 1);
      for (n = 0; n < D_CODES; n++) {
        static_dtree[n].dl = 5;
        static_dtree[n].fc = bi_reverse(n, 5);
      }
      init_block();
    }
    function init_block() {
      var n;
      for (n = 0; n < L_CODES; n++) {
        dyn_ltree[n].fc = 0;
      }
      for (n = 0; n < D_CODES; n++) {
        dyn_dtree[n].fc = 0;
      }
      for (n = 0; n < BL_CODES; n++) {
        bl_tree[n].fc = 0;
      }
      dyn_ltree[END_BLOCK].fc = 1;
      opt_len = static_len = 0;
      last_lit = last_dist = last_flags = 0;
      flags = 0;
      flag_bit = 1;
    }
    function pqdownheap(tree, k) {
      var v = heap[k], j = k << 1;
      while (j <= heap_len) {
        if (j < heap_len && SMALLER(tree, heap[j + 1], heap[j])) {
          j++;
        }
        if (SMALLER(tree, v, heap[j])) {
          break;
        }
        heap[k] = heap[j];
        k = j;
        j <<= 1;
      }
      heap[k] = v;
    }
    function gen_bitlen(desc) {
      var tree = desc.dyn_tree;
      var extra = desc.extra_bits;
      var base = desc.extra_base;
      var max_code = desc.max_code;
      var max_length = desc.max_length;
      var stree = desc.static_tree;
      var h;
      var n, m;
      var bits;
      var xbits;
      var f;
      var overflow = 0;
      for (bits = 0; bits <= MAX_BITS; bits++) {
        bl_count[bits] = 0;
      }
      tree[heap[heap_max]].dl = 0;
      for (h = heap_max + 1; h < HEAP_SIZE; h++) {
        n = heap[h];
        bits = tree[tree[n].dl].dl + 1;
        if (bits > max_length) {
          bits = max_length;
          overflow++;
        }
        tree[n].dl = bits;
        if (n > max_code) {
          continue;
        }
        bl_count[bits]++;
        xbits = 0;
        if (n >= base) {
          xbits = extra[n - base];
        }
        f = tree[n].fc;
        opt_len += f * (bits + xbits);
        if (stree !== null) {
          static_len += f * (stree[n].dl + xbits);
        }
      }
      if (overflow === 0) {
        return;
      }
      do {
        bits = max_length - 1;
        while (bl_count[bits] === 0) {
          bits--;
        }
        bl_count[bits]--;
        bl_count[bits + 1] += 2;
        bl_count[max_length]--;
        overflow -= 2;
      } while (overflow > 0);
      for (bits = max_length; bits !== 0; bits--) {
        n = bl_count[bits];
        while (n !== 0) {
          m = heap[--h];
          if (m > max_code) {
            continue;
          }
          if (tree[m].dl !== bits) {
            opt_len += (bits - tree[m].dl) * tree[m].fc;
            tree[m].fc = bits;
          }
          n--;
        }
      }
    }
    function gen_codes(tree, max_code) {
      var next_code = [];
      var code = 0;
      var bits;
      var n;
      for (bits = 1; bits <= MAX_BITS; bits++) {
        code = code + bl_count[bits - 1] << 1;
        next_code[bits] = code;
      }
      for (n = 0; n <= max_code; n++) {
        var len = tree[n].dl;
        if (len === 0) {
          continue;
        }
        tree[n].fc = bi_reverse(next_code[len]++, len);
      }
    }
    function build_tree(desc) {
      var tree = desc.dyn_tree;
      var stree = desc.static_tree;
      var elems = desc.elems;
      var n, m;
      var max_code = -1;
      var node = elems;
      heap_len = 0;
      heap_max = HEAP_SIZE;
      for (n = 0; n < elems; n++) {
        if (tree[n].fc !== 0) {
          heap[++heap_len] = max_code = n;
          depth[n] = 0;
        } else {
          tree[n].dl = 0;
        }
      }
      while (heap_len < 2) {
        var xnew = heap[++heap_len] = max_code < 2 ? ++max_code : 0;
        tree[xnew].fc = 1;
        depth[xnew] = 0;
        opt_len--;
        if (stree !== null) {
          static_len -= stree[xnew].dl;
        }
      }
      desc.max_code = max_code;
      for (n = heap_len >> 1; n >= 1; n--) {
        pqdownheap(tree, n);
      }
      do {
        n = heap[SMALLEST];
        heap[SMALLEST] = heap[heap_len--];
        pqdownheap(tree, SMALLEST);
        m = heap[SMALLEST];
        heap[--heap_max] = n;
        heap[--heap_max] = m;
        tree[node].fc = tree[n].fc + tree[m].fc;
        if (depth[n] > depth[m] + 1) {
          depth[node] = depth[n];
        } else {
          depth[node] = depth[m] + 1;
        }
        tree[n].dl = tree[m].dl = node;
        heap[SMALLEST] = node++;
        pqdownheap(tree, SMALLEST);
      } while (heap_len >= 2);
      heap[--heap_max] = heap[SMALLEST];
      gen_bitlen(desc);
      gen_codes(tree, max_code);
    }
    function scan_tree(tree, max_code) {
      var n, prevlen = -1, curlen, nextlen = tree[0].dl, count = 0, max_count = 7, min_count = 4;
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      }
      tree[max_code + 1].dl = 65535;
      for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[n + 1].dl;
        if (++count < max_count && curlen === nextlen) {
          continue;
        } else if (count < min_count) {
          bl_tree[curlen].fc += count;
        } else if (curlen !== 0) {
          if (curlen !== prevlen) {
            bl_tree[curlen].fc++;
          }
          bl_tree[REP_3_6].fc++;
        } else if (count <= 10) {
          bl_tree[REPZ_3_10].fc++;
        } else {
          bl_tree[REPZ_11_138].fc++;
        }
        count = 0;
        prevlen = curlen;
        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;
        } else if (curlen === nextlen) {
          max_count = 6;
          min_count = 3;
        } else {
          max_count = 7;
          min_count = 4;
        }
      }
    }
    function send_tree(tree, max_code) {
      var n;
      var prevlen = -1;
      var curlen;
      var nextlen = tree[0].dl;
      var count = 0;
      var max_count = 7;
      var min_count = 4;
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      }
      for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[n + 1].dl;
        if (++count < max_count && curlen === nextlen) {
          continue;
        } else if (count < min_count) {
          do {
            SEND_CODE(curlen, bl_tree);
          } while (--count !== 0);
        } else if (curlen !== 0) {
          if (curlen !== prevlen) {
            SEND_CODE(curlen, bl_tree);
            count--;
          }
          SEND_CODE(REP_3_6, bl_tree);
          send_bits(count - 3, 2);
        } else if (count <= 10) {
          SEND_CODE(REPZ_3_10, bl_tree);
          send_bits(count - 3, 3);
        } else {
          SEND_CODE(REPZ_11_138, bl_tree);
          send_bits(count - 11, 7);
        }
        count = 0;
        prevlen = curlen;
        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;
        } else if (curlen === nextlen) {
          max_count = 6;
          min_count = 3;
        } else {
          max_count = 7;
          min_count = 4;
        }
      }
    }
    function build_bl_tree() {
      var max_blindex;
      scan_tree(dyn_ltree, l_desc.max_code);
      scan_tree(dyn_dtree, d_desc.max_code);
      build_tree(bl_desc);
      for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) {
        if (bl_tree[bl_order[max_blindex]].dl !== 0) {
          break;
        }
      }
      opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
      return max_blindex;
    }
    function send_all_trees(lcodes, dcodes, blcodes) {
      var rank;
      send_bits(lcodes - 257, 5);
      send_bits(dcodes - 1, 5);
      send_bits(blcodes - 4, 4);
      for (rank = 0; rank < blcodes; rank++) {
        send_bits(bl_tree[bl_order[rank]].dl, 3);
      }
      send_tree(dyn_ltree, lcodes - 1);
      send_tree(dyn_dtree, dcodes - 1);
    }
    function flush_block(eof) {
      var opt_lenb, static_lenb, max_blindex, stored_len, i;
      stored_len = strstart - block_start;
      flag_buf[last_flags] = flags;
      build_tree(l_desc);
      build_tree(d_desc);
      max_blindex = build_bl_tree();
      opt_lenb = opt_len + 3 + 7 >> 3;
      static_lenb = static_len + 3 + 7 >> 3;
      if (static_lenb <= opt_lenb) {
        opt_lenb = static_lenb;
      }
      if (stored_len + 4 <= opt_lenb && block_start >= 0) {
        send_bits((STORED_BLOCK << 1) + eof, 3);
        bi_windup();
        put_short(stored_len);
        put_short(~stored_len);
        for (i = 0; i < stored_len; i++) {
          put_byte(window[block_start + i]);
        }
      } else if (static_lenb === opt_lenb) {
        send_bits((STATIC_TREES << 1) + eof, 3);
        compress_block(static_ltree, static_dtree);
      } else {
        send_bits((DYN_TREES << 1) + eof, 3);
        send_all_trees(l_desc.max_code + 1, d_desc.max_code + 1, max_blindex + 1);
        compress_block(dyn_ltree, dyn_dtree);
      }
      init_block();
      if (eof !== 0) {
        bi_windup();
      }
    }
    function ct_tally(dist, lc) {
      l_buf[last_lit++] = lc;
      if (dist === 0) {
        dyn_ltree[lc].fc++;
      } else {
        dist--;
        dyn_ltree[length_code[lc] + LITERALS + 1].fc++;
        dyn_dtree[D_CODE(dist)].fc++;
        d_buf[last_dist++] = dist;
        flags |= flag_bit;
      }
      flag_bit <<= 1;
      if ((last_lit & 7) === 0) {
        flag_buf[last_flags++] = flags;
        flags = 0;
        flag_bit = 1;
      }
      if (compr_level > 2 && (last_lit & 4095) === 0) {
        var out_length = last_lit * 8;
        var in_length = strstart - block_start;
        var dcode;
        for (dcode = 0; dcode < D_CODES; dcode++) {
          out_length += dyn_dtree[dcode].fc * (5 + extra_dbits[dcode]);
        }
        out_length >>= 3;
        if (last_dist < parseInt(last_lit / 2, 10) && out_length < parseInt(in_length / 2, 10)) {
          return true;
        }
      }
      return last_lit === LIT_BUFSIZE - 1 || last_dist === DIST_BUFSIZE;
    }
    function compress_block(ltree, dtree) {
      var dist;
      var lc;
      var lx = 0;
      var dx = 0;
      var fx = 0;
      var flag = 0;
      var code;
      var extra;
      if (last_lit !== 0) {
        do {
          if ((lx & 7) === 0) {
            flag = flag_buf[fx++];
          }
          lc = l_buf[lx++] & 255;
          if ((flag & 1) === 0) {
            SEND_CODE(lc, ltree);
          } else {
            code = length_code[lc];
            SEND_CODE(code + LITERALS + 1, ltree);
            extra = extra_lbits[code];
            if (extra !== 0) {
              lc -= base_length[code];
              send_bits(lc, extra);
            }
            dist = d_buf[dx++];
            code = D_CODE(dist);
            SEND_CODE(code, dtree);
            extra = extra_dbits[code];
            if (extra !== 0) {
              dist -= base_dist[code];
              send_bits(dist, extra);
            }
          }
          flag >>= 1;
        } while (lx < last_lit);
      }
      SEND_CODE(END_BLOCK, ltree);
    }
    var Buf_size = 16;
    function send_bits(value, length) {
      if (bi_valid > Buf_size - length) {
        bi_buf |= value << bi_valid;
        put_short(bi_buf);
        bi_buf = value >> Buf_size - bi_valid;
        bi_valid += length - Buf_size;
      } else {
        bi_buf |= value << bi_valid;
        bi_valid += length;
      }
    }
    function bi_reverse(code, len) {
      var res = 0;
      do {
        res |= code & 1;
        code >>= 1;
        res <<= 1;
      } while (--len > 0);
      return res >> 1;
    }
    function bi_windup() {
      if (bi_valid > 8) {
        put_short(bi_buf);
      } else if (bi_valid > 0) {
        put_byte(bi_buf);
      }
      bi_buf = 0;
      bi_valid = 0;
    }
    function qoutbuf() {
      var q, i;
      if (outcnt !== 0) {
        q = new_queue();
        if (qhead === null) {
          qhead = qtail = q;
        } else {
          qtail = qtail.next = q;
        }
        q.len = outcnt - outoff;
        for (i = 0; i < q.len; i++) {
          q.ptr[i] = outbuf[outoff + i];
        }
        outcnt = outoff = 0;
      }
    }
    function deflate(arr, level) {
      var i, buff;
      deflate_data = arr;
      deflate_pos = 0;
      if (typeof level === "undefined") {
        level = DEFAULT_LEVEL;
      }
      deflate_start(level);
      buff = [];
      do {
        i = deflate_internal(buff, buff.length, 1024);
      } while (i > 0);
      deflate_data = null;
      return buff;
    }
    module.exports = deflate;
    module.exports.DEFAULT_LEVEL = DEFAULT_LEVEL;
  })();
});
var deflateJs = createCommonjsModule(function(module) {
  (function() {
    module.exports = {
      inflate: rawinflate,
      deflate: rawdeflate
    };
  })();
});
export default deflateJs;
var inflate = deflateJs.inflate;
export {deflateJs as __moduleExports, inflate};
