
export function float32ArrayToRGB9E5(float32Array: Float32Array): Uint32Array {
    let rgb9e5Array = new Uint32Array(float32Array.length / 4);

    for (let i = 0, j = 0; i < float32Array.length; i += 4, j++) {
        let r = float32Array[i];
        let g = float32Array[i + 1];
        let b = float32Array[i + 2];

        rgb9e5Array[j] = float32ToRGB9E5(r, g, b);
    }
    return rgb9e5Array;
}

export function rgbeArrayToRGB9E5(rgbeArray: Uint8ClampedArray | Uint8Array): Uint32Array {
    let rgb9e5Array = new Uint32Array(rgbeArray.length / 4); // 1 pixel = 1 uint32

    for (let i = 0, j = 0; i < rgbeArray.length; i += 4, j++) {
        let r = rgbeArray[i];
        let g = rgbeArray[i + 1];
        let b = rgbeArray[i + 2];
        let e = rgbeArray[i + 3] - 128;

        // Convert to float RGB
        let scale = Math.pow(2, e) / 255.0;
        r *= scale;
        g *= scale;
        b *= scale;

        rgb9e5Array[j] = float32ToRGB9E5(r, g, b);
    }
    return rgb9e5Array;
}

export function float32ToRGB9E5(r: number, g: number, b: number): number {
    let maxRGB = Math.max(r, g, b);
    if (maxRGB < 1e-6) {
        return 0; // Black pixels
    } else {
        let exponent = Math.max(-15, Math.ceil(Math.log2(maxRGB)));
        let scaleFactor = Math.pow(2, -exponent) * 511;

        let r9 = Math.round(r * scaleFactor) & 0x1FF;
        let g9 = Math.round(g * scaleFactor) & 0x1FF;
        let b9 = Math.round(b * scaleFactor) & 0x1FF;
        let e5 = (exponent + 15) & 0x1F;

        return (e5 << 27) | (b9 << 18) | (g9 << 9) | r9;
    }
}

