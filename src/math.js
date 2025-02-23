class float32AsVec3{
    #_rawFloat32Array=undefined;
    #_numberOfVec3=0;
    #_pivot=-1;
    constructor(arr32,pivot=0){
        if(!(arr32 instanceof Float32Array)) CG.vital("[float32AsVec3] parameter must be of type Float32Array!");
        let _n=Math.floor(arr32.length/3);
        if(_n*3!=arr32.length)CG.warn(`[float32AsVec3] parameter should have length that is times of 3, but actually with ${arr32.length}. I'll ignore extra data.`);
        this.#_numberOfVec3=_n;
        this.#_rawFloat32Array=arr32;
        this.setPivot(pivot);
    }

    setPivot(p){
        this.#_pivot=Math.max(0,Math.min(this.#_numberOfVec3-1,p));
        return this;
    }

    /*
    multiplyMat33(mat33){
        const _rawData=this.#_rawFloat32Array;
        for(let i=this.#_pivot;i<this.#_numberOfVec3;++i){
            this.multiplyMat33AtPivotOnly(mat33);
        }
    }

    multiplyMat33At(pivot,mat33){
        const _rawData=this.#_rawFloat32Array;
        let _indexInFloat32=this.#_pivot*3;
        _rawData[_indexInFloat32+0]=mat33;
        //TODO:
    }
    */
}

class Vec4 {
    x;
    y;
    z;
    w;
  constructor(x = 0, y = 0, z = 0,w=0) {
        this.reset(x,y,z,w);
  }

    reset(x,y,z,w){
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    }

  // Magnitude and normalization
  magnitude() {
    return Math.sqrt(this.dot(this));
  }
  magnitudeSquared() {
    return this.dot(this);
  }

  // Dot product
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z+this.w*v.w;
  }

  add(x,y,z,w,newVec=false) {
    let _v=newVec?this.clone():this;
    _v.x += x;
    _v.y += y;
    _v.z += z;
    _v.w += w;
    return _v;
  }
  addVec(v,newVec=false) {
    return this.add(v.x,v.y,v.z,v.w,newVec);
  }

  multiply(scalar,newVec=false) {
    let _v=newVec?this.clone():this;
    _v.x *= scalar;
    _v.y *= scalar;
    _v.z *= scalar;
    _v.w *= scalar;
    return _v;
  }

  normalize(newVec=false) {
    let _v=newVec?this.clone():this;
    const mag = this.magnitude();
    if (mag === 0) { // Avoid division by zero
      return _v;
    }
    return _v.multiply(1/mag,false);
  }

    clone(){return new Vec4(this.x,this.y,this.z,this.w);}

    toString() {
        return `(${this.x}, ${this.y}, ${this.z}, ${this.w})`;
    }
}

class Vec3 {
    x;
    y;
    z;
  constructor(x = 0, y = 0, z = 0) {
        this.reset(x,y,z);
  }

    reset(x,y,z){
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

  // Magnitude and normalization
  magnitude() {
    return Math.sqrt(this.dot(this));
  }
  magnitudeSquared() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  // Dot product
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v,newVec=false) {
    let _v=newVec?this.clone():this;
    const _x=_v.x;
    const _y=_v.y;
    const _z=_v.z;
    _v.x=_y * v.z - _z * v.y,
    _v.y=_z * v.x - _x * v.z,
    _v.z= _x * v.y - _y * v.x
    return _v;
  }

  add(x,y,z,newVec=false) {
    let _v=newVec?this.clone():this;
    _v.x += x;
    _v.y += y;
    _v.z += z;
    return _v;
  }
  addVec(v,newVec=false) {
    return this.add(v.x,v.y,v.z,newVec);
  }

  multiply(scalar,newVec=false) {
    let _v=newVec?this.clone():this;
    _v.x *= scalar;
    _v.y *= scalar;
    _v.z *= scalar;
    return _v;
  }

  normalize(newVec=false) {
    let _v=newVec?this.clone():this;
    const mag = this.magnitude();
    if (mag === 0) { // Avoid division by zero
      return _v;
    }
    return _v.multiply(1/mag,false);
  }

    clone(){return new Vec3(this.x,this.y,this.z);}

    /*
    static fromFloat32Array(arr32,arrVec3=undefined){
        arrVec3?=arrVec3:[];
        const _N=Math.floor(arr32.length/3);
        if(_N<1)return arrVec3;
        else{
            for(let i=0;i<_N;++i){
                arrVec3[i]=new Vec3(arr32[i*3+0], arr32[i*3+1], arr32[i*3+2]);
            }
            return arrVec3;
        }
    }
    static toFloat32Array(arrVec3,arr32=undefined){
        arr32?=arr32:[];
        const _N=arrVec3.length;
        if(_N<1)return arr32;
        else{
            for(let i=0;i<_N*3;++i){
                let _v=arrVec3[i];
                arr32[i*3+0]=_v.x;
                arr32[i*3+1]=_v.y;
                arr32[i*3+2]=_v.z;
            }
            return arr32;
        }
    }
    */
    //Useful to print the vector
    toString() {
        return `(${this.x}, ${this.y}, ${this.z})`;
    }
}

const _identityMat44Data=Object.freeze([
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    0,0,0,1]);

class Mat44{
    _dataArr32=new Float32Array(16);// row major in store.
    constructor(){}

    reset(arrLikeData=undefined,startIndex=0,isColumnMajor=false){
        arrLikeData??=_identityMat44Data;
        if(arrLikeData.length-startIndex<16)throw "[Mat44] parameter lacks of elements, should be at least 16!";
        for(let i=0;i<16;++i,++startIndex){
            this._dataArr32[i]=arrLikeData[startIndex];
        }
        if(isColumnMajor){
            this.transpose();
        }
        return this;
    }

    transpose(newMat=false){
        const _outMat= newMat?new Mat44():this;
        const _data= _outMat._dataArr32;
        let _a=_data[1];_data[1]=_data[4];_data[4]=_a;
        _a=_data[2];_data[2]=_data[8];_data[8]=_a;
        _a=_data[3];_data[3]=_data[12];_data[12]=_a;
        _a=_data[6];_data[6]=_data[9];_data[9]=_a;
        _a=_data[7];_data[7]=_data[10];_data[10]=_a;
        _a=_data[11];_data[11]=_data[14];_data[14]=_a;
        return _outMat;
    }

    multiply(mat44,newMat=false){
        const _dataR=mat44._dataArr32;
        const _outArray=[];
        _outArray.push(this.#dotRowAt(0,_dataR[0],_dataR[4],_dataR[8],_dataR[12]));
        _outArray.push(this.#dotRowAt(0,_dataR[1],_dataR[5],_dataR[9],_dataR[13]));
        _outArray.push(this.#dotRowAt(0,_dataR[2],_dataR[6],_dataR[10],_dataR[14]));
        _outArray.push(this.#dotRowAt(0,_dataR[3],_dataR[7],_dataR[11],_dataR[15]));
        _outArray.push(this.#dotRowAt(1,_dataR[0],_dataR[4],_dataR[8],_dataR[12]));
        _outArray.push(this.#dotRowAt(1,_dataR[1],_dataR[5],_dataR[9],_dataR[13]));
        _outArray.push(this.#dotRowAt(1,_dataR[2],_dataR[6],_dataR[10],_dataR[14]));
        _outArray.push(this.#dotRowAt(1,_dataR[3],_dataR[7],_dataR[11],_dataR[15]));
        _outArray.push(this.#dotRowAt(2,_dataR[0],_dataR[4],_dataR[8],_dataR[12]));
        _outArray.push(this.#dotRowAt(2,_dataR[1],_dataR[5],_dataR[9],_dataR[13]));
        _outArray.push(this.#dotRowAt(2,_dataR[2],_dataR[6],_dataR[10],_dataR[14]));
        _outArray.push(this.#dotRowAt(2,_dataR[3],_dataR[7],_dataR[11],_dataR[15]));
        _outArray.push(this.#dotRowAt(3,_dataR[0],_dataR[4],_dataR[8],_dataR[12]));
        _outArray.push(this.#dotRowAt(3,_dataR[1],_dataR[5],_dataR[9],_dataR[13]));
        _outArray.push(this.#dotRowAt(3,_dataR[2],_dataR[6],_dataR[10],_dataR[14]));
        _outArray.push(this.#dotRowAt(3,_dataR[3],_dataR[7],_dataR[11],_dataR[15]));
        return (newMat?new Mat44():this).reset(_outArray);
    }

    multiplyVec4(vec4,outVec4){
        let _x=this.#dotRowAt(0,vec4.x,vec4.y,vec4.z,vec4.w);
        let _y=this.#dotRowAt(1,vec4.x,vec4.y,vec4.z,vec4.w);
        let _z=this.#dotRowAt(2,vec4.x,vec4.y,vec4.z,vec4.w);
        let _w=this.#dotRowAt(3,vec4.x,vec4.y,vec4.z,vec4.w);
        return (outVec4??new Vec4()).reset(_x,_y,_z,_w);
    }
    clone(){
        return new Mat44().reset(this._dataArr32,0,false);
    }

    determinant(){
        const a=this._dataArr32;
        let a00 = a[0],
            a01 = a[1],
            a02 = a[2],
            a03 = a[3];
        let a10 = a[4],
            a11 = a[5],
            a12 = a[6],
            a13 = a[7];
        let a20 = a[8],
            a21 = a[9],
            a22 = a[10],
            a23 = a[11];
        let a30 = a[12],
            a31 = a[13],
            a32 = a[14],
            a33 = a[15];
        let b00 = a00 * a11 - a01 * a10;
        let b01 = a00 * a12 - a02 * a10;
        let b02 = a00 * a13 - a03 * a10;
        let b03 = a01 * a12 - a02 * a11;
        let b04 = a01 * a13 - a03 * a11;
        let b05 = a02 * a13 - a03 * a12;
        let b06 = a20 * a31 - a21 * a30;
        let b07 = a20 * a32 - a22 * a30;
        let b08 = a20 * a33 - a23 * a30;
        let b09 = a21 * a32 - a22 * a31;
        let b10 = a21 * a33 - a23 * a31;
        let b11 = a22 * a33 - a23 * a32;
        // Calculate the determinant
        return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    }

    invert(newMat=false){
        const a=this._dataArr32;
        let a00 = a[0],
            a01 = a[1],
            a02 = a[2],
            a03 = a[3];
        let a10 = a[4],
            a11 = a[5],
            a12 = a[6],
            a13 = a[7];
        let a20 = a[8],
            a21 = a[9],
            a22 = a[10],
            a23 = a[11];
        let a30 = a[12],
            a31 = a[13],
            a32 = a[14],
            a33 = a[15];
        let b00 = a00 * a11 - a01 * a10;
        let b01 = a00 * a12 - a02 * a10;
        let b02 = a00 * a13 - a03 * a10;
        let b03 = a01 * a12 - a02 * a11;
        let b04 = a01 * a13 - a03 * a11;
        let b05 = a02 * a13 - a03 * a12;
        let b06 = a20 * a31 - a21 * a30;
        let b07 = a20 * a32 - a22 * a30;
        let b08 = a20 * a33 - a23 * a30;
        let b09 = a21 * a32 - a22 * a31;
        let b10 = a21 * a33 - a23 * a31;
        let b11 = a22 * a33 - a23 * a32;
        // Calculate the determinant
        let _det =
            b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
        if (!_det) {
            return null;
        }
        _det = 1.0 / _det;
        const _out=new Array(16);
        _out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * _det;
        _out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * _det;
        _out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * _det;
        _out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * _det;
        _out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * _det;
        _out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * _det;
        _out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * _det;
        _out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * _det;
        _out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * _det;
        _out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * _det;
        _out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * _det;
        _out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * _det;
        _out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * _det;
        _out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * _det;
        _out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * _det;
        _out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * _det;
        return (newMat?new Mat44():this).reset(_out);
    }

    #dotRowAt(row,x,y,z,w){
        const _data=this._dataArr32;
        return _data[row*4+0]*x+ _data[row*4+1]*y+ _data[row*4+2]*z+ _data[row*4+3]*w;
    }

    toString(){
        const _data=this._dataArr32;
        return `${_data[0]}, ${_data[1]}, ${_data[2]}, ${_data[3]}
${_data[4]}, ${_data[5]}, ${_data[6]}, ${_data[7]}
${_data[8]}, ${_data[9]}, ${_data[10]}, ${_data[11]}
${_data[12]}, ${_data[13]}, ${_data[14]}, ${_data[15]}`;
    }
}

window.CG??={};
window.CG.Vec4=Vec4;
window.CG.Vec3=Vec3;
window.CG.Mat44=Mat44;

console.log('[util.js] loaded.');

