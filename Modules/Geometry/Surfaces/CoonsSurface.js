import SurfaceBase from "./SurfaceBase.js";

class CoonsSurface extends SurfaceBase{
	constructor(pointAry, surfSizeX, surfSizeZ, splinePointsX, splinePointsZ, c1, c2, c3, c4){
		super(pointAry, surfSizeX, surfSizeZ, splinePointsX, splinePointsZ);
		this.c1points = c1;
		this.c2points = c2;
		this.c3points = c3;
		this.c4points = c4;
	}

	build(){
		let verts = [];

		let step_t   = 1 / (this.splinePointsZ-1);
		let step_tau = 1 / (this.splinePointsX-1);

		let c1_Ary = this.c1points.spline.curveBase.build(this.splinePointsZ);
		let c2_Ary = this.c2points.spline.curveBase.build(this.splinePointsZ);
		let c3_Ary = this.c3points.spline.curveBase.build(this.splinePointsX);
		let c4_Ary = this.c4points.spline.curveBase.build(this.splinePointsX);

		for(let stpT=0; stpT<this.splinePointsZ; stpT++){
			for(let stpTau=0; stpTau<this.splinePointsX; stpTau++){
				let point = this._r(stpT*step_t, stpTau*step_tau, c1_Ary, c2_Ary, c3_Ary, c4_Ary, stpT, stpTau);
				verts.push(point[0], point[1], point[2]);
			}
		}

		return verts;
	}

	getCoordDelegate(t, tau){ return this._rPrecise(t, tau); }

	_r(t, tau, c1_Ary, c2_Ary, c3_Ary, c4_Ary, stpT, stpTau){
		let c3tau = c3_Ary[stpTau];
		let c4tau = c4_Ary[stpTau];

		let f_t_tau = this._f(t, tau, c1_Ary, c2_Ary, stpT);
		let f_0_tau = this._f(0, tau, c1_Ary, c2_Ary, 0);
		let f_1_tau = this._f(1, tau, c1_Ary, c2_Ary, this.splinePointsZ-1);

		let rx = f_t_tau[0]-this._alfa0(t)*(f_0_tau[0]-c3tau[0])-this._alfa1(t)*(f_1_tau[0]-c4tau[0]);
		let ry = f_t_tau[1]-this._alfa0(t)*(f_0_tau[1]-c3tau[1])-this._alfa1(t)*(f_1_tau[1]-c4tau[1]);
		let rz = f_t_tau[2]-this._alfa0(t)*(f_0_tau[2]-c3tau[2])-this._alfa1(t)*(f_1_tau[2]-c4tau[2]);

		return [rx, ry, rz];
	}

	_alfa0(t) { return 1-t; }
	_alfa1(t) { return t;   }
	_f(t, tau, c1_Ary, c2_Ary, stpT) {
		let c1t = c1_Ary[stpT];
		let c2t = c2_Ary[stpT];

		let fx = this._alfa0(tau)*c1t[0] + this._alfa1(tau)*c2t[0];
		let fy = this._alfa0(tau)*c1t[1] + this._alfa1(tau)*c2t[1];
		let fz = this._alfa0(tau)*c1t[2] + this._alfa1(tau)*c2t[2];

		return [fx, fy, fz];
	}

	_rPrecise(t, tau){
		let c3tau = this.c3points.spline.curveBase.getCoord(tau);
		let c4tau = this.c4points.spline.curveBase.getCoord(tau);

		let f_t_tau = this._fPrecise(t, tau);
		let f_0_tau = this._fPrecise(0, tau);
		let f_1_tau = this._fPrecise(1, tau);

		let rx = f_t_tau[0]-this._alfa0(t)*(f_0_tau[0]-c3tau[0])-this._alfa1(t)*(f_1_tau[0]-c4tau[0]);
		let ry = f_t_tau[1]-this._alfa0(t)*(f_0_tau[1]-c3tau[1])-this._alfa1(t)*(f_1_tau[1]-c4tau[1]);
		let rz = f_t_tau[2]-this._alfa0(t)*(f_0_tau[2]-c3tau[2])-this._alfa1(t)*(f_1_tau[2]-c4tau[2]);

		return [rx, ry, rz];
	}

	_fPrecise(t, tau){
		let c1t = this.c1points.spline.curveBase.getCoord(t);
		let c2t = this.c2points.spline.curveBase.getCoord(t);

		let fx = this._alfa0(tau)*c1t[0] + this._alfa1(tau)*c2t[0];
		let fy = this._alfa0(tau)*c1t[1] + this._alfa1(tau)*c2t[1];
		let fz = this._alfa0(tau)*c1t[2] + this._alfa1(tau)*c2t[2];

		return [fx, fy, fz];
	}
}

export default CoonsSurface;