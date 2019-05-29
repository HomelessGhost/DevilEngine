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
				let G11 = g11/g,
					G12 = g12/g,
					G22 = g22/g;

				let u0 = G11 * Vec3.dot( s1, Vec3.sub(ps, s0) )
					   + G22 * Vec3.dot( s2, Vec3.sub(ps, s0) );

				let v0 = G12 * Vec3.dot( s1, Vec3.sub(ps, s0) )
					   + G22 * Vec3.dot( s2, Vec3.sub(ps, s0) );


				let fortune = 0;
				if( map.t[i-1] <= u0 && u0 <= map.t[i+1] )                 fortune++;
				if( map.tauAry[i][j-1] <= v0 && v0 <= map.tauAry[i][j+1] ) fortune++;
				if( curveMap[k-1] <= t0 && t0 <= curveMap[k+1] )           fortune++;

				if(fortune === 3){
					foundPoints.push(s_surf);
					break;
				}

			}

		}
	}
	return foundPoints;
}

export default CurveSurfaceIntersection;