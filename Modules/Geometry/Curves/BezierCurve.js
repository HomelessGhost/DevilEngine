import CurveBase from "./CurveBase.js";

class BezierCurve extends CurveBase{
	constructor(pointAry, splinePointsCount){
		super(pointAry, splinePointsCount);

		this.binomCache = new Map();
	}

	build(){
		let verts = [];
		let step_t   = 1 / (this.splinePointsCount-1);
		for(let stpT=0; stpT < this.splinePointsCount; stpT++){
			let point = this.bezier_r(stpT*step_t);
			verts.push(point[0], point[1], point[2]);
		}

		return verts;
	}

	getCoordDelegate(t){ return this.bezier_r(t); }

	bezier_r(t){
		let r_x = 0, r_y = 0, r_z = 0;
		let n = this.pointAry.length - 1;
		for(let k=0; k<=n; k++){	
				r_x += this.pointAry[ k ].position[0] * this._B(n, k, t);
				r_y += this.pointAry[ k ].position[1] * this._B(n, k, t);
				r_z += this.pointAry[ k ].position[2] * this._B(n, k, t);	
		}
		return [r_x, r_y, r_z];
	}

	_B(n, k, t){ return this._C(n, k) * Math.pow(t, k) * Math.pow(1-t, n-k); }

	_C(n, k){
		if(k === 0) return 1;
		if( this.binomCache.has(n*k+k) ) return this.binomCache.get(n*k+k);
		let result = (n-k+1)/k * this._C(n, k-1);
		this.binomCache.set(n*k+k, result);
		return result;
	}
}

export default BezierCurve;