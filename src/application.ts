//@ts-ignore
import * as dat from "../third/dat.gui.module.js";
import * as CG from "./api.js";

export default class Application {
    static NEAR_PLANE = 1;
    static FAR_PLANE = 100;

    private _gui = new dat.GUI();
    private _tempMat44 = new CG.Mat44();
    private _loader = CG.createLoader("./");
    private _camera: CG.ICamera;
    private _frustum = new CG.Frustum().createPerspectiveProjection(CG.utils.deg2Rad(60), 640 / 480, Application.NEAR_PLANE, Application.FAR_PLANE);
    //private _frustum = new CG.Frustum().createOrthogonalProjection(-10, 10, -10, 10, 0, 100);
    private _ctrl = new CG.SpaceController();
    private _geometryCube = CG.createCube(2);
    private _gl: WebGL2RenderingContext;
    private _defaultFBO: CG.Framebuffer;
    private _backFBO: CG.Framebuffer;
    private _renderer: CG.Renderer;
    private _depthTexture: CG.Texture;
    //private _light: CG.ILight = new CG.light.ParallelLight(10, 20, -10);
    private _light: CG.ILight = new CG.light.PointLight(10, 20, -10);
    private _pipeDepth: CG.Pipeline;

    constructor() {
        const obj = { type: 1 };
        this._gui.add(obj, 'type', { 'point light': 1, 'parallel light': 2, 'spot light': 3 }).onChange((value: string) => {
        });
        const _shadowMapSize = 1024;
        const { gl, canvas } = CG.createGlContext('glcanvas');
        this._gl = gl;
        this._camera = new CG.Camera(-10, 15, 8)
            //.setPosition(10, 20, -10)
            .lookAt(CG.Vec4.VEC4_0001)
            .setMouseEvents(CG.registMouseEvents(canvas))
            .setFrustum(this._frustum);

        this._defaultFBO = new CG.Framebuffer(gl, undefined, undefined, false);
        this._backFBO = new CG.Framebuffer(gl, _shadowMapSize, _shadowMapSize, true);
        this._depthTexture = new CG.Texture(gl).createGLTextureWithSize(_shadowMapSize, _shadowMapSize, gl.DEPTH_COMPONENT16, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT);
        this._backFBO.attachDepthTexture(this._depthTexture).validate();
        this._renderer = new CG.Renderer(gl);
        this._light.setDirection(-1, -1, 1);
        this._geometryCube.init(gl);


        //--------------------------------------------------------------------------------
        const _meshFloor = new CG.Mesh(CG.createPlane(80, 80).init(gl));
        const _meshCube = new CG.Mesh(this._geometryCube);
        const _meshCube2 = new CG.Mesh(this._geometryCube);
        const _meshCube3 = new CG.Mesh(this._geometryCube);
        const _meshCube4 = new CG.Mesh(this._geometryCube);
        this._ctrl.setSpace(_meshFloor).rotateAroundSelfX(CG.utils.deg2Rad(-90)).setPosition(0, -3, 0)
            .setSpace(_meshCube).scale(3, 3, 4)
            .setSpace(_meshCube2).moveUp(6).moveRight(2).moveForward(-2).rotateAroundSelfX(0.6).rotateAroundSelfZ(0.3)
            .setSpace(_meshCube3).moveForward(6).moveUp(3).rotateAroundSelfZ(Math.PI / 6).scale(1, 4, 1)
            .setSpace(_meshCube4).moveRight(6);
        const _subPipeCube = new CG.SubPipeline()
            .setVAO(_meshCube.VAO)
            .setUniformUpdater(this.createUpdater(this._camera, this._light, _meshCube, new CG.Vec4(1, 0, 0, 1)))
            .setDrawElementsParameters({
                mode: gl.TRIANGLES,
                count: _meshCube.numberIndices,
                type: gl.UNSIGNED_SHORT,
                offset: 0
            })
        const _subPipeCube2 = _subPipeCube.clone().setUniformUpdater(this.createUpdater(this._camera, this._light, _meshCube2, new CG.Vec4(0, 1, 0, 1)))
        const _subPipeCube3 = _subPipeCube.clone().setUniformUpdater(this.createUpdater(this._camera, this._light, _meshCube3, new CG.Vec4(0, 0, 1, 1)))
        const _subPipeCube4 = _subPipeCube.clone().setUniformUpdater(this.createUpdater(this._camera, this._light, _meshCube4, new CG.Vec4(0, 1, 1, 1)))
        const _subPipeFloor = new CG.SubPipeline()
            .setVAO(_meshFloor.VAO)
            .setDrawElementsParameters({
                mode: gl.TRIANGLES,
                count: _meshFloor.numberIndices,
                type: gl.UNSIGNED_SHORT,
                offset: 0
            })
            .setUniformUpdater(this.createUpdater(this._camera, this._light, _meshFloor, new CG.Vec4(1, 1, 1, 1)));



        this._loader.loadShader("./glsl/shadow-map-gen-depth").then((sources) => {
            this._pipeDepth = new CG.Pipeline(gl)
                .setFBO(this._backFBO)
                .setProgram(new CG.Program(gl, sources[0], sources[1])).validate()
                .cullFace(true, gl.FRONT)
                .drawBuffers(gl.NONE)
                .appendSubPipeline(_subPipeCube)
                .appendSubPipeline(_subPipeCube2)
                .appendSubPipeline(_subPipeCube3)
                .appendSubPipeline(_subPipeCube4)
            this._renderer.addPipeline(this._pipeDepth);
        });


        this._loader.loadShader("./glsl/shadow-map").then((sources) => {
            //this._loader.loadShader("./glsl/debug-normal").then((sources) => {
            const _pipeShadow = new CG.Pipeline(gl)
                .setFBO(this._defaultFBO)
                .setProgram(new CG.Program(gl, sources[0], sources[1])).validate()
                .cullFace(true, gl.BACK)
                .appendSubPipeline(_subPipeCube)
                .appendSubPipeline(_subPipeCube2)
                .appendSubPipeline(_subPipeCube3)
                .appendSubPipeline(_subPipeCube4)
                .appendSubPipeline(_subPipeFloor)
            _subPipeFloor.setTextures(this._depthTexture)
            this._renderer.addPipeline(_pipeShadow);
        });
        //--------------------------------------------------------------------------------

    }

    run(dt: number) {
        this._light.update(dt);
        this._camera.update(dt);
        this._renderer.render();
    }

    createUpdater(camera: CG.ICamera, light: CG.ILight, mesh: CG.Mesh, color: CG.rgba) {
        const gl = this._gl;
        return {
            updateu_mvpMatrix: (uLoc: WebGLUniformLocation) => {
                camera.viewProjectionMatrix.multiply(mesh.transform, this._tempMat44);
                gl.uniformMatrix4fv(uLoc, false, this._tempMat44.data);
            },
            updateu_mlMatrix_normal: (uLoc: WebGLUniformLocation) => {
                //this._tempMat44.copyFrom(mesh.transform).invert().transpose(); // remember, this's wrong!!!
                this._tempMat44.copyFrom(mesh.transform).invertTransposeLeftTop33();// this one is right.
                light.lightMatrix.multiply(this._tempMat44, this._tempMat44);
                gl.uniformMatrix4fv(uLoc, false, this._tempMat44.data);
            },
            updateu_mlpMatrix: (uLoc: WebGLUniformLocation) => {
                light.lightProjectionMatrix.multiply(mesh.transform, this._tempMat44);
                gl.uniformMatrix4fv(uLoc, false, this._tempMat44.data);
            },
            updateu_mlMatrix: (uLoc: WebGLUniformLocation) => {
                light.lightMatrix.multiply(mesh.transform, this._tempMat44);
                gl.uniformMatrix4fv(uLoc, false, this._tempMat44.data);
            },
            updateu_shadowMap: (uLoc: WebGLUniformLocation) => {
                gl.uniform1i(uLoc, 0);
            },
            updateu_color: (uLoc: WebGLUniformLocation) => {
                gl.uniform3f(uLoc, color.x, color.y, color.z);
            },
            updateu_nearFarPlane: (uLoc: WebGLUniformLocation) => {
                gl.uniform2f(uLoc, Application.NEAR_PLANE, Application.FAR_PLANE);
            },


            /// --------------------------------------------------------------------------------
            /// debug normals;
            updateu_debugNormalModelMatrix: (uLoc: WebGL2RenderingContext) => { // model to world
                this._tempMat44.copyFrom(mesh.transform).invertTransposeLeftTop33();
                gl.uniformMatrix4fv(uLoc, false, this._tempMat44.data);
            },
            updateu_debugNormalViewMatrix: (uLoc: WebGL2RenderingContext) => { // world to view;
                gl.uniformMatrix4fv(uLoc, false, camera.viewMatrix.data);
            },
            updateu_debugNormalSpace: (uLoc: WebGL2RenderingContext) => { // 0:model space; 1:world space; 2:view space;
                gl.uniform1i(uLoc, 2);
            },
            /// --------------------------------------------------------------------------------
        }
    }

}

