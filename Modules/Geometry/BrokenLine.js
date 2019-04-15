import loadShaderResource from "../../garbageFuncs.js";
import GL 		          from "../../gl.js";
import Camera             from "../../Components/Camera.js";
import Core               from "../../core.js";
import Shader             from "../../Shader.js";
import { Components }     from "../../ECS.js";
import { PointCollection, Point } from "./PointCollection.js";


class BrokenLineStorage{
	constructor(){
		if(!Core.mShaderProgs.get("BrokenLine")){
			loadShaderResource('../../Shaders/brokenLineVertex.vs', 'brokenLine_v');
        	loadShaderResource('../../Shaders/brokenLineFragment.fs', 'brokenLine_f');
        	let shader = new Shader("BrokenLineShader", Core.shadersSrc.get("brokenLine_v"), Core.shadersSrc.get("brokenLine_f"));
			Core.mShaderProgs.set( "BrokenLine",  shader);
			shader.prepareUniform("uProjView", "mat4");
			shader.prepareUniform("color", "vec3");
		}
		this.shader = Core.mShaderProgs.get("BrokenLine");
		this.vao         = null;
		this.brokenLines = [];
	}
	static addToStorage(storage, brokenLine){ storage.brokenLines.push(brokenLine); }

} Components(BrokenLineStorage);

class BrokenLine{
	constructor(geometry){
		this.geometry        = geometry;
		this.bufSize		 = 100;
		this.visible		 = true;
		this.size            = 0;
		this.color           = [0,0,0];

		this.indexBuffer = GL.ctx.createBuffer();
		GL.ctx.bindBuffer(GL.ctx.ELEMENT_ARRAY_BUFFER, this.indexBuffer );
        GL.ctx.bufferData(GL.ctx.ELEMENT_ARRAY_BUFFER, 100, GL.ctx.DYNAMIC_DRAW );
        GL.ctx.bindBuffer(GL.ctx.ELEMENT_ARRAY_BUFFER, null );

        BrokenLineStorage.addToStorage(geometry.brokenLineStorage, this);

	}

	addPoint(point){
		if(!point instanceof Point) { console.error("Adding to broken line an object that is not a Point"); return; }
		if(point.index === undefined) PointCollection.addPoint(this.geometry.pointCollection, point);

		GL.ctx.bindBuffer(GL.ctx.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
		GL.ctx.bufferSubData(GL.ctx.ELEMENT_ARRAY_BUFFER, Uint16Array.BYTES_PER_ELEMENT*this.size , new Uint16Array([point.index]), 0, null);
		GL.ctx.bindBuffer(GL.ctx.ELEMENT_ARRAY_BUFFER, null);
		this.size++;
	}

	setColor(cHex){ this.color = GL.rgbArray(cHex); }
}

let brokenLineDrawFunction = function(e){
	let storage = e.com.BrokenLineStorage;
	if(storage.brokenLines.length === 0) return;

	e.com.BrokenLineStorage.shader.bind();
	e.com.BrokenLineStorage.shader.setUniform("uProjView", Camera.getProjectionViewMatrix( Core.camera.com.Camera ) );

	GL.ctx.bindVertexArray(storage.vao.id);
	for(let i=0; i<storage.brokenLines.length; i++){
		if(storage.brokenLines[i].size <= 1 || !storage.brokenLines[i].visible) continue;
		e.com.BrokenLineStorage.shader.setUniform("color", storage.brokenLines[i].color);
		
		GL.ctx.bindBuffer(GL.ctx.ELEMENT_ARRAY_BUFFER, storage.brokenLines[i].indexBuffer);
		GL.ctx.drawElements(GL.ctx.LINE_STRIP, storage.brokenLines[i].size, GL.ctx.UNSIGNED_SHORT, 0);
		GL.ctx.bindBuffer(GL.ctx.ELEMENT_ARRAY_BUFFER, null);
	}
	GL.ctx.bindVertexArray(null);
}

export default BrokenLine;

export { brokenLineDrawFunction, BrokenLineStorage };