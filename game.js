var board = require('./board');

//
// Game
//

var Game = function(private_gameid) {
    this.id = Game.new_id();
    this.private_gameid = private_gameid < 0 ? this.id : private_gameid;
    this.player_limit = 4;
    this.time_limit = 60;
    this.tile_recharge = 2.0;
    this.readyTimeout = null;
    this.round_timeout = null;
    this.round_started = false;
    
    this.board = new board.Board();
    
    this.players = [];
    this.trails = [];
};

Game.prototype.data_object = function() {
    var data = {
        id: this.id,
        player_limit: this.player_limit,
        time_limit: this.time_limit,
        tile_recharge: this.tile_recharge,
        tiles: this.tiles,
        board: this.board.data_object(),
        players: [],
        private_gameid: this.private_gameid
    };
    for(var i in this.players) {
        data.players.push(this.players[i].data_object());
    }
    return data;
};

Game.last_id = 0;

Game.new_id = function() {
    return ++Game.last_id;
};

Game.prototype.add_player = function(player) {
    player.send('player_id', null, player);
    this.broadcast('sync_player', player.data_object(), player); // Tell existing players about the new one
    this.players.push(player);
    player.send('sync_game', this.data_object()); // Tell the new player about the game state
};

Game.prototype.remove_player = function(player) {
    var i = this.players.indexOf(player);
    if(i != -1) { this.players.splice(i, 1); }
    this.broadcast('remove_player', null, player);
    
    // If everyone has left the game, stop the round in progress and remove this game
    if(this.players.length === 0) {
        if(this.round_timeout)
            clearTimeout(this.round_timeout);
            Game.remove_game(this);
    } else {
        // Check to see if all remaining players are ready
        this.ready_changed();
    }
};

// Broadcast a message to all players
Game.prototype.broadcast = function(type, data, player) {
    for(var p in this.players) {
        this.players[p].send(type, data, player);
    }
};

// Broadcast a message to everyone but the sending player
Game.prototype.broadcast_others = function(type, data, player) {
    for(var p in this.players) {
        var send_player = this.players[p];
        if(player != send_player)
            send_player.send(type, data, player);
    }
};

Game.prototype.message = function(type, data, player) {
    switch(type) {
        case 'chat':
            if(data)
                this.broadcast(type, data, player);
            break;
            
        case 'sync_player':
            data = player.sync(data);
            this.broadcast(type, data, player);
            break;
            
        case 'add_tile':
            if(this.board.compatible_tile(data, player.path)) {
                player.path.push(data);
                this.broadcast_others(type, data, player);
            } else {
                console.log('Bad Claim: ' + data);
            }
            break;
            
        case 'add_trail':
            this.broadcast_others(type, data, player);
            break;
            
        case 'claim_tiles':
            this.claim(player);
            break;
            
        default:
            console.log('Unknown message type: ' + type);
            break;
    }
};

Game.prototype.reset = function() {
    this.board.randomize();
    
    for(var i in this.players)
        this.players[i].reset();
};

Game.prototype.ready_changed = function() {
    clearTimeout(this.ready_timeout);
    
    for(var i in this.players)
    {
        var player = this.players[i];
        
        if(!player.ready)
            return;
    }
    
    var that = this;
    
    this.broadcast('chat', 'All players ready, game starting...');
    
    // If all players are currently ready:
    // Pause a moment, make sure nobody backs out at the last second.
    this.ready_timeout = setTimeout(function(){
        that.ready_timeout = null;
        
        // Everyone still ready?
        for(var i in this.players)
        {
            var player = this.players[i];
            if(!player.ready)
                return;
        }
        
        // Great! Start the round!
        that.start_round();
    }, 3000);
};

Game.prototype.start_round = function() {
    if(!this.private_game)
        Game.close_game(this);

    clearTimeout(this.round_timeout);
    
    this.reset();
    
    // TODO: Countdown?
    
    this.round_started = true;
    
    this.broadcast('start_round', this.data_object());
    
    var that = this;
    
    // Uncomment for debugging. Periodically re-syncs the entire board
    // Useful for ferreting out synchonization problems
    /*var resync_interval = setInterval(function() {
        that.broadcast('sync_game', that.data_object());
    }, 5000);*/
    
    this.round_timeout = setTimeout(function(){
        that.round_timeout = null;
        that.round_started = false;
        
        //clearInterval(resync_interval);
        
        var stats = that.get_round_stats();
        that.broadcast('end_round', stats);
        
        var winner = that.get_winner();
        that.broadcast('chat', 'The round has ended!');
        that.broadcast('chat', winner.name + ' was the winner with ' + winner.score + ' points!');
        // TODO: Tally scores, give awards
        
    }, this.time_limit * 1000);
};

Game.prototype.get_winner = function() {
    var winner = this.players[0];
    for(var i = 1; i < this.players.length; ++i) {
        if(this.players[i].score > winner.score)
            winner = this.players[i];
    }
    
    return winner;
};

// Calculates the value of a players path
Game.prototype.path_value = function(path) {
    if(path.length < 2)
        return 0;
    
    var value = 0;
    var count = 0;
    var multiplier = 1;
    
    for(var i in path) {
        var tile = path[i];
        var type = this.board.tile_types[this.board.tiles[tile]];
        multiplier *= type.multiplier;
        value += count;
        count += 100;
    }
        
    return value * multiplier;
};

Game.prototype.merge_paths = function(path, path2) {
    for(var i in path2) {
        if(path.indexOf(path2[i]) == -1) {
            path.push(path2[i]);
        }
    }
};

Game.prototype.claim = function(player) {
        if(player.path.length < 2 || !this.round_started) {
            player.path = [];
            // Not a match, but let everyone know that this player's path is cleared
            this.broadcast('sync_player', {path: []}, player);
            return null;
        }
            
        var path = player.path;
        var last_tile = path[path.length - 1];
        player.path = [];
        var current_length = path.length;
            
        var score = this.path_value(path);
        
        for(var i in path) {
            var tile = path[i];
            for(var j in this.players) {
                var p = this.players[j];
                if(p.path.indexOf(tile) >= 0) {
                    var stolen = this.path_value(p.path);
                    
                    player.on_steal(stolen, p);
                    p.on_denied(stolen, player);
                    
                    this.merge_paths(path, p.path);
                    
                    score += stolen;
                    p.path = [];
                    this.broadcast('break_path', null, p);
                    //TODO: notify players that their path is broken
                }
            }
        }
        
        this.cycle_tiles(path, last_tile, player);
        
        player.on_score(score, current_length);
        
        player.score += score;
        this.broadcast('sync_player', {'score': player.score, 'change': score, 'path': []}, player);
        
};

Game.prototype.cycle_tiles = function(path, last_tile, player) {
    // Tell everyone the tiles are cleared
    this.broadcast('clear_tiles', {path: path, last_tile: last_tile}, player);
    
    var that = this;
    this.board.cycle_tiles(path, this.tile_recharge * 1000, function(new_tiles) {
        // Tell everyone about the new tiles
        that.broadcast('push_tiles', new_tiles);
    });
};

function set_award(awards, id, player, name, description) {
    awards[id] = {name: name, player: player.name, description: description};
}

Game.prototype.find_largest = function(attrib, callback) {
    var value = 0;
    var top_player = null;
    
    for(var i in this.players) {
        var player = this.players[i];
        
        if(value < player[attrib]) {
            top_player = player;
            value = player[attrib];
        }
    }
    
    if(top_player)
        callback(top_player);
};

Game.prototype.get_round_stats = function() {
    var winner = this.get_winner();
    
    var awards = {};
    
    for(var i in this.players) {
        var player = this.players[i];
        
        if(player.score === 0)
            set_award(awards, 'noscore', player,
                "Sombody Check his Pulse!", "didn't score at all!");
                
        if(player.sets_denied === 0 && this.players.length > 1)
            set_award(awards, 'nodeny', player,
                "Can't touch this", "didn't have any sets stolen from them");
                
        if(player.sets_stolen === 0 && this.players.length > 1)
            set_award(awards, 'nosteal', player,
                "Do unto others...", "didn't steal any sets from other players");
        
        if(player.score == 666 || player.score == 6666 || player.score == 66666)
            set_award(awards, 'evilscore', player,
                "Hell of a round", "scored a rather devilish amount");
                
        if(player.score == 1337)
            set_award(awards, 'l33tsc0r3', player,
                "5\/\/33t!!", "had an elite round");
                
        if(player.points_stolen > player.score - player.points_stolen)
            set_award(awards, 'moresteal', player,
                "I feed on your pain", "stole more points than they scored");
        
        if(player.largest_set > 0 && player.largest_set < 5)
            set_award(awards, 'safe', player,
                "Playing it safe", "never made a set larger than " + player.largest_set + " tiles");
        
        if(player.smallest_set > 5)
            set_award(awards, 'risky', player,
                "Bigger fish to fry", "never made a set smaller than " + player.smallest_set + " tiles");
        
        if(player.name.toLowerCase() == "daddybug" || player.name.toLowerCase() == "duncan" || player.name.toLowerCase() == "redeemer")
            set_award(awards, 'duncan', player,
                "Duncan, No!", "was playing, so something must have broken");
    }
    
    this.find_largest('largest_set', function(player) {
        if(player.largest_set < 10)
            return;
        set_award(awards, 'largest_set', player,
            "Why didn't anyone stop him?", "claimed a set with " + player.largest_set + " tiles");
    });
    
    this.find_largest('points_stolen', function(player) {
        set_award(awards, 'points_stolen', player,
            "Theif!", "denied other players of " + player.points_stolen + " points");
    });
    
    this.find_largest('largest_steal', function(player) {
        set_award(awards, 'largest_steal', player,
            "No tile for you!", "stole a set worth " + player.largest_steal + " points from " + player.largest_steal_player.name);
    });
    
    this.find_largest('tiles_claimed', function(player) {
        set_award(awards, 'tiles_claimed', player,
            "Mine!", "claimed " + player.tiles_claimed + " tiles");
    });
    
    this.find_largest('sets_claimed', function(player) {
        set_award(awards, 'sets_claimed', player,
            "Obsessive Clicker", "claimed " + player.sets_claimed + " sets");
    });
    
    this.find_largest('largest_set_denied', function(player) {
        set_award(awards, 'largest_set_denied', player,
            "The one that got away", "was denied a set worth " + player.largest_set_denied + " points by " + player.largest_set_denied_player.name);
    });
    
    this.find_largest('points_denied', function(player) {
        set_award(awards, 'points_denied', player,
            "Slipping through your fingers", "was denied " + player.points_denied + " points");
    });
    
    this.find_largest('sets_denied', function(player) {
        set_award(awards, 'sets_denied', player,
            "Whipping boy", "had " + player.sets_denied + " sets stolen from them");
    });
    
    // Push the awards into an array that can be shuffled and sliced
    awardArray = [];
    for(var award in awards)
        awardArray.push(awards[award]);
    
    function shuffle(v) {
        for(var j, x, i = v.length; i; j = Math.floor(Math.random() * i), x = v[--i], v[i] = v[j], v[j] = x);
        return v;
    }
    
    awardArray = shuffle(awardArray);
    
    return {
        winner: {
            name: winner.name,
            id: winner.id,
            score: winner.score
        },
        awards: awardArray.slice(0,6)
    };
};

Game.private_games = {};
Game.open_public_games = [];

Game.find_game = function(gameid) {
    var game;
    if(gameid == -1) {
        // Practice game. Always create a new one.
        return new Game();
    }
    else if(gameid == -2) {
        // New Private game
        game = new Game(gameid);
        Game.private_games[game.id] = game;
        return game;
    }
    else if(gameid) {
        // Private game. Join or create.
        game = Game.private_games[gameid];
        if(!game) {
            game = new Game(gameid);
            Game.private_games[gameid] = game;
        }
        return game;
    }
    else {
        // Public game, find one with an open spot
        for(var i in Game.open_public_games) {
            game = Game.open_public_games[i];
            if(game.players.length < game.player_limit) {
                return game;
            }
        }
        
        game = new Game();
        Game.open_public_games.push(game);

        return game;
    }
};

Game.close_game = function(game) {
    for(var i in Game.open_public_games) {
        if(game == Game.open_public_games[i])
            delete Game.open_public_games[i];
    }
};

Game.remove_game = function(game) {
    if(game.private_game) {
        // Remove from private game
        if(Game.private_games.hasOwnProperty(game.id))
            delete Game.private_games[game.id];
    } else {
        for(var i in Game.open_public_games) {
            if(game == Game.open_public_games[i])
                delete Game.open_public_games[i];
        }
    }
    
    delete game;
};

exports.Game = Game;
