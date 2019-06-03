import { Components } from "../../ECS.js";
import { PointCollection, Point } from "./PointCollection.js";
import BrokenLine, { brokenLineDrawFunction } from "./BrokenLine.js";
import SurfaceSpline                          from "./SurfaceSpline.js";
import Core               from "../../core.js";
import loadShaderResource from "../../garbageFuncs.js";
import Shader, { PhongShader }         from "../../Shader.js";
import GL 		          from "../../gl.js";
import Camera             from "../../Components/Camera.js";

class SurfaceStorage{
	constructor(){
		if(!Core.mShaderProgs.get("SplineDot")){
			loadShaderResource('../../Shaders/stdVertex.vs', 'std_v');
        	loadShaderResource('../../Shaders/stdFragment.fs', 'std_f');

        	loadShaderResource('../../Shaders/phongSurface.vs', 'phongSurface_v');
        	loadShaderResource('../../Shaders/phongSurface.fs', 'phongSurface_f');

        	loadShaderResource('../../Shaders/orthogonality.vs', 'orthogonality_v');
        	loadShaderResource('../../Shaders/orthogonality.fs', 'orthogonality_f');

        	let shader = new Shader("SplineDotShader", Core.shadersSrc.get("std_v"), Core.shadersSrc.get("std_f"));
        	let pShader = new PhongShader("PhongShader", Core.shadersSrc.get("phongSurface_v"), Core.shadersSrc.get("phongSurface_f"));
        	let oShader = new Shader("PhongShader", Core.shadersSrc.get("orthogonality_v"), Core.shadersSrc.get("orthogonality_f"));
			Core.mShaderProgs.set( "SplineDot",  shader);
			Core.mShaderProgs.set( "PhongSurface",  pShader);
			Core.mShaderProgs.set( "OrthoSurface",  oShader);
			shader.prepareUniform("uProjView", "mat4");
			shader.prepareUniform("color", "vec3");
			pShader.prepareUniform("uProjView", "mat4");
			pShader.prepareUniform("uTexture", "sampler2D");
			oShader.prepareUniform("uProjView", "mat4");

		}
		this.surfaces = [];
	}

	static addToStorage(storage, surface){ storage.surfaces.push(surface); }
} Components(SurfaceStorage);

class Surface{
	constructor(geometry, sX, sZ, dX, dZ, oX, oZ, func){
		this.geometry = geometry;
		this.refID = geometry._getRefID();

		this.controlPoints = [];
		this.sizeX = sX;
		this.sizeZ = sZ;
		this.xBrokenLines = [];
		this.zBrokenLines = [];
		this.color        = [0.0, 0.0, 1.0];
		this.texture      = null;



		this.spline = null;

		let y = 0;
		let x = -(sX/2)/dX;
		let z = -(sZ/2)/dZ;

		for(let j=0; j<sX; j++){
			for(let i=0; i<sZ; i++){
				if(!func) this.controlPoints.push( new Point(x+j/dX + oX, y, z+i/dZ + oZ, "ff0000") );
				else      this.controlPoints.push( new Point(x+j/dX + oX, func(x+j/dX, z+i/dZ), z+i/dZ + oZ, "ff0000") );
			}
		}

		for(let i=0; i<this.controlPoints.length; i++) {
			PointCollection.addPoint(geometry.pointCollection, this.controlPoints[i]);
			this.controlPoints[i].references.push({ callback : this.onUpdateCallback.bind(this), refID : this.refID });
		}


		for(let i=0; i<sX; i++){
			let brokenLine = geometry.createBrokenLine();
			this.zBrokenLines.push(brokenLine);
			brokenLine.setColor("#0fd826");
			for(let j=0; j<sZ; j++){
				brokenLine.addPoint(this.controlPoints[i*sZ+j]);
			}
		}

		for(let i=0; i<sZ; i++){
			let brokenLine = geometry.createBrokenLine();
			this.xBrokenLines.push(brokenLine);
			brokenLine.setColor("#e26b09");
			for(let j=0; j<sX; j++){
				brokenLine.addPoint(this.controlPoints[j*sZ+i]);
			}
		}

		this.references = [];

		this.type = SurfaceSpline.RECTANGLE_BASE;
		SurfaceStorage.addToStorage(geometry.surfaceStorage, this);
	}

	disableBrokenLines(){
		for(let i=0; i<this.xBrokenLines.length; i++) this.xBrokenLines[i].visible = false;
		for(let i=0; i<this.zBrokenLines.length; i++) this.zBrokenLines[i].visible = false;
		return this;
	}

	enableBrokenLines(){
		for(let i=0; i<this.xBrokenLines.length; i++) this.xBrokenLines[i].visible = true;
		for(let i=0; i<this.zBrokenLines.length; i++) this.zBrokenLines[i].visible = true;
		return this;
	}

	setColor(cHex){ this.color = GL.rgbArray(cHex); return this; }
	setTexture(texture){ this.texture = texture; return this; };

	addSpline(splinePointsX, splinePointsZ, buildMode, drawMode){
		if(buildMode === SurfaceSpline.COONS || buildMode === SurfaceSpline.RULED){
			console.error("Wrong spline type for RECTANGLE_BASE");
			return null;
		}
		this.spline = new SurfaceSpline(this, splinePointsX, splinePointsZ, buildMode, drawMode);
		return this;
	}

	onUpdateCallback(){ this.sendUpdateRequest(); if(this.spline) this.spline.update(); }

	sendUpdateRequest(){ for(let i=0; i<this.references.length; i++) this.references[i](); }		
}

class TwoCurveBase{
	constructor(geometry, size, density, oX, oZ){
		this.geometry = geometry;
		this.refID = geometry._getRefID();

		this.color        = [0.0, 0.0, 1.0];
		this.texture      = null;

		this.c1points = geometry.createCurve(0);
		this.c2points = geometry.createCurve(0);

		let y = 1;
		let x = -(size/2)/density;
		let z = -(size/2)/density;

		let pnt_Ary = [];

		for(let i=0; i<size; i++) pnt_Ary.push(new Point(x+oX, y, z+i/density+oZ,"ff0000"));
		for(let i=0; i<size; i++) pnt_Ary.push(new Point(x+size/density-1/density+oX, y, z+i/density+oZ, "ff0000"));

		for(let i=0; i<size; i++) this.c1points.addPoint(pnt_Ary[i]);
		for(let i=0; i<size; i++) this.c2points.addPoint(pnt_Ary[i+size]);

		for(let i=0; i<pnt_Ary.length; i++) pnt_Ary[i].references.push({ callback : this.onUpdateCallback.bind(this), refID : this.refID });

		this.spline = null;

		this.c1points.addSpline(200, 5,2);
		this.c2points.addSpline(200, 5,2);

		this.references = [];

		SurfaceStorage.addToStorage(geometry.surfaceStorage, this);


	}

	setColor(cHex){ this.color = GL.rgbArray(cHex); return this; }
	setTexture(texture){ this.texture = texture; return this; };

	disableBrokenLines(){ this.c1points.disableBrokenLine(); this.c2points.disableBrokenLine(); return this; }
	enableBrokenLines(){  this.c1points.enableBrokenLine();  this.c2points.enableBrokenLine();  return this; }

	disableBoundaryCurves(){
		this.c1points.visible = false;
		this.c2points.visible = false;
		return this;
	}

	enableBoundaryCurves(){
		this.c1points.visible = true;
		this.c2points.visible = true;
		return this;
	}

	addSpline(splinePointsX, splinePointsZ, buildMode, drawMode){
		if(buildMode !== SurfaceSpline.RULED){
			console.error("Wrong spline type for RECTANGLE_BASE");
			return null;
		}
		this.spline = new SurfaceSpline(this, splinePointsX, splinePointsZ, buildMode, drawMode);
		return this;
	}

	onUpdateCallback(){ this.sendUpdateRequest(); if(this.spline) this.spline.update(); }

	sendUpdateRequest(){ for(let i=0; i<this.references.length; i++) this.references[i](); }	
}

class FourCurveBase{
	constructor(geometry, size, density, oX, oZ){
		this.geometry = geometry;
		this.refID = geometry._getRefID();

		this.color        = [0.0, 0.0, 1.0];
		this.texture      = null;


		this.c1points = geometry.createCurve(0);
		this.c2points = geometry.createCurve(0);
		this.c3points = geometry.createCurve(0);
		this.c4points = geometry.createCurve(0);

		let y = 1;
		let x = -(size/2)/density;
		let z = -(size/2)/density;

		let pnt_Ary = [];

		for(let i=0; i<size-1; i++) pnt_Ary.push(new Point(x+oX, y, z+i/density+oZ,"ff0000"));
		for(let i=0; i<size-1; i++) pnt_Ary.push(new Point(x+i/density+oX, y, z+size/density-1/density+oZ, "ff0000"));
		for(let i=0; i<size-1; i++) pnt_Ary.push(new Point(x+size/density-1/density+oX, y, z+size/density-1/density-i/density+oZ, "ff0000"));
		for(let i=0; i<size-1; i++) pnt_Ary.push(new Point(x+size/density-1/density-i/density+oX, y, z+oZ, "ff0000"));

		let n = size;

		for(let i=0; i<=n-1; i++) this.c1points.addPoint(pnt_Ary[i]);
		this.c3points.addPoint(pnt_Ary[0]);
		for(let i=4*n-5; i>=3*n-3; i--) this.c3points.addPoint(pnt_Ary[i]);
		for(let i=3*n-3; i>=2*n-2; i--) this.c2points.addPoint(pnt_Ary[i]);
		for(let i=n-1; i<=2*n-2; i++) this.c4points.addPoint(pnt_Ary[i]);



		for(let i=0; i<pnt_Ary.length; i++) pnt_Ary[i].references.push({ callback : this.onUpdateCallback.bind(this), refID : this.refID });

		this.spline = null;

		this.c1points.addSpline(50, 5,2);
		this.c2points.addSpline(50, 5,2);
		this.c3points.addSpline(50, 5,2);
		this.c4points.addSpline(50, 5,2);

		this.poisson_coeff = null;

		this.references = [];

		SurfaceStorage.addToStorage(geometry.surfaceStorage, this);


	}

	setColor(cHex){ this.color = GL.rgbArray(cHex); return this; }
	setTexture(texture){ this.texture = texture; return this; };
	fixY(){ 
		for(let i=0; i<this.c1points.controlPoints.length; i++){
			this.c1points.controlPoints[i].yFixed = true;
			this.c2points.controlPoints[i].yFixed = true;
			this.c3points.controlPoints[i].yFixed = true;
			this.c4points.controlPoints[i].yFixed = true;
		}
		return this;
	}

	disableBrokenLines(){ 
		this.c1points.disableBrokenLine(); 
		this.c2points.disableBrokenLine();
		this.c3points.disableBrokenLine(); 
		this.c4points.disableBrokenLine();
		return this;
	}

	enableBrokenLines(){ 
		this.c1points.enableBrokenLine(); 
		this.c2points.enableBrokenLine();
		this.c3points.enableBrokenLine(); 
		this.c4points.enableBrokenLine();
		return this;
	}

	disableBoundaryCurves(){
		this.c1points.visible = false;
		this.c2points.visible = false;
		this.c3points.visible = false;
		this.c4points.visible = false;
		return this;
	}

	enableBoundaryCurves(){
		this.c1points.visible = true;
		this.c2points.visible = true;
		this.c3points.visible = true;
		this.c4points.visible = true;
		return this;
	}

	addSpline(splinePointsX, splinePointsZ, buildMode, drawMode){
		if(buildMode !== SurfaceSpline.COONS && buildMode !==SurfaceSpline.LAPLACE && buildMode !== SurfaceSpline.STRETCH && buildMode !== SurfaceSpline.DEFORMATION){
			console.error("Wrong spline type for RECTANGLE_BASE");
			return null;
		}
		this.spline = new SurfaceSpline(this, splinePointsX, splinePointsZ, buildMode, drawMode);
		return this;
	}

	onUpdateCallback(){ this.sendUpdateRequest(); if(this.spline) this.spline.update(); }

	sendUpdateRequest(){ for(let i=0; i<this.references.length; i++) this.references[i](); }	
}




Surface.RECTANGLE_BASE = 0;

let surfaceDrawFunction = function(e){
	let storage = e.com.SurfaceStorage;
	if(storage.surfaces.length === 0) return;

	for(let i=0; i<storage.surfaces.length; i++){
		if(!storage.surfaces[i].spline) continue;
		switch(storage.surfaces[i].spline.drawMode){
			case SurfaceSpline.POINTS:
				let shaderDot = Core.mShaderProgs.get("SplineDot");
				shaderDot.bind();
				shaderDot.setUniform("uProjView", Camera.getProjectionViewMatrix( Core.camera.com.Camera ) );
				GL.ctx.bindVertexArray(storage.surfaces[i].spline.vao.vao.id);
				GL.ctx.drawArrays(GL.ctx.POINTS, 0, storage.surfaces[i].spline.verts.length/3);
				break;
			case SurfaceSpline.ORTHO:
				let shaderOrtho = Core.mShaderProgs.get("OrthoSurface");
				shaderOrtho.bind();
				shaderOrtho.setUniform("uProjView", Camera.getProjectionViewMatrix( Core.camera.com.Camera ) );
				GL.ctx.bindVertexArray(storage.surfaces[i].spline.vao.vao.id);
				GL.ctx.drawElements(GL.ctx.TRIANGLE_STRIP, storage.surfaces[i].spline.indices.length, GL.ctx.UNSIGNED_SHORT, 0);

				let shaderGrid2 = Core.mShaderProgs.get("SplineDot");
				shaderGrid2.bind();
				shaderGrid2.setUniform("color", storage.surfaces[i].color );
				shaderGrid2.setUniform("uProjView", Camera.getProjectionViewMatrix( Core.camera.com.Camera ) );
				GL.ctx.bindVertexArray(storage.surfaces[i].spline.vaoGrid.vao.id);
				GL.ctx.drawElements(GL.ctx.LINE_STRIP, storage.surfaces[i].spline.indices.length, GL.ctx.UNSIGNED_SHORT, 0);
				break;

			case SurfaceSpline.GRID:
				let shaderGrid = Core.mShaderProgs.get("SplineDot");
				shaderGrid.bind();
				shaderGrid.setUniform("color", storage.surfaces[i].color );
				shaderGrid.setUniform("uProjView", Camera.getProjectionViewMatrix( Core.camera.com.Camera ) );
				GL.ctx.bindVertexArray(storage.surfaces[i].spline.vao.vao.id);
				GL.ctx.drawElements(GL.ctx.LINE_STRIP, storage.surfaces[i].spline.indices.length, GL.ctx.UNSIGNED_SHORT, 0);
				break;
			case SurfaceSpline.SURFACE:
				let shaderSurface = Core.mShaderProgs.get("PhongSurface");
				shaderSurface.bind();
				shaderSurface.setUniform("uProjView", Camera.getProjectionViewMatrix( Core.camera.com.Camera ) );
				shaderSurface.setUniform("baseColor", storage.surfaces[i].color );

				if(storage.surfaces[i].texture) shaderSurface.setUniforms("uTexture", storage.surfaces[i].texture);
				GL.ctx.bindVertexArray(storage.surfaces[i].spline.vao.vao.id);
				GL.ctx.disable(GL.ctx.CULL_FACE);
				GL.ctx.drawElements(GL.ctx.TRIANGLE_STRIP, storage.surfaces[i].spline.indices.length, GL.ctx.UNSIGNED_SHORT, 0);
				GL.ctx.enable(GL.ctx.CULL_FACE);
				break;
		}
	}
	GL.ctx.bindVertexArray(null);
}

export default Surface;
export { SurfaceStorage, surfaceDrawFunction, TwoCurveBase, FourCurveBase };