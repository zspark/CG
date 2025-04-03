export type createContext_fn_t = (canvas: HTMLCanvasElement) => WebGL2RenderingContext;

export type BufferData_t = AllowSharedBufferSource & {
    length: number;
    set: (data: any, offset: number) => void;
};

export type AttributeLayout_t = {
    shaderLocation: ShaderLocation_e,
    //format: VertexFormat_e;
    size: number,
    type: number,
    normalized: boolean,
    offset: number,
};

/*
enum VertexFormat_e {
    //https://gpuweb.github.io/gpuweb/#enumdef-gpuvertexformat
    float32x4 = "float32x4",
    float32x3 = "float32x3",
    float32x2 = "float32x2",
};

enum IndexFormat_e {
    uint16 = "uint16",
    uint32 = "uint32",
};
*/

export enum StepMode_e {
    vertex = "vertex",
    instance = "instance",
};

export enum ShaderLocation_e {
    ATTRIB_POSITION = 0,
    ATTRIB_NORMAL = 1,
    ATTRIB_TANGENT = 2,
    ATTRIB_COLOR = 3,
    ATTRIB_TEXTURE_UV_0 = 5,
    ATTRIB_TEXTURE_UV_1 = 6,
    ATTRIB_TEXTURE_UV_2 = 7,
    ATTRIB_TEXTURE_UV_3 = 8,
    ATTRIB_TEXTURE_UV_4 = 9,
    ATTRIB_INSTANCED_MATRIX_COL_1 = 12,
    ATTRIB_INSTANCED_MATRIX_COL_2 = 13,
    ATTRIB_INSTANCED_MATRIX_COL_3 = 14,
    ATTRIB_INSTANCED_MATRIX_COL_4 = 15,
};

export enum PBRTextureIndex_e {
    NORMAL = 0,
    OCCLUSION = 1,
    EMISSIVE = 2,
    BASECOLOR = 3,
    METALLICROUGHNESS = 4,
}

export type VertexAttribute_t = {
    buffer: IBuffer;
    shaderLocation: ShaderLocation_e;
    size: GLenum;
    type: GLenum;
    offset: GLintptr;
    normalized?: boolean;// false;
    stride?: number;//0
    stepMode?: StepMode_e; //StepMode_e.vertex
}

export interface IBuffer {
    get length(): number;
    get byteLength(): number;

    updateData(data: BufferData_t, usage?: GLenum): IBuffer;
    createGPUResource(gl: WebGL2RenderingContext): IBuffer;
    bind(): void;
    destroyGPUResource(): void;
}

export type UniformUpdaterFn_t = (program: IProgram) => void;

export interface IProgram extends IBindableObject {
    link(vertexShader: WebGLShader, fragmentShader: WebGLShader): IProgram;
    uploadUniform(name: string, value: any): IProgram;
    setUBO(ubo: IUniformBlock): IProgram;
    destroy(): void;
}

export type TextureData_t = Uint8Array | Uint16Array | Float32Array | HTMLImageElement;

export interface ITexture {
    target: GLenum;
    UVIndex: number;
    readonly isHDRData: boolean;
    readonly textureUnit: GLint;
    readonly width: number;
    readonly height: number;
    set genMipmap(value: boolean);
    set data(data: TextureData_t | TextureData_t[]);

    saveTexture(): void;
    resize(width: number, height: number): ITexture;
    createGPUResource(gl: WebGL2RenderingContext): ITexture;

    /**
     * data[0-5]: x+,x-,y+, y-, z+,z-
     */
    updateData(data: TextureData_t | TextureData_t[], xoffset?: number, yoffset?: number, width?: number, height?: number): ITexture;
    setParameter(name: number, value: number): ITexture;
    bind(textureUnit: number): ITexture;
    destroyGLTexture(): ITexture;
}

export interface IFramebuffer extends IBindableObject {
    resize(width: number, height: number): void;
    readPixels(): Uint8Array;
    createGPUResource(gl: WebGL2RenderingContext): void;
    attachColorTexture(texture: ITexture, attachment: number, target?: GLenum): void;
    attachDepthTexture(texture: ITexture, target?: number): void;
    validate(): void;
    clear(): void;
    destroy(): void;
}

export type SubPipelineOption_t = {
    repeat?: boolean;
    renderOnce?: boolean;
};

export interface IPipeline {
    FBO: IFramebuffer;
    get priority(): number;
    get program(): IProgram;

    addTexture(texture: ITexture): IPipeline;
    setFBO(fbo: IFramebuffer): IPipeline;
    setProgram(program: IProgram): IPipeline;
    createGPUResource(gl: WebGL2RenderingContext): IPipeline;
    appendSubPipeline(subp: ISubPipeline, option?: SubPipelineOption_t): IPipeline;
    removeSubPipeline(subp: ISubPipeline): IPipeline;
    removeSubPipelines(): IPipeline;
    depthTest(enable: boolean, func?: GLenum): IPipeline;
    blend(enable: boolean, funcSF?: GLenum, funcDF?: GLenum, equation?: GLenum): IPipeline;
    cullFace(enable: boolean, culledFace?: GLenum): IPipeline;
    drawBuffers(...buffers: GLenum[]): IPipeline;
    validate(): IPipeline;
    execute(context: IRenderContext): IPipeline;
}

export interface IGeometry extends IBindableObject {
    readonly drawCMD: () => void;

    /**
    * create gl buffers and record to VAO.
    */
    createGPUResource(gl: WebGL2RenderingContext): IGeometry;
    destroyGLObjects(gl: WebGL2RenderingContext): IGeometry;

    bindDrawCMD(): IGeometry;
    setDrawArraysParameters(mode: GLenum, first: GLint, count: GLsizei): IGeometry;
    setDrawArraysInstancedParameters(mode: GLenum, first: GLint, count: GLsizei, instanceCount: GLsizei): IGeometry;
    setDrawElementsParameters(mode: GLenum, count: GLsizei, type: GLenum, offset: GLintptr): IGeometry
    addAttribute(attribute: VertexAttribute_t): IGeometry;
    setIndexBuffer(buffer: IBuffer): IGeometry;
}

export interface IPrimitive {
    readonly name: string;
    readonly uuid: number;
    readonly material: IMaterial;
    geometry: IGeometry;
    createGPUResource(gl: WebGL2RenderingContext): IPrimitive;
}

export interface api_IMaterial {
    pbrMR_roughnessFactor: number;
    pbrMR_metallicFactor: number;
    normalTextureScale: number;
    occlusionTextureStrength: number;
    pbrMR_baseColorFactor: number[];
    emissiveFactor: number[];

    setPbrMR_baseColorFactor(r: number, g: number, b: number, a: number): void;
    setEmissiveFactor(r: number, g: number, b: number): void;
};

export interface IMaterial extends api_IMaterial, IBindableObject {
    update(dt: number): void;
    readonly API: api_IMaterial;
    name: string;
    pbrMR_baseColorTexture: ITexture;
    pbrMR_metallicRoughnessTexture: ITexture;
    normalTexture: ITexture;
    occlusionTexture: ITexture;
    emissiveTexture: ITexture;
}

export interface IRenderObject extends IBindableObject {
    readonly drawCMD: () => void;
    createGPUResource(gl: WebGL2RenderingContext): void;
}

export interface ISubPipeline {
    createGPUResource(gl: WebGL2RenderingContext): ISubPipeline;
    setUniformUpdaterFn(updater: UniformUpdaterFn_t): ISubPipeline;
    setRenderObject(target: IRenderObject): ISubPipeline;
    setTextures(...tex: Array<ITexture>): ISubPipeline;
    setTexture(texture: ITexture): ISubPipeline;
    addTexture(texture: ITexture): ISubPipeline;
    setMaterial(mterial: IMaterial): ISubPipeline;
    clearTextures(): ISubPipeline;
    validate(): ISubPipeline;
    update(program: IProgram): ISubPipeline;
    bind(context: IRenderContext): void;
    draw(): void;
    clone(): ISubPipeline;
}

export type PipelineOption_t = SubPipelineOption_t;

export interface IBindableObject {
    readonly criticalKey: object;
    bind(): void;
};

export interface IRenderer {
    readonly gl: WebGL2RenderingContext;
    registerUBO(ubo: IUniformBlock): IRenderer;
    render(): IRenderer;
    addPipeline(p: IPipeline, option?: PipelineOption_t): IRenderer;
    addTransparentPipeline(p: IPipeline): IRenderer;
    removePipeline(p: IPipeline): IRenderer;
}

export interface IRenderContext {
    readonly gl: WebGL2RenderingContext;
    bind(obj: IBindableObject): void;
    setDepthTest(enable: boolean, func: GLenum): void;
    setBlend(enable: boolean, funcSF: GLenum, funcDF: GLenum, equation: GLenum): void;
    setCullFace(enable: boolean, faceToCull: GLenum): void;
}

export interface IUniformBlock {
    get bindingPoint(): number;
    createGPUResource(gl: WebGL2RenderingContext): IUniformBlock;
    uploadData(data: BufferData_t): IUniformBlock;
}
