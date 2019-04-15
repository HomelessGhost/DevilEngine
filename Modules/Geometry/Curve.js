import { Components } from "../../ECS.js";
import { PointCollection, Point } from "./PointCollection.js";
import BrokenLine, { brokenLineDrawFunction } from "./BrokenLine.js";
import CurveSpline                            from "./CurveSpline.js";
import Core               from "../../core.js";
import loadShaderResource from "../../garbageFuncs.js";
import Shader             from "../../Shader.js";
import GL 		          from "../../gl.js";
import Camera             from "../../Components/Camera.js";

class CurveStorage{
	constructor(){
		if(!Core.mShaderProgs.get("SplineDot")){
			loadShaderResource('../../Shaders/stdVertex.vs', 'std_v');
        	loadShaderResource('../../Shaders/stdFragment.fs', 'std_f');
        	let shader = new Shader("SplineDotShader", Core.shadersSrc.get("std_v"), Core.shadersSrc.get("std_f"));
			Core.mShaderProgs.set( "SplineDot",  shader);
			shader.prepareUniform("uProjView", "mat4");
		}
		this.shader = Core.mShaderProgs.get("SplineDot");
		this.curves = [];
	}

	static addToStorage(storage, curve){ storage.curves.push(curve); }
} Components(CurveStorage);


class Curve{
	constructor(geometry, sX, dX, oX, oZ, func){
		this.geometry = geometry;
		this.refID = geometry._getRefID();

		this.visible = true;

		this.controlPoints = [];
		this.size = sX;
		this.brokenLine = geometry.createBrokenLine();
		this.brokenLine.setColor("#0fd826");

		this.spline = null;

		let y = 0;
		let x = -(sX/2)/dX;

		for(let j=0; j<sX; j++){
	
			if(!func) this.controlPoints.push( new Point(x+j/dX + oX, y, 0 + oZ, "ff0000") );
			else      this.controlPoints.push( new Point(x+j/dX + oX, func(x+j/dX, 0), 0 + oZ, "ff0000") );
			
		}

		for(let i=0; i<this.controlPoints.length; i++) {
			PointCollection.addPoint(geometry.pointCollection, this.controlPoints[i]);
			this.controlPoints[i].references.push({ callback : this.onUpdateCallback.bind(this), refID : this.refID  });
		}

		for(let i=0; i<sX; i++){ this.brokenLine.addPoint(this.controlPoints[i]); }

		this.references = [];

		CurveStorage.addToStorage(geometry.curveStorage, this);
	}

	disableBrokenLine(){ this.brokenLine.visible = false; return this; }
	enableBrokenLine(){  this.brokenLine.visible = true;  return this; }

	enableDebugPoints(){ this.spline.debugPoints.visible = true; return this; }
	disableDebugPoints(){ this.spline.debugPoints.visible = false; return this; }

	addSpline(splinePointsCount, buildMode, drawMode, q){
		this.spline = new CurveSpline(this, splinePointsCount, buildMode, drawMode, q);
		return this;
	}

	addPoint(point){
		if(!point instanceof Point) { console.error("Adding to broken line an object that is not a Point"); return; }
		if(point.index === undefined) PointCollection.addPoint(this.geometry.pointCollection, point);
		this.controlPoints.push(point);
		point.references.push({ callback : this.onUpdateCallback.bind(this), refID : this.refID });
		this.brokenLine.addPoint(point);
	}

	onUpdateCallback(){ this.sendUpdateRequest(); if(this.spline && this.visible) this.spline.update(); }
	sendUpdateRequest(){ for(let i=0; i<this.references.length; i++) this.references[i](); }

}

let curveDrawFunction = function(e){
	let storage = e.com.CurveStorage;
	if(storage.curves.length === 0) return;

	let shader = e.com.CurveStorage.shader;
	shader.bind();
	shader.setUniform("uProjView", Camera.getProjectionViewMatrix( Core.camera.com.Camera ) );
	for(let i=0; i<storage.curves.length; i++){
		if(!storage.curves[i].spline || !storage.curves[i].visible) continue;
		GL.ctx.bindVertexArray(storage.curves[i].spline.vao.vao.id);
		switch(storage.curves[i].spline.drawMode){

			case CurveSpline.POINTS:
				GL.ctx.drawArrays(GL.ctx.POINTS, 0, storage.curves[i].spline.verts.length/3);
				break;
			case CurveSpline.LINE:
				GL.ctx.drawArrays(GL.ctx.LINE_STRIP, 0, storage.curves[i].spline.verts.length/3);
				break;
		}
	}
	GL.ctx.bindVertexArray(null);
}

export default Curve;

export { CurveStorage, curveDrawFunction }; 