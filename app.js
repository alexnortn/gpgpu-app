// Server Side
// -------------------------------------------------------------------------

const express = require('express');  
const app = express();  
const path = require('path');
const server = require('http').createServer(app);  
const io = require('socket.io')(server);
const fs = require('fs');
const jsonfile = require('jsonfile');

let matrixColumns = 1024;
let matrixRows    = 1024;

let _id;

app.use(express.static(__dirname + '/'));  
app.get('/', function(req, res,next) {  
    res.sendFile(__dirname + '/index.html');
});

server.listen(4200);

// Utility Functions
// -------------------------------------------------------------------------

// Promisify fs.readFile()
fs.readJSONAsync = function (filename) {
    return new Promise(function (resolve, reject) {
        try {
            fs.readFile(filename, 'utf8', function(err, buffer){
                if (err) reject(err); else resolve(JSON.parse(buffer));
            });
        } catch (err) {
            reject(err);
        }
    });
};

// Load conns data (url + id)
function getConnsData(id) {
    let connsFile = "./connsData/conns-" + id + ".json";
    console.log('loading conns for cell ' + id);
    return fs.readJSONAsync(connsFile, 'utf8')
    .then( res => {
        return res;
    }).catch(reason => console.log('conns promise rejected for', reason));
}

// Web Sockets
// -------------------------------------------------------------------------
io.on('connection', function(client) {
    // Establish Connection
    client.on('join', function(data) {
        console.log(data);
        client.emit('messages', 'Hello from server 666');
    });
    // Receive Cell ID
    client.on('id', ( id => {
        console.log('Begin Cell ' + id);
        _id = id;
    }));
    // Write out updated Conns
    client.on('writeCellData', (data => {
        getConnsData(_id).then( conns => {
            let vbuff = new Float32Array(matrixColumns * matrixRows * 3);
            // Flatten response data
            Object.entries(data).forEach(([index, vertex]) => vbuff[index] = vertex);  
            // Update conns-#####.json
            let index = 0;
            console.log('writing cell data ' + _id);
            Object.entries(conns).forEach(([cellName, cell]) => {
                cell.forEach(contact => {
                    contact['vertex'] = vbuff[index];
                    index++;
                });
            });
            // Write conns-#####.json -> to file
            let file = './connsData2/conns-' + _id + '.json'; 
            jsonfile.writeFile(file, conns, (error) => { 
                if (error) {
                    console.error(error);
                }
                else {
                    client.emit('writeSuccess', 'success!'); // Message complete
                }
            }); 
        }).catch(reason => console.log('conns promise rejected for', reason));
    }));
    // Doneskis
    client.on('done', (data => console.log(data)));
});