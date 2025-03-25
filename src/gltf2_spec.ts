
export type GLTFScene_t = {
    name?: string;
    nodes: number[],
};

export type GLTFNode_t = {
    name?: string;
    children?: number[];
    matrix?: number[];
    translation?: number[];
    rotation?: number[];
    scale?: number[];
    mesh?: number,
    camera?: number,
};

export type GLTFPrimitive_t = {
    name?: string;
    mode?: number,
    indices?: number,
    attributes: {
        POSITION: number,
        NORMAL?: number,
        TANGENT?: number,
        TEXCOORD_0?: number,
        TEXCOORD_1?: number,
        TEXCOORD_2?: number,
        TEXCOORD_3?: number,
    },
    material?: number,
};

export type GLTFBuffer_t = {
    byteLength: number,
    uri: string,
}

export type GLTFBufferView_t = {
    name?: string,
    buffer: number,
    byteOffset?: number,//0
    byteLength: number,
    byteStride?: number,
    target?: number,
}

export type GLTFAccessor_t = {
    normalized?: boolean,
    bufferView: number,
    byteOffset?: number,
    type: String,
    componentType: number,
    count: number,//The number of elements referenced by this accessor, not to be confused with the number of bytes or number of components.
    min?: number[],
    max?: number[],
}

export type GLTFMesh_t = {
    name?: string,
    primitives: GLTFPrimitive_t[],
};

export type GLTFv2_t = {
    scene?: number,
    scenes?: GLTFScene_t[],
    nodes?: GLTFNode_t[],
    meshes?: GLTFMesh_t[],
    buffers?: GLTFBuffer_t[],
    bufferViews?: GLTFBufferView_t[],
    accessors?: GLTFAccessor_t[],
    materials?: GLTFMaterial_t[],
    images?: GLTFImage_t[],
    samplers?: GLTFSampler_t[],
    textures?: GLTFTexture_t[],
}

export type GLTFMaterial_t = {
    name: string;
    doubleSided?: boolean,//false
    alphaMode?: string,// "OPAQUE"
    pbrMetallicRoughness?: {
        baseColorTexture: {
            index: number,
            texCoord?: number
        },
        baseColorFactor: number[],
        metallicRoughnessTexture: {
            index: number,
            texCoord?: number
        },
        metallicFactor: number,
        roughnessFactor: number,
    }
    normalTexture: {
        scale: number,
        index: number,
        texCoord?: number,
    },
    occlusionTexture: {
        strength: number,
        index: number,
        texCoord?: number,
    },
    emissiveTexture: {
        index: number,
        texCoord?: number,
    },
    emissiveFactor: number[],
};

export type GLTFImage_t = {
    uri?: string,
    bufferView?: number,
    mimeType?: string,
};

export type GLTFSampler_t = {
    magFilter: number,
    minFilter: number,
    wrapS: number,
    wrapT: number,
};

export type GLTFTexture_t = {
    name?: string;
    source?: number,
    sampler?: number,
};

export type Attribute_t = {
    size: number;
    type: number;
    normalized: boolean;
    offset: number
}

