import gl			from "../gl.js";
import VAO			from "../VAO.js";
import Core 		from "../core.js";

function FinalQuad(name ="FaceCube", matName = "VecWColor"){
	//If the vao exists, create a new renderable using it.
	//let vao = Fungi.vaos.get(name);
	//if(!vao) vao = FacedCube.vao(name);
	//return new Renderable(name, vao, matName);
}

FinalQuad.vao = function(name="Quad2U"){
	let vao = Core.mVAOCache.get(name);
	if(vao) return vao;

	var aVert	= [-1,1,0,	-1,-1,0,	1,-1,0,	1,-1,0,	1,1,0,	-1,1,0],
		aUV		= [ 0,0, 	0,1,		1,1,	1,1,	1,0,	0,0];
	return VAO.standardRenderable(name,3,aVert,null,aUV,null);
	
}

export default FinalQuad;