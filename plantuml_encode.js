/**
 *
 * @param {Buffer} c
 */
function encode64(c) {
  var str = "";
  var len = c.length;
  for (var i = 0; i < len; i += 3) {
    if (i + 2 == len) {
      str += append3bytes(c[i], c[i + 1], 0);
    } else if (i + 1 == len) {
      str += append3bytes(c[i], 0, 0);
    } else {
      str += append3bytes(c[i], c[i + 1], c[i + 2]);
    }
  }
  return str;
}

function append3bytes(b1, b2, b3) {
  var c1 = b1 >> 2;
  var c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  var c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
  var c4 = b3 & 0x3f;
  var r = "";
  r += encode6bit(c1 & 0x3f);
  r += encode6bit(c2 & 0x3f);
  r += encode6bit(c3 & 0x3f);
  r += encode6bit(c4 & 0x3f);
  return r;
}

function encode6bit(b) {
  if (b < 10) {
    return String.fromCharCode(48 + b);
  }
  b -= 10;
  if (b < 26) {
    return String.fromCharCode(65 + b);
  }
  b -= 26;
  if (b < 26) {
    return String.fromCharCode(97 + b);
  }
  b -= 26;
  if (b == 0) {
    return "-";
  }
  if (b == 1) {
    return "_";
  }
  return "?";
}

module.exports = {
  encode64: encode64
};
