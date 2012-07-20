/* <copyright>
 * Copyright (c) 2012 Brandon Jones
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 </copyright> */

var Montage = require("montage/core/core").Montage,
    Player = require("reels/player").Player,
    Board = require("js/board").Board,
    Globals = require("reels/globals").Globals;

function dist(pt0, pt1) {
    var dx = (pt1.x - pt0.x);
    var dy = (pt1.y - pt0.y);
    return Math.sqrt(dx * dx + dy * dy);
}

exports.GameState = Montage.create(Montage, {
    // Server state
    id: {
        value: -1
    },

    playerLimit: {
        value: 4
    },

    players: {
        value: {},
        distinct: true
    },

    playerList: {
        value: [],
        distinct: true
    },

    // Player list ranked by score
    rankedPlayers: {
        value: [],
        distinct: true
    },

    awards: {
        value: [],
        distinct: true
    },

    board: {
        value: null
    },

    // Client state
    localPlayerId: {
        value: -1
    },

    localPlayer: {
        value: null
    },

    lastMousePt: {
        value: null
    },

    timeStarted: {
        value: 0
    },

    timeLeft: {
        value: 0
    },

    timeLimit: {
        value: 0
    },

    roundStarted: {
        value: false
    },

    currentStage: {
        value: "lobby"
    },

    chatLog: {
        value: [],
        distinct: true
    },

    // Renderer
    _render: {
        value: null
    },

    render: {
        get: function() {
            return this._render;
        },
        set: function(value) {
            this._render = value;
            this._render.bindGame(this);

            var i;
            for(i in this.board.tiles)
                this._render.drawTile(i);
        }
    },

    frameTimeout: {
        value: null
    },

    // Socket
    socket: {
        value: null
    },

    init: {
        value: function() {
            this.board = new Board(10, 48, Globals.board.width-20, Globals.board.height-58, Globals.theme);

            // Socket connection
            var game = this;
            
            this.socket = io.connect();
            this.socket.on('connect', function() {
                // Try to get locally stored name?
                var playerName = null; //jQuery.cookie('player_name');
                if(playerName !== null) {
                    this.sendMessage('sync_player', {
                        name: playerName
                    } );
                }
            });
            this.socket.on('message', function(packet){
                var data = JSON.parse(packet);
                /*console.log(data.type + ', ' + data.player + ': ');
                console.log(data.data);*/
                game.onMessage(data.type, data.data, data.player);
            });

            return this;
        }
    },

    onMessage: {
        value: function(type, data, playerId) {
            var player = null;
            if(playerId in this.players)
                player = this.players[playerId];
            
            switch(type) {
                case 'player_id':
                    this.localPlayerId = playerId;
                    break;
                
                case 'sync_player':
                    if(!player) {
                        player = Player.create().init(playerId, this);
                        this.addPlayer(player);
                    }
                    player.sync(data);
                    break;
                    
                case 'remove_player':
                    this.removePlayer(player);
                    break;
                    
                case 'sync_game':
                    this.sync(data);
                    break;
                    
                case 'start_round':
                    this.sync(data);
                    this.startRound();
                    break;
                
                case 'end_round':
                    this.endRound(data);
                    break;
                    
                case 'break_path':
                    player.path = [];
                    if(playerId == this.localPlayerId) {
                        // Do something that makes the player feel sad.
                        //this.stealSnd.play();
                    }
                    break;
                    
                case 'clear_tiles':
                    this.clearTiles(data.path, data.last_tile, player);
                    break;
                    
                case 'push_tiles':
                    this.pushTiles(data);
                    break;
                
                case 'add_tile':
                    player.path.push(data);
                    this.render.drawHighlight(data, player);
                    break;
                
                case 'add_trail':
                    player.updateTrail(this.board.unscale_point(data));
                    this.render.drawTrail(player);
                    break;
                
                case 'chat':
                    this.onChat(player, data);
                    break;
            }
        }
    },

    sendMessage: {
        value: function(type, data) {
            this.socket.send(JSON.stringify({type: type, data: data}));
        }
    },

    serverPlayer: {
        value: {
            name: "○ Server ○"
        }
    },

    onChat: {
        value: function(player, message) {
            if(player === null) {
                player = this.serverPlayer;
            }
            this.chatLog.push({player: player, message: message});
        }
    },

    startRound: {
        value: function() {
            var that = this;
            
            this.timeStarted = new Date().getTime();
            this.roundStarted = true;
            this.timeLeft = this.timeLimit;

            var startRoundEvent = document.createEvent("CustomEvent");
            startRoundEvent.initCustomEvent("startRound", true, true, null);
            this.dispatchEvent(startRoundEvent);
        }
    },

    endRound: {
        value: function(data) {
            this.timeStarted = 0;
            this.timeLeft = 0;
            this.localPlayer.ready = false;
            this.awards = data.awards;

            // Copy the player list and sort by score
            this.rankedPlayers = this.playerList.slice(0);
            this.rankedPlayers.sort(function(a, b) {
                return b.score - a.score;
            });

            var endRoundEvent = document.createEvent("CustomEvent");
            endRoundEvent.initCustomEvent("endRound", true, true, null);
            this.dispatchEvent(endRoundEvent);

            this.roundStarted = false;
        }
    },

    onFrame: {
        value: function(now, frameTime) {
            this.timeLeft = this.timeLimit - Math.floor((now - this.timeStarted) / 1000);

            for(var p in this.players)
                this.players[p].fadeTrail(frameTime);
            
            this.redrawBoard(frameTime);
        }
    },

    addPoint: {
        value: function(x, y, first) {
            var pt0 = this.lastMousePt;
            var pt1 = {x: x, y: y};
            this.lastMousePt = pt1;
            
            var syncPt = this.localPlayer.updateTrail(this.lastMousePt);
            
            if(syncPt) {
                this.sendMessage('add_trail', this.board.scale_point(this.lastMousePt));
            }
            
            if(this.render)
                this.render.drawTrail(this.localPlayer, this.lastMousePt);

            var tile;
            
            // Try and iterate over the line that was drawn and add any tiles to the path]
            // TODO: This is a very brute-force approach. I'd like to try and optimize it later.
            if(!first) {
                var d = dist(pt0, pt1);
                var dx = (pt1.x - pt0.x) / d;
                var dy = (pt1.y - pt0.y) / d;
                
                for(var i = 1; i < d; ++i) {
                    var newTile = this.board.pixel_to_tile(pt0.x+(dx*i), pt0.y+(dy*i));
                    if(tile != newTile && newTile != -1 && this.board.compatible_tile(newTile, this.localPlayer.path)) {
                        tile = newTile;
                        this.localPlayer.path.push(tile);
                        this.render.drawHighlight(tile, this.localPlayer);
                        this.sendMessage('add_tile', tile);
                    }
                }
            }
            
            // Make sure to include the final point
            tile = this.board.pixel_to_tile(x, y);
            if(tile != -1 && this.board.compatible_tile(tile, this.localPlayer.path)) {
                this.localPlayer.path.push(tile);
                this.render.drawHighlight(tile, this.localPlayer);
                this.sendMessage('add_tile', tile);
            }
        }
    },

    finishPath: {
        value: function() {
            this.sendMessage('claim_tiles');
    
            var path = this.localPlayer.path;
            this.localPlayer.path = [];
        }
    },

    sync: {
        value: function(data) {
            var i;

            if(data.id)
                this.id = data.id;
            
            if(data.board) {
                this.board.sync(data.board);
                if(this.render) {
                    for(i in this.board.tiles)
                        this.render.drawTile(i);
                }
                
            }
            
            if(data.players) {
                for(i in data.players) {
                    var id = data.players[i].id;
                    if(id in this.players) {
                        this.players[id].sync(data.players[i]);
                    } else  {
                        var player = Player.create().init(id, this);
                        player.sync(data.players[i]);
                        this.addPlayer(player);
                    }
                }
            }
            
            if(data.time_limit) {
                this.timeLimit = data.time_limit;
            }
        }
    },

    addPlayer: {
        value: function(player) {
            this.players[player.id] = player;
            this.playerList.push(player);
            if(player.id == this.localPlayerId) {
                this.localPlayer = player;
            }
        }
    },

    removePlayer: {
        value: function(player) {
            var i;
            for(i = 0; i < this.playerList.length; ++i) {
                if(this.playerList[i] == player) {
                    this.playerList.splice(i, 1);
                    break;
                }
            }
            delete this.players[player.id];
        }
    },

    clearTiles: {
        value: function(path, lastTile, player) {
            //this.claimSnd.play();
            
            this.render.clearTiles(path, lastTile, player == this.localPlayer);
            
            for(var i in path) {
                this.board.tiles[path[i]] = -1;
            }
        }
    },

    pushTiles: {
        value: function(newTiles) {
            //this.pushSnd.play();

            if(this.roundStarted)
                this.render.pushTiles(newTiles);
        }
    },

    setTile: {
        value: function(tile, type) {
            this.board.tiles[tile] = type;
            this.render.drawTile(tile);
        }
    },

    redrawBoard: {
        value: function(frameTime) {
            if(!this.render) { return; }
            this.render.clear();
    
            this.render.startFrame(frameTime);
            
            this.renderHighlights(frameTime);
            
            for(var p in this.players) {
                if(p == this.localPlayerId)
                    this.render.drawTrail(this.players[p], this.lastMousePt);
                else
                    this.render.drawTrail(this.players[p]);
            }
            
            this.render.endFrame(frameTime);
        }
    },

    renderHighlights: {
        value: function(frameTime) {
            if(!this.render) { return; }
            var highlightCount = [];
            var i;
    
            // Ensure that space is reserved for the local players highlights
            // Which are always the outer-most ring
            var player = this.localPlayer;
            for(i in player.path) {
                highlightCount[player.path[i]] = 1;
            }
            
            // Render all other players highlights, which nest inside one another when overlapping
            for(var p in this.players) {
                player = this.players[p];
                if(player == this.localPlayer)
                    continue;
                    
                for(i in player.path) {
                    var tile = player.path[i];
                    if(!highlightCount[tile])
                        highlightCount[tile] = 1;
                    else
                        highlightCount[tile] += 1;
                    this.render.drawHighlight(tile, player, highlightCount[tile]);
                }
            }
            
            // Render the local players highlights (done last so nothing else covers them)
            player = this.localPlayer;
            for(i in player.path) {
                this.render.drawHighlight(player.path[i], player, 1);
            }
        }
    }
});

