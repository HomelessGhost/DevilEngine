#version 300 es
layout(location=0) in vec4 a_position;

uniform UBOTransform{
    mat4	projViewMatrix;
    vec3	cameraPos;
    float	globalTime;
    vec2	screenSize;
};

uniform UBOModel{
    mat4 	modelMatrix;
    mat3	normalMatrix;
};

uniform vec3 u_colorAry[20];

out vec3 v_color;

void main(void){
    v_color			= u_colorAry[ int(a_position.w) ];

    gl_PointSize 	= 10.0;
    gl_Position 	= projViewMatrix * modelMatrix * vec4(a_position.xyz, 1.0);
}