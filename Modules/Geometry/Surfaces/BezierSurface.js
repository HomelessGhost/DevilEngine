import SurfaceBase from "./SurfaceBase.js";

class BezierSurface extends SurfaceBase{
	constructor(pointAry, surfSizeX, surfSizeZ, splinePointsX, splinePointsZ){
		super(pointAry, surfSizeX, surfSizeZ, splinePointsX, splinePointsZ);

		this.binomCache = new Map();
	}

	build(){
		let verts = [];

		let step_t   = 1 / (this.splinePointsZ-1);
		let step_tau = 1 / (this.splinePointsX-1); 
		for(let stpT=0; stpT < this.splinePointsZ; stpT++){
			for(let stpTau=0; stpTau < this.splinePointsX; stpTau++){
				let point = this.bezier_r(stpT*step_t, stpTau * step_tau);
				verts.push(point[0], point[1], point[2]);
			}
		}

		return verts;
	}

	getCoordDelegate(t, tau){ return this.bezier_r(t, tau); }

	bezier_r(t, tau){
		let r_x = 0, r_y = 0, r_z = 0;
		let n = this.surfSizeZ - 1;
		let m = this.surfSizeX - 1;
		for(let k=0; k<=n; k++){
			for(let j=0; j<=m; j++){
				r_x += this.pointAry[ j*(n+1) + k ].position[0] * this._B(m, j, tau) * this._B(n, k, t);
				r_y += this.pointAry[ j*(n+1) + k ].position[1] * this._B(m, j, tau) * this._B(n, k, t);
				r_z += this.pointAry[ j*(n+1) + k ].position[2] * this._B(m, j, tau) * this._B(n, k, t);
			}
		}
		return [r_x, r_y, r_z];
	}

	_C(n, k){
		if(k === 0) return 1;
		if( this.binomCache.has(n*k+k) ) return this.binomCache.get(n*k+k);
		let result = (n-k+1)/k * this._C(n, k-1);
		this.binomCache.set(n*k+k, result);
		return result;
	}

	_B(n, k, t){ return this._C(n, k) * Math.pow(t, k) * Math.pow(1-t, n-k); }
}

export default BezierSurface;