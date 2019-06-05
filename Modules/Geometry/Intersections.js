import SurfaceIterator  from "./Surfaces/SurfaceIterator.js";
import CurveIterator    from "./Curves/CurveIterator.js";
import Vec3             from "../../maths/Vec3.js";

function CurveSurfaceIntersection(curveBase, surfaceBase){
	let curveIterator   = new CurveIterator(curveBase);
	let surfaceIterator = new SurfaceIterator(surfaceBase);

	let foundPoints = [];

	let map = surfaceIterator.buildMap();
	let curveMap = curveIterator.buildMap();

	for(let i = 1; i < map.t.length-1; i++){
		let u = map.t[i];


		for(let j = 1; j < map.tauAry[i].length-1; j++){
			let v = map.tauAry[i][j];

	
			let s_surf = new Vec3(surfaceBase.getCoord(u, v));
			let FD = surfaceBase.firstDerivative(u, v);
			let s1 = new Vec3(FD.s1),
				s2 = new Vec3(FD.s2);
			let n = Vec3.cross(s1, s2).normalize();

			let tmp = Vec3.add( Vec3.scale(s1, u), Vec3.scale(s2, v) );
			let s0 = Vec3.sub(s_surf, tmp);


			for(let k = 1; k < curveMap.length-1; k++){
				let t = curveMap[k];

				let c_curve = new Vec3(curveBase.getCoord(t));
				let c_prime = new Vec3(curveBase.firstDerivative(t));
				let c0 = Vec3.sub(c_curve, Vec3.scale(c_prime, t));


				let t0 = Vec3.dot(n, Vec3.sub(s0, c0))/Vec3.dot(n, c_prime);

				let ps = Vec3.add(c0, Vec3.scale(c_prime, t0));

				let g11 = Vec3.dot(s1, s1),
					g12 = Vec3.dot(s1, s2),
					g22 = Vec3.dot(s2, s2);
				let g = g11*g22 - g12*g12;
				let G11 = g22/g,
					G12 = -g12/g,
					G22 = g11/g;

				let subtr = Vec3.sub(ps, s0);

				let u0 = G11 * Vec3.dot( s1, subtr )
					   + G12 * Vec3.dot( s2, subtr );

				let v0 = G12 * Vec3.dot( s1, subtr )
					   + G22 * Vec3.dot( s2, subtr );


				let fortune = 0;

				let dU = (map.t[i+1] - map.t[i])/2,
					dD = (map.t[i] - map.t[i-1])/2,
					dL = (map.tauAry[i][j] - map.tauAry[i][j-1])/2,
					dR = (map.tauAry[i][j+1] - map.tauAry[i][j])/2;

				if( map.t[i] - dD <= u0 && u0 <= map.t[i] + dU )                 fortune++;
				if( map.tauAry[i][j] - dL <= v0 && v0 <= map.tauAry[i][j] + dR ) fortune++;
				if( curveMap[k-1] <= t0 && t0 <= curveMap[k+1] )                 fortune++;

				if(fortune === 3){
					

					let eps = 0.0001;
					
					let t_old = 1000;
					let u_old = 1000;
					let v_old = 1000;
					let t_k = t0;
					let u_k = u0;
					let v_k = v0;

					if(t_k > 1) t_k = 1;
					if(t_k < 0) t_k = 0;
					if(u_k > 1) u_k = 1;
					if(u_k < 0) u_k = 0;
					if(v_k > 1) v_k = 1;
					if(v_k < 0) v_k = 0;

					while( Math.abs(t_k-t_old) > eps || Math.abs(u_k-u_old) > eps || Math.abs(v_k-v_old) > eps ){
						t_old = t_k;
						u_old = u_k;
						v_old = v_k;

						let p1 = new Vec3(curveBase.getCoord(t_k));
						let p = new Vec3(surfaceBase.getCoord(u_k, v_k));
						let c = new Vec3(curveBase.getCoord(t_k));
						let s = new Vec3(surfaceBase.getCoord(u_k, v_k));


						let c_prime = new Vec3(curveBase.firstDerivative(t_k));
						let c_dprime = new Vec3(curveBase.secondDerivative(t_k));
						let diff_up = Vec3.sub(c, p);
						let diff_down = Vec3.sub(p, c);


						let dt = Vec3.dot(diff_up, c_prime) / ( Vec3.dot(diff_down, c_dprime) - Vec3.dot(c_prime, c_prime) );
						
						t_k = t_k + dt;

						let FD = surfaceBase.firstDerivative(u_k, v_k);
						let s1 = new Vec3(FD.s1),
							s2 = new Vec3(FD.s2);

						let SD = surfaceBase.secondDerivative(u_k, v_k);
						let s11 = new Vec3(SD.s11),
							s22 = new Vec3(SD.s22),
							s12 = new Vec3(SD.s12);

						let a11 = Vec3.dot(Vec3.sub(p1, s), s11) - Vec3.dot(s1, s1),
							a12 = Vec3.dot(Vec3.sub(p1, s), s12) - Vec3.dot(s2, s1),
							a21 = Vec3.dot(Vec3.sub(p1, s), s12) - Vec3.dot(s1, s2),
							a22 = Vec3.dot(Vec3.sub(p1, s), s22) - Vec3.dot(s2, s2),
							b1  = Vec3.dot(Vec3.sub(s, p1), s1),
							b2  = Vec3.dot(Vec3.sub(s, p1), s2);
						
						let det = a11*a22 - a12*a21,
							det_u = b1*a22 - b2*a12,
							det_v = a11*b2 - a21*b1;

						let dU = det_u/det;
						let dV = det_v/det; 
						
						u_k = u_k + dU;
						v_k = v_k + dV;

						console.log(t_k - t_old, u_k - u_old, v_k - v_old);


					}
					
					foundPoints.push(new Vec3(surfaceBase.getCoord(u_k, v_k)));

					break;
				}

			}

		}
	}
	return foundPoints;
}

export default CurveSurfaceIntersection;