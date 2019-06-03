import CurveBase     from "./CurveBase.js";
import Vec3          from "../../../maths/Vec3.js";
import { Matrix }    from "../../../maths/LinearAlgebra.js";

class BSplineInterpolationCurve extends CurveBase{
	constructor(pointAry, splinePointsCount, q){
		super(pointAry, splinePointsCount);

		this.q = 2;
	}

	build(){
		let verts = [];
		let n = this.pointAry.length-1;

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
		for(let i=0; i<=n; i++) t[i] = i/n;

	    // Chord Length Method
		// let L = 0;
		// let L_k = new Array(n+1);
		// L_k[0] = 0;
		// for(let i=1; i<=n; i++){
		// 	let tmpLen = Vec3.sub(this.pointAry[i].position, this.pointAry[i-1].position).length();
		// 	L += tmpLen;
		// 	L_k[i] = L_k[i-1] + tmpLen;
		// }
		// for(let k=0; k<=n; k++) t[k] = L_k[k]/L;



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
		if(n===h) invXmatr = Matrix.inverse(N);
		else {				

			let N_T = Matrix.transpose(N);
			let m1 = Matrix.mult(N_T, N);
			let m1i = Matrix.inverse(m1);

			invXmatr = Matrix.mult(m1i, N_T);
		}

		this.x = new Array(h+1);
		this.y = new Array(h+1);
		this.z = new Array(h+1);

		for(let i=0; i <= h; i++){
			let tmpX = 0, tmpY = 0, tmpZ = 0;
			for(let j=0; j <= n; j++){
				tmpX += invXmatr[i][j] * this.pointAry[j].position[0];
				tmpY += invXmatr[i][j] * this.pointAry[j].position[1];
				tmpZ += invXmatr[i][j] * this.pointAry[j].position[2];
			}
			this.x[i] = tmpX;
			this.y[i] = tmpY;
			this.z[i] = tmpZ;
		}



		let step_t = (this.knots[h+1] - this.knots[p]) / (this.splinePointsCount-1);
		this.tMax = step_t * (this.splinePointsCount-1);
		for(let stpT=0; stpT < this.splinePointsCount; stpT++){
			let r_x = 0, r_y = 0, r_z = 0;
			let N2 = this._N2(h, p, this.knots[p]+stpT*step_t);

			for(let k=0; k<=h; k++){
				r_x += this.x[k] * N2[k];
				r_y += this.y[k] * N2[k];
				r_z += this.z[k] * N2[k];	
			}
			verts.push( [r_x, r_y, r_z] );
		}
		
		return verts;
	}

	getCoordDelegate(t){
		t = t*this.tMax;
		let h = this.h;
		let q = this.q;
		let p = q-1;
		let r_x = 0, r_y = 0, r_z = 0;
		let N2 = this._N2(h, p, this.knots[p]+t);

		for(let k=0; k<=h; k++){
			r_x += this.x[k] * N2[k];
			r_y += this.y[k] * N2[k];
			r_z += this.z[k] * N2[k];	
		}
		return [r_x, r_y, r_z];
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
}


export default BSplineInterpolationCurve;