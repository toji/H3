// Hex Flip classes
var player = require('./player');
var game = require('./game');

// Node middleware
var express = require('express');
var template = require('./template.js');

// File system
var fs = require('fs');
var url = require('url');

var HTTP_PORT = 8080;
var TCP_PORT = 8181;

// HTTP Server
var server = express.createServer();

server.configure(function() {
    /*server.use(express.cookieParser());
    server.use(express.session({ secret: 'baka neko' }));*/
    server.use(express.favicon(__dirname + '/public/favicon.ico'));
    server.use(express.static(__dirname + '/public'));
    server.use(express.directory(__dirname + '/public'));
});

server.get('/setup', function(req, res){
    template.create('public/game_type.html', {}, function(t) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(t);
    });
});

server.get('/join', function(req, res){
    template.create('public/join_game.html', {}, function(t) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(t);
    });
});

server.get('/game/practice', function(req, res){
    //req.session.game_id = -1;
    
    var context = {
        game_id: -1
    };
    
    template.create('public/game.html', context, function(t) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(t);
    });
});

server.get('/game/:id?', function(req, res){
    var game_id = 0;
    
    if(req.params.id) {
        game_id = req.params.id;
    } else {
        var parsed = url.parse(req.url, true);
        if(parsed.query.id) {
            game_id = parsed.query.id;
        }
    }
    
    if(!game_id) {
        // Creates a game, so it can be looked up again later
        var new_game = game.Game.find_game();
        game_id = new_game.id;
    }
    
    //req.session.game_id = game_id;

    var context = {
        game_id: game_id
    };
    
    template.create('public/game.html', context, function(t) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(t);
    });
});

// Socket.io
var io = require('socket.io').listen(server); // Latch onto HTTP server

io.configure(function() {
    io.set("log level", 1);
});

io.sockets.on('connection', function(client) {
    var p = new player.Player();
    p.bind_web_client(client);
    
    console.log('Web Player Connected: ' + p.id);
    
    var new_game = game.Game.find_game();
    p.join_game(new_game);
});

server.listen(HTTP_PORT);
console.log('HTTP Server running at on port ' + HTTP_PORT);

// TCP Sever
/*var net = require('net');
var tcp_server = net.createServer(function (socket) {
    socket.setEncoding("utf8");
    
    var new_game = game.Game.find_game();
    
    var p = new player.Player();
    p.bind_tcp_client(socket);
    p.join_game(new_game);
    
    console.log('TCP Player Connected: ' + p.id);
});

tcp_server.listen(TCP_PORT);
console.log('TCP Server running at on port ' + TCP_PORT);*/
