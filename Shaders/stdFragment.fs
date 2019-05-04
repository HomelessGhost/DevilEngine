#version 300 es
precision mediump float;

uniform vec3 color;

out vec4 resultColor;

void main(){
	resultColor = vec4(color, 1.0);
}