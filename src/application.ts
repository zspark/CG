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
    private _geometryCube: CG.IGeometry;
    private _gl: WebGL2RenderingContext;
    private _renderer: CG.Renderer;
    private _backFBO: CG.Framebuffer;
    private _depthTexture: CG.Texture;
    private _colorTexture: CG.Texture;
    private _meshGrid: CG.Mesh;
    private _meshCube: CG.Mesh;
    //private _light: CG.ILight = new CG.light.ParallelLight(10, 20, -10);
    private _light: CG.ILight = new CG.light.PointLight(10, 20, -10);
    private _axis: CG.Axes;
    private _gridFloor: CG.GridFloor;
    private _backFBOPipeline: CG.Pipeline;
    private _outline: CG.Outline;
    private _cubeSubPipes: CG.SubPipeline[] = [];

    constructor() {
        this.createGUI();

        const gl = this._gl = CG.createGLContext('glcanvas');
        this._camera = new CG.Camera(-10, 15, 8).lookAt(CG.Vec4.VEC4_0001).setMouseEvents(CG.registMouseEvents(gl.canvas as HTMLCanvasElement)).setFrustum(this._frustum)//.setPosition(10, 20, -10)
        this._renderer = new CG.Renderer(gl);
        this._axis = new CG.Axes(gl, this._renderer);//, this._backFBO);
        this._gridFloor = new CG.GridFloor(gl, this._renderer);//, this._backFBO);
        this._light.setDirection(-1, -1, 1);
        this.createBackFBO();
        this._outline = new CG.Outline(gl, this._renderer).setDepthTexture(this._colorTexture);
        this._outline.enable();
        //this.createFront();


        //--------------------------------------------------------------------------------
        this._geometryCube = CG.geometry.createCube(2).init(gl);
        const _meshCube = this._meshCube = new CG.Mesh(this._geometryCube);
        const _meshCube2 = new CG.Mesh(this._geometryCube);
        const _meshCube3 = new CG.Mesh(this._geometryCube);
        this._ctrl.setSpace(_meshCube).setPosition(2, 2, 2)
            .setSpace(_meshCube2).setPosition(-4, -4, 3).rotateAroundSelfX(Math.PI / 3)
            .setSpace(_meshCube3).setPosition(0.5, 6, -8).rotateAroundSelfY(1.7).rotateAroundSelfZ(0.33);
        const _subPipeCube = new CG.SubPipeline()
            .setGeometry(_meshCube.geometry)
            .setUniformUpdater(this.createUpdater(this._camera, this._light, _meshCube, new CG.Vec4(1, 0, 0, 1)))
            .setDrawElementsParameters({
                mode: gl.TRIANGLES,
                count: _meshCube.numberIndices,
                type: gl.UNSIGNED_SHORT,
                offset: 0
            })
        const _subPipeCube2 = _subPipeCube.clone()
            .setUniformUpdater(this.createUpdater(this._camera, this._light, _meshCube2, new CG.Vec4(0, 1, 0, 1)))
        const _subPipeCube3 = _subPipeCube.clone()
            .setUniformUpdater(this.createUpdater(this._camera, this._light, _meshCube3, new CG.Vec4(0, 0, 1, 1)))
        this._cubeSubPipes.push(_subPipeCube, _subPipeCube2, _subPipeCube3);

        this._loader.loadShader("./glsl/vertexColor").then((sources) => {
            //this._loader.loadShader("./glsl/debug-normal").then((sources) => {
            const _p = new CG.Pipeline(gl, 0)
                .cullFace(true, gl.BACK)
                .depthTest(true, gl.LESS)
                .setProgram(new CG.Program(gl, sources[0], sources[1])).validate()
                .appendSubPipeline(_subPipeCube)
                .appendSubPipeline(_subPipeCube2)
                .appendSubPipeline(_subPipeCube3)
            this._axis.addTarget(_meshCube)
            this._renderer.addPipeline(_p);
        });

        this._loader.loadShader_separate("./glsl/pureRed", "./glsl/depth-to-color-attachment-r32f").then((sources) => {
            this._backFBOPipeline = new CG.Pipeline(gl, 100)
                .setFBO(this._backFBO)
                .cullFace(true, gl.BACK)
                .depthTest(true, gl.LESS)
                .setProgram(new CG.Program(gl, sources[0], sources[1])).validate()
            this._renderer.addPipeline(this._backFBOPipeline);
        });

        //--------------------------------------------------------------------------------

    }

    run(dt: number) {
        this._light.update(dt);
        this._camera.update(dt);
        this._gridFloor.update(dt, this._camera);
        this._axis.update(dt, this._camera.viewProjectionMatrix);
        this._renderer.render();
    }

    createUpdater(camera: CG.ICamera, light: CG.ILight, mesh: CG.Mesh, color: CG.rgba) {
        const gl = this._gl;
        return {
            updateu_mvpMatrix: (uLoc: WebGLUniformLocation) => {
                camera.viewProjectionMatrix.multiply(mesh.transform, this._tempMat44);
                gl.uniformMatrix4fv(uLoc, false, this._tempMat44.data);
            },
            updateu_mvMatrix: (uLoc: WebGLUniformLocation) => {
                camera.viewMatrix.multiply(mesh.transform, this._tempMat44);
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

    createGUI() {
        let _data = [0, 0, 0, 0, 0, 0];
        const obj = {
            rotateSlefX: 0, rotateSlefY: 0, rotateSlefZ: 0,
            rotateParentX: 0, rotateParentY: 0, rotateParentZ: 0,
            selectCubeA: false,
            selectCubeB: false,
            selectCubeC: false,
        };
        this._gui.add(obj, 'rotateSlefX').min(-360).max(360).step(0.25).onChange((v: number) => {
            //console.log(v);
            this._ctrl.setSpace(this._meshCube).rotateAroundSelfX(CG.utils.deg2Rad(v - _data[0]));
            _data[0] = v;
        });
        this._gui.add(obj, 'rotateSlefY').min(-360).max(360).step(0.25).onChange((v: number) => {
            this._ctrl.setSpace(this._meshCube).rotateAroundSelfY(CG.utils.deg2Rad(v - _data[1]));
            _data[1] = v;
        });
        this._gui.add(obj, 'rotateSlefZ').min(-360).max(360).step(0.25).onChange((v: number) => {
            this._ctrl.setSpace(this._meshCube).rotateAroundSelfZ(CG.utils.deg2Rad(v - _data[2]));
            _data[2] = v;
        });
        this._gui.add(obj, 'rotateParentX').min(-360).max(360).step(0.25).onChange((v: number) => {
            this._ctrl.setSpace(this._meshCube).rotateAroundParentX(CG.utils.deg2Rad(v - _data[3]));
            _data[3] = v;
        });
        this._gui.add(obj, 'rotateParentY').min(-360).max(360).step(0.25).onChange((v: number) => {
            this._ctrl.setSpace(this._meshCube).rotateAroundParentY(CG.utils.deg2Rad(v - _data[4]));
            _data[4] = v;
        });
        this._gui.add(obj, 'rotateParentZ').min(-360).max(360).step(0.25).onChange((v: number) => {
            this._ctrl.setSpace(this._meshCube).rotateAroundParentZ(CG.utils.deg2Rad(v - _data[5]));
            _data[5] = v;
        });
        this._gui.add(obj, "selectCubeA").onChange((v: boolean) => {
            v ? this._backFBOPipeline.appendSubPipeline(this._cubeSubPipes[0]) : this._backFBOPipeline.removeSubPipeline(this._cubeSubPipes[0]);
        });
        this._gui.add(obj, "selectCubeB").onChange((v: boolean) => {
            v ? this._backFBOPipeline.appendSubPipeline(this._cubeSubPipes[1]) : this._backFBOPipeline.removeSubPipeline(this._cubeSubPipes[1]);
        });
        this._gui.add(obj, "selectCubeC").onChange((v: boolean) => {
            v ? this._backFBOPipeline.appendSubPipeline(this._cubeSubPipes[2]) : this._backFBOPipeline.removeSubPipeline(this._cubeSubPipes[2]);
        });
    }

    createFront() {
        const gl = this._gl;
    }

    createBackFBO() {
        const gl = this._gl;
        const width: number = gl.drawingBufferWidth;
        const height: number = gl.drawingBufferHeight;
        this._backFBO = new CG.Framebuffer(gl, width, height);
        //this._depthTexture = new CG.Texture(gl).createGLTextureWithSize(width, height, gl.DEPTH_COMPONENT16, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT);
        //this._backFBO.attachDepthTexture(this._depthTexture);
        this._colorTexture = new CG.Texture(gl).createGLTextureWithSize(width, height, gl.R32F, gl.RED, gl.FLOAT);
        this._backFBO.attachColorTexture(this._colorTexture, 0).validate();
    }
}

