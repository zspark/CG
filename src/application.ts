//@ts-ignore
import * as dat from "../third/lil-gui.esm.min.js";
import * as CG from "./api.js";

export default class Application {

    private _ctrl = new CG.SpaceController();
    private _geometryCube: CG.IGeometry;
    private _scene: CG.Scene;

    constructor(canvas: HTMLCanvasElement) {
        CG.registWebGL();
        CG.programManagerHint(true, true);
        const _scene = this._scene = new CG.Scene(canvas);

        //--------------------------------------------------------------------------------
        //--------------------------------------------------------------------------------
        this._geometryCube = CG.geometry.createCube(2);
        let _primitive = new CG.Primitive("primitive-cube", this._geometryCube);
        let _meshCube1 = new CG.Mesh("MeshCube1", _primitive);
        let _meshCube2 = new CG.Mesh("MeshCube2", _primitive);
        let _meshCube3 = new CG.Mesh("MeshCube3", _primitive);
        this._ctrl.setSpace(_meshCube1).setPosition(2, 2, 2)
            .setSpace(_meshCube2).setPosition(-4, -4, 3).rotateAroundSelfX(Math.PI / 3)
            .setSpace(_meshCube3).setPosition(0.5, 6, -8).rotateAroundSelfY(1.7).rotateAroundSelfZ(0.33);
        //this._scene.addMesh(_meshCube1, true, p);
        //this._scene.addMesh(_meshCube2, true, p);
        //this._scene.addMesh(_meshCube3, true, p);
        _scene.loadModel(
            //"./assets/gltf/MetalRoughSpheres.glb"
            //"./assets/gltf/skull/scene.gltf"
            //"./assets/gltf/cube/scene.gltf"
            //"./assets/gltf/cup_with_holder/scene.gltf"
            //"./assets/gltf/sphere/scene.gltf"
            //"./assets/gltf/stanford_dragon_vrip/scene.gltf"
            //"./assets/gltf/metal_dragon/scene.gltf"
            //"./assets/gltf/vintage_metal_ashtray/scene.gltf"
            "./assets/gltf/material_ball_in_3d-coat/scene.gltf"
            //"./assets/gltf/haunted_house/scene.gltf"
            //"./assets/gltf/dragon_sculpture/scene.gltf"
            //"./assets/gltf/glass_bunny/scene.gltf"
        );
        const _geometryPlane = CG.geometry.createPlane(10, 10);
        let _meshPlane = new CG.Mesh("MeshPlane", new CG.Primitive("primitive-plane", _geometryPlane));
        //_scene.addMesh(_meshPlane, false);
        //--------------------------------------------------------------------------------
        //
        //--------------------------------------------------------------------------------
        this.createGUI();
    }

    run(dt: number) {
        this._scene.update(dt);
    }

    createGUI() {
        {
            const _gui = new dat.GUI();
            _gui.domElement.style.position = 'absolute';
            _gui.domElement.style.left = '15px';
            _gui.domElement.style.top = '0px';

            const _pos = this._scene.light.position
            const _color = this._scene.light.color
            const _camera = this._scene.camera;
            const _obj = {
                open: () => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.gltf, .glb'; // You can specify file types here (e.g., txt, json)
                    input.multiple = true;
                    input.onchange = (event: Event) => {
                        debugger;
                        const file = (event.target as HTMLInputElement).files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = function (e: ProgressEvent) {
                                debugger;
                                console.log('File content:', (e.target as FileReader).result);
                                // Do something with the file content
                            };
                            reader.readAsText(file); // Can also use readAsDataURL(), readAsArrayBuffer(), etc.
                        }
                    };
                    input.click();
                },
                debug: {
                    showOutline: true,
                    debugTexture: "none",
                },
                _lightSource: {
                    color: [_color.r, _color.g, _color.b],
                    intensity: this._scene.light.intensity,
                    positionX: _pos.x,
                    positionY: _pos.y,
                    positionZ: _pos.z,
                },
                _cameraObj: {
                    positionX: 0,
                    positionY: 0,
                    positionZ: 0,
                    lookAtSelected: () => {
                        const _r = this._scene.picker.pickedResult;
                        _camera.lookAt(_r?.picked?.mesh.position ?? CG.Vec4.VEC4_0001);
                    },
                }
            };
            const _lisener = {
                notify: (evt?: CG.Event_t) => {
                    const _pos = _camera.position;
                    _obj._cameraObj.positionX = _pos.x;
                    _obj._cameraObj.positionY = _pos.y;
                    _obj._cameraObj.positionZ = _pos.z;
                    return false;
                }
            };
            _camera.addListener(_lisener, CG.Camera.CHANGED);
            _lisener.notify();


            //_gui.add(_obj, "open");
            const _debugFolder = _gui.addFolder("debug").close();
            _debugFolder.add(_obj.debug, "showOutline").onChange((v: boolean) => {
                this._scene.showOutline = v;
            });
            _debugFolder.add(_obj.debug, "debugTexture", ["none", "normal", "occlusion", "emissive", "baseColor", "metallic", "roughness", "F0"]).onChange((v: string) => {
                switch (v) {
                    case "none":
                        this._scene.setDebugValue(-1);
                        break;
                    case "normal":
                        this._scene.setDebugValue(0);
                        break;
                    case "occlusion":
                        this._scene.setDebugValue(1);
                        break;
                    case "emissive":
                        this._scene.setDebugValue(2);
                        break;
                    case "baseColor":
                        this._scene.setDebugValue(3);
                        break;
                    case "metallic":
                        this._scene.setDebugValue(4);
                        break;
                    case "roughness":
                        this._scene.setDebugValue(5);
                        break;
                    case "F0":
                        this._scene.setDebugValue(6);
                        break;
                }
            });

            let _cameraFolder = _gui.addFolder('camera').close();
            _cameraFolder.add(_obj._cameraObj, 'positionX').min(-10).max(10).step(0.01).onChange((v: any) => {
                _camera.setPosition(v, _obj._cameraObj.positionY, _obj._cameraObj.positionZ);
            }).listen();
            _cameraFolder.add(_obj._cameraObj, 'positionY').min(-10).max(10).step(0.01).onChange((v: any) => {
                _camera.setPosition(_obj._cameraObj.positionX, v, _obj._cameraObj.positionZ);
            }).listen();
            _cameraFolder.add(_obj._cameraObj, 'positionZ').min(-10).max(10).step(0.01).onChange((v: any) => {
                _camera.setPosition(_obj._cameraObj.positionX, _obj._cameraObj.positionY, v);
            }).listen();
            _cameraFolder.add(_obj._cameraObj, 'lookAtSelected');


            let _lightFolder = _gui.addFolder('light source');
            _lightFolder.addColor(_obj._lightSource, 'color').onChange((v: any) => {
                //console.log(v);
                this._scene.light.setColor(v[0], v[1], v[2]);
            });
            _lightFolder.add(_obj._lightSource, 'intensity').min(0).max(10).step(0.01).onChange((v: number) => {
                this._scene.light.intensity = v;
            });
            _lightFolder.add(_obj._lightSource, 'positionX').min(0).max(100).step(0.01).onChange((v: number) => {
                this._scene.light.setPosition(v, _obj._lightSource.positionY, _obj._lightSource.positionZ);
            });
            _lightFolder.add(_obj._lightSource, 'positionY').min(0).max(100).step(0.01).onChange((v: number) => {
                this._scene.light.setPosition(_obj._lightSource.positionX, v, _obj._lightSource.positionZ);
            });
            _lightFolder.add(_obj._lightSource, 'positionZ').min(0).max(100).step(0.01).onChange((v: number) => {
                this._scene.light.setPosition(_obj._lightSource.positionX, _obj._lightSource.positionY, v);
            });
        }

        {

            let _node: CG.SpacialNode;
            let _mat: CG.api_IMaterial;
            this._scene.picker.addListener({
                notify: (evt: CG.Event_t) => {
                    _node = this._scene.picker.pickedResult.picked?.mesh;
                    if (_node) {
                        _gui.show();
                    } else {
                        _gui.hide();
                    }

                    _mat = this._scene.picker.pickedResult?.picked?.primitive.material.API;
                    if (_mat) {
                        obj.material.normalTextureScale = _mat.normalTextureScale;
                        obj.material.occlusionTextureStrength = _mat.occlusionTextureStrength;
                        obj.material.emissiveFactor = _mat.emissiveFactor;
                        obj.material.pbrMetallicRoughness.baseColorFactor = _mat.pbrMR_baseColorFactor;
                        obj.material.pbrMetallicRoughness.metallicFactor = _mat.pbrMR_metallicFactor;
                        obj.material.pbrMetallicRoughness.roughnessFactor = _mat.pbrMR_roughnessFactor;
                        _folderMaterial.show();
                    } else {
                        _folderMaterial.hide();
                    }
                    return false;
                }
            }, CG.Picker.PICKED);

            const obj = {
                selectParent: () => {
                    if (_node) {
                        _node = _node.parentNode;
                    }
                },
                transform: {
                    rotateSlefX: 0, rotateSlefY: 0, rotateSlefZ: 0,
                    rotateParentX: 0, rotateParentY: 0, rotateParentZ: 0,
                },
                material: {
                    pbrMetallicRoughness: {
                        baseColorFactor: [1, 1, 1, 1],
                        roughnessFactor: 1,
                        metallicFactor: 1,
                    },
                    normalTextureScale: 1.0,
                    occlusionTextureStrength: 1.0,
                    emissiveFactor: [0, 0, 0],
                }
            };
            let _gui = new dat.GUI();
            _gui.add(obj, "selectParent").hide();


            let _data = [0, 0, 0, 0, 0, 0];
            const _folderTrans = _gui.addFolder('transformation');
            _folderTrans.add(obj.transform, 'rotateSlefX').min(-360).max(360).step(0.25).onChange((v: number) => {
                //console.log(v);
                this._ctrl.setSpace(_node)?.rotateAroundSelfX(CG.utils.deg2Rad(v - _data[0]));
                _data[0] = v;
            });
            _folderTrans.add(obj.transform, 'rotateSlefY').min(-360).max(360).step(0.25).onChange((v: number) => {
                this._ctrl.setSpace(_node)?.rotateAroundSelfY(CG.utils.deg2Rad(v - _data[1]));
                _data[1] = v;
            });
            _folderTrans.add(obj.transform, 'rotateSlefZ').min(-360).max(360).step(0.25).onChange((v: number) => {
                this._ctrl.setSpace(_node)?.rotateAroundSelfZ(CG.utils.deg2Rad(v - _data[2]));
                _data[2] = v;
            });
            _folderTrans.add(obj.transform, 'rotateParentX').min(-360).max(360).step(0.25).onChange((v: number) => {
                this._ctrl.setSpace(_node)?.rotateAroundParentX(CG.utils.deg2Rad(v - _data[3]));
                _data[3] = v;
            });
            _folderTrans.add(obj.transform, 'rotateParentY').min(-360).max(360).step(0.25).onChange((v: number) => {
                this._ctrl.setSpace(_node)?.rotateAroundParentY(CG.utils.deg2Rad(v - _data[4]));
                _data[4] = v;
            });
            _folderTrans.add(obj.transform, 'rotateParentZ').min(-360).max(360).step(0.25).onChange((v: number) => {
                this._ctrl.setSpace(_node)?.rotateAroundParentZ(CG.utils.deg2Rad(v - _data[5]));
                _data[5] = v;
            });


            let _folderMaterial = _gui.addFolder('material');
            const _folderPBR = _folderMaterial.addFolder("pbr");
            _folderPBR.open();
            _folderPBR.addColor(obj.material.pbrMetallicRoughness, 'baseColorFactor').onChange((v: number[]) => {
                _mat.pbrMR_baseColorFactor = v;
            }).listen();
            _folderPBR.add(obj.material.pbrMetallicRoughness, 'metallicFactor').min(0).max(1).step(0.05).onChange((v: number) => {
                _mat.pbrMR_metallicFactor = v;
            }).listen();
            _folderPBR.add(obj.material.pbrMetallicRoughness, 'roughnessFactor').min(0).max(1).step(0.05).onChange((v: number) => {
                _mat.pbrMR_roughnessFactor = v;
            }).listen();
            _folderMaterial.add(obj.material, 'normalTextureScale').min(0).max(1).step(0.05).onChange((v: number) => {
                _mat.normalTextureScale = v;
            }).listen();
            _folderMaterial.add(obj.material, 'occlusionTextureStrength').min(0).max(1).step(0.05).onChange((v: number) => {
                _mat.occlusionTextureStrength = v;
            }).listen();
            _folderMaterial.addColor(obj.material, 'emissiveFactor').onChange((v: number[]) => {
                _mat.emissiveFactor = v;
            }).listen();

        }

    }
}

