import VAO                           from "../../VAO.js";
import Shader                        from "../../Shader.js";
import { Components }                from "../../ECS.js";
import Core                          from "../../core.js";
import { Quat, Vec3 }	             from "../../Maths.js";
import GL                            from "../../gl.js";
import DebugObject                   from "./DebugObject.js";
import CurveSpline                   from "./CurveSpline.js";
import EllipticGridGenerator         from "./EllipticGridGenerator.js";
import DeformationGridGenerator      from "./DeformationGridGenerator.js";
import { Matrix }                    from "../../maths/LinearAlgebra.js";


class SurfaceSpline{
	constructor(base, splinePointsX, splinePointsZ, buildMode, drawMode){
		this.geometry = base.geometry;

		this.base     = base;

		this.vao             = new VAO;
		this.verts			 = [];
		this.normals         = [];
		this.indices         = [];
		this.uv              = [];
		this.bufSize		 = Float32Array.BYTES_PER_ELEMENT * 3 * splinePointsX * splinePointsZ; //3Floats per vert
		this.splinePointsX   = splinePointsX;
		this.splinePointsZ   = splinePointsZ;		
		this.buildMode       = buildMode ?  buildMode : SurfaceSpline.UNIFORM;
		this.drawMode        = drawMode ? drawMode : SurfaceSpline.GRID;
		
		this.drawNormals     = true;



		if(drawMode === SurfaceSpline.GRID) this.index();
		else                   this.indexTriangleStrip();

		this.vao.create()
			.emptyFloatBuffer("bVertices",this.bufSize , Shader.ATTRIB_POSITION_LOC, 3, 0, 0, false)
			.emptyFloatBuffer("bNormals",this.bufSize , Shader.ATTRIB_NORMAL_LOC, 3, 0, 0, false)
			.emptyFloatBuffer("bUV",this.bufSize/3*2 , Shader.ATTRIB_UV_LOC, 2, 0, 0, false)
			.indexBuffer("index",this.indices,true,false)
			.finalize("SplinePoints");


		this.normalObj = new DebugObject(this.geometry, splinePointsX * splinePointsZ, "#00FF00");
		this.normalObj.visible = false;;
		this.binomCache = new Map();
		// this.surface.splineCallbacks.push(this.updateCallback.bind(this));
		this.calculateUV()
		this.update();
	}

	updateCallback(){ this.update(); }


	generate(){
		//if(this.base.controlPoints.length < 4) return this;

		let surfSizeX       = this.base.sizeX;
		let surfSizeZ       = this.base.sizeZ;

		let pointAry = this.base.controlPoints;


		if(this.buildMode === SurfaceSpline.UNIFORM){
		////////////////////////////////////////////////////////////////////////////
			let step_t   = (surfSizeZ-1) / (this.splinePointsZ -1);
			let step_tau = (surfSizeX-1) / (this.splinePointsX -1);

			let X = 0, Z = 0;

			for(let stpT = 0; stpT < this.splinePointsZ; stpT++){

				let t   = stpT*step_t;
				let t_i = Z;
				X = 0;

				for(let stpTau = 0; stpTau < this.splinePointsX; stpTau++){
					let tau = stpTau*step_tau;

					let p_ij   = pointAry[  X   *surfSizeZ + Z   ].position;
					let p_iij  = pointAry[  X   *surfSizeZ + Z+1 ].position;
					let p_ijj  = pointAry[ (X+1)*surfSizeZ + Z   ].position;
					let p_iijj = pointAry[ (X+1)*surfSizeZ + Z+1 ].position;

					let r0 = null;
					let r1 = null;
					let tmp1 = null;
					let tmp2 = null;

					tmp1 = Vec3.scale( p_ij, 1 - (t-Z), tmp1 );
					tmp2 = Vec3.scale( p_iij,     t-Z,  tmp2 );

					r0 = Vec3.add(tmp1, tmp2);

					tmp1 = Vec3.scale( p_ijj, 1 - (t-Z), tmp1 );
					tmp2 = Vec3.scale( p_iijj,     t-Z,  tmp2 );

					r1 = Vec3.add(tmp1, tmp2);

					tmp1 = Vec3.scale( r0, 1 - (tau-X), tmp1 );
					tmp2 = Vec3.scale( r1,      tau-X,  tmp2 );

					let point = null;

					point = Vec3.add(tmp1 , tmp2);
					this.verts.push(point[0], point[1], point[2]);

					if(stpTau!==this.splinePointsX-1 && (stpTau+1)*step_tau > X+1+0.00001 ) X++;
				}
				if(stpT!==this.splinePointsZ-1 && (stpT+1)*step_t > Z+1+0.00001) Z++;		
			}
			if(this.drawMode !== SurfaceSpline.POINTS) this.calculateNormalsX();
			if(this.drawNormals) this.normalObj.setNormals(0.3, this.verts, this.normals);
			return this;

		////////////////////////////////////////////////////////////////////////////
		}

		if(this.buildMode === SurfaceSpline.DISTANCE){
		////////////////////////////////////////////////////////////////////////////
			let t_Xj = new Array(surfSizeX);
			for(let X=0; X<surfSizeX; X++) t_Xj[X] = new Array(surfSizeZ);

			for(let X=0; X<surfSizeX; X++){
				t_Xj[X][0] = 0;
				for(let Z=0; Z<surfSizeZ-1; Z++){
					t_Xj[X][Z+1] = t_Xj[X][Z] + Vec3.sub(pointAry[ X*surfSizeZ + Z  ].position, 
																		   pointAry[ X*surfSizeZ + Z+1].position).length();
				}
			}

			let step_t = new Array(surfSizeX);

			for(let X=0; X<surfSizeX; X++)
				step_t[X] = t_Xj[X][ surfSizeZ-1 ] / ( this.splinePointsZ-1 ) ;		

			let tau_ij = new Array(surfSizeX);
			for(let X=0; X<surfSizeX; X++) tau_ij[X] = new Array(this.splinePointsZ);
			

			for(let X=0; X<surfSizeX; X++){

				let Z = 0;
				let t_i = 0;
				let p_ij   = pointAry[  X   *surfSizeZ + Z   ].position;
				let p_iij  = pointAry[  X   *surfSizeZ + Z+1 ].position;


				for(let stpT=0; stpT<this.splinePointsZ; stpT++){

					let t = stpT*step_t[X];
					let factor_t = (t-t_i)/( t_Xj[X][Z+1]-t_Xj[X][Z] );

					tau_ij[X][stpT] = Vec3.add(Vec3.scale(p_ij, 1 - factor_t ) , Vec3.scale(p_iij, factor_t ));

					if( stpT!==this.splinePointsZ-1  && (stpT+1)*step_t[X] > t_Xj[X][Z+1]+0.00001 ){
						Z++;		
						p_ij   = pointAry[ X*surfSizeZ + Z   ].position;
						p_iij  = pointAry[ X*surfSizeZ + Z+1 ].position;
						t_i = t_Xj[X][Z];
					}
				}
			}

			for(let stpT=0; stpT<this.splinePointsZ; stpT++){

				let tAry = new Array(surfSizeX);
				tAry[0] = 0;				

				for(let X=0; X<surfSizeX-1; X++)
					tAry[X+1] = tAry[X] + Vec3.sub(tau_ij[X+1][stpT], tau_ij[X][stpT]).length();
				

				let X = 0;
				let step = tAry[surfSizeX-1] / (this.splinePointsX-1);

				for(let stpTau=0; stpTau < this.splinePointsX; stpTau++){
					let tau = stpTau*step;
					let tau_i = tAry[X];
					let factor_tau = (tau-tau_i)/( tAry[X+1]-tAry[X] );

					let point = Vec3.add(Vec3.scale(tau_ij[X][stpT] ,1 - factor_tau ) , Vec3.scale(tau_ij[X+1][stpT] ,factor_tau ));
				 	this.verts.push(point.x, point.y, point.z);

				 	if(stpTau !==  this.splinePointsX-1 && (stpTau+1) * step > tAry[X+1]+0.000001){
						X++;
					} 
				}
			}
			if(this.drawMode !== SurfaceSpline.POINTS) this.calculateNormalsX();
			if(this.drawNormals) this.normalObj.setNormals(0.3, this.verts, this.normals);
			return this;

		////////////////////////////////////////////////////////////////////////////
		}

		if(this.buildMode === SurfaceSpline.BICUBIC4_4_C){
		////////////////////////////////////////////////////////////////////////////
			let N = surfSizeZ-1;
			let L = surfSizeX-1;

			let P = new Array(L+1);
			for(let J=0; J<=L; J++) {
				P[J] = new Array(N+1);
				for(let I=0; I<=N; I++) P[J][I] = pointAry[ J*surfSizeZ + I ];
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


			 		this.verts.push(x, y, z);

			 		if(stpTau !==  this.splinePointsX-1 && (stpTau+1) * step > tauAry[j+1]+0.000001){
						j++;
					} 
				}
			}
			return this;

		////////////////////////////////////////////////////////////////////////////
		}

		if(this.buildMode === SurfaceSpline.BICUBIC4_4){
		////////////////////////////////////////////////////////////////////////////
			let N = surfSizeZ-1;
			let L = surfSizeX-1;

			// Формируем матрицу контрольных точек
			let P = new Array(L+1);
			for(let J=0; J<=L; J++) {
				P[J] = new Array(N+1);
				for(let I=0; I<=N; I++) P[J][I] = pointAry[ J*surfSizeZ + I ].position;
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

				 	this.verts.push(x, y, z);

				 	if(stpTau !==  this.splinePointsX-1 && (stpTau+1) * step_tau > tauAry[j+1]+0.000001){
						j++;
					} 
				}
				if(stpT !==  this.splinePointsZ-1 && (stpT+1) * step_t > tAry[i+1]+0.000001){
					i++;
				} 
			}
			if(this.drawMode !== SurfaceSpline.POINTS) this.calculateNormalsX();
			if(this.drawNormals) this.normalObj.setNormals(0.3, this.verts, this.normals);
			return this;

		////////////////////////////////////////////////////////////////////////////
		}

		if(this.buildMode === SurfaceSpline.BEZIER){
		////////////////////////////////////////////////////////////////////////////
			let step_t   = 1 / (this.splinePointsZ-1);
			let step_tau = 1 / (this.splinePointsX-1); 
			for(let stpT=0; stpT < this.splinePointsZ; stpT++){
				for(let stpTau=0; stpTau < this.splinePointsX; stpTau++){
					let point = this.bezier_r(stpT*step_t, stpTau * step_tau);
					this.verts.push(point[0], point[1], point[2]);
				}
			}
			if(this.drawMode !== SurfaceSpline.POINTS) this.calculateNormalsX();
			if(this.drawNormals) this.normalObj.setNormals(0.3, this.verts, this.normals);
			return this;

		////////////////////////////////////////////////////////////////////////////
		}

		if(this.buildMode === SurfaceSpline.COONS){
		////////////////////////////////////////////////////////////////////////////
			let step_t   = 1 / (this.splinePointsZ-1);
			let step_tau = 1 / (this.splinePointsX-1);

			let c1_Ary = this.base.c1points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsZ);
			let c2_Ary = this.base.c2points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsZ);
			let c3_Ary = this.base.c3points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsX);
			let c4_Ary = this.base.c4points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsX);

			for(let stpT=0; stpT<this.splinePointsZ; stpT++){
				for(let stpTau=0; stpTau<this.splinePointsX; stpTau++){
					let point = this._r(stpT*step_t, stpTau*step_tau, c1_Ary, c2_Ary, c3_Ary, c4_Ary, stpT, stpTau);
					this.verts.push(point[0], point[1], point[2]);
				}
			}
			if(this.drawMode !== SurfaceSpline.POINTS) this.calculateNormalsX();
			if(this.drawNormals) this.normalObj.setNormals(0.3, this.verts, this.normals);
			return this;

		////////////////////////////////////////////////////////////////////////////
		}

		if(this.buildMode === SurfaceSpline.RULED){
		////////////////////////////////////////////////////////////////////////////
			let step_t   = 1 / (this.splinePointsZ-1);
			let step_tau = 1 / (this.splinePointsX-1);


			let c1_Ary = this.base.c1points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsZ);
			let c2_Ary = this.base.c2points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsZ);

			for(let stpT=0; stpT<this.splinePointsZ; stpT++){
				let c1t = c1_Ary[stpT];
				let c2t = c2_Ary[stpT];
				for(let stpTau=0; stpTau<this.splinePointsX; stpTau++){
					let r_x = (1-stpTau*step_tau)*c1t[0]+stpTau*step_tau*c2t[0];
					let r_y = (1-stpTau*step_tau)*c1t[1]+stpTau*step_tau*c2t[1];
					let r_z = (1-stpTau*step_tau)*c1t[2]+stpTau*step_tau*c2t[2];
					this.verts.push(r_x, r_y, r_z);
				}
			}
			if(this.drawMode !== SurfaceSpline.POINTS) this.calculateNormalsX();
			if(this.drawNormals) this.normalObj.setNormals(0.3, this.verts, this.normals);
			return this;

		////////////////////////////////////////////////////////////////////////////
		}

		if(this.buildMode === SurfaceSpline.LAPLACE){
		////////////////////////////////////////////////////////////////////////////
			let step_t   = 1 / (this.splinePointsZ-1);
			let step_tau = 1 / (this.splinePointsX-1);

			let c1_Ary = this.base.c1points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsZ);
			let c2_Ary = this.base.c2points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsZ);
			let c3_Ary = this.base.c3points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsX);
			let c4_Ary = this.base.c4points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsX);

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

			if(!this.ellipticGridGenerator){
				this.ellipticGridGenerator = new EllipticGridGenerator(this.splinePointsZ, this.splinePointsX, step_t, step_tau);
			}
			this.ellipticGridGenerator.init(X, Z);
			let solution = this.ellipticGridGenerator.solveLaplace1();
			let solvedX = solution[0];
			let solvedZ = solution[1];

			for(let i=0; i<this.splinePointsZ; i++){
				for(let j=0; j<this.splinePointsX; j++){
					this.verts.push(solvedX[i][j], 1, solvedZ[i][j]);
				}
			}


			if(this.drawMode !== SurfaceSpline.POINTS) this.calculateNormalsX();
			if(this.drawNormals) this.normalObj.setNormals(0.3, this.verts, this.normals);
			return this;

		////////////////////////////////////////////////////////////////////////////
		}
		

		if(this.buildMode === SurfaceSpline.STRETCH){
		////////////////////////////////////////////////////////////////////////////
			let step_t   = 1 / (this.splinePointsZ-1);
			let step_tau = 1 / (this.splinePointsX-1);

			let c1_Ary = this.base.c1points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsZ);
			let c2_Ary = this.base.c2points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsZ);
			let c3_Ary = this.base.c3points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsX);
			let c4_Ary = this.base.c4points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsX);

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
			let x     = [0.2];
			let y     = [0.2];
			let alpha = [0.95];

			let stretch1 = function(ksi, eta){
			//	let x =0.7, y = 0.3;
				//let alpha = 0.95;
				let beta  = 0.4;
				let result = ksi;
				for(let i=0; i<x.length; i++){
					let d = Math.sqrt( (x[i]-ksi)*(x[i]-ksi) + (y[i]-eta)*(y[i]-eta) );

					result += alpha[i]*(x[i]-ksi)*Math.exp(-beta*d);
				//	console.log(alpha[0]);
				}

				return result;
			}

			let stretch2 = function(ksi, eta){
			//	let alpha = 0.95;
				let beta  = 0.4;
				let result = eta;
				for(let i=0; i<x.length; i++){
					let d = Math.sqrt( (x[i]-ksi)*(x[i]-ksi) + (y[i]-eta)*(y[i]-eta) );

					result += alpha[i]*(y[i]-eta)*Math.exp(-beta*d);
				}
			//	console.log(result);
				return result;
			} 

			if(!this.ellipticGridGenerator){
				this.ellipticGridGenerator = new EllipticGridGenerator(this.splinePointsZ, this.splinePointsX, step_t, step_tau, EllipticGridGenerator.POISSON, stretch1, stretch2);
			}
			this.ellipticGridGenerator.init(X, Z);
			let solution = this.ellipticGridGenerator.solvePoisson();
			let solvedX = solution[0];
			let solvedZ = solution[1];

			for(let i=0; i<this.splinePointsZ; i++){
				for(let j=0; j<this.splinePointsX; j++){
					this.verts.push(solvedX[i][j], 1, solvedZ[i][j]);
				}
			}

			if(this.drawMode !== SurfaceSpline.POINTS) this.calculateNormalsX();
			if(this.drawNormals) this.normalObj.setNormals(0.3, this.verts, this.normals);
			return this;

		////////////////////////////////////////////////////////////////////////////
		}

		if(this.buildMode === SurfaceSpline.DEFORMATION){
		////////////////////////////////////////////////////////////////////////////
		let step_t   = 1 / (this.splinePointsZ-1);
		let step_tau = 1 / (this.splinePointsX-1);

		let c1_Ary = this.base.c1points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsZ);
		let c2_Ary = this.base.c2points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsZ);
		let c3_Ary = this.base.c3points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsX);
		let c4_Ary = this.base.c4points.spline.getEvaluatedArray(CurveSpline.B_SPLINE_INT, this.splinePointsX);


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
			this.deformationGridGenerator = new DeformationGridGenerator(X, Z, this.splinePointsZ, this.splinePointsX, this.base.poisson_coeff);
		}
		this.deformationGridGenerator.init(X,Z);
		let solution = this.deformationGridGenerator.solve();
		let solvedX = solution[0];
		let solvedZ = solution[1];

		for(let i=0; i<this.splinePointsZ; i++){
			for(let j=0; j<this.splinePointsX; j++){
				this.verts.push(solvedX[i][j], 1, solvedZ[i][j]);
			}
		}

		if(this.drawMode !== SurfaceSpline.POINTS) this.calculateNormalsX();
		if(this.drawNormals) this.normalObj.setNormals(0.3, this.verts, this.normals);

		return this;

		////////////////////////////////////////////////////////////////////////////
		}
		

		else { 
			console.log("SurfaceSpline error: given build mode does not exist. Try SurfaceSpline.UNIFORM or SurfaceSpline.DISTANCE");
			return this;
		}
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

	_C(n, k){
		if(k === 0) return 1;
		if( this.binomCache.has(n*k+k) ) return this.binomCache.get(n*k+k);
		let result = (n-k+1)/k * this._C(n, k-1);
		this.binomCache.set(n*k+k, result);
		return result;
	}

	_B(n, k, t){ return this._C(n, k) * Math.pow(t, k) * Math.pow(1-t, n-k); }

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

	bezier_r(t, tau){
		let pointAry = this.base.controlPoints;

		let r_x = 0, r_y = 0, r_z = 0;
		let n = this.base.sizeZ - 1;
		let m = this.base.sizeX - 1;
		for(let k=0; k<=n; k++){
			for(let j=0; j<=m; j++){
				r_x += pointAry[ j*(n+1) + k ].position[0] * this._B(m, j, tau) * this._B(n, k, t);
				r_y += pointAry[ j*(n+1) + k ].position[1] * this._B(m, j, tau) * this._B(n, k, t);
				r_z += pointAry[ j*(n+1) + k ].position[2] * this._B(m, j, tau) * this._B(n, k, t);
			}
		}
		return [r_x, r_y, r_z];
	}

	enableNormals(){
		this.normalObj.setNormals(0.3, this.verts, this.normals);
		this.drawNormals = true;
	}

	disableNormals() { this.drawNormals = false; }

	update(){
		this.clear();
		this.generate();
		if(this.verts.length == 0) return this;
		
		// Считаем количество точек
		this.vao.count = this.verts.length / 3;

		// Отправляем вершины в GPU
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,this.vao.vao["bVertices"].id);
		GL.ctx.bufferSubData(GL.ctx.ARRAY_BUFFER, 0, new Float32Array(this.verts), 0, null);
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,null);

		// Отправляем нормали в GPU
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,this.vao.vao["bNormals"].id);
		GL.ctx.bufferSubData(GL.ctx.ARRAY_BUFFER, 0, new Float32Array(this.normals), 0, null);
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,null);

		return this;
	}

	index(){
		for(let X = 0; X < this.splinePointsX; X++){
			if( X%2 === 0 ) for(let Z = 0; Z < this.splinePointsZ; Z++)
				this.indices.push( Z*this.splinePointsX + X );

			else for(let Z = this.splinePointsZ-1; Z >= 0; Z--)
				this.indices.push( Z*this.splinePointsX + X );
		}
		if(this.splinePointsX % 2 === 0){
			for(let Z=0; Z<this.splinePointsZ; Z++){
				if( Z%2 == 0 ) for(let X = this.splinePointsX-1; X >= 0; X--)
					this.indices.push( Z*this.splinePointsX + X );

				else for(let X=0; X <this.splinePointsX; X++)
					this.indices.push( Z*this.splinePointsX + X );
			}		
		}
		else {
			for(let Z=this.splinePointsZ-1; Z>=0; Z--){
				if( Z%2 == 0 ) for(let X = this.splinePointsX-1; X >= 0; X--)
					this.indices.push( Z*this.splinePointsX + X );

				else for(let X = 0; X <this.splinePointsX; X++)
					this.indices.push( Z*this.splinePointsX + X );
			}				
		}

		return this;
	}

	indexTriangleStrip(){
		for(let Z=0; Z<this.splinePointsZ-1; Z++){
			for(let X=0; X<this.splinePointsX; X++){
				this.indices.push(Z*this.splinePointsX + X, (Z+1)*this.splinePointsX + X);
			}
			this.indices.push((Z+1)*this.splinePointsX + this.splinePointsX-1, (Z+1)*this.splinePointsX);
		}
	}

	calculateNormalsX(){
		//Generate the Normals using finite difference method
		let p,					//Temp Array Index when calcating neighboring vertices
			pos,				//Using X,Y, determine current vertex index position in array
			zMax = this.splinePointsZ-1,		//Max X Position in Grid
			xMax = this.splinePointsX-1,		//Max Y Position in Grid
			nX = 0,				//Normal X value
			nY = 0,				//Normal Y value
			nZ = 0,				//Normal Z value
			nL = 0,				//Normal Vector Length
			hL,					//Left Vector height
			hR,					//Right Vector Height
			hD,					//Down Vector height
			hU;					//Up Vector Height


		for(let Z=0; Z < this.splinePointsZ; Z++){
			for(let X=0; X < this.splinePointsX; X++){
				pos = Z*this.splinePointsX*3 + X*3;   //X,Y position to Array index conversion

				let vec = new Vec3(this.verts[pos],this.verts[pos+1],this.verts[pos+2]);
				//-----------------
				//Get the height value of 4 neighboring vectors: Left,Right,Top Left
				
				if(X > 0){ //LEFT
					p = Z*this.splinePointsX*3 + (X-1)*3;	//Calc Neighbor Vector
					hL = new Vec3(this.verts[p],this.verts[p+1],this.verts[p+2]);		//Grab only the Y position which is the height.
				}else hL = undefined;	//Out of bounds, use current 

				if(X < xMax){ //RIGHT
					p = Z*this.splinePointsX*3 + (X+1)*3;
					hR = new Vec3(this.verts[p],this.verts[p+1],this.verts[p+2]);
				}else hR = undefined;	

				if(Z > 0){ //UP
					p = (Z-1)*this.splinePointsX*3 + X*3;
					hU = new Vec3(this.verts[p],this.verts[p+1],this.verts[p+2]);
				}else hU = undefined;

				if(Z < zMax){ //DOWN
					p = (Z+1)*this.splinePointsX*3 + X*3;
					hD = new Vec3(this.verts[p],this.verts[p+1],this.verts[p+2]);
				}else hD = undefined;

				let crossUL = undefined;
				let crossLD = undefined;
				let crossDR = undefined;
				let crossRU = undefined;
				if(hU!==undefined && hL!==undefined) crossUL = Vec3.cross(Vec3.sub(hU, vec), Vec3.sub(hL, vec)).normalize();
				if(hL!==undefined && hD!==undefined) crossLD = Vec3.cross(Vec3.sub(hL, vec), Vec3.sub(hD, vec)).normalize();				
				if(hD!==undefined && hR!==undefined) crossDR = Vec3.cross(Vec3.sub(hD, vec), Vec3.sub(hR, vec)).normalize();
				if(hR!==undefined && hU!==undefined) crossRU = Vec3.cross(Vec3.sub(hR, vec), Vec3.sub(hU, vec)).normalize();

				if(crossUL!==undefined) { nX+=crossUL.x; nY+=crossUL.y; nZ+=crossUL.z; }
				if(crossLD!==undefined) { nX+=crossLD.x; nY+=crossLD.y; nZ+=crossLD.z; } 
				if(crossDR!==undefined) { nX+=crossDR.x; nY+=crossDR.y; nZ+=crossDR.z; } 
				if(crossRU!==undefined) { nX+=crossRU.x; nY+=crossRU.y; nZ+=crossRU.z; }

				nL = Math.sqrt( nX*nX + nY*nY + nZ*nZ);							
				this.normals.push(nX/nL,nY/nL,nZ/nL);			//Normalize the final normal vector data before saving to array.
				nX = 0;
				nY = 0;
				nZ = 0;
			}
		}
	}

	calculateUV(){
		let stepX = 1 / (this.splinePointsX-1);
		let stepZ = 1 / (this.splinePointsZ-1);
		for(let i=0; i<this.splinePointsZ; i++){
			for(let j=0; j<this.splinePointsX; j++){
				this.uv.push(i*stepX, j*stepZ);
			}
		}
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,this.vao.vao["bUV"].id);
		GL.ctx.bufferSubData(GL.ctx.ARRAY_BUFFER, 0, new Float32Array(this.uv), 0, null);
		GL.ctx.bindBuffer(GL.ctx.ARRAY_BUFFER,null);
	}	

	clear(){
		this.verts = [];
		this.normals = [];
		return this;
	}
}

SurfaceSpline.UNIFORM      = 1;
SurfaceSpline.DISTANCE     = 2;
SurfaceSpline.BEZIER       = 3;
SurfaceSpline.COONS        = 4;
SurfaceSpline.RULED        = 5;
SurfaceSpline.LAPLACE      = 6;
SurfaceSpline.STRETCH      = 7;
SurfaceSpline.BICUBIC4_4   = 8;
SurfaceSpline.BICUBIC4_4_C = 9;
SurfaceSpline.DEFORMATION  = 10;

SurfaceSpline.POINTS   = 1;
SurfaceSpline.GRID     = 2;
SurfaceSpline.SURFACE  = 3;

SurfaceSpline.RECTANGLE_BASE = 0;

export default SurfaceSpline;