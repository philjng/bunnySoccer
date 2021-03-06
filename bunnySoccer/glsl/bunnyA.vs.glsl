#version 300 es

// The uniform variable is set up in the javascript code and the same for all vertices
uniform vec3 bunnyAPosition;
uniform int explodeA;

// Create shared variable for the vertex and fragment shaders
out vec3 color;

void main() {
    // Set shared variable to vertex normal
    color = normal;
    vec3 newPos = (position + normal) * 1.5; // take the position of each vertex (triangles) and add to it the normal vector, then expand 1.5

    // Multiply each vertex by the model matrix to get the world position of each vertex, then the view matrix to get the position in the camera coordinate system, and finally the projection matrix to get final vertex position
    if (explodeA == 1) {
        gl_Position = projectionMatrix * viewMatrix * (modelMatrix * vec4(newPos, 1.0) + vec4(bunnyAPosition, 0.0));
    }
    else {
        gl_Position = projectionMatrix * viewMatrix * ( modelMatrix * vec4(position, 1.0) + vec4(bunnyAPosition, 0.0) );
    }
}