import SurfaceBase from "./SurfaceBase.js";
import { Matrix }  from "../../../maths/LinearAlgebra.js";
import DeformationGridGenerator      from "../DeformationGridGenerator.js";


class DeformationSurface extends SurfaceBase{
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

		if(!this.deformationGridGenerator){
			this.deformationGridGenerator = new DeformationGridGenerator(X, Z, this.splinePointsZ, this.splinePointsX, 0.2);
		}
		this.deformationGridGenerator.init(X,Z);
		let solution = this.deformationGridGenerator.solve();
		let solvedX = solution[0];
		let solvedZ = solution[1];

		for(let i=0; i<this.splinePointsZ; i++){
			for(let j=0; j<this.splinePointsX; j++){
				verts.push(solvedX[i][j], 1, solvedZ[i][j]);
			}
		}


		return verts;
	}

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

}

export default DeformationSurface;