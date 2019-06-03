import VAO                           from "../../VAO.js";
import Shader                        from "../../Shader.js";
import { Components }                from "../../ECS.js";
import Core                          from "../../core.js";
import { Quat, Vec3 }	             from "../../Maths.js";
import GL                            from "../../gl.js";
import DebugObject                   from "./DebugObject.js";
import CurveSpline                   from "./CurveSpline.js";
import EllipticGridGenerator         from "./EllipticGridGenerator.js";
import DeformationGridGenerator      from "./DeformationGridGenerator.js";
import { Matrix }                    from "../../maths/LinearAlgebra.js";

import { BezierSurface }             from "./Surfaces/SurfaceBaseImport.js";
import { CoonsSurface }              from "./Surfaces/SurfaceBaseImport.js";
import { DistanceSurface }           from "./Surfaces/SurfaceBaseImport.js";
import { RuledSurface }              from "./Surfaces/SurfaceBaseImport.js";
import { UniformSurface }            from "./Surfaces/SurfaceBaseImport.js";
import { Bicubic4_4Surface }         from "./Surfaces/SurfaceBaseImport.js";
import { Bicubic4_4_CSurface }       from "./Surfaces/SurfaceBaseImport.js";
import { DeformationSurface }        from "./Surfaces/SurfaceBaseImport.js";

import SurfaceIterator  from "./Surfaces/SurfaceIterator.js";



class SurfaceSpline{
	constructor(base, splinePointsX, splinePointsZ, buildMode, drawMode){
		this.geometry = base.geometry;

		this.base     = base;

		this.vao             = new VAO;
		this.vaoGrid         = new VAO;
		this.verts			 = [];
		this.normals         = [];
		this.colors          = [];
		this.indicesGrid     = [];
		this.indices         = [];
		this.uv              = [];
		this.bufSize		 = Float32Array.BYTES_PER_ELEMENT * 3 * splinePointsX * splinePointsZ; //3Floats per vert
		this.splinePointsX   = splinePointsX;
		this.splinePointsZ   = splinePointsZ;		
		this.buildMode       = buildMode ?  buildMode : SurfaceSpline.UNIFORM;
		this.drawMode        = drawMode ? drawMode : SurfaceSpline.GRID;
		
		this.drawNormals     = true;


		this.index();
		if(this.drawMode !== 2 ) this.indexTriangleStrip();
		

		this.vao.create()
			.emptyFloatBuffer("bVertices",this.bufSize , Shader.ATTRIB_POSITION_LOC, 3, 0, 0, false)
			.emptyFloatBuffer("bNormals",this.bufSize , Shader.ATTRIB_NORMAL_LOC, 3, 0, 0, false)
			.emptyFloatBuffer("bUV",this.bufSize/3*2 , Shader.ATTRIB_UV_LOC, 2, 0, 0, false)
			.emptyFloatBuffer("bColors",this.bufSize , Shader.ATTRIB_COLOR, 3, 0, 0, false)
			.indexBuffer("index",this.indices,true,false)
			.finalize("SplinePoints");

		this.vaoGrid.create()
			.emptyFloatBuffer("bVertices",this.bufSize , Shader.ATTRIB_POSITION_LOC, 3, 0, 0, false)
			.indexBuffer("index",this.indicesGrid,true,false)
			.finalize("Grid");


		this.normalObj = new DebugObject(this.geometry, splinePointsX * splinePointsZ, "#dd1cca");
		this.normalObj.visible = true;

		// this.surface.splineCallbacks.push(this.updateCallback.bind(this));
		this.calculateUV();
		this.defineBaseType();
		this.update();
	}



	defineBaseType(){
		switch(this.buildMode){
			case SurfaceSpline.BEZIER:
				this.surfaceBase = new BezierSurface(this.base.controlPoints, this.base.sizeX, this.base.sizeZ, this.splinePointsX, this.splinePointsZ);
				break;
			case SurfaceSpline.COONS:
				this.surfaceBase = new CoonsSurface(this.base.controlPoints, this.base.sizeX, this.base.sizeZ, this.splinePointsX, this.splinePointsZ, 
					this.base.c1points, this.base.c2points, this.base.c3points, this.base.c4points);
				break;
			case SurfaceSpline.RULED:
				this.surfaceBase = new RuledSurface(this.base.controlPoints, this.base.sizeX, this.base.sizeZ, this.splinePointsX, this.splinePointsZ, 
					this.base.c1points, this.base.c2points);
				break;
			case SurfaceSpline.DEFORMATION:
				this.surfaceBase = new DeformationSurface(this.base.controlPoints, this.base.sizeX, this.base.sizeZ, this.splinePointsX, this.splinePointsZ, 
					this.base.c1points, this.base.c2points, this.base.c3points, this.base.c4points);
				break;
			case SurfaceSpline.BICUBIC4_4:
				this.surfaceBase = new Bicubic4_4Surface(this.base.controlPoints, this.base.sizeX, this.base.sizeZ, this.splinePointsX, this.splinePointsZ);
				break;
			case SurfaceSpline.BICUBIC4_4_C:
				this.surfaceBase = new Bicubic4_4_CSurface(this.base.controlPoints, this.base.sizeX, this.base.sizeZ, this.splinePointsX, this.splinePointsZ);
				break;
			// case SurfaceSpline.DISTANCE:
			// 	this.curveBase = new DistanceCurve(this.base.controlPoints, this.splinePointsCount);
			// 	break;
		}

	}

	updateCallback(){ this.update(); }

	generate(){
		this.verts = this.surfaceBase.build();

		this.calculateOrtho();

		// let iterator = new SurfaceIterator(this.surfaceBase);
		// let map = iterator.buildMap();

		// this.normVerts = [];
		// for(let i = 0; i < map.t.length; i++){
		// 	for(let j =0; j < map.tauAry[i].length; j++){
		// 		let FD = this.surfaceBase.firstDerivative(map.t[i], map.tauAry[i][j]);
		// 		let s1 = new Vec3(FD.s1),
		// 			s2 = new Vec3(FD.s2);
		// 		let n = Vec3.cross(s1, s2).normalize();

			
		// 		this.normVerts.push(...this.surfaceBase.getCoord(map.t[i], map.tauAry[i][j]));
		// 		this.normals.push(...n); 
		// 	}
		// }
		// console.log(this.normals);
		// console.log(this.normVerts);


		//if(this.drawNormals) this.calculateNormalsX();
		//if(this.drawNormals) this.normalObj.setNormals(0.3, this.normVerts, this.normals);

		return this;
	}


	generate1(){
		//if(this.base.controlPoints.length < 4) return this;

		let surfSizeX       = this.base.sizeX;
		let surfSizeZ       = this.base.sizeZ;

		let pointAry = this.base.controlPoints;


		if(this.buildMode === SurfaceSpline.UNIFORM){
		////////////////////////////////////////////////////////////////////////////
			let step_t   = (surfSizeZ-1) / (this.splinePointsZ -1);
			let step_tau = (surfSizeX-1) / (this.splinePointsX -1);

			let X = 0, Z = 0;

			for(let stpT = 0; stpT < this.splinePointsZ; stpT++){

				let t   = stpT*step_t;
				let t_i = Z;
				X = 0;

				for(let stpTau = 0; stpTau < this.splinePointsX; stpTau++){
					let tau = stpTau*step_tau;

					let p_ij   = pointAry[  X   *surfSizeZ + Z   ].position;
					let p_iij  = pointAry[  X   *surfSizeZ + Z+1 ].position;
					let p_ijj  = pointAry[ (X+1)*surfSizeZ + Z   ].position;
					let p_iijj = pointAry[ (X+1)*surfSizeZ + Z+1 ].position;

					let r0 = null;
					let r1 = null;
					let tmp1 = null;
					let tmp2 = null;

					tmp1 = Vec3.scale( p_ij, 1 - (t-Z), tmp1 );
					tmp2 = Vec3.scale( p_iij,     t-Z,  tmp2 );

					r0 = Vec3.add(tmp1, tmp2);

					tmp1 = Vec3.scale( p_ijj, 1 - (t-Z), tmp1 );
					tmp2 = Vec3.scale( p_iijj,     t-Z,  tmp2 );

					r1 = Vec3.add(tmp1, tmp2);

					tmp1 = Vec3.scale( r0, 1 - (tau-X), tmp1 );
					tmp2 = Vec3.scale( r1,      tau-X,  tmp2 );

					let point = null;

					point = Vec3.add(tmp1 , tmp2);
					this.verts.push(point[0], point[1], point[2]);

					if(stpTau!==this.splinePointsX-1 && (stpTau+1)*step_tau > X+1+0.00001 ) X++;
				}
				if(stpT!==this.splinePointsZ-1 && (stpT+1)*step_t > Z+1+0.00001) Z++;		
			}
			if(this.drawMode !== SurfaceSpline.POINTS) this.calculateNormalsX();
			if(this.drawNormals) this.normalObj.setNormals(0.3, this.verts, this.normals);
			return this;

		////////////////////////////////////////////////////////////////////////////
		}

		if(this.buildMode === SurfaceSpline.DISTANCE){
		////////////////////////////////////////////////////////////////////////////
			let t_Xj = new Array(surfSizeX);
			for(let X=0; X<surfSizeX; X++) t_Xj[X] = new Array(surfSizeZ);

			for(let X=0; X<surfSizeX; X++){
				t_Xj[X][0] = 0;
				for(let Z=0; Z<surfSizeZ-1; Z++){
					t_Xj[X][Z+1] = t_Xj[X][Z] + Vec3.sub(pointAry[ X*surfSizeZ + Z  ].position, 
																		   pointAry[ X*surfSizeZ + Z+1].position).length();
				}
			}

			let step_t = new Array(surfSizeX);

			for(let X=0; X<surfSizeX; X++)
				step_t[X] = t_Xj[X][ surfSizeZ-1 ] / ( this.splinePointsZ-1 ) ;		

			let tau_ij = new Array(surfSizeX);
			for(let X=0; X<surfSizeX; X++) tau_ij[X] = new Array(this.splinePointsZ);
			

			for(let X=0; X<surfSizeX; X++){

				let Z = 0;
				let t_i = 0;
				let p_ij   = pointAry[  X   *surfSizeZ + Z   ].position;
				let p_iij  = pointAry[  X   *surfSizeZ + Z+1 ].position;


				for(let stpT=0; stpT<this.splinePointsZ; stpT++){

					let t = stpT*step_t[X];
					let factor_t = (t-t_i)/( t_Xj[X][Z+1]-t_Xj[X][Z] );

					tau_ij[X][stpT] = Vec3.add(Vec3.scale(p_ij, 1 - factor_t ) , Vec3.scale(p_iij, factor_t ));

					if( stpT!==this.splinePointsZ-1  && (stpT+1)*step_t[X] > t_Xj[X][Z+1]+0.00001 ){
						Z++;		
						p_ij   = pointAry[ X*surfSizeZ + Z   ].position;
						p_iij  = pointAry[ X*surfSizeZ + Z+1 ].position;
						t_i = t_Xj[X][Z];
					}
				}
			}

			for(let stpT=0; stpT<this.splinePointsZ; stpT++){

				let tAry = new Array(surfSizeX);
				tAry[0] = 0;				

				for(let X=0; X<surfSizeX-1; X++)
					tAry[X+1] = tAry[X] + Vec3.sub(tau_ij[X+1][stpT], tau_ij[X][stpT]).length();
				

				let X = 0;
				let step = tAry[surfSizeX-1] / (this.splinePointsX-1);

				for(let stpTau=0; stpTau < this.splinePointsX; stpTau++){
					let tau = stpTau*step;
					let tau_i = tAry[X];
					let factor_tau = (tau-tau_i)/( tAry[X+1]-tAry[X] );

					let point = Vec3.add(Vec3.scale(tau_ij[X][stpT] ,1 - factor_tau ) , Vec3.scale(tau_ij[X+1][stpT] ,factor_tau ));
				 	this.verts.push(point.x, point.y, point.z);

				 	if(stpTau !==  this.splinePointsX-1 && (stpTau+1) * step > tAry[X+1]+0.000001){
						X++;
					} 
				}
			}
			if(this.drawMode !== SurfaceSpline.POINTS) this.calculateNormalsX();
			if(this.drawNormals) this.normalObj.setNormals(0.3, this.verts, this.normals);
			return this;

		////////////////////////////////////////////////////////////////////////////
		}


		if(this.buildMode === SurfaceSpline.LAPLACE){
		////////////////////////////////////////////////////////////////////////////
			let step_t   = 1 / (this.splinePointsZ-1);
			let step_tau = 1 / (this.splinePointsX-1);

			let c1_Ary = this.base.c1points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsZ);
			let c2_Ary = this.base.c2points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsZ);
			let c3_Ary = this.base.c3points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsX);
			let c4_Ary = this.base.c4points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsX);

			let X = Matrix.createMatrix(this.splinePointsZ, this.splinePointsX);
			let Z = Matrix.createMatrix(this.splinePointsZ, this.splinePointsX);

			for(let i=0; i<this.splinePointsX; i++){
				X[0][i] = c3_Ary[i][0];
				Z[0][i] = c3_Ary[i][2];

				X[this.splinePointsZ-1][i] = c4_Ary[i][0];
				Z[this.splinePointsZ-1][i] = c4_Ary[i][2];
			}
			for(let i=1; i<this.splinePointsZ-1; i++){
				X[i][0] = c1_Ary[i][0];
				Z[i][0] = c1_Ary[i][2];

				X[i][this.splinePointsX-1] = c2_Ary[i][0];
				Z[i][this.splinePointsX-1] = c2_Ary[i][2];
			}

			for(let stpT=1; stpT<this.splinePointsZ-1; stpT++){
				for(let stpTau=1; stpTau<this.splinePointsX-1; stpTau++){
					let point = this._r(stpT*step_t, stpTau*step_tau, c1_Ary, c2_Ary, c3_Ary, c4_Ary, stpT, stpTau);
					X[stpT][stpTau] = point[0];
					Z[stpT][stpTau] = point[2];
				}
			}

			if(!this.ellipticGridGenerator){
				this.ellipticGridGenerator = new EllipticGridGenerator(this.splinePointsZ, this.splinePointsX, step_t, step_tau);
			}
			this.ellipticGridGenerator.init(X, Z);
			let solution = this.ellipticGridGenerator.solveLaplace1();
			let solvedX = solution[0];
			let solvedZ = solution[1];

			for(let i=0; i<this.splinePointsZ; i++){
				for(let j=0; j<this.splinePointsX; j++){
					this.verts.push(solvedX[i][j], 1, solvedZ[i][j]);
				}
			}

			this.calculateOrtho();
			if(this.drawMode !== SurfaceSpline.POINTS) this.calculateNormalsX();
			if(this.drawNormals) this.normalObj.setNormals(0.3, this.verts, this.normals);
			return this;

		////////////////////////////////////////////////////////////////////////////
		}
		

		if(this.buildMode === SurfaceSpline.STRETCH){
		////////////////////////////////////////////////////////////////////////////
			let step_t   = 1 / (this.splinePointsZ-1);
			let step_tau = 1 / (this.splinePointsX-1);

			let c1_Ary = this.base.c1points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsZ);
			let c2_Ary = this.base.c2points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsZ);
			let c3_Ary = this.base.c3points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsX);
			let c4_Ary = this.base.c4points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsX);

			let X = Matrix.createMatrix(this.splinePointsZ, this.splinePointsX);
			let Z = Matrix.createMatrix(this.splinePointsZ, this.splinePointsX);


			for(let i=0; i<this.splinePointsX; i++){
				X[0][i] = c3_Ary[i][0];
				Z[0][i] = c3_Ary[i][2];

				X[this.splinePointsZ-1][i] = c4_Ary[i][0];
				Z[this.splinePointsZ-1][i] = c4_Ary[i][2];
			}
			for(let i=1; i<this.splinePointsZ-1; i++){
				X[i][0] = c1_Ary[i][0];
				Z[i][0] = c1_Ary[i][2];

				X[i][this.splinePointsX-1] = c2_Ary[i][0];
				Z[i][this.splinePointsX-1] = c2_Ary[i][2];
			}

			for(let stpT=1; stpT<this.splinePointsZ-1; stpT++){
				for(let stpTau=1; stpTau<this.splinePointsX-1; stpTau++){
					let point = this._r(stpT*step_t, stpTau*step_tau, c1_Ary, c2_Ary, c3_Ary, c4_Ary, stpT, stpTau);
					X[stpT][stpTau] = point[0];
					Z[stpT][stpTau] = point[2];
				}
			}
			let x     = [0.2];
			let y     = [0.2];
			let alpha = [0.95];

			let stretch1 = function(ksi, eta){
			//	let x =0.7, y = 0.3;
				//let alpha = 0.95;
				let beta  = 0.4;
				let result = ksi;
				for(let i=0; i<x.length; i++){
					let d = Math.sqrt( (x[i]-ksi)*(x[i]-ksi) + (y[i]-eta)*(y[i]-eta) );

					result += alpha[i]*(x[i]-ksi)*Math.exp(-beta*d);
				//	console.log(alpha[0]);
				}

				return result;
			}

			let stretch2 = function(ksi, eta){
			//	let alpha = 0.95;
				let beta  = 0.4;
				let result = eta;
				for(let i=0; i<x.length; i++){
					let d = Math.sqrt( (x[i]-ksi)*(x[i]-ksi) + (y[i]-eta)*(y[i]-eta) );

					result += alpha[i]*(y[i]-eta)*Math.exp(-beta*d);
				}
			//	console.log(result);
				return result;
			} 

			if(!this.ellipticGridGenerator){
				this.ellipticGridGenerator = new EllipticGridGenerator(this.splinePointsZ, this.splinePointsX, step_t, step_tau, EllipticGridGenerator.POISSON, stretch1, stretch2);
			}
			this.ellipticGridGenerator.init(X, Z);
			let solution = this.ellipticGridGenerator.solvePoisson();
			let solvedX = solution[0];
			let solvedZ = solution[1];

			for(let i=0; i<this.splinePointsZ; i++){
				for(let j=0; j<this.splinePointsX; j++){
					this.verts.push(solvedX[i][j], 1, solvedZ[i][j]);
				}
			}

			if(this.drawMode !== SurfaceSpline.POINTS) this.calculateNormalsX();
			if(this.drawNormals) this.normalObj.setNormals(0.3, this.verts, this.normals);
			return this;

		////////////////////////////////////////////////////////////////////////////
		}


		else { 
			console.log("SurfaceSpline error: given build mode does not exist. Try SurfaceSpline.UNIFORM or SurfaceSpline.DISTANCE");
			return this;
		}
	}


	enableNormals(){
		this.normalObj.setNormals(0.3, this.verts, this.normals);
		this.drawNormals = true;
	}

	disableNormals() { this.drawNormals = false; }

	update(){
		this.clear();
		this.generate();
		if(this.verts.length == 0) return this;
		
		// Считаем количество точек
		this.vao.count = this.verts.length / 3;

		// Отправляем вершины в GPU
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,this.vao.vao["bVertices"].id);
		GL.ctx.bufferSubData(GL.ctx.ARRAY_BUFFER, 0, new Float32Array(this.verts), 0, null);
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,null);

		//
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,this.vaoGrid.vao["bVertices"].id);
		GL.ctx.bufferSubData(GL.ctx.ARRAY_BUFFER, 0, new Float32Array(this.verts), 0, null);
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,null);

		// Отправляем нормали в GPU
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,this.vao.vao["bNormals"].id);
		GL.ctx.bufferSubData(GL.ctx.ARRAY_BUFFER, 0, new Float32Array(this.normals), 0, null);
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,null);

		return this;
	}

	index(){
		this.indices = [];
		for(let X = 0; X < this.splinePointsX; X++){
			if( X%2 === 0 ) for(let Z = 0; Z < this.splinePointsZ; Z++)
				this.indices.push( Z*this.splinePointsX + X );

			else for(let Z = this.splinePointsZ-1; Z >= 0; Z--)
				this.indices.push( Z*this.splinePointsX + X );
		}
		if(this.splinePointsX % 2 === 0){
			for(let Z=0; Z<this.splinePointsZ; Z++){
				if( Z%2 == 0 ) for(let X = this.splinePointsX-1; X >= 0; X--)
					this.indices.push( Z*this.splinePointsX + X );

				else for(let X=0; X <this.splinePointsX; X++)
					this.indices.push( Z*this.splinePointsX + X );
			}		
		}
		else {
			for(let Z=this.splinePointsZ-1; Z>=0; Z--){
				if( Z%2 == 0 ) for(let X = this.splinePointsX-1; X >= 0; X--)
					this.indices.push( Z*this.splinePointsX + X );

				else for(let X = 0; X <this.splinePointsX; X++)
					this.indices.push( Z*this.splinePointsX + X );
			}				
		}

		for(let i = 0; i < this.indices.length; i++)
			this.indicesGrid.push(this.indices[i]);

		return this;
	}

	indexTriangleStrip(){
		this.indices = [];
		for(let Z=0; Z<this.splinePointsZ-1; Z++){
			for(let X=0; X<this.splinePointsX; X++){
				this.indices.push(Z*this.splinePointsX + X, (Z+1)*this.splinePointsX + X);
			}
			this.indices.push((Z+1)*this.splinePointsX + this.splinePointsX-1, (Z+1)*this.splinePointsX);
		}
	}

	calculateNormalsX(){
		//Generate the Normals using finite difference method
		let p,					//Temp Array Index when calcating neighboring vertices
			pos,				//Using X,Y, determine current vertex index position in array
			zMax = this.splinePointsZ-1,		//Max X Position in Grid
			xMax = this.splinePointsX-1,		//Max Y Position in Grid
			nX = 0,				//Normal X value
			nY = 0,				//Normal Y value
			nZ = 0,				//Normal Z value
			nL = 0,				//Normal Vector Length
			hL,					//Left Vector height
			hR,					//Right Vector Height
			hD,					//Down Vector height
			hU;					//Up Vector Height


		for(let Z=0; Z < this.splinePointsZ; Z++){
			for(let X=0; X < this.splinePointsX; X++){
				pos = Z*this.splinePointsX*3 + X*3;   //X,Y position to Array index conversion

				let vec = new Vec3(this.verts[pos],this.verts[pos+1],this.verts[pos+2]);
				//-----------------
				//Get the height value of 4 neighboring vectors: Left,Right,Top Left
				
				if(X > 0){ //LEFT
					p = Z*this.splinePointsX*3 + (X-1)*3;	//Calc Neighbor Vector
					hL = new Vec3(this.verts[p],this.verts[p+1],this.verts[p+2]);		//Grab only the Y position which is the height.
				}else hL = undefined;	//Out of bounds, use current 

				if(X < xMax){ //RIGHT
					p = Z*this.splinePointsX*3 + (X+1)*3;
					hR = new Vec3(this.verts[p],this.verts[p+1],this.verts[p+2]);
				}else hR = undefined;	

				if(Z > 0){ //UP
					p = (Z-1)*this.splinePointsX*3 + X*3;
					hU = new Vec3(this.verts[p],this.verts[p+1],this.verts[p+2]);
				}else hU = undefined;

				if(Z < zMax){ //DOWN
					p = (Z+1)*this.splinePointsX*3 + X*3;
					hD = new Vec3(this.verts[p],this.verts[p+1],this.verts[p+2]);
				}else hD = undefined;

				let crossUL = undefined;
				let crossLD = undefined;
				let crossDR = undefined;
				let crossRU = undefined;
				if(hU!==undefined && hL!==undefined) crossUL = Vec3.cross(Vec3.sub(hU, vec), Vec3.sub(hL, vec)).normalize();
				if(hL!==undefined && hD!==undefined) crossLD = Vec3.cross(Vec3.sub(hL, vec), Vec3.sub(hD, vec)).normalize();				
				if(hD!==undefined && hR!==undefined) crossDR = Vec3.cross(Vec3.sub(hD, vec), Vec3.sub(hR, vec)).normalize();
				if(hR!==undefined && hU!==undefined) crossRU = Vec3.cross(Vec3.sub(hR, vec), Vec3.sub(hU, vec)).normalize();

				if(crossUL!==undefined) { nX+=crossUL.x; nY+=crossUL.y; nZ+=crossUL.z; }
				if(crossLD!==undefined) { nX+=crossLD.x; nY+=crossLD.y; nZ+=crossLD.z; } 
				if(crossDR!==undefined) { nX+=crossDR.x; nY+=crossDR.y; nZ+=crossDR.z; } 
				if(crossRU!==undefined) { nX+=crossRU.x; nY+=crossRU.y; nZ+=crossRU.z; }

				nL = Math.sqrt( nX*nX + nY*nY + nZ*nZ);							
				this.normals.push(nX/nL,nY/nL,nZ/nL);			//Normalize the final normal vector data before saving to array.
				nX = 0;
				nY = 0;
				nZ = 0;
			}
		}
	}

	calculateOrtho(){
		let zMax = this.splinePointsZ;
		let xMax = this.splinePointsX;

		let pL,
			pR,
			pD,
			pU;

		let vL,
			vR,
			vD,
			vU;

		for(let z = 0; z < zMax; z++){
			for(let x = 0; x < xMax; x++){

				if(z === 0){
					pU = z*xMax*3 + x*3;
					pD = (z+1)*xMax*3 + x*3;
				}
				else if(z === zMax-1){
					pU = (z-1)*xMax*3 + x*3;
					pD = z*xMax*3 + x*3;	
				}
				else {
					pU = (z-1)*xMax*3 + x*3;
					pD = (z+1)*xMax*3 + x*3;
				}
				vU = new Vec3(this.verts[pU],this.verts[pU+1],this.verts[pU+2]);
				vD = new Vec3(this.verts[pD],this.verts[pD+1],this.verts[pD+2]);

				if(x === 0){
					pL = z*xMax*3 + x*3;
					pR = z*xMax*3 + (x+1)*3;
				}
				else if(x === xMax-1){
					pL = z*xMax*3 + (x-1)*3;
					pR = z*xMax*3 + x*3;	
				}
				else{
					pL = z*xMax*3 + (x-1)*3;
					pR = z*xMax*3 + (x+1)*3;
				}
				vL = new Vec3(this.verts[pL],this.verts[pL+1],this.verts[pL+2]);
				vR = new Vec3(this.verts[pR],this.verts[pR+1],this.verts[pR+2]);

				let zVec = Vec3.sub(vU, vD),
					xVec = Vec3.sub(vR, vL);

				let phiCos = Math.abs(Vec3.angleCos(zVec, xVec));


				this.colors.push(phiCos, 0, 1-phiCos);

				// Отправляем цвета в GPU
				GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,this.vao.vao["bColors"].id);
				GL.ctx.bufferSubData(GL.ctx.ARRAY_BUFFER, 0, new Float32Array(this.colors), 0, null);
				GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,null);
			}
		}
	}

	calculateUV(){
		let stepX = 1 / (this.splinePointsX-1);
		let stepZ = 1 / (this.splinePointsZ-1);
		for(let i=0; i<this.splinePointsZ; i++){
			for(let j=0; j<this.splinePointsX; j++){
				this.uv.push(i*stepX, j*stepZ);
			}
		}
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,this.vao.vao["bUV"].id);
		GL.ctx.bufferSubData(GL.ctx.ARRAY_BUFFER, 0, new Float32Array(this.uv), 0, null);
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,null);
	}	

	clear(){
		this.verts = [];
		this.normals = [];
		this.colors = [];
		return this;
	}
}

SurfaceSpline.UNIFORM      = 1;
SurfaceSpline.DISTANCE     = 2;
SurfaceSpline.BEZIER       = 3;
SurfaceSpline.COONS        = 4;
SurfaceSpline.RULED        = 5;
SurfaceSpline.LAPLACE      = 6;
SurfaceSpline.STRETCH      = 7;
SurfaceSpline.BICUBIC4_4   = 8;
SurfaceSpline.BICUBIC4_4_C = 9;
SurfaceSpline.DEFORMATION  = 10;

SurfaceSpline.POINTS   = 1;
SurfaceSpline.GRID     = 2;
SurfaceSpline.SURFACE  = 3;
SurfaceSpline.ORTHO    = 4;

SurfaceSpline.RECTANGLE_BASE = 0;

export default SurfaceSpline;