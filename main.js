// Client Side
const $ = require('jquery');
const io = require('socket.io-client');
const THREE = require('three');
              require('./node_modules/three/examples/js/loaders/ctm/lzma.js');
              require('./node_modules/three/examples/js/loaders/ctm/ctm.js');
              require('./node_modules/three/examples/js/loaders/ctm/CTMLoader.js');
const NearestVertex = require('./initNearestVertex.js');

let socket = io.connect();

let matrixColumns;
let matrixRows;

let connsList;
let obuff;
let cbuff;
let vbuff;

let index = 0;

matrixColumns = 1024;
matrixRows    = 1024;

// TEST CASES
// -------------------------------------------------------------------------
// let buffer = new Float32Array(10);
//     buffer.fill(666);
socket.on('connect', function(data) {
    socket.emit('join', 'Hello World from client 666');
    // socket.emit('with-binary', buffer);
});

// Load Cell List => Kick off processCells()
// -------------------------------------------------------------------------
fetch(`./connsData/conns-list.json`) // Check if this data exists...
.then( res => {
    return res.json();
})
.then( data => {
    connsList = data;
    processCell(connsList[index]);
}).catch(reason => console.log('conns promise rejected for', reason));


// Process Cells
// -------------------------------------------------------------------------
function processCell(id) {
    // Send Id to Server
    socket.emit('id', id);
    
    // Request Contacts Buffer Data
    console.log('fetching conns data..');
    let connsPromise = fetch(`./connsData/conns-${id}.json`) // Check if this data exists...
    .then( res => {
        console.log(`loaded cell ${id} conns data`);
        return res.json();
    })
    .then( data => {
        let buff = new Float32Array(matrixColumns * matrixRows * 3); // Where to specify
        let index = 0;
        
        _connsOutput = data;
        
        Object.entries(data).forEach(([cellName, cell]) => {
            cell.forEach(contact => {
                // console.log('processing contact ' + index); // Might keep stack from overflowing
                buff[index + 0] = contact.post.x;
                buff[index + 1] = contact.post.y;
                buff[index + 2] = contact.post.z;
                index += 3;
            });
        });  

        return buff;

    }).catch(reason => console.log('conns promise rejected for', reason));

    console.log('fetching verts data..');
    // Request Vertices Buffer Data
    let vertsPromise = new Promise((f, r) => {
        let loader = new THREE.CTMLoader();
        loader.load( `./meshes/${id}.ctm`,   function( geometry ) {
            console.log(`loaded cell ${id} verts data`);
            f( geometry.attributes.position.array );
        }, { useWorker: true } );
    })
    .then( data => {
        let vbuff = new Float32Array(matrixColumns * matrixRows * 3); // Where to specify
        
        for (let i=0; i < data.length; i++) {
            vbuff[i] = data[i];
        }
        
        return vbuff;
    }).catch(reason => console.log('verts promise rejected for', reason));
    

    // Kick off GPGPU NearestVertex => Module Exports that shit
    Promise.all([connsPromise, vertsPromise])
    .then(([cbuff, vbuff]) => {    
        window.cbuff = cbuff;
        window.vbuff = vbuff;
        
        let obuff = new Float32Array(matrixColumns * matrixRows * 3); // Where to specify
        
        console.log('out + conns + verts success!');
        return NearestVertex.gpgpu(vbuff, cbuff, obuff); // returns Promise
    })
    .then((data) => {
        socket.emit('writeCellData', data);
    }).catch(reason => console.log('NearestVertex promise rejected for', reason));
}


// Process Another Cell Event Handler
// -------------------------------------------------------------------------
socket.on('writeSuccess', function(data) {
    if (index > connsList.length-1) {
        socket.emit('done', 'Cell processing done!');
        return;
    }
    index++;
    processCell(connsList[index]);
});