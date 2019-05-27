#version 300 es                         // Telling which version we are going to use

layout(location=0) in vec3 a_position;
layout(location=5) in vec3 a_color;

uniform mat4 uProjView;
out vec3 o_color;

void main(void){
	o_color = a_color;
	gl_Position  = uProjView * vec4(a_position, 1.0);
	gl_PointSize = 3.0;
}