#version 300 es
precision mediump float;

in highp vec2 vUV;

uniform sampler2D bufColor;
uniform sampler2D bufDepth;

out vec4 outColor;

const float offset = 1.0 / 300.0; 

void main(void){
	vec4 c = texture(bufColor,vUV);

	//Simple Drawing Frame
	outColor = c; 
}



// precision highp float;

// in highp vec2 vUV;

// uniform sampler2D bufColor;
// uniform sampler2D bufDepth; 

// out vec4 outColor;

// const float PROJ_NEAR = 0.1;
// const float PROJ_FAR = 100.0;

// float LinearizeDepth(float z){ 
//     float n = 1.0; // camera z near
//     float f = 100.0; // camera z far
//     return (2.0 * n) / (f + n - z * (f - n)); 
// }

// void main(void){
//     ivec2 fCoord = ivec2(gl_FragCoord.xy);      //Get the Int of the current Screen pixel X,Y
//     ivec2 texSize = textureSize(bufColor,0);    //Get Size of Texture

//     vec4 color = texelFetch(bufColor, fCoord , 0);
//     // float depth = texelFetch(bufDepth, fCoord , 0).x;
//     // depth = LinearizeDepth(depth);

//         //outColor = color;
//         //outColor = vec4(depth,depth,depth,1.0);

//         //if(depth < 0.4) outColor = vec4(1.0,0.0,0.0,1.0);

//         /*Better Math for depth testing
//         float ndc = 2.0 * texelFetch(bufDepth, fCoord, 0).r - 1.0;  //Normalized Device Space -1:1
//         float depth2 = -(2.0 * PROJ_FAR * PROJ_NEAR) / (ndc * (PROJ_FAR - PROJ_NEAR) - PROJ_FAR - PROJ_NEAR);
//         if(depth2 < 4.0 ) outColor = vec4(1.0,0.0,0.0,1.0);    
//         */

//         /* Pixel Grid */
//     float pixelSize = 7.0;
//     float xMod      = mod(float(fCoord.x),pixelSize);
//     float yMod      = mod(float(fCoord.y),pixelSize);

//     if( xMod == 0.0 || yMod == 0.0 ) outColor = vec4(0.0,0.0,0.0,0.3);
//     else{
//         ivec2 pix = fCoord;
//         pix.x -= int( xMod );
//         pix.y -= int( yMod );
//         outColor = texelFetch(bufColor, pix , 0);
//     }
        
// }