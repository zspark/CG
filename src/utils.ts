
function deg2Rad(deg: number): number {
    return deg * Math.PI / 180;
};

function rad2Deg(rad: number): number {
    return rad * 180 / Math.PI;
};

function numberSame(a: number, b: number, epsilon: number = 0.00001): boolean {
    return Math.abs(a - b) < epsilon;
};

let _uuid = 1;
function uuid(): number {
    return ++_uuid;
};

function displayTexture(gl: WebGL2RenderingContext, texture: WebGLTexture, width: number, height: number, depthValue: boolean = false): void {
    // Create a framebuffer and attach the texture
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    // Read the pixel data from the framebuffer
    const pixels = new Uint8Array(width * height * 4); // RGBA
    if (depthValue) {
        const data = new Float32Array(width * height); // grayscale
        gl.readPixels(0, 0, width, height, gl.R16F, gl.FLOAT, data);
        for (let y = 0; y < height; ++y) {
            for (let x = 0; x < width; ++x) {
                let _index = y * width + x;
                pixels[_index * 4 + 0] = data[_index] * 255;
                pixels[_index * 4 + 1] = data[_index] * 255;
                pixels[_index * 4 + 2] = data[_index] * 255;
                pixels[_index * 4 + 3] = 255;
            }
        }
    } else {
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    }

    // Unbind the framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Convert raw pixel data to an image using Canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Create an ImageData object and put pixels
    const imageData = new ImageData(new Uint8ClampedArray(pixels), width, height);
    ctx.putImageData(imageData, 0, 0);

    // Convert canvas to data URL
    const img = new Image();
    img.src = canvas.toDataURL(); // Convert to PNG base64
    document.body.appendChild(img); // Append to DOM

    console.log("Texture displayed in DOM as an image.");
}

//@ts-ignore
window.displayTexture = displayTexture;

export default { uuid, deg2Rad, rad2Deg, numberSame, displayTexture };
