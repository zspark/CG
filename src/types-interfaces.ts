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
export type BufferLayout_t = {
    attributes: AttributeLayout_t[],
    stride: GLsizei,
    stepMode: StepMode_e,
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

export interface IBuffer {
    get length(): number;
    get byteLength(): number;

    setData(data: BufferData_t, usage?: GLenum): IBuffer;
    updateData(data: BufferData_t): IBuffer;
    createGPUResource(gl: WebGL2RenderingContext): IBuffer;
    setAttribute(shaderLocation: ShaderLocation_e, size: number, type: number, normalized: boolean, offset: GLintptr): IBuffer;
    setStrideAndStepMode(stride: number, stepMode?: StepMode_e): IBuffer;
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

export interface ITexture {
    get textureUnit(): GLint;
    set data(data: ArrayBuffer | HTMLImageElement);
    UVIndex: number;

    createGPUResource(gl: WebGL2RenderingContext): ITexture;
    updateData(data: any, xoffset?: number, yoffset?: number, width?: number, height?: number): ITexture;
    setParameter(name: number, value: number): ITexture;
    bind(textureUnit: number): ITexture;
    destroyGLTexture(): ITexture;
}

export interface ISkyboxTexture {

    set data(data: ArrayBuffer[]);
    get textureUnit(): GLint;

    createGPUResource(gl: WebGL2RenderingContext): ISkyboxTexture;
    /**
     * data[0-5]: x+,x-,y+, y-, z+,z-
     */
    updateData(data: any[], xoffset?: number, yoffset?: number, width?: number, height?: number): ISkyboxTexture;
    setParameter(name: number, value: number): ISkyboxTexture;
    bind(textureUnit: number): ISkyboxTexture;
    destroyGLTexture(): ISkyboxTexture;
}

export interface IFramebuffer extends IBindableObject {
    createGPUResource(gl: WebGL2RenderingContext): void;
    attachColorTexture(texture: ITexture, attachment: number, target?: GLenum): void;
    attachDepthTexture(texture: ITexture, target?: number): void;
    validate(): void;
    clear(): void;
    destroy(): void;
}

export type SubPipelineOption_t = {
    renderOnce?: boolean;
};

export interface IPipeline {
    FBO: IFramebuffer;
    get priority(): number;
    get program(): IProgram;

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
    readonly vertexBufferLength: number;
    readonly indexBufferLength: number;
    readonly drawCMD: () => void;

    /**
    * create gl buffers and record to VAO.
    */
    createGPUResource(gl: WebGL2RenderingContext, createBufferGPUResourceAsWell?: boolean): IGeometry;
    destroyGLObjects(gl: WebGL2RenderingContext): IGeometry;

    bindDrawCMD(): IGeometry;
    setDrawArraysParameters(mode: GLenum, first: GLint, count: GLsizei): IGeometry;
    setDrawArraysInstancedParameters(mode: GLenum, first: GLint, count: GLsizei, instanceCount: GLsizei): IGeometry;
    setDrawElementsParameters(mode: GLenum, count: GLsizei, type: GLenum, offset: GLintptr): IGeometry
    addVertexBuffer(buffer: IBuffer): IGeometry;
    setIndexBuffer(buffer: IBuffer): IGeometry;
}

export interface ISubPipeline {
    get geometry(): IGeometry;

    createGPUResource(gl: WebGL2RenderingContext): ISubPipeline;
    setUniformUpdaterFn(updater: UniformUpdaterFn_t): ISubPipeline;
    setGeometry(geo: IGeometry): ISubPipeline;
    setTextures(...tex: Array<ITexture | ISkyboxTexture>): ISubPipeline;
    setTexture(texture: ITexture | ISkyboxTexture): ISubPipeline;
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
