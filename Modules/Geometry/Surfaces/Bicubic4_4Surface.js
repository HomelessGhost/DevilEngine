import SurfaceBase   from "./SurfaceBase.js";
import Vec3          from "../../../maths/Vec3.js";
import { Matrix }    from "../../../maths/LinearAlgebra.js";

class Bicubic4_4Surface extends SurfaceBase{
	constructor(pointAry, surfSizeX, surfSizeZ, splinePointsX, splinePointsZ){
		super(pointAry, surfSizeX, surfSizeZ, splinePointsX, splinePointsZ);
	}

	build(){
		let verts = [];

		let N = this.surfSizeZ-1;
		let L = this.surfSizeX-1;

		// Формируем матрицу контрольных точек
		let P = new Array(L+1);
		for(let J=0; J<=L; J++) {
			P[J] = new Array(N+1);
			for(let I=0; I<=N; I++) P[J][I] = this.pointAry[ J*this.surfSizeZ + I ].position;
		}

		// Рассчёт параметров t_i и tau_i будем производить следующим образом: 
		// Например, для t_1 на каждой линии посчитаем расстояшие от первой точки
		// линии до второй, затем возьмём среднее арифметическое полученных значений
		// и запишем его в t_1. Два t_2 посчитаем на каждой линии расстояния между
		// первой точкой и второй и запишем в t_2 среднее арифметичекое для 
		// посчитанных значений + t_1. И так далее до t_N. Для tau_i аналогично.
		let tAry   = new Array(N+1);   tAry[0]   = 0;
		let tauAry = new Array(L+1);   tauAry[0] = 0;
		let h      = new Array(N);
		let d      = new Array(L);

		// Считаем t_i
		for(let I=1; I<=N; I++){
			let tmp = 0;
			for(let J=0; J<=L; J++){
				tmp += Vec3.sub(P[J][I], P[J][I-1]).length();
			}
			h[I-1]  = tmp/(L+1);
			tAry[I] = tAry[I-1] + tmp/(L+1);
		}
		// Считаем tau_i
		for(let J=1; J<=L; J++){
			let tmp = 0;
			for(let I=0; I<=N; I++){
				tmp += Vec3.sub(P[J][I], P[J-1][I]).length();
			}
			d[J-1]    = tmp/(N+1);
			tauAry[J] = tauAry[J-1] + tmp/(N+1);
		}

		// Создаём матрицы для хранения значений M02, M20, M22 в узлах сетки
		let M_20 = Matrix.createMatrix(L+1, N+1);
		let M_02 = Matrix.createMatrix(L+1, N+1);
		let M_22 = Matrix.createMatrix(L+1, N+1);

		// Теперь необходимо заполнить матрицы M_02 и M_20 значениями. Для этого
		// потребуется решить N + L однородных задач (при условии 4-го типа КУ).

		let a = new Array( N > L ? N : L );
		let b = new Array( N > L ? N : L );
		let c = new Array( N > L ? N : L );
		let dx = new Array( N > L ? N : L );
		let dy = new Array( N > L ? N : L );
		let dz = new Array( N > L ? N : L );

		// ШАГ 1: строим кубические сплайны по t
		for(let j=0; j<=L; j++){
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

			dx[1] = 6*lambda0*( (P[j][2].x-P[j][1].x)/h[1]     - (P[j][1].x-P[j][0].x)/h[0]  );
			dx[N-1] = 6*muN_1*( (P[j][N].x-P[j][N-1].x)/h[N-1] - (P[j][N-1].x-P[j][N-2].x)/h[N-2]  );

			dy[1] = 6*lambda0*( (P[j][2].y-P[j][1].y)/h[1]     - (P[j][1].y-P[j][0].y)/h[0]  );
			dy[N-1] = 6*muN_1*( (P[j][N].y-P[j][N-1].y)/h[N-1] - (P[j][N-1].y-P[j][N-2].y)/h[N-2]  );

			dz[1] = 6*lambda0*( (P[j][2].z-P[j][1].z)/h[1]     - (P[j][1].z-P[j][0].z)/h[0]  );
			dz[N-1] = 6*muN_1*( (P[j][N].z-P[j][N-1].z)/h[N-1] - (P[j][N-1].z-P[j][N-2].z)/h[N-2]  );

			for(let i=2; i<=N-2; i++){
				dx[i] = 6*( (P[j][i+1].x-P[j][i].x)/h[i] - (P[j][i].x-P[j][i-1].x)/h[i-1]  );
				dy[i] = 6*( (P[j][i+1].y-P[j][i].y)/h[i] - (P[j][i].y-P[j][i-1].y)/h[i-1]  );
				dz[i] = 6*( (P[j][i+1].z-P[j][i].z)/h[i] - (P[j][i].z-P[j][i-1].z)/h[i-1]  );
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

			for(let i=0; i<=N; i++) M_20[j][i] = { x: MiX[i], y: MiY[i], z: MiZ[i] };
		}

		// ШАГ 2: строим кубические сплайны по tau
		for(let i=0; i<=N; i++){
			a[1] = 0;
			c[L-1] = 0;
			b[1] = d[0]+2*d[1];
			b[L-1] = 2*d[L-2]+d[L-1];
			a[L-1] = d[L-2]-d[L-1];
			c[1] = d[1]-d[0];
		
			for(let j=2; j<=L-2; j++){
				a[j] = d[j-1];
				c[j] = d[j];
				b[j] = 2*(d[j-1]+d[j]);
			}
			let lambda0 = (d[1]/(d[0]+d[1]));
			let muN_1   = (d[L-2]/(d[L-2]+d[L-1]));

			dx[1] = 6*lambda0*( (P[2][i].x-P[1][i].x)/d[1]     - (P[1][i].x-P[0][i].x)/d[0]  );
			dx[L-1] = 6*muN_1*( (P[L][i].x-P[L-1][i].x)/d[L-1] - (P[L-1][i].x-P[L-2][i].x)/d[L-2]  );

			dy[1] = 6*lambda0*( (P[2][i].y-P[1][i].y)/d[1]     - (P[1][i].y-P[0][i].y)/d[0]  );
			dy[L-1] = 6*muN_1*( (P[L][i].y-P[L-1][i].y)/d[L-1] - (P[L-1][i].y-P[L-2][i].y)/d[L-2]  );

			dz[1] = 6*lambda0*( (P[2][i].z-P[1][i].z)/d[1]     - (P[1][i].z-P[0][i].z)/d[0]  );
			dz[L-1] = 6*muN_1*( (P[L][i].z-P[L-1][i].z)/d[L-1] - (P[L-1][i].z-P[L-2][i].z)/d[L-2]  );

			for(let j=2; j<=L-2; j++){
				dx[j] = 6*( (P[j+1][i].x-P[j][i].x)/d[j] - (P[j][i].x-P[j-1][i].x)/d[j-1]  );
				dy[j] = 6*( (P[j+1][i].y-P[j][i].y)/d[j] - (P[j][i].y-P[j-1][i].y)/d[j-1]  );
				dz[j] = 6*( (P[j+1][i].z-P[j][i].z)/d[j] - (P[j][i].z-P[j-1][i].z)/d[j-1]  );
			}

			let MiX = this.ThomasAlgorithm(a,b,c,dx,L);
			let MiY = this.ThomasAlgorithm(a,b,c,dy,L);
			let MiZ = this.ThomasAlgorithm(a,b,c,dz,L);
			MiX[0] = MiX[1]-(d[0]/d[1])*(MiX[2]-MiX[1]);
			MiX[L] = MiX[L-1]+(d[L-1]/d[L-2])*(MiX[L-1]-MiX[L-2]);

			MiY[0] = MiY[1]-(d[0]/d[1])*(MiY[2]-MiY[1]);
			MiY[L] = MiY[L-1]+(d[L-1]/d[L-2])*(MiY[L-1]-MiY[L-2]);

			MiZ[0] = MiZ[1]-(d[0]/d[1])*(MiZ[2]-MiZ[1]);
			MiZ[L] = MiZ[L-1]+(d[L-1]/d[L-2])*(MiZ[L-1]-MiZ[L-2]);

			for(let j=0; j<=L; j++) M_02[j][i] = { x: MiX[j], y: MiY[j], z: MiZ[j] };
		}

		// ШАГ 3: строим кубические сплайны для нахождения значений M22
		for(let i=0; i<=N; i++){
			a[1] = 0;
			c[L-1] = 0;
			b[1] = d[0]+2*d[1];
			b[L-1] = 2*d[L-2]+d[L-1];
			a[L-1] = d[L-2]-d[L-1];
			c[1] = d[1]-d[0];
		
			for(let j=2; j<=L-2; j++){
				a[j] = d[j-1];
				c[j] = d[j];
				b[j] = 2*(d[j-1]+d[j]);
			}
			let lambda0 = (d[1]/(d[0]+d[1]));
			let muN_1   = (d[L-2]/(d[L-2]+d[L-1]));

			dx[1] = 6*lambda0*( (M_20[2][i].x-M_20[1][i].x)/d[1]     - (M_20[1][i].x-M_20[0][i].x)/d[0]  );
			dx[L-1] = 6*muN_1*( (M_20[L][i].x-M_20[L-1][i].x)/d[L-1] - (M_20[L-1][i].x-M_20[L-2][i].x)/d[L-2]  );

			dy[1] = 6*lambda0*( (M_20[2][i].y-M_20[1][i].y)/d[1]     - (M_20[1][i].y-M_20[0][i].y)/d[0]  );
			dy[L-1] = 6*muN_1*( (M_20[L][i].y-M_20[L-1][i].y)/d[L-1] - (M_20[L-1][i].y-M_20[L-2][i].y)/d[L-2]  );

			dz[1] = 6*lambda0*( (M_20[2][i].z-M_20[1][i].z)/d[1]     - (M_20[1][i].z-M_20[0][i].z)/d[0]  );
			dz[L-1] = 6*muN_1*( (M_20[L][i].z-M_20[L-1][i].z)/d[L-1] - (M_20[L-1][i].z-M_20[L-2][i].z)/d[L-2]  );

			for(let j=2; j<=L-2; j++){
				dx[j] = 6*( (M_20[j+1][i].x-M_20[j][i].x)/d[j] - (M_20[j][i].x-M_20[j-1][i].x)/d[j-1]  );
				dy[j] = 6*( (M_20[j+1][i].y-M_20[j][i].y)/d[j] - (M_20[j][i].y-M_20[j-1][i].y)/d[j-1]  );
				dz[j] = 6*( (M_20[j+1][i].z-M_20[j][i].z)/d[j] - (M_20[j][i].z-M_20[j-1][i].z)/d[j-1]  );
			}

			let MiX = this.ThomasAlgorithm(a,b,c,dx,L);
			let MiY = this.ThomasAlgorithm(a,b,c,dy,L);
			let MiZ = this.ThomasAlgorithm(a,b,c,dz,L);
			MiX[0] = MiX[1]-(d[0]/d[1])*(MiX[2]-MiX[1]);
			MiX[L] = MiX[L-1]+(d[L-1]/d[L-2])*(MiX[L-1]-MiX[L-2]);

			MiY[0] = MiY[1]-(d[0]/d[1])*(MiY[2]-MiY[1]);
			MiY[L] = MiY[L-1]+(d[L-1]/d[L-2])*(MiY[L-1]-MiY[L-2]);

			MiZ[0] = MiZ[1]-(d[0]/d[1])*(MiZ[2]-MiZ[1]);
			MiZ[L] = MiZ[L-1]+(d[L-1]/d[L-2])*(MiZ[L-1]-MiZ[L-2]);

			for(let j=0; j<=L; j++) M_22[j][i] = { x: MiX[j], y: MiY[j], z: MiZ[j] };
		}

		// Теперь строим сплайновую поверхность по посчитанным данным
		let step_t   = tAry[N]   / (this.splinePointsZ-1);
		let step_tau = tauAry[L] / (this.splinePointsX-1);
		let i = 0, j = 0;
		for(let stpT=0; stpT<this.splinePointsZ; stpT++){
			let t = stpT*step_t;
			let w = (t-tAry[i])/h[i];

			let fi1_w = 1-w;
			let fi2_w = w;
			let fi3_w = w*(w-1)*(2-w);
			let fi4_w = w*(w*w-1);

			j = 0;
			for(let stpTau=0; stpTau < this.splinePointsX; stpTau++){
				let tau = stpTau*step_tau;
				let k = (tau-tauAry[j])/d[j];
				let fi1_k = 1-k;
				let fi2_k = k;
				let fi3_k = k*(k-1)*(2-k);
				let fi4_k = k*(k*k-1);

				let factor = 6;
				// Для X
				let sum1x = fi1_w * P[j][i].x   + fi2_w * P[j][i+1].x   + (fi3_w*h[i]*h[i] * M_20[j][i].x   + fi4_w*h[i]*h[i] * M_20[j][i+1].x) / factor;
				let sum2x = fi1_w * P[j+1][i].x + fi2_w * P[j+1][i+1].x + (fi3_w*h[i]*h[i] * M_20[j+1][i].x + fi4_w*h[i]*h[i] * M_20[j+1][i+1].x) / factor;

				let sum3x = (fi1_w * M_02[j][i].x   + fi2_w * M_02[j][i+1].x   + fi3_w*h[i]*h[i] * M_22[j][i].x/6   + fi4_w*h[i]*h[i] * M_22[j][i+1].x/6) / factor;
				let sum4x = (fi1_w * M_02[j+1][i].x + fi2_w * M_02[j+1][i+1].x + fi3_w*h[i]*h[i] * M_22[j+1][i].x/6 + fi4_w*h[i]*h[i] * M_22[j+1][i+1].x/6) / factor;
				

				// Для Y
				let sum1y = fi1_w * P[j][i].y   + fi2_w * P[j][i+1].y   + (fi3_w*h[i]*h[i] * M_20[j][i].y   + fi4_w*h[i]*h[i] * M_20[j][i+1].y) / factor;
				let sum2y = fi1_w * P[j+1][i].y + fi2_w * P[j+1][i+1].y + (fi3_w*h[i]*h[i] * M_20[j+1][i].y + fi4_w*h[i]*h[i] * M_20[j+1][i+1].y) / factor;

				let sum3y = (fi1_w * M_02[j][i].y   + fi2_w * M_02[j][i+1].y   + fi3_w*h[i]*h[i] * M_22[j][i].y/6   + fi4_w*h[i]*h[i] * M_22[j][i+1].y/6) / factor;
				let sum4y = (fi1_w * M_02[j+1][i].y + fi2_w * M_02[j+1][i+1].y + fi3_w*h[i]*h[i] * M_22[j+1][i].y/6 + fi4_w*h[i]*h[i] * M_22[j+1][i+1].y/6) / factor;

				// Для Z
				let sum1z = fi1_w * P[j][i].z   + fi2_w * P[j][i+1].z   + (fi3_w*h[i]*h[i] * M_20[j][i].z   + fi4_w*h[i]*h[i] * M_20[j][i+1].z) / factor;
				let sum2z = fi1_w * P[j+1][i].z + fi2_w * P[j+1][i+1].z + (fi3_w*h[i]*h[i] * M_20[j+1][i].z + fi4_w*h[i]*h[i] * M_20[j+1][i+1].z) / factor;

				let sum3z = (fi1_w * M_02[j][i].z   + fi2_w * M_02[j][i+1].z   + fi3_w*h[i]*h[i] * M_22[j][i].z/6   + fi4_w*h[i]*h[i] * M_22[j][i+1].z/6) / factor;
				let sum4z = (fi1_w * M_02[j+1][i].z + fi2_w * M_02[j+1][i+1].z + fi3_w*h[i]*h[i] * M_22[j+1][i].z/6 + fi4_w*h[i]*h[i] * M_22[j+1][i+1].z/6) / factor;
				

				// Результат
				let x = fi1_k*sum1x + fi2_k*sum2x + fi3_k*d[j]*d[j]*sum3x + fi4_k*d[j]*d[j]*sum4x;
				let y = fi1_k*sum1y + fi2_k*sum2y + fi3_k*d[j]*d[j]*sum3y + fi4_k*d[j]*d[j]*sum4y;
				let z = fi1_k*sum1z + fi2_k*sum2z + fi3_k*d[j]*d[j]*sum3z + fi4_k*d[j]*d[j]*sum4z;

			 	verts.push(x, y, z);

			 	if(stpTau !==  this.splinePointsX-1 && (stpTau+1) * step_tau > tauAry[j+1]+0.000001){
					j++;
				} 
			}
			if(stpT !==  this.splinePointsZ-1 && (stpT+1) * step_t > tAry[i+1]+0.000001){
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

export default Bicubic4_4Surface;