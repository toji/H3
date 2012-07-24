var Game = require('./game').Game;

//
// Player
//

var Player = function(client) {
    this.game = null;
    
    this.id = Player.new_id();
    this.name = 'Player ' + this.id;
    this.color = {r: 255, g: 255, b: 255 };
    
    this.reset();

    this.client = client;
    
    var that = this;
    this.client.on('message', function(packet) {
        var data = JSON.parse(packet);
        if(data.type == "join_game") {
            var game = Game.find_game(data.data);
            that.join_game(game);
        } else if(that.game) {
            that.game.message(data.type, data.data, that);
        }
    });
    
    this.client.on('disconnect', function() {
        if(that.game)
            that.game.remove_player(that);
        console.log('Player Disconnected: ' + that.id);
    });
};

Player.prototype.join_game = function(game) {
    this.leave_game();
    
    if(game) {
        this.game = game;
        game.add_player(this);
    }
};

Player.prototype.leave_game = function() {
    if(this.game) {
        this.game.remove_player(this);
        this.game = null;
    }
};

Player.prototype.reset = function() {
    this.score = 0;
    this.path = [];
    this.ready = false;
    
    //stats
    this.tiles_claimed = 0;
    this.sets_claimed = 0;
    this.points_stolen = 0;
    this.largest_score = 0;
    this.largest_set = 0;
    this.smallest_set = 0;
    this.largest_steal = 0;
    this.sets_denied = 0;
    this.points_denied = 0;
    this.largest_set_denied = 0;
};

Player.prototype.data_object = function() {
    var that = this;
    return {
        id: that.id,
        name: that.name,
        score: that.score,
        color: that.color,
        path: that.path,
        ready: that.ready
    };
};

Player.last_id = -1;

Player.new_id = function() {
    return ++Player.last_id;
};

Player.prototype.send = function(type, data, player) {
    if(!data) { data = ''; }
    if(player) { player = player.id; }
    
    var packet = JSON.stringify({type: type, data: data, player: player});
    if(this.client)
        this.client.send(packet);
    else if(this.socket) {
        var trans = packet + '\n';
        this.socket.write(trans.length + '\n' + trans);
    }
};

// Player-initiated syncing can only update certain values, like name and color
Player.prototype.sync = function(data) {
    var filtered_data = {};
    
    if(data.name) {
        this.name = data.name;
        filtered_data.name = data.name;
    }
    
    if(data.color) {
        this.color = data.color;
        filtered_data.color = data.color;
    }
    
    if(data.hasOwnProperty('ready')) {
        this.ready = data.ready;
        filtered_data.ready = data.ready;
        this.game.ready_changed();
    }
    
    return filtered_data;
};

// Stats collecting
Player.prototype.on_score = function(score, tiles) {
    this.sets_claimed++;
    if(score > this.largest_score)
        this.largest_score = score;
    
    this.tiles_claimed += tiles;
    if(tiles > this.largest_set)
        this.largest_set = tiles;
        
    if(this.smallest_set === 0 || tiles < this.smallest_set)
        this.smallest_set = tiles;
};

Player.prototype.on_steal = function(score, player) {
    this.points_stolen += score;
    if(score > this.largest_steal) {
        this.largest_steal_player = player;
        this.largest_steal = score;
    }
};

Player.prototype.on_denied = function(score, player) {
    this.points_denied += score;
    this.sets_denied++;
    if(score > this.largest_set_denied) {
        this.largest_set_denied_player = player;
        this.largest_set_denied = score;
    }
};

exports.Player = Player;
