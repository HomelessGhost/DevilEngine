import VAO              from "../../VAO.js";
import Shader           from "../../Shader.js";
import { Components }   from "../../ECS.js";
import Core             from "../../core.js";
import { Quat, Vec3 }	from "../../Maths.js";
import GL               from "../../gl.js";
import DebugObject      from "./DebugObject.js";

import { BezierCurve }               from "./Curves/CurveBaseImport.js";
import { BSplineCurve }              from "./Curves/CurveBaseImport.js";
import { HermiteCurve }              from "./Curves/CurveBaseImport.js";
import { NaturalCurve }              from "./Curves/CurveBaseImport.js";
import { UniformCurve }              from "./Curves/CurveBaseImport.js";
import { DistanceCurve }             from "./Curves/CurveBaseImport.js";
import { BSplineInterpolationCurve } from "./Curves/CurveBaseImport.js";

class CurveSpline{
	constructor(base, splinePointsCount, buildMode, drawMode){
		this.geometry  = base.geometry;
		this.base      = base;



		this.vao             = new VAO;
		this.verts			 = [];
		this.tangents        = [];
		this.tangentVerts    = [];
		this.bufSize		 = Float32Array.BYTES_PER_ELEMENT * 3 * splinePointsCount; //3Floats per vert
		this.visible		 = true;

		this.splinePointsCount = splinePointsCount;

		this.buildMode       = buildMode ?  buildMode : CurveSpline.UNIFORM;
		this.drawMode        = drawMode ? drawMode : CurveSpline.LINE;

		this.drawDebugPoints = true;
		this.drawBrokenLine  = true;

		this.vao.create()
			.emptyFloatBuffer("bVertices",this.bufSize , Shader.ATTRIB_POSITION_LOC, 3, 0, 0, false)
			.finalize("SplinePoints");

		this.bSplineType = CurveSpline.B_UNIFORM;
		this.q = null;
		this.h = null;

//		this.debugObject = new DebugObject(this.geometry, splinePointsCount * 2, "#000000");
		this.tangentObj = new DebugObject(this.geometry, 30, "#00FF00");

		this.defineBaseType();

		this.update();
	}

	defineBaseType(){
		switch(this.buildMode){
			case CurveSpline.BEZIER:
				this.curveBase = new BezierCurve(this.base.controlPoints, this.splinePointsCount);
				break;
			case CurveSpline.B_SPLINE:
				this.curveBase = new BSplineCurve(this.base.controlPoints, this.splinePointsCount, 3);
				break;
			case CurveSpline.B_SPLINE_INTERPOLATION:
				this.curveBase = new BSplineInterpolationCurve(this.base.controlPoints, this.splinePointsCount, this.q);
				break;
			case CurveSpline.HERMITE:
				this.curveBase = new HermiteCurve(this.base.controlPoints, this.splinePointsCount, this.debugObject);
				this.drawBrokenLine = false;
				break;
			case CurveSpline.NATURAL_SPLINE:
				this.curveBase = new NaturalCurve(this.base.controlPoints, this.splinePointsCount);
				break;
			case CurveSpline.UNIFORM:
				this.curveBase = new UniformCurve(this.base.controlPoints, this.splinePointsCount);
				break;
			case CurveSpline.DISTANCE:
				this.curveBase = new DistanceCurve(this.base.controlPoints, this.splinePointsCount);
				break;
		}

	}

	calculateTangentVectors(n){
		let freq = 1/n;
		let t = 0;
		for(let t = 0; t <= 1; t+= freq){
			let norm = this.curveBase.firstDerivative(t);
			let vert = this.curveBase.getCoord(t);
			this.tangentVerts.push( vert[0], vert[1], vert[2] )
			this.tangents.push( norm[0], norm[1], norm[2] );
		}

		return this;
	}

	updateCallback(){ this.update(); }

	setBuildMode(buildMode){ this.buildMode = buildMode; this.update(); return this; }
	setDrawMode(drawMode){ this.drawMode = drawMode; this.update(); return this; }

	generate(){
		this.splitIntoBuffer( this.curveBase.build() );
		
		// this.calculateTangentVectors(10);
		// this.tangentObj.setNormals(0.1, this.tangentVerts, this.tangents);
		// this.tangentObj.visible = true;

		// console.log(this.curveBase.iterate());
		return this;

	}

	splitIntoBuffer(pnts){
		for(let i = 0; i < pnts.length; i++)
			this.verts.push(pnts[i][0], pnts[i][1], pnts[i][2]);
	}


	update(){
		this.clear();
		this.generate();

		// Отправляем вершины в GPU
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,this.vao.vao["bVertices"].id);
		GL.ctx.bufferSubData(GL.ctx.ARRAY_BUFFER, 0, new Float32Array(this.verts), 0, null);
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,null);

		return this;
	}

	clear(){
		this.verts = [];
		this.verts.length = 0;
		this.tangents = [];
		this.tangents.length = 0;
		this.tangentVerts = [];
		this.tangentVerts.length = 0;
		return this;
	}

}

CurveSpline.UNIFORM      = 1;
CurveSpline.DISTANCE     = 2;
CurveSpline.BEZIER       = 3;
CurveSpline.B_SPLINE     = 4;
CurveSpline.B_SPLINE_INTERPOLATION = 5;
CurveSpline.HERMITE      = 6;
CurveSpline.B_SPLINE_APPROXIMATION = 7;
CurveSpline.NATURAL_SPLINE = 8;

CurveSpline.B_UNIFORM  = 1;
CurveSpline.B_NONUNIFORM  = 2;

CurveSpline.POINTS   = 1;
CurveSpline.LINE     = 2;

export default CurveSpline;