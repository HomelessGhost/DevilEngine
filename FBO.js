import GL from "./gl.js"
import Core from "./core.js"

class FBO{
	static build(name,colorCnt,useDepth,wSize,hSize){
		var rtn = {}
		if(wSize === undefined || wSize == null) wSize = GL.width;
		if(hSize === undefined || hSize == null) hSize = GL.height;

		//Create and Set Depth
		FBO.create(rtn);
		if(useDepth == true) FBO.depthBuffer(rtn,wSize,hSize);

		//Build color buffers
		var cBufAry = [];
		for(var i=0; i < colorCnt; i++){
			cBufAry.push( GL.ctx.COLOR_ATTACHMENT0 + i );
			FBO.texColorBuffer(rtn,i,wSize,hSize);
		}
		if(cBufAry.length > 1)GL.ctx.drawBuffers(cBufAry);
		
		//All Done.
		FBO.finalize(rtn,name);
		return rtn;
	}

	static create(out){
		out.colorBuf = [];
		out.id = GL.ctx.createFramebuffer();
		GL.ctx.bindFramebuffer(GL.ctx.FRAMEBUFFER, out.id);
		return this;
	}

	static texColorBuffer(out,cAttachNum,w,h){
		//Up to 16 texture attachments 0 to 15
		out.colorBuf[cAttachNum] = GL.ctx.createTexture();
		GL.ctx.bindTexture(GL.ctx.TEXTURE_2D, out.colorBuf[cAttachNum]);
		GL.ctx.texImage2D(GL.ctx.TEXTURE_2D,0, GL.ctx.RGBA, w, h, 0, GL.ctx.RGBA, GL.ctx.UNSIGNED_BYTE, null);
		GL.ctx.texParameteri(GL.ctx.TEXTURE_2D, GL.ctx.TEXTURE_MIN_FILTER, GL.ctx.LINEAR);
		GL.ctx.texParameteri(GL.ctx.TEXTURE_2D, GL.ctx.TEXTURE_MAG_FILTER, GL.ctx.LINEAR);
		GL.ctx.texParameteri(GL.ctx.TEXTURE_2D, GL.ctx.TEXTURE_WRAP_S, GL.ctx.CLAMP_TO_EDGE);	//Stretch image to X position
		GL.ctx.texParameteri(GL.ctx.TEXTURE_2D, GL.ctx.TEXTURE_WRAP_T, GL.ctx.CLAMP_TO_EDGE);	//Stretch image to Y position
	//	GL.ctx.generateMipmap(GL.ctx.TEXTURE_2D)  // Debug

		GL.ctx.framebufferTexture2D(GL.ctx.FRAMEBUFFER, GL.ctx.COLOR_ATTACHMENT0 + cAttachNum, GL.ctx.TEXTURE_2D, out.colorBuf[cAttachNum], 0);
		return this;
	}

	static depthBuffer(out,w,h){
		out.depth = GL.ctx.createRenderbuffer();
		GL.ctx.bindRenderbuffer(GL.ctx.RENDERBUFFER, out.depth);
		GL.ctx.renderbufferStorage(GL.ctx.RENDERBUFFER, GL.ctx.DEPTH_COMPONENT16, w, h);
		GL.ctx.framebufferRenderbuffer(GL.ctx.FRAMEBUFFER, GL.ctx.DEPTH_ATTACHMENT, GL.ctx.RENDERBUFFER, out.depth);
		return this;
	}

	static finalize(out,name){
		switch(GL.ctx.checkFramebufferStatus(GL.ctx.FRAMEBUFFER)){
			case GL.ctx.FRAMEBUFFER_COMPLETE: break;
			case GL.ctx.FRAMEBUFFER_INCOMPLETE_ATTACHMENT: console.log("FRAMEBUFFER_INCOMPLETE_ATTACHMENT"); break;
			case GL.ctx.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: console.log("FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT"); break;
			case GL.ctx.FRAMEBUFFER_INCOMPLETE_DIMENSIONS: console.log("FRAMEBUFFER_INCOMPLETE_DIMENSIONS"); break;
			case GL.ctx.FRAMEBUFFER_UNSUPPORTED: console.log("FRAMEBUFFER_UNSUPPORTED"); break;
			case GL.ctx.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE: console.log("FRAMEBUFFER_INCOMPLETE_MULTISAMPLE"); break;
			case GL.ctx.RENDERBUFFER_SAMPLES: console.log("RENDERBUFFER_SAMPLES"); break;
		}
		
		GL.ctx.bindTexture(GL.ctx.TEXTURE_2D, null);
		GL.ctx.bindRenderbuffer(GL.ctx.RENDERBUFFER, null);
		GL.ctx.bindFramebuffer(GL.ctx.FRAMEBUFFER, null);
		Core.FBOs[name] = out;

		return out;
	}

	static colorDepthFBO(name){
		var rtn = {};
		return FBO.create(rtn)
			.texColorBuffer(rtn,0)
			.depthBuffer(rtn)
			.finalize(rtn,name);
	}

	static readPixel(fbo,x,y,cAttachNum){
		var p = new Uint8Array(4);
		GL.ctx.bindFramebuffer(GL.ctx.READ_FRAMEBUFFER, fbo.id);
		GL.ctx.readBuffer(GL.ctx.COLOR_ATTACHMENT0 + cAttachNum);
		GL.ctx.readPixels(x, y, 1, 1, GL.ctx.RGBA, GL.ctx.UNSIGNED_BYTE, p);
		GL.ctx.bindFramebuffer(GL.ctx.READ_FRAMEBUFFER, null);
		return p;
	}

	static activate(fbo){ GL.ctx.bindFramebuffer(GL.ctx.FRAMEBUFFER,fbo.id); return this; }
	static deactivate(){ GL.ctx.bindFramebuffer(GL.ctx.FRAMEBUFFER,null); return this; }
	static clear(fbo){
		GL.ctx.bindFramebuffer(GL.ctx.FRAMEBUFFER,fbo.id);
		GL.ctx.clear(GL.ctx.COLOR_BUFFER_BIT | GL.ctx.DEPTH_BUFFER_BIT); 
		GL.ctx.bindFramebuffer(GL.ctx.FRAMEBUFFER,null);
	}

	static delete(fbo){
		//TODO, Delete using the Cache name, then remove it from cache.
			GL.ctx.deleteRenderbuffer(fbo.depth);
			GL.ctx.deleteTexture(fbo.texColor);
			GL.ctx.deleteFramebuffer(fbo.id);
	}
}

export default FBO;

class FBO_2{
	constructor(){
		this.fbo = null;
		this.aryDrawBuf = [];
	}

	//-------------------------------------------------
	// START AND COMPLETE CREATING FRAME BUFFER
	//-------------------------------------------------
	create(w=null, h=null){

		if(w === undefined || w == null) w = GL.width;
		if(h === undefined || h == null) h = GL.height;

		this.fbo = { frameWidth:w, frameHeight:h, ptr:GL.ctx.createFramebuffer() };
		this.aryDrawBuf.length = 0;

		GL.ctx.bindFramebuffer(GL.ctx.FRAMEBUFFER, this.fbo.ptr);
		return this;
	}

	finalize(name){
		//Assign which buffers are going to be written too
		GL.ctx.drawBuffers(this.aryDrawBuf);

		//Check if the Frame has been setup Correctly.
		switch(GL.ctx.checkFramebufferStatus(GL.ctx.FRAMEBUFFER)){
			case GL.ctx.FRAMEBUFFER_COMPLETE: break;
			case GL.ctx.FRAMEBUFFER_INCOMPLETE_ATTACHMENT: console.log("FRAMEBUFFER_INCOMPLETE_ATTACHMENT"); break;
			case GL.ctx.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: console.log("FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT"); break;
			case GL.ctx.FRAMEBUFFER_INCOMPLETE_DIMENSIONS: console.log("FRAMEBUFFER_INCOMPLETE_DIMENSIONS"); break;
			case GL.ctx.FRAMEBUFFER_UNSUPPORTED: console.log("FRAMEBUFFER_UNSUPPORTED"); break;
			case GL.ctx.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE: console.log("FRAMEBUFFER_INCOMPLETE_MULTISAMPLE"); break;
			case GL.ctx.RENDERBUFFER_SAMPLES: console.log("RENDERBUFFER_SAMPLES"); break;
		}
		
		//Cleanup
		GL.ctx.bindFramebuffer(GL.ctx.FRAMEBUFFER, null);
		GL.ctx.bindRenderbuffer(GL.ctx.RENDERBUFFER, null);
		GL.ctx.bindTexture(GL.ctx.TEXTURE_2D, null);

//		mod.res.fbo[name] = this.fbo;

		//Return final struct
		return this.fbo;
	}


	//-------------------------------------------------
	// COLOR BUFFERS
	//-------------------------------------------------
	texColorBuffer(name,cAttachNum){
		//Up to 16 texture attachments 0 to 15
		let buf = { texture:GL.ctx.createTexture() };
		
		GL.ctx.bindTexture(GL.ctx.TEXTURE_2D, buf.texture);
		GL.ctx.texImage2D(GL.ctx.TEXTURE_2D, 0, GL.ctx.RGBA, this.fbo.frameWidth, this.fbo.frameHeight, 0, GL.ctx.RGBA, GL.ctx.UNSIGNED_BYTE, null);
		GL.ctx.texParameteri(GL.ctx.TEXTURE_2D, GL.ctx.TEXTURE_MAG_FILTER, GL.ctx.LINEAR); //NEAREST
		GL.ctx.texParameteri(GL.ctx.TEXTURE_2D, GL.ctx.TEXTURE_MIN_FILTER, GL.ctx.LINEAR); //NEAREST

		//ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR);
		//ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR);
		//ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);	//Stretch image to X position
		//ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);	//Stretch image to Y position

		GL.ctx.framebufferTexture2D(GL.ctx.FRAMEBUFFER, GL.ctx.COLOR_ATTACHMENT0 + cAttachNum, GL.ctx.TEXTURE_2D, buf.texture, 0);

		//Save Attachment to enable on finalize
		this.aryDrawBuf.push(GL.ctx.COLOR_ATTACHMENT0 + cAttachNum);
		this.fbo[name] = buf;
		return this;
	}

	multiSampleColorBuffer(name, cAttachNum, sampleSize=4){ //NOTE, Only sampleSize of 4 works, any other value crashes.
		let buf = { ptr: GL.ctx.createRenderbuffer() };

		GL.ctx.bindRenderbuffer(GL.ctx.RENDERBUFFER, buf.ptr); //Bind Buffer

		//Set Data Size
		GL.ctx.renderbufferStorageMultisample(GL.ctx.RENDERBUFFER, sampleSize, GL.ctx.RGBA8, this.fbo.frameWidth, this.fbo.frameHeight); 
		
		//Bind buf to color attachment
		GL.ctx.framebufferRenderbuffer(GL.ctx.FRAMEBUFFER, GL.ctx.COLOR_ATTACHMENT0 + cAttachNum, GL.ctx.RENDERBUFFER, buf.ptr);

		//Save Attachment to enable on finalize
		this.aryDrawBuf.push(GL.ctx.COLOR_ATTACHMENT0 + cAttachNum);
		this.fbo[name] = buf;
		return this;
	}


	//-------------------------------------------------
	// DEPTH BUFFERS
	//-------------------------------------------------
	depthBuffer(isMultiSample = false, sampleSize=4){
		this.fbo.bDepth = GL.ctx.createRenderbuffer();
		GL.ctx.bindRenderbuffer(GL.ctx.RENDERBUFFER, this.fbo.bDepth);
		
		//Regular render Buffer
		if(!isMultiSample){
			GL.ctx.renderbufferStorage(GL.ctx.RENDERBUFFER, GL.ctx.DEPTH_COMPONENT16,
				this.fbo.frameWidth, this.fbo.frameHeight);
		
		//Set render buffer to do multi samples
		}else{
			GL.ctx.renderbufferStorageMultisample(GL.ctx.RENDERBUFFER, sampleSize,
				GL.ctx.DEPTH_COMPONENT16, 
				this.fbo.frameWidth, this.fbo.frameHeight ); //DEPTH_COMPONENT24
		}

		//Attach buffer to frame
		GL.ctx.framebufferRenderbuffer(GL.ctx.FRAMEBUFFER, GL.ctx.DEPTH_ATTACHMENT, GL.ctx.RENDERBUFFER, this.fbo.bDepth);
		return this;
	}

	texDepthBuffer(){
		//Up to 16 texture attachments 0 to 15
		var buf = { texture:GL.ctx.createTexture() };
		
		GL.ctx.bindTexture(GL.ctx.TEXTURE_2D, buf.texture);
		//ctx.pixelStorei(ctx.UNPACK_FLIP_Y_WEBGL, false);
		GL.ctx.texParameteri(GL.ctx.TEXTURE_2D, GL.ctx.TEXTURE_MAG_FILTER, GL.ctx.NEAREST);
		GL.ctx.texParameteri(GL.ctx.TEXTURE_2D, GL.ctx.TEXTURE_MIN_FILTER, GL.ctx.NEAREST);
		GL.ctx.texParameteri(GL.ctx.TEXTURE_2D, GL.ctx.TEXTURE_WRAP_S, GL.ctx.CLAMP_TO_EDGE);
		GL.ctx.texParameteri(GL.ctx.TEXTURE_2D, GL.ctx.TEXTURE_WRAP_T, GL.ctx.CLAMP_TO_EDGE);
		GL.ctx.texStorage2D(GL.ctx.TEXTURE_2D, 1, GL.ctx.DEPTH_COMPONENT16, this.fbo.frameWidth, this.fbo.frameHeight);

		GL.ctx.framebufferTexture2D(GL.ctx.FRAMEBUFFER, GL.ctx.DEPTH_ATTACHMENT, GL.ctx.TEXTURE_2D, buf.texture, 0);

		this.fbo.bDepth = buf
		return this;
	}


	//-------------------------------------------------
	// STATIC FUNCTIONS
	//-------------------------------------------------
	static readPixel(fbo,x,y,cAttachNum){
		var p = new Uint8Array(4);
		GL.ctx.bindFramebuffer(GL.ctx.READ_FRAMEBUFFER, fbo.ptr);
		GL.ctx.readBuffer(GL.ctx.COLOR_ATTACHMENT0 + cAttachNum);
		GL.ctx.readPixels(x, y, 1, 1, GL.ctx.RGBA, GL.ctx.UNSIGNED_BYTE, p);
		GL.ctx.bindFramebuffer(GL.ctx.READ_FRAMEBUFFER, null);
		return p;
	}

	static activate(fbo){ GL.ctx.bindFramebuffer(GL.ctx.FRAMEBUFFER,fbo.ptr); return this; }
	static deactivate(){ GL.ctx.bindFramebuffer(GL.ctx.FRAMEBUFFER,null); return this; }
	static clear(fbo, unbind = true){
		GL.ctx.bindFramebuffer(GL.ctx.FRAMEBUFFER,fbo.ptr);
		GL.ctx.clear(GL.ctx.COLOR_BUFFER_BIT | GL.ctx.DEPTH_BUFFER_BIT); 
		if(unbind) GL.ctx.bindFramebuffer(GL.ctx.FRAMEBUFFER,null);
	}


	static blit(fboRead,fboWrite){
		//bind the two Frame Buffers
		GL.ctx.bindFramebuffer(GL.ctx.READ_FRAMEBUFFER, fboRead.ptr);
		GL.ctx.readBuffer(GL.ctx.COLOR_ATTACHMENT0);

		GL.ctx.bindFramebuffer(GL.ctx.DRAW_FRAMEBUFFER, fboWrite.ptr);
	//	GL.ctx.drawBuffer(GL.ctx.COLOR_ATTACHMENT0);

		GL.ctx.drawBuffers([
 		GL.ctx.COLOR_ATTACHMENT0,  // color attachment 0 to draw buffer 0
		]);


		//Clear Frame buffer being copied to.
		GL.ctx.clearBufferfv(GL.ctx.COLOR, 0, [0.0, 0.0, 0.0, 1.0]); 

		//Transfer Pixels from one FrameBuffer to the Next
		GL.ctx.blitFramebuffer(
			0, 0, fboRead.frameWidth, fboRead.frameHeight,
			0, 0, fboWrite.frameWidth, fboWrite.frameHeight,
			GL.ctx.COLOR_BUFFER_BIT, GL.ctx.NEAREST);





		//bind the two Frame Buffers
		GL.ctx.bindFramebuffer(GL.ctx.READ_FRAMEBUFFER, fboRead.ptr);
		GL.ctx.readBuffer(GL.ctx.COLOR_ATTACHMENT0+1);

		GL.ctx.bindFramebuffer(GL.ctx.DRAW_FRAMEBUFFER, fboWrite.ptr);
		GL.ctx.drawBuffers([
 			null,  // color attachment 0 to draw buffer 0
  			GL.ctx.COLOR_ATTACHMENT1,  // color attachment 1 to draw buffer 1
		]);


		//Clear Frame buffer being copied to.
		GL.ctx.clearBufferfv(GL.ctx.COLOR, 0, [0.0, 0.0, 0.0, 1.0]); 

		//Transfer Pixels from one FrameBuffer to the Next
		GL.ctx.blitFramebuffer(
			0, 0, fboRead.frameWidth, fboRead.frameHeight,
			0, 0, fboWrite.frameWidth, fboWrite.frameHeight,
			GL.ctx.COLOR_BUFFER_BIT, GL.ctx.NEAREST);





		//Unbind
		GL.ctx.bindFramebuffer(GL.ctx.READ_FRAMEBUFFER, null);
		GL.ctx.bindFramebuffer(GL.ctx.DRAW_FRAMEBUFFER, null);
	}




	static delete(fbo){
		//TODO, Delete using the Cache name, then remove it from cache.
		GL.ctx.deleteRenderbuffer(fbo.bDepth);
		GL.ctx.deleteTexture(fbo.bColor.texture);
		GL.ctx.deleteTexture(fbo.pColor.texture);
		GL.ctx.deleteFramebuffer(fbo.ptr);
	}

	static deleteMS(fbo){
		//TODO, Delete using the Cache name, then remove it from cache.
		GL.ctx.deleteRenderbuffer(fbo.bDepth);
		GL.ctx.deleteRenderbuffer(fbo.bColor.ptr);
		GL.ctx.deleteRenderbuffer(fbo.pColor.ptr);
		GL.ctx.deleteFramebuffer(fbo.ptr);
	}

	
}

export { FBO_2 };