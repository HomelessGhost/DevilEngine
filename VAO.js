import GL 		from "./gl.js";
import Core	    from "./core.js";
import Shader	from "./Shader.js";

class VAO{
    constructor(){ this.vao = null; }

    //----------------------------------------------------------
    create(){
        this.vao = {
            id			: GL.ctx.createVertexArray(),
            elmCount	: 0,
            isIndexed	: false,
            isInstanced	: false
        };

        //vao.instanceCount - Added dynamicly if needed.

        GL.ctx.bindVertexArray(this.vao.id);
        return this;
    }

    finalize(name){
        if(this.vao.elmCount === 0 && this.vao.bVertices !== undefined) this.vao.elmCount = this.vao.bVertices.elmCount;

        GL.ctx.bindVertexArray( null );
        GL.ctx.bindBuffer( GL.ctx.ARRAY_BUFFER, null );
        GL.ctx.bindBuffer( GL.ctx.ELEMENT_ARRAY_BUFFER, null );

        Core.mVAOCache.set(name, this.vao);
        return this.vao;
    }

    setInstanced(cnt){
        this.vao.isInstanced	= true;
        this.vao.instanceCount	= cnt;
        return this;
    }

    cleanup(){ this.vao = null; return this; }
    //endregion

    //----------------------------------------------------------
    //Float Array Buffers
    floatBuffer(name, aryData, attrLoc, compLen=3, stride=0, offset=0, isStatic=true, isInstance=false){
        let rtn = {
            id			: GL.ctx.createBuffer(),
            compLen		: compLen,
            stride		: stride,
            offset		: offset,
            elmCount	: aryData.length / compLen
        };

        let ary = (aryData instanceof Float32Array)? aryData : new Float32Array(aryData);
        GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER, rtn.id);
        GL.ctx.bufferData(GL.ctx.ARRAY_BUFFER, ary, (isStatic)? GL.ctx.STATIC_DRAW : GL.ctx.DYNAMIC_DRAW );
        GL.ctx.enableVertexAttribArray( attrLoc );
        GL.ctx.vertexAttribPointer(attrLoc, compLen, GL.ctx.FLOAT, false, stride, offset);

        if(isInstance === true) GL.ctx.vertexAttribDivisor(attrLoc, 1);

        this.vao[name] = rtn;
        return this;
    }


    partitionFloatBuffer(attrLoc, compLen, stride=0, offset=0, isInstance=false){
        GL.ctx.enableVertexAttribArray(attrLoc);
        GL.ctx.vertexAttribPointer(attrLoc, compLen, GL.ctx.FLOAT, false, stride, offset);

        if(isInstance) GL.ctx.vertexAttribDivisor(attrLoc, 1);

        return this;
    }


    emptyFloatBuffer(name, byteCount, attrLoc, compLen, stride=0, offset=0, isStatic=false, isInstance=false){
        let rtn = {
            id			: GL.ctx.createBuffer(),
            compLen		: compLen,
            stride		: stride,
            offset		: offset,
            elmCount	: 0
        };

        GL.ctx.bindBuffer( GL.ctx.ARRAY_BUFFER, rtn.id);
        GL.ctx.bufferData( GL.ctx.ARRAY_BUFFER, byteCount, (isStatic)? GL.ctx.STATIC_DRAW : GL.ctx.DYNAMIC_DRAW);
        GL.ctx.enableVertexAttribArray( attrLoc );
        GL.ctx.vertexAttribPointer( attrLoc, compLen, GL.ctx.FLOAT, false, stride, offset );

        if(isInstance) GL.ctx.vertexAttribDivisor( attrLoc, 1 );

        this.vao[name] = rtn;
        return this;
    }
    //endregion


    //----------------------------------------------------------
    //Matrix 4 Array Buffer
    mat4ArrayBuffer(name, aryData, attrLoc, isStatic=true, isInstance=false){
        let rtn = {
            id			: GL.ctx.createBuffer(),
            compLen		: 4,
            stride		: 64,
            offset		: 0,
            elmCount	: aryFloat.length / 16
        };

        let ary = (aryData instanceof Float32Array)? aryData : new Float32Array(aryData);

        GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER, rtn.id);
        GL.ctx.bufferData(GL.ctx.ARRAY_BUFFER, ary, (isStatic !== false)? GL.ctx.STATIC_DRAW : GL.ctx.DYNAMIC_DRAW );

        //Matrix is treated like an array of vec4, So there is actually 4 attributes to setup that
        //actually makes up a single mat4.
        GL.ctx.enableVertexAttribArray( attrLoc );
        GL.ctx.vertexAttribPointer( attrLoc,	4, GL.ctx.FLOAT, false, 64, 0 );

        GL.ctx.enableVertexAttribArray( attrLoc+1 );
        GL.ctx.vertexAttribPointer( attrLoc+1,	4, GL.ctx.FLOAT, false, 64, 16);

        GL.ctx.enableVertexAttribArray( attrLoc+2 );
        GL.ctx.vertexAttribPointer( attrLoc+2,	4, GL.ctx.FLOAT, false, 64, 32);

        GL.ctx.enableVertexAttribArray( attrLoc+3 );
        GL.ctx.vertexAttribPointer( attrLoc+3,	4, GL.ctx.FLOAT, false, 64, 48);

        if(isInstance){
            GL.ctx.vertexAttribDivisor( attrLoc,	1 );
            GL.ctx.vertexAttribDivisor( attrLoc+1,	1 );
            GL.ctx.vertexAttribDivisor( attrLoc+2,	1 );
            GL.ctx.vertexAttribDivisor( attrLoc+3,	1 );
        }

        this.vao[name] = rtn;
        return this;
    }
    //endregion


    //----------------------------------------------------------
    //Indexes
    indexBuffer(name, aryData, isStatic=true){
        let rtn = {	id 			: GL.ctx.createBuffer(),
                elmCount 	: aryData.length	},
            ary = (aryData instanceof Uint16Array)? aryData : new Uint16Array(aryData);

        GL.ctx.bindBuffer(GL.ctx.ELEMENT_ARRAY_BUFFER, rtn.id );
        GL.ctx.bufferData(GL.ctx.ELEMENT_ARRAY_BUFFER, ary, (isStatic)? GL.ctx.STATIC_DRAW : GL.ctx.DYNAMIC_DRAW );

        this.vao[name]		= rtn;
        this.vao.elmCount	= aryData.length;
        this.vao.isIndexed	= true;
        return this;
    }

    emptyIndexBuffer(name, byteCount, isStatic=false){
        let rtn = { id:GL.ctx.createBuffer(), elmCount:0 };

        GL.ctx.bindBuffer(GL.ctx.ELEMENT_ARRAY_BUFFER, rtn.id );
        GL.ctx.bufferData(GL.ctx.ELEMENT_ARRAY_BUFFER, byteCount, (isStatic)? GL.ctx.STATIC_DRAW : GL.ctx.DYNAMIC_DRAW );

        this.vao[name]		= rtn;
        this.vao.isIndexed	= true;
        return this;
    }
    //endregion


    //----------------------------------------------------------
    //Static Functions
    static bind(vao){	GL.ctx.bindVertexArray(vao.id); return VAO; }
    static unbind(){	GL.ctx.bindVertexArray( null ); return VAO; }
    static draw(vao, drawMode = GL.ctx.TRIANGLES, doBinding=false){
        if(doBinding) GL.ctx.bindVertexArray(vao.id);

        if(vao.elmCount !== 0){
            if(vao.isIndexed)	GL.ctx.drawElements(drawMode, vao.elmCount, GL.ctx.UNSIGNED_SHORT, 0);
            else				GL.ctx.drawArrays(drawMode, 0, vao.elmCount);
        }

        if(doBinding) GL.ctx.bindVertexArray(null);
        return VAO;
    }

    //static updateAryBufSubData(bufID, offset, data){
    //	GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER, bufID);
    //	GL.ctx.bufferSubData(GL.ctx.ARRAY_BUFFER, offset, data, 0, null);
    //	GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER, null);
    //}
    //endregion


    //----------------------------------------------------------
    //Templates
    static standardRenderable(name, vertCompLen, aryVert, aryNorm=null, aryUV=null, aryInd=null, aryTan=null, aryBi=null){
        let o = new VAO().create()
            .floatBuffer("bVertices", aryVert, Shader.ATTRIB_POSITION_LOC, vertCompLen);

        if(aryNorm)	o.floatBuffer("bNormal", aryNorm, Shader.ATTRIB_NORMAL_LOC, 3);
        if(aryUV)	o.floatBuffer("bUV", aryUV, Shader.ATTRIB_UV_LOC, 2);
        if(aryInd)	o.indexBuffer("bIndex", aryInd);

        if(aryTan)	o.floatBuffer("bTangent", aryTan, Shader.ATTRIB_TANGENT_LOC, 3);
        if(aryBi)	o.floatBuffer("bBitangent", aryBi, Shader.ATTRIB_BITANGENT_LOC, 3);

        let vao = o.finalize(name);
        o.cleanup();

        return vao;
    }

    static standardArmature(name, vertCompLen, aryVert, aryNorm=null, aryUV=null, aryInd=null, jointSize=0, aryJoint = null, aryWeight = null){
        var o = new VAO().create()
            .floatBuffer("bVertices", aryVert, Shader.ATTRIB_POSITION_LOC, vertCompLen);

        if(aryNorm)	o.floatBuffer("bNormal", aryNorm, Shader.ATTRIB_NORMAL_LOC, 3);
        if(aryUV)	o.floatBuffer("bUV", aryUV, Shader.ATTRIB_UV_LOC, 2);
        if(aryInd)	o.indexBuffer("bIndex", aryInd);
        if(jointSize > 0){
            o.floatBuffer("bJointIdx",		aryJoint,	Shader.ATTRIB_JOINT_IDX_LOC,	jointSize);
            o.floatBuffer("bJointWeight",	aryWeight,	Shader.ATTRIB_JOINT_WEIGHT_LOC,	jointSize);
        }

        var vao = o.finalize(name);
        o.cleanup();

        return vao;
    }

    static standardEmpty(name, vertCompLen=3, vertCnt=4, normLen=0, uvLen=0, indexLen=0){
        var o = new Vao().create()
            .emptyFloatBuffer("bVertices",
                Float32Array.BYTES_PER_ELEMENT * vertCompLen * vertCnt,
                Shader.ATTRIB_POSITION_LOC, vertCompLen );

        //if(aryNorm)	VAO.floatArrayBuffer(rtn,	"bNormal",	aryNorm,	ATTR_NORM_LOC,	3,0,0,true);
        if(uvLen > 0)		o.emptyFloatBuffer("bUV", Float32Array.BYTES_PER_ELEMENT * 2 * uvLen, Shader.ATTRIB_UV_LOC, 2);
        if(indexLen > 0)	o.emptyIndexBuffer("bIndex", Uint16Array.BYTES_PER_ELEMENT * indexLen, false);

        var vao = o.finalize(name);
        o.cleanup();

        return vao;
    }
    //endregion
}

export default VAO;