// Hex Flip classes
var Player = require('./player').Player;
var Game = require('./game').Game;

// Node middleware
var express = require('express');

var HTTP_PORT = 8080;

// HTTP Server
var server = express.createServer();

server.configure(function() {
    /*server.use(express.cookieParser());
    server.use(express.session({ secret: 'baka neko' }));*/
    server.use(express.favicon(__dirname + '/public/favicon.ico'));
    server.use(express.static(__dirname + '/public'));
    server.use(express.directory(__dirname + '/public'));
});

// Socket.io
var io = require('socket.io').listen(server); // Latch onto HTTP server

io.configure(function() {
    io.set("log level", 1);
});

io.sockets.on('connection', function(client) {
    var p = new Player(client);
    
    console.log('Player Connected: ' + p.id);
});

server.listen(HTTP_PORT);
console.log('HTTP Server running at on port ' + HTTP_PORT);