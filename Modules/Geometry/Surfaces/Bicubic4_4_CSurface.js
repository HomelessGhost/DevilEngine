import SurfaceBase   from "./SurfaceBase.js";
import Vec3          from "../../../maths/Vec3.js";
import { Matrix }    from "../../../maths/LinearAlgebra.js";

class Bicubic4_4_CSurface extends SurfaceBase{
	constructor(pointAry, surfSizeX, surfSizeZ, splinePointsX, splinePointsZ){
		super(pointAry, surfSizeX, surfSizeZ, splinePointsX, splinePointsZ);
	}

	build(){
		let verts = [];

		let N = this.surfSizeZ-1;
		let L = this.surfSizeX-1;

		let P = new Array(L+1);
		for(let J=0; J<=L; J++) {
			P[J] = new Array(N+1);
			for(let I=0; I<=N; I++) P[J][I] = this.pointAry[ J*this.surfSizeZ + I ];
		}

		let tPoints = new Array(L+1);
		let a = new Array( N > L ? N : L );
		let b = new Array( N > L ? N : L );
		let c = new Array( N > L ? N : L );
		let dx = new Array( N > L ? N : L );
		let dy = new Array( N > L ? N : L );
		let dz = new Array( N > L ? N : L );

		for(let j=0; j<=L; j++){
			tPoints[j] = new Array(this.splinePointsZ);
			let tAry = new Array(N+1); tAry[0] = 0;
			let h = new Array(N);
			for(let i=1; i<=N; i++){
				let distance = Vec3.sub(P[j][i].position, P[j][i-1].position).length();
				h[i-1] = distance;
				tAry[i] = tAry[i-1] + distance;
			}

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

			dx[1] = 6*lambda0*( (P[j][2].position[0]-P[j][1].position[0])/h[1] - (P[j][1].position[0]-P[j][0].position[0])/h[0]  );
			dx[N-1] = 6*muN_1*( (P[j][N].position[0]-P[j][N-1].position[0])/h[N-1] - (P[j][N-1].position[0]-P[j][N-2].position[0])/h[N-2]  );

			dy[1] = 6*lambda0*( (P[j][2].position[1]-P[j][1].position[1])/h[1] - (P[j][1].position[1]-P[j][0].position[1])/h[0]  );
			dy[N-1] = 6*muN_1*( (P[j][N].position[1]-P[j][N-1].position[1])/h[N-1] - (P[j][N-1].position[1]-P[j][N-2].position[1])/h[N-2]  );

			dz[1] = 6*lambda0*( (P[j][2].position[2]-P[j][1].position[2])/h[1] - (P[j][1].position[2]-P[j][0].position[2])/h[0]  );
			dz[N-1] = 6*muN_1*( (P[j][N].position[2]-P[j][N-1].position[2])/h[N-1] - (P[j][N-1].position[2]-P[j][N-2].position[2])/h[N-2]  );

			for(let i=2; i<=N-2; i++){
				dx[i] = 6*( (P[j][i+1].position[0]-P[j][i].position[0])/h[i] - (P[j][i].position[0]-P[j][i-1].position[0])/h[i-1]  );
				dy[i] = 6*( (P[j][i+1].position[1]-P[j][i].position[1])/h[i] - (P[j][i].position[1]-P[j][i-1].position[1])/h[i-1]  );
				dz[i] = 6*( (P[j][i+1].position[2]-P[j][i].position[2])/h[i] - (P[j][i].position[2]-P[j][i-1].position[2])/h[i-1]  );
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
			let step = tAry[N] / (this.splinePointsZ-1);

			for(let stpT=0; stpT < this.splinePointsZ; stpT++){
				let t = stpT*step;
				let w = (t-tAry[i])/h[i];

				let fi1 = 1-w;
				let fi2 = w;
				let fi3 = w*(w-1)*(2-w);
				let fi4 = w*(w*w-1);

				let x = fi1*P[j][i].position[0]+fi2*P[j][i+1].position[0]+fi3*h[i]*h[i]*MiX[i]/6+fi4*h[i]*h[i]*MiX[i+1]/6;
				let y = fi1*P[j][i].position[1]+fi2*P[j][i+1].position[1]+fi3*h[i]*h[i]*MiY[i]/6+fi4*h[i]*h[i]*MiY[i+1]/6;
				let z = fi1*P[j][i].position[2]+fi2*P[j][i+1].position[2]+fi3*h[i]*h[i]*MiZ[i]/6+fi4*h[i]*h[i]*MiZ[i+1]/6;

				tPoints[j][stpT] = new Vec3(x, y, z);
		 	

		 		if(stpT !==  this.splinePointsZ-1 && (stpT+1) * step > tAry[i+1]+0.000001){
					i++;
				} 
			}
		}

		N = L;
		for(let i=0; i<this.splinePointsZ; i++){
			let tauAry = new Array(L+1); tauAry[0] = 0;
			let h = new Array(L);
			for(let j=1; j<=L; j++){
				let distance = Vec3.sub(tPoints[j][i], tPoints[j-1][i]).length();
				h[j-1] = distance;
				tauAry[j] = tauAry[j-1] + distance;
			}

			a[1] = 0;
			c[N-1] = 0;
			b[1] = h[0]+2*h[1];
			b[N-1] = 2*h[N-2]+h[N-1];
			a[N-1] = h[N-2]-h[N-1];
			c[1] = h[1]-h[0];

			for(let j=2; j<=N-2; j++){
				a[j] = h[j-1];
				c[j] = h[j];
				b[j] = 2*(h[j-1]+h[j]);
			}

			let lambda0 = (h[1]/(h[0]+h[1]));
			let muN_1   = (h[N-2]/(h[N-2]+h[N-1]));

			dx[1] = 6*lambda0*( (tPoints[2][i].x-tPoints[1][i].x)/h[1]     - (tPoints[1][i].x-tPoints[0][i].x)/h[0]  );
			dx[N-1] = 6*muN_1*( (tPoints[N][i].x-tPoints[N-1][i].x)/h[N-1] - (tPoints[N-1][i].x-tPoints[N-2][i].x)/h[N-2]  );

			dy[1] = 6*lambda0*( (tPoints[2][i].y-tPoints[1][i].y)/h[1]     - (tPoints[1][i].y-tPoints[0][i].y)/h[0]  );
			dy[N-1] = 6*muN_1*( (tPoints[N][i].y-tPoints[N-1][i].y)/h[N-1] - (tPoints[N-1][i].y-tPoints[N-2][i].y)/h[N-2]  );

			dz[1] = 6*lambda0*( (tPoints[2][i].z-tPoints[1][i].z)/h[1]     - (tPoints[1][i].z-tPoints[0][i].z)/h[0]  );
			dz[N-1] = 6*muN_1*( (tPoints[N][i].z-tPoints[N-1][i].z)/h[N-1] - (tPoints[N-1][i].z-tPoints[N-2][i].z)/h[N-2]  );

			for(let j=2; j<=N-2; j++){
				dx[j] = 6*( (tPoints[j+1][i].x-tPoints[j][i].x)/h[j] - (tPoints[j][i].x-tPoints[j-1][i].x)/h[j-1]  );
				dy[j] = 6*( (tPoints[j+1][i].y-tPoints[j][i].y)/h[j] - (tPoints[j][i].y-tPoints[j-1][i].y)/h[j-1]  );
				dz[j] = 6*( (tPoints[j+1][i].z-tPoints[j][i].z)/h[j] - (tPoints[j][i].z-tPoints[j-1][i].z)/h[j-1]  );
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

			let j = 0;
			let step = tauAry[N] / (this.splinePointsX-1);

			for(let stpTau=0; stpTau < this.splinePointsX; stpTau++){
				let tau = stpTau*step;
				let w = (tau-tauAry[j])/h[j];

				let fi1 = 1-w;
				let fi2 = w;
				let fi3 = w*(w-1)*(2-w);
				let fi4 = w*(w*w-1);

				let x = fi1*tPoints[j][i].x + fi2*tPoints[j+1][i].x + fi3*h[j]*h[j]*MiX[j]/6+fi4*h[j]*h[j]*MiX[j+1]/6;
				let y = fi1*tPoints[j][i].y + fi2*tPoints[j+1][i].y + fi3*h[j]*h[j]*MiY[j]/6+fi4*h[j]*h[j]*MiY[j+1]/6;
				let z = fi1*tPoints[j][i].z + fi2*tPoints[j+1][i].z + fi3*h[j]*h[j]*MiZ[j]/6+fi4*h[j]*h[j]*MiZ[j+1]/6;


		 		verts.push(x, y, z);

		 		if(stpTau !==  this.splinePointsX-1 && (stpTau+1) * step > tauAry[j+1]+0.000001){
					j++;
				} 
			}
		}

		return verts;
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
}

export default Bicubic4_4_CSurface;