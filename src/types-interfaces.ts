export type createContext_fn_t = (canvasElementId: string) => WebGL2RenderingContext;

export type BufferData_t = AllowSharedBufferSource & {
    length: number;
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
    ATTRIB_TEXTURE_UV = 1,
    ATTRIB_NORMAL = 2,
    ATTRIB_COLOR = 3,
    ATTRIB_INSTANCED_MATRIX_COL_1 = 4,
    ATTRIB_INSTANCED_MATRIX_COL_2 = 5,
    ATTRIB_INSTANCED_MATRIX_COL_3 = 6,
    ATTRIB_INSTANCED_MATRIX_COL_4 = 7,
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

export type UniformUpdater_t = {
    [key: string]: (u: WebGLUniformLocation) => void;
}

export interface IProgram extends IBindableObject {
    link(vertexShader: WebGLShader, fragmentShader: WebGLShader): IProgram;
    getAttribLocation(name: string): void;
    updateUniforms(uniformUpdater: UniformUpdater_t): IProgram;
    destroy(): void;
}

export interface ITexture {
    get textureUnit(): GLint;

    createGLTexture(data: any): ITexture;
    updateData(data: any, xoffset: number, yoffset: number, width: number, height: number): ITexture;
    createGLTextureWithSize(width: number, height: number): ITexture;
    setParameter(name: number, value: number): ITexture;
    bind(textureUnit: number): ITexture;
    destroyGLTexture(): ITexture;
}

export interface ISkyboxTexture {

    get textureUnit(): GLint;

    /**
     * data[0-5]: x+,x-,y+, y-, z+,z-
     */
    createGLTexture(data: any[]): ISkyboxTexture;
    createGLTextureWithSize(width: number, height: number): ISkyboxTexture;
    /**
     * data[0-5]: x+,x-,y+, y-, z+,z-
     */
    updateData(data: any[], xoffset: number, yoffset: number, width: number, height: number): ISkyboxTexture;
    setParameter(name: number, value: number): ISkyboxTexture;
    bind(textureUnit: number): ISkyboxTexture;
    destroyGLTexture(): ISkyboxTexture;
}

export interface IFramebuffer extends IBindableObject {
    attachColorTexture(texture: ITexture, attachment: number, target?: GLenum): void;
    attachDepthTexture(texture: ITexture, target?: number): void;
    validate(): void;
    clear(): void;
    destroy(): void;
}

export type SubPipelineOption_t = {
    onlyOnce?: boolean;
};

export interface IPipeline {
    FBO: IFramebuffer;
    get priority(): number;
    get program(): IProgram;


    setFBO(fbo: IFramebuffer): IPipeline;
    setProgram(program: IProgram): IPipeline;
    appendSubPipeline(subp: ISubPipeline, option?: SubPipelineOption_t): IPipeline;
    removeSubPipeline(subp: ISubPipeline): IPipeline;
    removeSubPipelines(): IPipeline;
    depthTest(enable: boolean, func?: GLenum): IPipeline;
    blend(enable: boolean, funcSF?: GLenum, funcDF?: GLenum, equation?: GLenum): IPipeline;
    cullFace(enable: boolean, culledFace?: GLenum): IPipeline;
    drawBuffers(...buffers: GLenum[]): IPipeline;
    validate(): IPipeline;
    execute(): IPipeline;
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
    get uniformUpdater(): UniformUpdater_t;

    setUniformUpdater(updater: UniformUpdater_t): ISubPipeline;
    setGeometry(geo: IGeometry): ISubPipeline;
    setTextures(...tex: Array<ITexture | ISkyboxTexture>): ISubPipeline;
    setTexture(texture: ITexture | ISkyboxTexture): ISubPipeline;
    clearTextures(): ISubPipeline;
    validate(): ISubPipeline;
    bind(): void;
    draw(): void;
    clone(): ISubPipeline;
}

export type PipelineOption_t = SubPipelineOption_t;

export interface IBindableObject {
    readonly criticalKey: object;
    bind(): void;
};

export interface IRenderer {
    render(): IRenderer;
    addPipeline(p: IPipeline, option?: PipelineOption_t): IRenderer;
    addTransparentPipeline(p: IPipeline): IRenderer;
    removePipeline(p: IPipeline): IRenderer;
}

