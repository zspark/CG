/**
 * copied from the following:
 *
 * hdrpng.js - support for Radiance .HDR and RGBE / RGB9_E5 images in PNG.
 * @author Enki
 * @github: https://enkimute.github.io/hdrpng.js/
 * @desc load/save Radiance .HDR, RGBE in PNG and RGB9_E5 in PNG for HTML5, webGL, webGL2.
 */

/** Load and parse a Radiance .HDR file. It completes with a 32bit RGBE buffer.
  * @param {URL} url location of .HDR file to load.
  * @param {function} completion completion callback.
  * @returns {XMLHttpRequest} the XMLHttpRequest used to download the file.
  */
export default function loadHDR(url: string, completion: (img: Uint8Array, w: number, h: number) => void, fail: () => void): void {
    var req = new XMLHttpRequest();
    req.responseType = "arraybuffer";
    req.onerror = fail;
    req.onload = function () {
        if (this.status >= 400) return;
        var header = '', pos = 0, d8 = new Uint8Array(this.response), format;
        // read header.  
        while (!header.match(/\n\n[^\n]+\n/g)) header += String.fromCharCode(d8[pos++]);
        // check format. 
        format = header.match(/FORMAT=(.*)$/m)[1];
        if (format != '32-bit_rle_rgbe') return console.warn('unknown format : ' + format);
        // parse resolution
        let rez: string[] = header.split(/\n/).reverse()[1].split(' ');
        let width = Number(rez[3]) * 1;
        let height = Number(rez[1]) * 1;
        // Create image.
        var img = new Uint8Array(width * height * 4), ipos = 0;
        // Read all scanlines
        for (var j = 0; j < height; j++) {
            var rgbe = d8.slice(pos, pos += 4), scanline = [];
            if (rgbe[0] != 2 || (rgbe[1] != 2) || (rgbe[2] & 0x80)) {
                var len = width, rs = 0; pos -= 4; while (len > 0) {
                    img.set(d8.slice(pos, pos += 4), ipos);
                    if (img[ipos] == 1 && img[ipos + 1] == 1 && img[ipos + 2] == 1) {
                        for (img[ipos + 3] << rs; i > 0; i--) {
                            img.set(img.slice(ipos - 4, ipos), ipos);
                            ipos += 4;
                            len--
                        }
                        rs += 8;
                    } else { len--; ipos += 4; rs = 0; }
                }
            } else {
                if ((rgbe[2] << 8) + rgbe[3] != width) return console.warn('HDR line mismatch ..');
                for (var i = 0; i < 4; i++) {
                    var ptr = i * width, ptr_end = (i + 1) * width, buf, count;
                    while (ptr < ptr_end) {
                        buf = d8.slice(pos, pos += 2);
                        if (buf[0] > 128) { count = buf[0] - 128; while (count-- > 0) scanline[ptr++] = buf[1]; }
                        else { count = buf[0] - 1; scanline[ptr++] = buf[1]; while (count-- > 0) scanline[ptr++] = d8[pos++]; }
                    }
                }
                for (var i = 0; i < width; i++) { img[ipos++] = scanline[i]; img[ipos++] = scanline[i + width]; img[ipos++] = scanline[i + 2 * width]; img[ipos++] = scanline[i + 3 * width]; }
            }
        }
        completion && completion(img, width, height);
    }
    req.open("GET", url, true);
    req.send(null);
}
