import { Matrix } from "../../maths/LinearAlgebra.js";

class DeformationGridGenerator{
	constructor(X, Y, sKsi, sEta, poissonCoef){
		// "i" stands for "initial".
		this.iX = Matrix.transpose(X);
		this.iY = Matrix.transpose(Y);
		this.sKsi = sKsi;
		this.sEta = sEta;

		this.Ux  = Matrix.createMatrix(this.sEta, this.sKsi);
		this.Uy  = Matrix.createMatrix(this.sEta, this.sKsi);
		this.nUx = Matrix.createMatrix(this.sEta, this.sKsi);
		this.nUy = Matrix.createMatrix(this.sEta, this.sKsi);

		this.dx   = new Array(this.sEta);
		this.dx2p = new Array(this.sEta);
		this.dx2m = new Array(this.sEta);

		this.dy   = new Array(this.sKsi);
		this.dy2p = new Array(this.sKsi);
		this.dy2m = new Array(this.sKsi);

		this.A = Matrix.createMatrix(this.sEta, this.sKsi); 
		this.B = Matrix.createMatrix(this.sEta, this.sKsi);

		this.poisson_coeff = poissonCoef ? poissonCoef : 0.5;

		this.calculateCoeffs();



	}

	init(curX, curY){
		curX = Matrix.transpose(curX);
		curY = Matrix.transpose(curY);

		// Вычисляем граничные условия и initial guess для вектора деформации внутренних точек
		for(let i=0; i<this.sEta; i++){
			for(let j=0; j<this.sKsi; j++){
				this.Ux[i][j] = this.nUx[i][j] = curX[i][j] - this.iX[i][j];
				this.Uy[i][j] = this.nUy[i][j] = curY[i][j] - this.iY[i][j];
			}
		}
	}

	changeCoeff(c){
		this.poisson_coeff = c;
		this.calculateCoeffs();
	}

	calculateCoeffs(){
		let dx   = this.dx;
		let dx2p = this.dx2p;
		let dx2m = this.dx2m;

		let dy   = this.dy;
		let dy2p = this.dy2p;
		let dy2m = this.dy2m;

		let s = this.poisson_coeff;

		let N = this.sKsi-1;
		let L = this.sEta-1;
		for(let j=1; j<=N-1; j++){
			dy[j]   = this.iY[0][j+1] - this.iY[0][j-1];
			dy2p[j] = this.iY[0][j+1] - this.iY[0][j];
			dy2m[j] = this.iY[0][j]   - this.iY[0][j-1];
		}
		for(let i=1; i<=L-1; i++){
			dx[i]   = this.iX[i+1][0] - this.iX[i-1][0];
			dx2p[i] = this.iX[i+1][0] - this.iX[i][0];
			dx2m[i] = this.iX[i][0]   - this.iX[i-1][0];
		}

		for(let i=1; i<=L-1; i++){
			for(let j=1; j<=N-1; j++){
				this.A[i][j] = 2/dx[i]*(1/dx2p[i]+1/dx2m[i]) + (1-s)/dy[j]*(1/dy2p[j]+1/dy2m[j]);
				this.B[i][j] = 2/dy[j]*(1/dy2p[j]+1/dy2m[j]) + (1-s)/dx[i]*(1/dx2p[i]+1/dx2m[i]);
			}
		}
	}

	solve(){
		let N = this.sKsi-1, L = this.sEta-1;
		let Ux = this.Ux, Uy = this.Uy;
		let nUx = this.nUx, nUy = this.nUy;
		let A = this.A, B = this.B, s = this.poisson_coeff;
		let dx   = this.dx;
		let dx2p = this.dx2p;
		let dx2m = this.dx2m;

		let dy   = this.dy;
		let dy2p = this.dy2p;
		let dy2m = this.dy2m;
		let xError = 1, yError = 1;
		let counter = 0;
		while(xError > 0.001 || yError > 0.001){
			xError = yError = 0;
			let xerr = null, yerr = null;
			for(let i=1; i<=L-1; i++){
				for(let j=1; j<=N-1; j++){
					nUx[i][j] = 1/A[i][j]*( 2/dx[i]*( Ux[i+1][j]/dx2p[i] + Ux[i-1][j]/dx2m[i] ) +
					                    (1-s)/dy[j]*( Ux[i][j+1]/dy2p[j] + Ux[i][j-1]/dy2m[j] ) +
					            (1+s)/(2*dx[i]*dy[j])*(Uy[i+1][j+1]-Uy[i+1][j-1]-Uy[i-1][j+1]+Uy[i-1][j-1]) );

					nUy[i][j] = 1/B[i][j]*( 2/dy[j]*(Uy[i][j+1]/dy2p[j]+Uy[i][j-1]/dy2m[j]) +
					                    (1-s)/dx[i]*(Uy[i+1][j]/dx2p[i]+Uy[i-1][j]/dx2m[i]) +
					            (1+s)/(2*dx[i]*dy[j])*(Ux[i+1][j+1]-Ux[i+1][j-1]-Ux[i-1][j+1]+Ux[i-1][j-1]) );

					xerr = Math.abs(nUx[i][j]-Ux[i][j]);
					yerr = Math.abs(nUy[i][j]-Uy[i][j]);

					if(xerr > xError) xError = xerr;
					if(yerr > yError) yError = yerr;
					Ux[i][j] = nUx[i][j];
					Uy[i][j] = nUy[i][j];
				}
			}
			counter++;

		}
		let resX = Matrix.sum(this.iX, Ux);
		let resY = Matrix.sum(this.iY, Uy);
		return [Matrix.transpose(resX), Matrix.transpose(resY)];
	}
}

export default DeformationGridGenerator;