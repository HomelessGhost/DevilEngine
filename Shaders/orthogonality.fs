#version 300 es
precision mediump float;

in vec3 o_color;

out vec4 resultColor;

void main(){
	resultColor = vec4(o_color, 1.0);
}