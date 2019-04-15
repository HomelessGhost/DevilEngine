import loadShaderResource from "../../garbageFuncs.js";
import GL 		          from "../../gl.js";
import Camera             from "../../Components/Camera.js";
import Core               from "../../core.js";
import Shader             from "../../Shader.js";
import { Components }     from "../../ECS.js";
import { PointCollection, Point } from "./PointCollection.js";
import VAO from "../../VAO.js";

let vShader = '#version 300 es\n'+
			'layout(location=0) in vec3 a_position;'+
			'uniform mat4 uProjView;'+
			'void main(void){'+
				'gl_PointSize = 6.0;' +
				'gl_Position = uProjView * vec4(a_position.xyz, 1.0);'+ 
			'}';

let fShader = '#version 300 es\n'+
			'precision mediump float;'+
			'uniform vec3 color;'+
			'out vec4 finalColor;'+
			'void main(void){ finalColor = vec4(color, 1.0); }';


class DebugObjectStorage{
	constructor(){
		if(!Core.mShaderProgs.get("DebugObject")){
        	let shader = new Shader("DebugObjectShader", vShader, fShader);
			Core.mShaderProgs.set( "DebugObject",  shader);
			shader.prepareUniform("uProjView", "mat4");
			shader.prepareUniform("color", "vec3");
		}
		this.shader = Core.mShaderProgs.get("DebugObject");
		this.debugObjects = [];
	}
	static addToStorage(storage, debugObject){ storage.debugObjects.push(debugObject); }

} Components(DebugObjectStorage);



class DebugObject{
	constructor(geometry, vertCount, cHex){
		this.geometry = geometry;

		this.visible = false;
		this.bufSize		 = Float32Array.BYTES_PER_ELEMENT * 3 * vertCount * 2;
		this.drawMode = null;
		this.color = cHex ? GL.rgbArray(cHex) : [0,0,0];
		this.mVerts = [];
		this.mVertBuffer = 0;
		this.mVertCount = 0;
		this.vao = new VAO; 

		this.vao.create()
			.emptyFloatBuffer("bVertices",this.bufSize , Shader.ATTRIB_POSITION_LOC, 3, 0, 0, false) //Setup buffer and verts
			.finalize("DebugStuff");

		DebugObjectStorage.addToStorage(geometry.debugObjectStorage, this);

	}

	setNormals(nLen, verts, normals){
		if(verts === undefined || normals === undefined) return this;

		this.mVerts = [];
		var len = verts.length;
		for(let i=0; i < len; i+=3){
			this.mVerts.push(
				verts[i],
				verts[i+1],
				verts[i+2],
				verts[i]   + normals[i]   * nLen,
				verts[i+1] + normals[i+1] * nLen,
				verts[i+2] + normals[i+2] * nLen,
			);

		}
		this.drawMode = GL.ctx.LINES;

		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER, this.vao.vao["bVertices"].id);
		GL.ctx.bufferSubData(GL.ctx.ARRAY_BUFFER, 0, new Float32Array(this.mVerts), 0, null);
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,null);

		this.mVertCount = this.mVerts.length / 3;

		return this;
	}

	setLines(verts){
		this.mVerts = [];
		var len = verts.length;
		for(let i=0; i < len; i++){
			this.mVerts.push(
				verts[i].position[0],
				verts[i].position[1],
				verts[i].position[2],
			);
		}

		this.drawMode = GL.ctx.LINES;

		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER, this.vao.vao["bVertices"].id);
		GL.ctx.bufferSubData(GL.ctx.ARRAY_BUFFER, 0, new Float32Array(this.mVerts), 0, null);
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,null);

		this.mVertCount = this.mVerts.length / 3;
		return this;
	}

	setDots(verts){
		this.mVerts = [];
		var len = verts.length;
		for(let i=0; i < len; i+=3){
			this.mVerts.push(
				verts[i],
				verts[i+1],
				verts[i+2]
			);
		}

		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER, this.vao.vao["bVertices"].id);
		GL.ctx.bufferSubData(GL.ctx.ARRAY_BUFFER, 0, new Float32Array(this.mVerts), 0, null);
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,null);

		this.mVertCount = this.mVerts.length / 3;
		this.drawMode = GL.ctx.POINTS;
		return this;
	}
}

let debugObjectDrawFunction = function(e){
	let storage = e.com.DebugObjectStorage;
	if(storage.debugObjects.length === 0) return;

	e.com.DebugObjectStorage.shader.bind();
	e.com.DebugObjectStorage.shader.setUniform("uProjView", Camera.getProjectionViewMatrix( Core.camera.com.Camera ) );

	
	for(let i=0; i<storage.debugObjects.length; i++){
		if(!storage.debugObjects[i].visible) continue;
		if(storage.debugObjects[i].mVerts.length ===0) continue;
		e.com.DebugObjectStorage.shader.setUniform("color", storage.debugObjects[i].color);
		
		GL.ctx.bindVertexArray(storage.debugObjects[i].vao.vao.id);
		GL.ctx.drawArrays(storage.debugObjects[i].drawMode, 0, storage.debugObjects[i].mVerts.length/3);
	}
	GL.ctx.bindVertexArray(null);
}

export default DebugObject;

export { DebugObjectStorage, debugObjectDrawFunction };