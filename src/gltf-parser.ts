import log from "./log.js";
import * as spec from "./gltf2_spec.js";
import glC from "./gl-const.js";
import { default as createLoader, ILoader } from "./assets-loader.js"
import { default as Geometry } from "./geometry.js"
import { ITexture, IGeometry, IBuffer, VertexAttribute_t, ShaderLocation_e, StepMode_e } from "./types-interfaces.js"
import { Buffer } from "./device-resource.js"
import { Texture } from "./device-resource.js"
import Mesh from "./mesh.js"
import Primitive from "./primitive.js"
import SpacialNode from "./spacial-node.js"
import Material from "./material.js"
import { Mat44, Quat } from "./math.js"

export interface IGLTFParser {
}

export type GLTFParserOutput_t = {
    geometrys: IGeometry[],
    CGMeshs: Mesh[],
    SpacialNodes: SpacialNode[],
    CGMaterials: Material[],
}

export default class GLTFParser implements IGLTFParser {

    private _helperMat4: Mat44 = new Mat44();
    private _quat_rotate: Quat = new Quat([0, 0, 0, 0]);
    private _arrBuffers: IBuffer[] = [];
    private _arrData: ArrayBuffer[] = [];
    private _ref_gltf: spec.GLTFv2_t;
    private _ref_accessors: spec.GLTFAccessor_t[];
    private _ref_bufferViews: spec.GLTFBufferView_t[];
    private _output: GLTFParserOutput_t;
    private _baseURL: string;
    private _loader: ILoader;
    private _arrImage: (HTMLImageElement | Uint8Array)[] = [];
    private _arrTexture: ITexture[] = [];

    constructor(deleteAfterParse: boolean = true) {
        this._output = { SpacialNodes: [], geometrys: [], CGMeshs: [], CGMaterials: [] };
    }

    async load(url: string): Promise<GLTFParserOutput_t> {
        if (url.indexOf(".gltf") != -1) {
            return this._loadGLTF(url);
        } else {
            return this._loadGLB(url);
        }
    }

    private async _loadGLB(url: string): Promise<GLTFParserOutput_t> {
        this._loader = createLoader('./');
        const arrayBuffer: ArrayBuffer | void = await this._loader.loadBinary(url)
        if (!arrayBuffer) return null;

        const dataView = new DataView(arrayBuffer);

        // Read header (12 bytes)
        const magic = dataView.getUint32(0, true);
        const version = dataView.getUint32(4, true);
        const length = dataView.getUint32(8, true);

        if (magic !== 0x46546C67) { // 'glTF' magic number
            throw new Error("Invalid GLB file");
        }

        let offset = 12;
        let _gltf: any = null;
        let binaryChunk: ArrayBuffer;

        while (offset < length) {
            const chunkLength = dataView.getUint32(offset, true);
            const chunkType = dataView.getUint32(offset + 4, true);
            offset += 8;

            const chunkData = arrayBuffer.slice(offset, offset + chunkLength);
            offset += chunkLength;

            if (chunkType === 0x4E4F534A) { // 'JSON'
                _gltf = JSON.parse(new TextDecoder().decode(chunkData));
            } else if (chunkType === 0x004E4942) { // 'BIN'
                binaryChunk = chunkData;
            }
        }

        this._arrData[0] = binaryChunk;
        for (let i = 0, N = _gltf.images.length; i < N; ++i) {
            let _img = _gltf.images[i];
            let _bv = _gltf.bufferViews[_img.bufferView];
            this._arrImage[i] = new Uint8Array(binaryChunk, _bv.byteOffset ?? 0, _bv.byteLength);
        }
        this._parse(_gltf);
        return this._output;
    }

    private async _loadGLTF(url: string): Promise<GLTFParserOutput_t> {
        const _index = url.lastIndexOf('/');
        this._baseURL = url.substring(0, _index) + '/';
        this._loader = createLoader(this._baseURL);

        const str = await this._loader.loadText(url.substring(_index));
        const _gltf = JSON.parse(str)
        const buffers: spec.GLTFBuffer_t[] = _gltf.buffers;
        for (let i = 0, N = buffers.length; i < N; ++i) {
            let _data = await this._loader.loadBinary(buffers[i].uri);
            if (!!_data) this._arrData[i] = _data;
        }
        const imgs: spec.GLTFImage_t[] = _gltf.images;
        for (let i = 0, N = imgs?.length ?? 0; i < N; ++i) {
            let _data = await this._loader.loadTexture(imgs[i].uri);
            if (!!_data) this._arrImage[i] = _data;
        }
        this._parse(_gltf);
        return this._output;
    }

    private _parseNodes(nodes: spec.GLTFNode_t[]): void {
        for (let i = 0, N = nodes.length; i < N; ++i) {
            this._parseNode(i, nodes[i]);
        }

        const _CGNodes = this._output.SpacialNodes;
        for (let i = 0, N = nodes.length; i < N; ++i) {
            let _node = nodes[i];
            if (_node.children) {
                let _pNode = _CGNodes[i];
                for (let j = 0, M = _node.children.length; j < M; ++j) {
                    _pNode.addChildNode(_CGNodes[_node.children[j]]);
                }
            }
        }
    }

    private _parseNode(index: number, node: spec.GLTFNode_t): void {
        let _CGNode: SpacialNode;
        if (node.mesh != undefined) {
            _CGNode = this._output.CGMeshs[node.mesh];
        } else {
            _CGNode = new SpacialNode(node.name);
        }
        this._output.SpacialNodes[index] = _CGNode;

        if (node.matrix) {
            _CGNode.transform.reset(node.matrix, 0, 16);
        } else {
            if (node.translation) {
                Mat44.createTranslate(node.scale[0], node.scale[1], node.scale[2], this._helperMat4);
                _CGNode.transformSelf(this._helperMat4);
            }
            if (node.rotation) {
                this._quat_rotate.reset(node.rotation[0], node.rotation[1], node.rotation[2], node.rotation[3]);
                //TODO:
                _CGNode.transformSelf(this._helperMat4);
            }
            if (node.scale) {
                Mat44.createScale(node.scale[0], node.scale[1], node.scale[2], this._helperMat4);
                _CGNode.transformSelf(this._helperMat4);
            }
        }
    }

    private _parseTextures(texs: spec.GLTFTexture_t[]): void {
        for (let i = 0, N = texs.length; i < N; ++i) {
            const tex: spec.GLTFTexture_t = texs[i];
            const _img: HTMLImageElement | Uint8Array = this._arrImage[tex.source];
            let _out;
            if (_img instanceof HTMLImageElement) {
                _out = new Texture(_img.width, _img.height);
            } else {
                let size = Math.sqrt(_img.length / 4);
                _out = new Texture(size, size);
            }
            _out.data = _img;
            const _sampler: spec.GLTFSampler_t = this._ref_gltf.samplers[tex.sampler];
            _out.setParameter(glC.TEXTURE_WRAP_S, _sampler.wrapS);
            _out.setParameter(glC.TEXTURE_WRAP_T, _sampler.wrapT);
            _out.setParameter(glC.TEXTURE_MIN_FILTER, _sampler.minFilter);
            _out.setParameter(glC.TEXTURE_MAG_FILTER, _sampler.magFilter);
            this._arrTexture[i] = _out;
        }
    }

    private _parse(gltf: spec.GLTFv2_t): void {
        this._ref_gltf = gltf;
        this._ref_accessors = gltf.accessors;
        this._ref_bufferViews = gltf.bufferViews;
        gltf.textures && this._parseTextures(gltf.textures);
        this._parseMaterials(gltf.materials);
        gltf.meshes && this._parseMeshes(gltf.meshes);
        gltf.nodes && this._parseNodes(gltf.nodes);
    }

    private _parseMaterials(materials: spec.GLTFMaterial_t[]): void {
        if (materials?.length <= 0) return;

        let _mat: Material;
        let _matProp: spec.GLTFMaterial_t;
        for (let i = 0, N = materials.length; i < N; ++i) {
            _matProp = materials[i];
            _mat = new Material(_matProp.name);
            //TODO:_mat.alphaMode/doublesided;
            if (_matProp.pbrMetallicRoughness) {
                if (_mat.pbrMR_baseColorTexture = this._arrTexture[_matProp.pbrMetallicRoughness.baseColorTexture?.index])
                    _mat.pbrMR_baseColorTexture.UVIndex = _matProp.pbrMetallicRoughness.baseColorTexture?.texCoord ?? 0;
                if (_mat.pbrMR_metallicRoughnessTexture = this._arrTexture[_matProp.pbrMetallicRoughness.metallicRoughnessTexture?.index])
                    _mat.pbrMR_metallicRoughnessTexture.UVIndex = _matProp.pbrMetallicRoughness.metallicRoughnessTexture?.texCoord ?? 0;
                _mat.pbrMR_metallicFactor = _matProp.pbrMetallicRoughness.metallicFactor ?? 1;
                _mat.pbrMR_roughnessFactor = _matProp.pbrMetallicRoughness.roughnessFactor ?? 1;
                _mat.pbrMR_baseColorFactor = _matProp.pbrMetallicRoughness.baseColorFactor ?? [1, 1, 1, 1];
            }
            if (_mat.normalTexture = this._arrTexture[_matProp.normalTexture?.index]) {
                _mat.normalTexture.UVIndex = _matProp.normalTexture.texCoord ?? 0;
                _mat.normalTextureScale = _matProp.normalTexture.scale ?? 1.0;
            }
            if (_mat.occlusionTexture = this._arrTexture[_matProp.occlusionTexture?.index]) {
                _mat.occlusionTextureStrength = _matProp.occlusionTexture.strength ?? 1.0;
            }
            _mat.emissiveTexture = this._arrTexture[_matProp.emissiveTexture?.index];
            _mat.emissiveFactor = _matProp.emissiveFactor ?? [0, 0, 0];

            this._output.CGMaterials[i] = _mat;
        }
    }

    private _parseMeshes(meshes: spec.GLTFMesh_t[]): void {
        if (meshes?.length <= 0) return;

        for (let i = 0, N = meshes.length; i < N; ++i) {
            let _mesh = this._parseMesh(meshes[i]);
            this._output.CGMeshs[i] = _mesh;
        }
    }

    private _parseMesh(mesh: spec.GLTFMesh_t): Mesh {
        const _mesh: Mesh = new Mesh(mesh.name);
        for (let i = 0, N = mesh.primitives.length; i < N; ++i) {
            let _primitive = this._parsePrimitive(mesh.primitives[i]);
            _mesh.addPrimitive(_primitive);
        }
        return _mesh;
    }

    private _parsePrimitive(primitive: spec.GLTFPrimitive_t): Primitive {
        const _geo: IGeometry = new Geometry();
        let _acc: spec.GLTFAccessor_t;
        let _gltfAttrib: spec.Attribute_t;
        let _buf: IBuffer;

        // attributes;
        _acc = this._ref_accessors[primitive.attributes.POSITION];
        if (_acc) {
            const _bv = this._ref_bufferViews[_acc.bufferView];
            _gltfAttrib = this._getAttribute(_bv, _acc);
            _geo.addAttribute({
                buffer: this._getBuffer(_bv, _acc),
                shaderLocation: ShaderLocation_e.ATTRIB_POSITION,
                size: _gltfAttrib.size,
                type: _gltfAttrib.type,
                normalized: _gltfAttrib.normalized,
                stride: _bv.byteStride,
                offset: _gltfAttrib.offset,
            });
        }

        _acc = this._ref_accessors[primitive.attributes.NORMAL];
        if (_acc) {
            const _bv = this._ref_bufferViews[_acc.bufferView];
            _gltfAttrib = this._getAttribute(_bv, _acc);
            _geo.addAttribute({
                buffer: this._getBuffer(_bv, _acc),
                shaderLocation: ShaderLocation_e.ATTRIB_NORMAL,
                size: _gltfAttrib.size,
                type: _gltfAttrib.type,
                normalized: _gltfAttrib.normalized,
                stride: _bv.byteStride,
                offset: _gltfAttrib.offset,
            });
        }

        _acc = this._ref_accessors[primitive.attributes.TANGENT];
        if (_acc) {
            const _bv = this._ref_bufferViews[_acc.bufferView];
            _gltfAttrib = this._getAttribute(_bv, _acc);
            _geo.addAttribute({
                buffer: this._getBuffer(_bv, _acc),
                shaderLocation: ShaderLocation_e.ATTRIB_TANGENT,
                size: _gltfAttrib.size,
                type: _gltfAttrib.type,
                normalized: _gltfAttrib.normalized,
                stride: _bv.byteStride,
                offset: _gltfAttrib.offset,
            });
        }

        for (let i = 0, N = 5; i < N; ++i) {
            //@ts-ignore;
            _acc = this._ref_accessors[primitive.attributes[`TEXCOORD_${i}`]];
            if (_acc) {
                const _bv = this._ref_bufferViews[_acc.bufferView];
                _gltfAttrib = this._getAttribute(_bv, _acc);
                _geo.addAttribute({
                    buffer: this._getBuffer(_bv, _acc),
                    shaderLocation: ShaderLocation_e.ATTRIB_TEXTURE_UV_0 + i,
                    size: _gltfAttrib.size,
                    type: _gltfAttrib.type,
                    normalized: _gltfAttrib.normalized,
                    stride: _bv.byteStride,
                    offset: _gltfAttrib.offset,
                });
            }
        }

        // indices;
        _acc = this._ref_accessors[primitive.indices];
        if (_acc) {
            const _bv = this._ref_bufferViews[_acc.bufferView];
            if (_bv) {
                _buf = this._getBuffer(_bv, _acc);
                _geo.setIndexBuffer(_buf);
                _geo.setDrawElementsParameters(
                    primitive.mode ?? glC.TRIANGLES,
                    _acc.count,
                    _acc.componentType,
                    _acc.byteOffset ?? 0
                );
            } else {
                log.warn("[GLTFParser] index accessor exist, but NO buffer view!");
            }
        } else {
            _geo.setDrawArraysParameters(primitive.mode ?? glC.TRIANGLES, 0, _acc.count);
        }
        const _primitive: Primitive = new Primitive(primitive.name, _geo);
        _primitive.material = this._output.CGMaterials[primitive.material];
        return _primitive;
    }

    private _getBuffer(bv: spec.GLTFBufferView_t, accessor: spec.GLTFAccessor_t): IBuffer {
        let _buf = this._arrBuffers[accessor.bufferView];
        if (!_buf) {
            _buf = new Buffer(bv.target);//ARRAY_BUFFER : 34962
            if (accessor.componentType === glC.FLOAT) {//5126
                _buf.updateData(new Float32Array(this._arrData[bv.buffer], bv.byteOffset ?? 0, bv.byteLength / 4));
            } else if (accessor.componentType === glC.UNSIGNED_INT) {//5125
                _buf.updateData(new Uint32Array(this._arrData[bv.buffer], bv.byteOffset ?? 0, bv.byteLength / 4));
            } else if (accessor.componentType === glC.UNSIGNED_SHORT) {//5123
                _buf.updateData(new Uint16Array(this._arrData[bv.buffer], bv.byteOffset ?? 0, bv.byteLength / 2));
            } else if (accessor.componentType === glC.UNSIGNED_BYTE) {//5121
                _buf.updateData(new Uint8Array(this._arrData[bv.buffer], bv.byteOffset ?? 0, bv.byteLength));
            }

            this._arrBuffers[accessor.bufferView] = _buf;
        }
        return _buf;
    }

    private _getAttribute(bv: spec.GLTFBufferView_t, accessor: spec.GLTFAccessor_t): spec.Attribute_t {
        return {
            //@ts-ignore
            size: accessorTypeToNumber[accessor.type],
            type: accessor.componentType,
            normalized: accessor.normalized ?? false,
            offset: accessor.byteOffset ?? 0,
        }
    }
}

//@ts-ignore
window.parseGLTF = GLTFParser;

const accessorTypeToNumber = Object.freeze({
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16,
});
