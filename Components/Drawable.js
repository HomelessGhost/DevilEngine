import Core		        from "../core.js";
import { Components }	from "../ECS.js";

class Drawable{
	constructor(){
		this.vao		= null;
		this.drawMode	= Core.gl.TRIANGLES;
		this.material	= null;
		this.options 	= { cullFace:true }

		
		this.customDrawFunction = null;
	}
} Components(Drawable);

export default Drawable;