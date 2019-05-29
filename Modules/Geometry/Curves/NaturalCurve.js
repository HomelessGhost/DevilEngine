import CurveBase     from "./CurveBase.js";
import Vec3          from "../../../maths/Vec3.js";

class NaturalCurve extends CurveBase{
	constructor(pointAry, splinePointsCount){
		super(pointAry, splinePointsCount);
	}

	build(){
		let verts = [];

		let N = this.pointAry.length-1;
		let h = new Array(N-1);
		let P = new Array(N+1);
		for(let i=0; i<=N; i++) P[i] = this.pointAry[i].position;
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


		 	verts.push( [x, y, z] );

		 	if(stpT !==  this.splinePointsCount-1 && (stpT+1) * step > tAry[i+1]+0.000001){
				i++;
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

export default NaturalCurve;