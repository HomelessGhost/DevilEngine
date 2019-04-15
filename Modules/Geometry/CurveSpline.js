import VAO              from "../../VAO.js";
import Shader           from "../../Shader.js";
import { Components }   from "../../ECS.js";
import Core             from "../../core.js";
import { Quat, Vec3 }	from "../../Maths.js";
import GL               from "../../gl.js";
import DebugObject      from "./DebugObject.js";

class CurveSpline{
	constructor(base, splinePointsCount, buildMode, drawMode){
		this.geometry  = base.geometry;
		this.base      = base;

		this.vao             = new VAO;
		this.verts			 = [];
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

		this.binomCache = new Map();
		this.knots = [];
		this.bSplineType = CurveSpline.B_UNIFORM;
		this.q = null;
		this.h = null;

		this.debugPoints = new DebugObject(this.geometry, splinePointsCount * 2, "#000000");



		this.update();
	}

	updateCallback(){ this.update(); }

	setBuildMode(buildMode){ this.buildMode = buildMode; this.update(); return this; }
	setDrawMode(drawMode){ this.drawMode = drawMode; this.update(); return this; }

	generate(){
		let pointAry = this.base.controlPoints;
		if(pointAry.length < 2) return this;
		let lines = pointAry.length - 1;

		if(this.buildMode === CurveSpline.UNIFORM){
		/////////////////////////////////////////////////////////
			let t_max = lines;
			let step  = t_max / this.splinePointsCount;
			for(let t = 0; t < t_max; t+=step){
				let t_i = Math.floor(t);
				let p_i  = new Vec3().copy(pointAry[t_i].position);
				let p_ii = new Vec3().copy(pointAry[t_i+1].position);

				let point = Vec3.add(Vec3.scale(p_i,  1 - (t-t_i) ) , Vec3.scale(p_ii, t-t_i ));

				this.verts.push(point[0], point[1], point[2]);
			}
			return this;

		/////////////////////////////////////////////////////////
		}

		if(this.buildMode === CurveSpline.DISTANCE){
		/////////////////////////////////////////////////////////
			let tAry = [];
			let t_max = 0;
			tAry.push(0);
			for(let i = 0; i < lines; i++){
				t_max += Vec3.sub(pointAry[i].position, pointAry[i+1].position).length();
				tAry.push(t_max);
			}

			let t_i = 0;
			let cur_ind = 0;
			let step = t_max / (this.splinePointsCount - 1);

			for(var t = 0; t < t_max; t+=step){
				let p_i  = new Vec3().copy(pointAry[cur_ind].position);
				let p_ii = new Vec3().copy(pointAry[cur_ind+1].position);

				let point = Vec3.add(Vec3.scale(p_i, 1 - (t-t_i)/(tAry[cur_ind+1]-tAry[cur_ind]) ) , Vec3.scale(p_ii, (t-t_i)/(tAry[cur_ind+1]-tAry[cur_ind]) ));

				this.verts.push(point[0], point[1], point[2]);

				if(t + step > tAry[cur_ind+1]){
					t_i = tAry[cur_ind+1];
					cur_ind++;
				} 
			}
			return this;

		/////////////////////////////////////////////////////////
		}
		
		/////////////////////////////////////////////////////////
		if(this.buildMode === CurveSpline.BEZIER){
			let step_t   = 1 / (this.splinePointsCount-1);
			for(let stpT=0; stpT < this.splinePointsCount; stpT++){
				let point = this.bezier_r(stpT*step_t);
				this.verts.push(point[0], point[1], point[2]);
				
			}

		}
		/////////////////////////////////////////////////////////
		if(this.buildMode === CurveSpline.B_SPLINE){
			this.knots = [];

			let n = this.base.controlPoints.length-1;
			if(!this.q) this.q = n+1;
			let q = this.q;

			switch(this.bSplineType) {
				case CurveSpline.B_UNIFORM:
					for(let i=0; i<=n+q; i++) {
						if(0 <= i && i < q) this.knots.push(0);
						else if(q <= i && i <= n) this.knots.push(i-q+1);
						else this.knots.push(n-q+2);
					}
					break;
				case CurveSpline.B_NONUNIFORM:
					let c_k = new Array(n+1);
					let full_sum = 0;
					for(let i=1; i<=n; i++) {
						c_k[i] = Vec3.sub(pointAry[i].position, pointAry[i-1].position).length();
						full_sum += c_k[i];
					}
					for(let k=0; k<=n+q; k++){
						if(k<q) this.knots.push(0);
						else if(k<=n) {
							let part_sum = 0;
							for(let i=1; i<=k-q+1; i++) part_sum += c_k[i];
							let ratio1 = (k-q+1)/(n-q+2);
							this.knots.push( (ratio1*c_k[k-q+2]+part_sum)/full_sum*(n-q+2) );
						}
						else this.knots.push(n-q+2);
					}
					break;
			}


			let step_t = (this.knots[n+1] - this.knots[q-1]) / (this.splinePointsCount-1);
			for(let stpT=0; stpT < this.splinePointsCount; stpT++){
				let point = this.bspline_r2(this.knots[q-1] + stpT*step_t);
				this.verts.push(point[0], point[1], point[2]);
			}
		}
		/////////////////////////////////////////////////////////
		if(this.buildMode === CurveSpline.B_SPLINE_APPROXIMATION){

			let n = pointAry.length-1;

			if(!this.q) this.q = n+1;
			if(!this.h) this.h = n; 
			let h = this.h;
			let q = this.q;
			let p = q-1;
			let m = h+p+1;
			
			

			if(h < p ||  h > n) console.error("Wrong parameters for B spline interpolation");

			this.knots = new Array( m+1 );

			let t = new Array(n+1);

			// Uniformly spaced method
			//	for(let i=0; i<=n; i++) t[i] = i/n;

			//	Chord Length Method
			let L = 0;
			let L_k = new Array(n+1);
			L_k[0] = 0;
			for(let i=1; i<=n; i++){
				let tmpLen = Vec3.sub(pointAry[i].position, pointAry[i-1].position).length();
				L += tmpLen;
				L_k[i] = L_k[i-1] + tmpLen;
			}
			for(let k=0; k<=n; k++) t[k] = L_k[k]/L;


			// UNIFORM KNOT VECTOR DISTRIBUTION
			for(let i=0; i<=p; i++)   this.knots[i]=0;
			for(let j=1; j<=h-p; j++) this.knots[j+p]=j/(h-p+1);
			for(let j=m-p; j<=m; j++) this.knots[j]=1;

			// AVERAGE KNOT VECTOR DISTRIBUTION
			// for(let i=0; i<=p; i++)  this.knots[i]=0;
			// for(let j=1; j<=n-p; j++){
			// 	let sum=0;
			// 	for(let i=j; i<=j+p-1; i++) sum += t[i];
			// 	this.knots[j+p]=sum/p;
			// }
			// for(let i=m-p; i<=m; i++) this.knots[i]=1;
			

			// BUILDING MATRIX
			let N = new Array( n+1 );
			for(let i=0; i<=n; i++) N[i] = this._N2(h, p, t[i]);
			

			// SOLVING EQUATIONS
			let Qx = new Array(h+1);
			let Qy = new Array(h+1);
			let Qz = new Array(h+1);
			let invXmatr = null;
			if(n===h) invXmatr = this.inverse(N);
			else {				

				let N_new = Array(n-1);
				for(let i=0; i<n-1; i++) N_new[i] = new Array(h-1);
				for(let i=1; i<=n-1; i++){
					for(let j=1; j<=h-1;j++) N_new[i-1][j-1] = N[i][j];
				}
				let N_T = this.transform(N_new);
				let m1 = this.mult(N_T, N_new);			
				invXmatr = this.inverse(m1);

				let Qk_x = new Array(n+1);
				let Qk_y = new Array(n+1);
				let Qk_z = new Array(n+1);
				for(let k=0; k<=n;k++){
					Qk_x[k] = pointAry[k].position[0]-N[k][0]*pointAry[0].position[0]-N[k][h]*pointAry[n].position[0];
					Qk_y[k] = pointAry[k].position[1]-N[k][0]*pointAry[0].position[1]-N[k][h]*pointAry[n].position[1];
					Qk_z[k] = pointAry[k].position[2]-N[k][0]*pointAry[0].position[2]-N[k][h]*pointAry[n].position[2];
				}

				for(let i=1; i<=h-1; i++){
					let sumX = 0, sumY = 0, sumZ = 0;
					for(let k=1; k<=n-1; k++){
						sumX += N[k][i]*Qk_x[k];
						sumY += N[k][i]*Qk_y[k];
						sumZ += N[k][i]*Qk_z[k];
					}
					Qx[i] = sumX;
					Qy[i] = sumY;
					Qz[i] = sumZ;
				}
			}
			


			let x = new Array(h+1);
			let y = new Array(h+1);
			let z = new Array(h+1);

			if(n===h){
				for(let i=0; i <= h; i++){
					let tmpX = 0, tmpY = 0, tmpZ = 0;
					for(let j=0; j <= n; j++){
						tmpX += invXmatr[i][j] * pointAry[j].position[0];
						tmpY += invXmatr[i][j] * pointAry[j].position[1];
						tmpZ += invXmatr[i][j] * pointAry[j].position[2];
					}
					x[i] = tmpX;
					y[i] = tmpY;
					z[i] = tmpZ;
				}
			} else {
				for(let i=1; i<=h-1; i++){
					let tmpX = 0, tmpY = 0, tmpZ = 0;
					for(let j=1; j <= h-1; j++){
						tmpX += invXmatr[i-1][j-1] * Qx[j];
						tmpY += invXmatr[i-1][j-1] * Qy[j];
						tmpZ += invXmatr[i-1][j-1] * Qz[j];
					}

					x[i] = tmpX;
					y[i] = tmpY;
					z[i] = tmpZ;
				}
			}


			let P = [];
			P.push(pointAry[0].position[0],pointAry[0].position[1],pointAry[0].position[2]);
			for(let i=1; i<=h-1; i++) P.push(x[i], y[i], z[i]);
			P.push(pointAry[n].position[0],pointAry[n].position[1],pointAry[n].position[2]);

			x[0] = pointAry[0].position[0];
			y[0] = pointAry[0].position[1];
			z[0] = pointAry[0].position[2];

			x[h] = pointAry[n].position[0];
			y[h] = pointAry[n].position[1];
			z[h] = pointAry[n].position[2];

	

			let step_t = (this.knots[h+1] - this.knots[p]) / (this.splinePointsCount-1);
			for(let stpT=0; stpT < this.splinePointsCount; stpT++){
				let r_x = 0, r_y = 0, r_z = 0;
				let N2 = this._N2(h, p, this.knots[p]+stpT*step_t);

				for(let k=0; k<=h; k++){
					r_x += x[k] * N2[k];
					r_y += y[k] * N2[k];
					r_z += z[k] * N2[k];	
				}
				this.verts.push(r_x, r_y, r_z);
			}
			if(this.debugPoints.visible) this.debugPoints.setDots(P);
		}
		/////////////////////////////////////////////////////////
		if(this.buildMode === CurveSpline.B_SPLINE_INTERPOLATION){
			let n = pointAry.length-1;

			if(!this.q) this.q = n+1;
			if(!this.h) this.h = n; 
			let h = this.h;
			let q = this.q;
			let p = q-1;
			let m = h+p+1;
			
			if(h < p ||  h > n) console.error("Wrong parameters for B spline interpolation");

			this.knots = new Array( m+1 );

			let t = new Array(n+1);

			// Uniformly spaced method
			// for(let i=0; i<=n; i++) t[i] = i/n;

		    // Chord Length Method
			let L = 0;
			let L_k = new Array(n+1);
			L_k[0] = 0;
			for(let i=1; i<=n; i++){
				let tmpLen = Vec3.sub(pointAry[i].position, pointAry[i-1].position).length();
				L += tmpLen;
				L_k[i] = L_k[i-1] + tmpLen;
			}
			for(let k=0; k<=n; k++) t[k] = L_k[k]/L;


			// UNIFORM KNOT VECTOR DISTRIBUTION                 Работает всегда
			for(let i=0; i<=p; i++)   this.knots[i]=0;
			for(let j=1; j<=h-p; j++) this.knots[j+p]=j/(h-p+1);
			for(let j=m-p; j<=m; j++) this.knots[j]=1;

			// AVERAGE KNOT VECTOR DISTRIBUTION                 Этот метод некорректен, если h != n
			// for(let i=0; i<=p; i++)  this.knots[i]=0;
			// for(let j=1; j<=h-p; j++){
			// 	let sum=0;
			// 	for(let i=j; i<=j+p-1; i++) sum += t[i];
			// 	this.knots[j+p]=sum/p;
			// }
			// for(let i=m-p; i<=m; i++) this.knots[i]=1;
			

			// BUILDING MATRIX
			let N = new Array( n+1 );
			for(let i=0; i<=n; i++) N[i] = this._N2(h, p, t[i]);
			

			// SOLVING EQUATIONS
			let invXmatr = null;
			if(n===h) invXmatr = this.inverse(N);
			else {				

				let N_T = this.transform(N);
				let m1 = this.mult(N_T, N);
				let m1i = this.inverse(m1);

				invXmatr = this.mult(m1i, N_T);


			}

			let x = new Array(h+1);
			let y = new Array(h+1);
			let z = new Array(h+1);

			for(let i=0; i <= h; i++){
				let tmpX = 0, tmpY = 0, tmpZ = 0;
				for(let j=0; j <= n; j++){
					tmpX += invXmatr[i][j] * pointAry[j].position[0];
					tmpY += invXmatr[i][j] * pointAry[j].position[1];
					tmpZ += invXmatr[i][j] * pointAry[j].position[2];
				}
				x[i] = tmpX;
				y[i] = tmpY;
				z[i] = tmpZ;
			}

			let P = [];
			for(let i=0; i<=h; i++) P.push(x[i], y[i], z[i]);

			let B = new Array(h+1);
			for(let i=0; i<=h; i++) B[i] = new Array(3);
			for(let i=0; i<=h; i++){
				B[i][0] = x[i];
				B[i][1] = y[i];
				B[i][2] = z[i];
			}
			let D = this.mult(N, B);
			for(let i=0; i<=n; i++){
				D[i][0] -= pointAry[i].position[0];
				D[i][1] -= pointAry[i].position[1];
				D[i][2] -= pointAry[i].position[2];
			}

			

			let step_t = (this.knots[h+1] - this.knots[p]) / (this.splinePointsCount-1);
			for(let stpT=0; stpT < this.splinePointsCount; stpT++){
				let r_x = 0, r_y = 0, r_z = 0;
				let N2 = this._N2(h, p, this.knots[p]+stpT*step_t);

				for(let k=0; k<=h; k++){
					r_x += x[k] * N2[k];
					r_y += y[k] * N2[k];
					r_z += z[k] * N2[k];	
				}
				this.verts.push(r_x, r_y, r_z);
			}
			if(this.debugPoints.visible) this.debugPoints.setDots(P);

		}

		/////////////////////////////////////////////////////////
		if(this.buildMode === CurveSpline.HERMITE){
			if(pointAry.length<4 || pointAry.length%2 !== 0) return this;
			this.drawBrokenLine = false;
			let t_Ary = new Array(pointAry.length/2);
			let m_Ary = new Array(pointAry.length/2);
			t_Ary[0] = 0.0;
			for(let i=2; i<pointAry.length; i+=2) t_Ary[i/2] = t_Ary[i/2-1] + Vec3.sub(pointAry[i].position, pointAry[i-2].position).length();
			for(let i=0; i<pointAry.length; i+=2) m_Ary[i/2] = Vec3.sub(pointAry[i+1].position, pointAry[i].position);

			let step_t = t_Ary[t_Ary.length-1] / (this.splinePointsCount-1);


			let i = 0;

			for(let stpT=0; stpT<this.splinePointsCount; stpT++){
				let t = stpT*step_t;
				
				let h_i = t_Ary[i+1]-t_Ary[i];
				let w = (t-t_Ary[i])/h_i;

				let fi1 = (1-w)*(1-w)*(1+2*w);
				let fi2 = w*w*(3-2*w);
				let fi3 = w*(1-w)*(1-w);
				let fi4 = -w*w*(1-w);

				let x = fi1*pointAry[i*2].position[0] + fi2*pointAry[(i+1)*2].position[0] + fi3*h_i*m_Ary[i][0] + fi4*h_i*m_Ary[i+1][0];
				let y = fi1*pointAry[i*2].position[1] + fi2*pointAry[(i+1)*2].position[1] + fi3*h_i*m_Ary[i][1] + fi4*h_i*m_Ary[i+1][1];
				let z = fi1*pointAry[i*2].position[2] + fi2*pointAry[(i+1)*2].position[2] + fi3*h_i*m_Ary[i][2] + fi4*h_i*m_Ary[i+1][2];

				this.verts.push(x, y, z);
				if( stpT!==this.splinePointsCount-1 && (stpT+1)*step_t > t_Ary[i+1]+0.0001 ){
					i++;
				}
			}

			this.debugPoints.setLines(pointAry);
		}
		/////////////////////////////////////////////////////////
		if(this.buildMode === CurveSpline.NATURAL_SPLINE){
			let N = pointAry.length-1;
			let h = new Array(N-1);
			let P = new Array(N+1);
			for(let i=0; i<=N; i++) P[i] = pointAry[i].position;
			let tAry = new Array(P.length);
			tAry[0] = 0.0;
			for(let i=1; i<P.length; i++) {
				let distance = Vec3.sub(P[i], P[i-1]).length();
				tAry[i] = tAry[i-1] + distance;
				h[i-1] = distance;
			}
			let a = new Array(N);
			let b = new Array(N);
			let c = new Array(N);
			
			a[1] = 0;
			c[N-1] = 0;
			b[1] = h[0]+2*h[1];
			b[N-1] = 2*h[N-2]+h[N-1];
			a[N-1] = h[N-2]-h[N-1];
			c[1] = h[1]-h[0];
			
			for(let i=2; i<=N-2; i++){
				a[i] = h[i-1];
				c[i] = h[i];
				b[i] = 2*(h[i-1]+h[i]);
			}
			let lambda0 = (h[1]/(h[0]+h[1]));
			let muN_1   = (h[N-2]/(h[N-2]+h[N-1]));

			let dx = new Array(N);
			dx[1] = 6*lambda0*( (P[2].x-P[1].x)/h[1]     - (P[1].x-P[0].x)/h[0]  );
			dx[N-1] = 6*muN_1*( (P[N].x-P[N-1].x)/h[N-1] - (P[N-1].x-P[N-2].x)/h[N-2]  );

			let dy = new Array(N);
			dy[1] = 6*lambda0*( (P[2].y-P[1].y)/h[1]     - (P[1].y-P[0].y)/h[0]  );
			dy[N-1] = 6*muN_1*( (P[N].y-P[N-1].y)/h[N-1] - (P[N-1].y-P[N-2].y)/h[N-2]  );

			let dz = new Array(N);
			dz[1] = 6*lambda0*( (P[2].z-P[1].z)/h[1]     - (P[1].z-P[0].z)/h[0]  );
			dz[N-1] = 6*muN_1*( (P[N].z-P[N-1].z)/h[N-1] - (P[N-1].z-P[N-2].z)/h[N-2]  );

			for(let i=2; i<=N-2; i++){
				dx[i] = 6*( (P[i+1].x-P[i].x)/h[i] - (P[i].x-P[i-1].x)/h[i-1]  );
				dy[i] = 6*( (P[i+1].y-P[i].y)/h[i] - (P[i].y-P[i-1].y)/h[i-1]  );
				dz[i] = 6*( (P[i+1].z-P[i].z)/h[i] - (P[i].z-P[i-1].z)/h[i-1]  );
			}

			let MiX = this.ThomasAlgorithm(a,b,c,dx,N);
			let MiY = this.ThomasAlgorithm(a,b,c,dy,N);
			let MiZ = this.ThomasAlgorithm(a,b,c,dz,N);
			MiX[0] = MiX[1]-(h[0]/h[1])*(MiX[2]-MiX[1]);
			MiX[N] = MiX[N-1]+(h[N-1]/h[N-2])*(MiX[N-1]-MiX[N-2]);

			MiY[0] = MiY[1]-(h[0]/h[1])*(MiY[2]-MiY[1]);
			MiY[N] = MiY[N-1]+(h[N-1]/h[N-2])*(MiY[N-1]-MiY[N-2]);

			MiZ[0] = MiZ[1]-(h[0]/h[1])*(MiZ[2]-MiZ[1]);
			MiZ[N] = MiZ[N-1]+(h[N-1]/h[N-2])*(MiZ[N-1]-MiZ[N-2]);



			let i = 0;
			let step = tAry[N] / (this.splinePointsCount-1);

			for(let stpT=0; stpT < this.splinePointsCount; stpT++){
				let t = stpT*step;
				let w = (t-tAry[i])/h[i];

				let fi1 = 1-w;
				let fi2 = w;
				let fi3 = w*(w-1)*(2-w);
				let fi4 = w*(w*w-1);

				let x = fi1*P[i].x+fi2*P[i+1].x+fi3*h[i]*h[i]*MiX[i]/6+fi4*h[i]*h[i]*MiX[i+1]/6;
				let y = fi1*P[i].y+fi2*P[i+1].y+fi3*h[i]*h[i]*MiY[i]/6+fi4*h[i]*h[i]*MiY[i+1]/6;
				let z = fi1*P[i].z+fi2*P[i+1].z+fi3*h[i]*h[i]*MiZ[i]/6+fi4*h[i]*h[i]*MiZ[i+1]/6;


			 	this.verts.push(x, y, z);

			 	if(stpT !==  this.splinePointsCount-1 && (stpT+1) * step > tAry[i+1]+0.000001){
					i++;
				} 
			}
		}
	}

	getEvaluatedArray(mode, pointCnt, map){
		let pointAry = this.base.controlPoints;
		let n = pointAry.length-1;
		this.q = n+1; 
		let q = n+1;
		let p = n;
		let m = n+p+1;

		this.knots = new Array( m+1 );

		for(let i=0; i<=p; i++)   this.knots[i]=0;
		for(let j=1; j<=n-p; j++) this.knots[j]=j/(n-p+1);
		for(let j=m-p; j<=m; j++) this.knots[j]=1;
			

		let N = new Array( n+1 );
		for(let i=0; i<=n; i++) N[i] = new Array( n+1 );

		for(let i=0; i<=n; i++){
			let N_array = this._N2(n, p, i/n);
			for(let j=0; j<=n; j++){
				N[i][j] = N_array[j];
			}
		}

		let invXmatr = this.inverse(N);
		let x = new Array(n+1);
		let y = new Array(n+1);
		let z = new Array(n+1);
		for(let i=0; i <= n; i++){
			let tmpX = 0, tmpY = 0, tmpZ = 0;
			for(let j=0; j <= n; j++){
				tmpX += invXmatr[i][j] * pointAry[j].position.x;
				tmpY += invXmatr[i][j] * pointAry[j].position.y;
				tmpZ += invXmatr[i][j] * pointAry[j].position.z;
			}
			x[i] = tmpX;
			y[i] = tmpY;
			z[i] = tmpZ;
		}

		let evaluatedArray = new Array(pointCnt);

		let step_t = 1 / (pointCnt-1);
		for(let stpT=0; stpT < pointCnt; stpT++){
			let r_x = 0, r_y = 0, r_z = 0;

			let N2 = map ? this._N2(n, p, map(stpT*step_t)) : this._N2(n, p, stpT*step_t);

			for(let k=0; k<=n; k++){
				r_x += x[k] * N2[k];
				r_y += y[k] * N2[k];
				r_z += z[k] * N2[k];	
			}
			evaluatedArray[stpT] = [r_x, r_y, r_z];
		}
		return evaluatedArray;
	}

	ThomasAlgorithm(a, b, c, d, N){ 
		let P = new Array(N);
		let Q = new Array(N);
		P[1] = c[1]/b[1];
		Q[1] = d[1]/b[1];
		let factor = null;
		for(let i=2; i<=N-1; i++){
			factor = b[i]-a[i]*P[i-1];
			P[i] = c[i]/factor;
			Q[i] = (d[i]-a[i]*Q[i-1])/factor;
		}
		P[N-1] = 0;
		let u = new Array(N+1);
		u[N-1] = Q[N-1];
		for(let i=N-2; i>=1; i--){
			u[i] = -P[i]*u[i+1]+Q[i];
		}
		return u;
	}

	_C(n, k){
		if(k === 0) return 1;
		if( this.binomCache.has(n*k+k) ) return this.binomCache.get(n*k+k);
		let result = (n-k+1)/k * this._C(n, k-1);
		this.binomCache.set(n*k+k, result);
		return result;
	}

	_B(n, k, t){ return this._C(n, k) * Math.pow(t, k) * Math.pow(1-t, n-k); }

	_N(k, q, t){
		let knots = this.knots;
		if(q === 1) {
			if(knots[k] <= t && knots[k+1] >= t) return 1;
			else return 0;
		}
		let div1, div2;
 		if(knots[k+q-1] === knots[k]) div1 = 0;
 		else                          div1 = 1/(knots[k+q-1]-knots[k]);

 		if(knots[k+q] === knots[k+1]) div2 = 0;
 		else                          div2 = 1/(knots[k+q]-knots[k+1]);

		return (t-knots[k])*div1*this._N(k, q-1, t) + (knots[k+q]-t)*div2*this._N(k+1, q-1, t);
	}

	_N2(n, p, u){
		let U = this.knots;
		let m = U.length-1;
		let N = new Array(n+1);
		for(let ind=0; ind<=n; ind++) N[ind]=0;
		if(u===U[0]) { N[0]=1.0; return N; }
		if(u===U[m]) { N[n]=1.0; return N; }
		let k = 0;
		while(U[k+1]<u) k++;
		N[k]=1.0;
		for(let d=1; d<=p; d++){
			N[k-d] = (U[k+1]-u)/(U[k+1]-U[k-d+1])*N[k-d+1];
			for(let i=k-d+1; i<=k-1; i++){
				N[i] = (u-U[i])/(U[i+d]-U[i])*N[i] + (U[i+d+1]-u)/(U[i+d+1]-U[i+1])*N[i+1];
			}
			N[k] = (u-U[k])/(U[k+d]-U[k])*N[k];
			
		}
		return N;
	}


	bezier_r(t){
		let pointAry = this.base.controlPoints;
		let r_x = 0, r_y = 0, r_z = 0;
		let n = this.base.controlPoints.length - 1;
		for(let k=0; k<=n; k++){	
				r_x += pointAry[ k ].position[0] * this._B(n, k, t);
				r_y += pointAry[ k ].position[1] * this._B(n, k, t);
				r_z += pointAry[ k ].position[2] * this._B(n, k, t);	
		}
		return [r_x, r_y, r_z];
	}

	bspline_r(t){
		let pointAry = this.gPoints._points;
		let n = this.gPoints._points.length - 1;
		let r_x = 0, r_y = 0, r_z = 0;
		for(let k=0; k<=n; k++){
				let mult = this._N(k, this.q, t);
				r_x += pointAry[ k ].position.x * mult;
				r_y += pointAry[ k ].position.y * mult;
				r_z += pointAry[ k ].position.z * mult;	
		}
		return [r_x, r_y, r_z];
	}

	bspline_r2(t){
		let pointAry = this.base.controlPoints;
		let n = this.base.controlPoints.length - 1;
		let r_x = 0, r_y = 0, r_z = 0;
		let N = this._N2(n, this.q-1, t);
		for(let k=0; k<=n; k++){
				r_x += pointAry[ k ].position[0] * N[k];
				r_y += pointAry[ k ].position[1] * N[k];
				r_z += pointAry[ k ].position[2] * N[k];	
		}
		return [r_x, r_y, r_z];
	}

	inverse(A){
		let n = A.length;
		let a = new Array(n);
		for(let i=0; i<n;i++) a[i]=new Array(2*n);

		for(let i=0;i<n;i++){
			for(let j=0;j<n;j++){
				a[i][j] = A[i][j];
			}
		}
		for(let i=0;i<n;i++){
			for(let j=n;j<2*n;j++){
				if(i==j-n) a[i][j]=1;
				else       a[i][j]=0;
			}
		}
		for(let i=0;i<n;i++){
			let t=a[i][i];
			for(let j=i;j<2*n;j++)
				a[i][j]=a[i][j]/t;
			for(let j=0;j<n;j++){
				if(i!=j){
					t=a[j][i];
					for(let k=0;k<2*n;k++)
						a[j][k]=a[j][k]-t*a[i][k];
				}
			}
		}
		let inv = new Array(n);
		for(let i=0; i<n;i++) inv[i]=new Array(n);
		for(let i=0;i<n;i++){
			for(let j=0;j<n;j++){
				inv[i][j] = a[i][j+n];
			}
		}
		return inv;
	}

	transform(A){
		let n = A.length;
		let m = A[0].length;
		let A_T = new Array(m);
		for(let i=0; i<m; i++) A_T[i] = new Array(n);
		for(let i=0; i<m; i++){
			for(let j=0; j<n; j++){
				A_T[i][j] = A[j][i];
			}
		}
		return A_T;
	}

	mult(A, B){
		let m = A[0].length;
		let n = B.length;
		let h = A.length;
		let k = B[0].length;
		if(m !== n) console.error("Wrong matrix dimensions");
		let C = new Array(h);
		for(let i=0; i<h; i++) C[i] = new Array(k);

		for(let i=0; i<h; i++){
			for(let j=0; j<k; j++){
				let c_ij = 0;
				for(let k=0; k<n; k++){
					c_ij += A[i][k]*B[k][j];
				}
				C[i][j] = c_ij;
			}
		}
		return C;
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