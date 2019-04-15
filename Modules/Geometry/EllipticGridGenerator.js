import { Matrix } from "../../maths/LinearAlgebra.js";

class EllipticGridGenerator{
	constructor(sKsi, sEta, dKsi, dEta, mode, stretchS, stretchT){
		this.X = null;
		this.Y = null;
		this.sKsi = sKsi;
		this.sEta = sEta;
		this.dKsi = dKsi;
		this.dEta = dEta;

		this.a = Matrix.createMatrix(this.sKsi, this.sEta);
		this.b = Matrix.createMatrix(this.sKsi, this.sEta);
		this.c = Matrix.createMatrix(this.sKsi, this.sEta);
		this.d = Matrix.createMatrix(this.sKsi, this.sEta);
		this.e = Matrix.createMatrix(this.sKsi, this.sEta);

		this.g11 = Matrix.createMatrix(this.sKsi, this.sEta);
		this.g12 = Matrix.createMatrix(this.sKsi, this.sEta);
		this.g22 = Matrix.createMatrix(this.sKsi, this.sEta);

		if(mode === EllipticGridGenerator.POISSON){

			this.P11 = Matrix.createMatrix(this.sKsi, this.sEta);
			this.P12 = Matrix.createMatrix(this.sKsi, this.sEta);
			this.P22 = Matrix.createMatrix(this.sKsi, this.sEta);
			for(let i=0; i<this.sKsi; i++){
				for(let j=0; j<this.sEta; j++){
					this.P11[i][j] = new Array(2);
					this.P12[i][j] = new Array(2);
					this.P22[i][j] = new Array(2);
				}
			}


			// Это функции формата s(ksi, eta)
			//                     t(ksi, eta)
			this.stretchS = stretchS ? stretchS : (s, t)=> s;
			this.stretchT = stretchT ? stretchT : (s, t)=> t;
		}



		this.newX = Matrix.createMatrix(this.sKsi, this.sEta);
		this.newY = Matrix.createMatrix(this.sKsi, this.sEta);

	}

	init(X, Y){
		this.X = X;
		this.Y = Y;
		for(let i=0; i<this.sKsi; i++){
			for(let j=0; j<this.sEta; j++){
				this.newX[i][j] = this.X[i][j];
				this.newY[i][j] = this.Y[i][j];
			}
		}
	}

	solveLaplace1(){
		let X = this.X, Y = this.Y, a = this.a, b = this.b, d = this.d, e = this.e;
		let newX = this.newX, newY = this.newY;
		let xError = 1, yError = 1;
		let counter = 0;
		while(xError > 0.001 || yError > 0.001){
			this.calculateLaplaceCoeff();
			xError = yError = 0;
			for(let i=1; i<this.sKsi-1; i++){
				newX[i] = this.ThomasAlgorithm(a[i], b[i], a[i], d[i], this.sEta-1, i, 1);
				newY[i] = this.ThomasAlgorithm(a[i], b[i], a[i], e[i], this.sEta-1, i, 2);
				let xerr = null, yerr = null;
				for(let j=1; j<this.sEta-1; j++){
					xerr = Math.abs(newX[i][j]-X[i][j]);
					yerr = Math.abs(newY[i][j]-Y[i][j]);
					if(xerr > xError) xError = xerr;
					if(yerr > yError) yError = yerr;
					X[i][j] = newX[i][j];
					Y[i][j] = newY[i][j];
				}
			}
			counter++;

		}
		//console.log(counter);
		return [X, Y];
	}

	solveLaplace2(){
		let X = this.X, Y = this.Y, a = this.a, b = this.b, d = this.d, e = this.e;
		let alpha = this.alpha, beta = this.beta, gamma = this.gamma;
		let newX = this.newX, newY = this.newY;
		let counter = 0;
		let xError = 1, yError = 1;
		while(xError > 0.001 || yError > 0.001){
			this.calculateLaplaceCoeff();
			xError = yError = 0;
			for(let i=1; i<this.sKsi-1; i++){
				let xerr = null, yerr = null;
				for(let j=1; j<this.sEta-1; j++){
						newX[i][j]= (d[i][j]+a[i][j]*(X[i][j+1]+newX[i][j-1])) / b[i][j];
						newY[i][j]= (e[i][j]+a[i][j]*(Y[i][j+1]+newY[i][j-1])) / b[i][j];

					xerr = Math.abs(newX[i][j]-X[i][j]);
					yerr = Math.abs(newY[i][j]-Y[i][j]);
					if(xerr > xError) xError = xerr;
					if(yerr > yError) yError = yerr;
					X[i][j] = newX[i][j];
					Y[i][j] = newY[i][j];
				}
			}
			counter++;

		}
		//console.log(counter);
		return [X, Y];
	}

	solvePoisson(){
		this.calculateControl();
		let X = this.X, Y = this.Y, a = this.a, b = this.b, c = this.c,  d = this.d, e = this.e;
		let newX = this.newX, newY = this.newY;
		let xError = 1, yError = 1;
		let counter = 0;
		while(xError > 0.001 || yError > 0.001){
			this.calculatePoissonCoeff();
			xError = yError = 0;
			for(let i=1; i<this.sKsi-1; i++){
				newX[i] = this.ThomasAlgorithm(a[i], b[i], c[i], d[i], this.sEta-1, i, 1);
				newY[i] = this.ThomasAlgorithm(a[i], b[i], c[i], e[i], this.sEta-1, i, 2);
				let xerr = null, yerr = null;
				for(let j=1; j<this.sEta-1; j++){
					xerr = Math.abs(newX[i][j]-X[i][j]);
					yerr = Math.abs(newY[i][j]-Y[i][j]);
					if(xerr > xError) xError = xerr;
					if(yerr > yError) yError = yerr;
					X[i][j] = newX[i][j];
					Y[i][j] = newY[i][j];
				}
			}
			counter++;

		}
		console.log(counter);
		return [X, Y];
	}

	calculateLaplaceCoeff(){
		let X = this.X, Y = this.Y;
		let dEta = this.dEta, dKsi = this.dKsi;
		for(let i=1; i<this.sKsi-1; i++){
			for(let j=1; j<this.sEta-1; j++){
				this.g11[i][j] = ( (X[i+1][j]-X[i-1][j])*(X[i+1][j]-X[i-1][j]) + (Y[i+1][j]-Y[i-1][j])*(Y[i+1][j]-Y[i-1][j]) )/(4*dKsi*dKsi);
				this.g22[i][j] = ( (X[i][j+1]-X[i][j-1])*(X[i][j+1]-X[i][j-1]) + (Y[i][j+1]-Y[i][j-1])*(Y[i][j+1]-Y[i][j-1]) )/(4*dEta*dEta);
				this.g12[i][j] = ( (X[i+1][j]-X[i-1][j])*(X[i][j+1]-X[i][j-1]) + (Y[i+1][j]-Y[i-1][j])*(Y[i][j+1]-Y[i][j-1]) )/(4*dEta*dKsi);

				this.a[i][j] = this.g11[i][j] / (dEta*dEta);
				this.b[i][j] = 2*(this.g11[i][j] / (dKsi*dKsi) + this.g22[i][j] / (dEta*dEta));
				this.d[i][j] = (this.g22[i][j]/(dKsi*dKsi)) * (X[i+1][j]+X[i-1][j]) - (2*this.g12[i][j]/(4*dEta*dKsi))*(X[i+1][j+1]-X[i+1][j-1]-X[i-1][j+1]+X[i-1][j-1]);
				this.e[i][j] = (this.g22[i][j]/(dKsi*dKsi)) * (Y[i+1][j]+Y[i-1][j]) - (2*this.g12[i][j]/(4*dEta*dKsi))*(Y[i+1][j+1]-Y[i+1][j-1]-Y[i-1][j+1]+Y[i-1][j-1]);
			}
		}
	}


	calculatePoissonCoeff(){
		let X = this.X, Y = this.Y;
		let dEta = this.dEta, dKsi = this.dKsi;

		for(let i=1; i<this.sKsi-1; i++){

			for(let j=1; j<this.sEta-1; j++){
				this.g11[i][j] = ( (X[i+1][j]-X[i-1][j])*(X[i+1][j]-X[i-1][j]) + (Y[i+1][j]-Y[i-1][j])*(Y[i+1][j]-Y[i-1][j]) )/(4*dKsi*dKsi);
				this.g22[i][j] = ( (X[i][j+1]-X[i][j-1])*(X[i][j+1]-X[i][j-1]) + (Y[i][j+1]-Y[i][j-1])*(Y[i][j+1]-Y[i][j-1]) )/(4*dEta*dEta);
				this.g12[i][j] = ( (X[i+1][j]-X[i-1][j])*(X[i][j+1]-X[i][j-1]) + (Y[i+1][j]-Y[i-1][j])*(Y[i][j+1]-Y[i][j-1]) )/(4*dEta*dKsi);

				let P = this.g22[i][j];
				let Q = this.g12[i][j];
				let R = this.g11[i][j];
				let S = this.g22[i][j]*this.P11[i][j][0] - 2*this.g12[i][j]*this.P12[i][j][0] + this.g11[i][j]*this.P22[i][j][0];
				let T = this.g22[i][j]*this.P11[i][j][1] - 2*this.g12[i][j]*this.P12[i][j][1] + this.g11[i][j]*this.P22[i][j][1];


				this.a[i][j] = R/(dEta*dEta) - T/(2*dEta);
				this.c[i][j] = R/(dEta*dEta) + T/(2*dEta);

				this.b[i][j] = 2*(P/(dKsi*dKsi) + R/(dEta*dEta));
				this.d[i][j] = (P/(dKsi*dKsi)) * (X[i+1][j]+X[i-1][j]) + S/(2*dKsi)*(X[i+1][j]-X[i-1][j]) - (2*Q/(4*dEta*dKsi))*(X[i+1][j+1]-X[i+1][j-1]-X[i-1][j+1]+X[i-1][j-1]);
				this.e[i][j] = (P/(dKsi*dKsi)) * (Y[i+1][j]+Y[i-1][j]) + S/(2*dKsi)*(Y[i+1][j]-Y[i-1][j]) - (2*Q/(4*dEta*dKsi))*(Y[i+1][j+1]-Y[i+1][j-1]-Y[i-1][j+1]+Y[i-1][j-1]);
			}
		}
	}

	calculateControl(){
		let stretchS = this.stretchS, stretchT = this.stretchT;
		let dKsi = this.dKsi, dEta = this.dEta;
		let P11 = this.P11, P12 = this.P12, P22 = this.P22;

		let s_ksi = new Array(this.sKsi);
		let s_eta = new Array(this.sKsi);
		let t_ksi = new Array(this.sKsi);
		let t_eta = new Array(this.sKsi);

		let s_ksi_ksi = new Array(this.sKsi);
		let s_ksi_eta = new Array(this.sKsi);
		let s_eta_eta = new Array(this.sKsi);

		let t_ksi_ksi = new Array(this.sKsi);
		let t_ksi_eta = new Array(this.sKsi);
		let t_eta_eta = new Array(this.sKsi);

		for(let i=1; i<this.sKsi-1; i++){
			s_ksi[i] = new Array(this.sEta);
			s_eta[i] = new Array(this.sEta);
			t_ksi[i] = new Array(this.sEta);
			t_eta[i] = new Array(this.sEta);

			s_ksi_ksi[i] = new Array(this.sEta);
			s_ksi_eta[i] = new Array(this.sEta);
			s_eta_eta[i] = new Array(this.sEta);

			t_ksi_ksi[i] = new Array(this.sEta);
			t_ksi_eta[i] = new Array(this.sEta);
			t_eta_eta[i] = new Array(this.sEta);

			for(let j=1; j<this.sEta-1; j++){
				s_ksi[i][j] = ( stretchS( (i+1)*dKsi, j*dEta ) - stretchS( (i-1)*dKsi, j*dEta ) )/(2*dKsi);
				s_eta[i][j] = ( stretchS( i*dKsi, (j+1)*dEta ) - stretchS( i*dKsi, (j-1)*dEta ) )/(2*dEta);

				t_ksi[i][j] = ( stretchT( (i+1)*dKsi, j*dEta ) - stretchT( (i-1)*dKsi, j*dEta ) )/(2*dKsi);
				t_eta[i][j] = ( stretchT( i*dKsi, (j+1)*dEta ) - stretchT( i*dKsi, (j-1)*dEta ) )/(2*dEta);

				s_ksi_ksi[i][j] = ( stretchS( (i+1)*dKsi, j*dEta ) - 2*stretchS( i*dKsi, j*dEta ) + stretchS( (i-1)*dKsi, j*dEta ) )/(dKsi*dKsi);
				s_eta_eta[i][j] = ( stretchS( i*dKsi, (j+1)*dEta ) - 2*stretchS( i*dKsi, j*dEta ) + stretchS( i*dKsi, (j-1)*dEta ) )/(dEta*dEta);
				t_ksi_ksi[i][j] = ( stretchT( (i+1)*dKsi, j*dEta ) - 2*stretchT( i*dKsi, j*dEta ) + stretchT( (i-1)*dKsi, j*dEta ) )/(dKsi*dKsi);
				t_eta_eta[i][j] = ( stretchT( i*dKsi, (j+1)*dEta ) - 2*stretchT( i*dKsi, j*dEta ) + stretchT( i*dKsi, (j-1)*dEta ) )/(dEta*dEta);

				s_ksi_eta[i][j] = ( stretchS( (i+1)*dKsi, (j+1)*dEta ) + stretchS( (i-1)*dKsi, (j-1)*dEta ) - stretchS( (i+1)*dKsi, (j-1)*dEta ) - stretchS( (i-1)*dKsi, (j+1)*dEta ) )/(4*dKsi*dEta);
				t_ksi_eta[i][j] = ( stretchT( (i+1)*dKsi, (j+1)*dEta ) + stretchT( (i-1)*dKsi, (j-1)*dEta ) - stretchT( (i+1)*dKsi, (j-1)*dEta ) - stretchT( (i-1)*dKsi, (j+1)*dEta ) )/(4*dKsi*dEta);
			}				
		}
		for(let i=1; i<this.sKsi-1; i++){
			for(let j=1; j<this.sEta-1; j++){
				let detT = s_ksi[i][j]*t_eta[i][j] - t_ksi[i][j]*s_eta[i][j];

				let Ti11 =  t_eta[i][j]/detT;
				let Ti12 = -s_eta[i][j]/detT;
				let Ti21 = -t_ksi[i][j]/detT;
				let Ti22 =  s_ksi[i][j]/detT;

				P11[i][j][0] = -Ti11*s_ksi_ksi[i][j]-Ti12*t_ksi_ksi[i][j];
				P11[i][j][1] = -Ti21*s_ksi_ksi[i][j]-Ti22*t_ksi_ksi[i][j];

				P12[i][j][0] = -Ti11*s_ksi_eta[i][j]-Ti12*t_ksi_eta[i][j];
				P12[i][j][1] = -Ti21*s_ksi_eta[i][j]-Ti22*t_ksi_eta[i][j];

				P22[i][j][0] = -Ti11*s_eta_eta[i][j]-Ti12*t_eta_eta[i][j];
				P22[i][j][1] = -Ti21*s_eta_eta[i][j]-Ti22*t_eta_eta[i][j];			
			}
		}


	}
	// Прогонка
	ThomasAlgorithm(a, b, c, d, N, iter, which){ 
		if(which===1){
			d[1] += a[1]*this.X[iter][0];
			d[N-1] += c[N-1]*this.X[iter][N];
		} else {
			d[1] += a[1]*this.Y[iter][0];
			d[N-1] += c[N-1]*this.Y[iter][N];
		}

		let P = new Array(N);
		let Q = new Array(N);
		P[1] = c[1]/b[1];
		Q[1] = d[1]/b[1];
		let factor = null;
		for(let i=2; i<=N-1; i++){
			factor = b[i]-a[i]*P[i-1];
			P[i] = c[i]/factor;
			Q[i] = (d[i]+a[i]*Q[i-1])/factor;
		}
		P[N-1] = 0;
		let u = new Array(N);
		u[N-1] = Q[N-1];
		for(let i=N-2; i>=1; i--){
			u[i] = P[i]*u[i+1]+Q[i];
		}
		return u;
	}
}

EllipticGridGenerator.LAPLACE = 1;
EllipticGridGenerator.POISSON = 2;

export default EllipticGridGenerator;
