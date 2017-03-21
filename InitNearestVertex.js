"use strict";

let GPGPUtility = require('./gpgpUtility.js');
let NearestVertex = require('./NearestVertex.js');

let bufferStatus;
let gpgpUtility;
let nearestVertex;

let matrixColumns;
let matrixRows;

let connsTexture;
let vertsTexture;
let outTexture;

matrixColumns = 1024;
matrixRows    = 1024;
gpgpUtility = new GPGPUtility.make(matrixColumns, matrixRows, {premultipliedAlpha:false});

function gpgpu(vbuff, cbuff, obuff) {
  console.log('setting up GPGPU...');
  return new Promise((f, r) => {
    if (gpgpUtility.isFloatingTexture()) {
        let gl = gpgpUtility.getGLContext();

        // Texture height and width are set in the constructor
        connsTexture = gpgpUtility.makeTexture(gl.FLOAT, cbuff);
        vertsTexture = gpgpUtility.makeTexture(gl.FLOAT, vbuff);
        outTexture   = gpgpUtility.makeTexture(gl.FLOAT, obuff);

        bufferStatus = gpgpUtility.frameBufferIsComplete();

        if (bufferStatus.isComplete) {
            // Create new NearestVertex Class
            nearestVertex = new NearestVertex.make(gpgpUtility);
            // Setup GPGPU instance
            nearestVertex.setup(connsTexture, vertsTexture, outTexture);
            // Delete resources no longer in use
            nearestVertex.done();
            console.log('GPGPU Done.');
            // Return GPGPU output
            f(nearestVertex.run());
        }
        else {
            r(bufferStatus.message);
        }
    }
    else {
        r( "Floating point textures are not supported." );
    }
  });
}

// Make GPGPU available to others
   module.exports.gpgpu = gpgpu;