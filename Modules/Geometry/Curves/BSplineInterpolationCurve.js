import CurveBase from "./CurveBase.js";
import Vec3 from "../../../maths/Vec3.js"

class BSplineInterpolationCurve extends CurveBase{
	constructor(pointAry, splinePointsCount, q){
		super(pointAry, splinePointsCount);

		this.q = q;
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
		// for(let i=0; i<=n; i++) t[i] = i/n;

	    // Chord Length Method
		let L = 0;
		let L_k = new Array(n+1);
		L_k[0] = 0;
		for(let i=1; i<=n; i++){
			let tmpLen = Vec3.sub(this.pointAry[i].position, this.pointAry[i-1].position).length();
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
				tmpX += invXmatr[i][j] * this.pointAry[j].position[0];
				tmpY += invXmatr[i][j] * this.pointAry[j].position[1];
				tmpZ += invXmatr[i][j] * this.pointAry[j].position[2];
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
			D[i][0] -= this.pointAry[i].position[0];
			D[i][1] -= this.pointAry[i].position[1];
			D[i][2] -= this.pointAry[i].position[2];
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
			verts.push(r_x, r_y, r_z);
		}
		
		return verts;
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
}


export default BSplineInterpolationCurve;