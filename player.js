//
// Player
//

var Player = function() {
    this.game = null;
    
    this.id = Player.new_id();
    this.name = 'Player ' + this.id;
    this.color = {r: 255, g: 255, b: 255 };
    
    this.reset();
}

Player.prototype.bind_web_client = function(client) 
{
    this.client = client;
    
    var that = this;
    this.client.on('message', function(packet) {
        var data = JSON.parse(packet);
        if(that.game)
            that.game.message(data.type, data.data, that);
    });
    
    this.client.on('disconnect', function() { 
        if(that.game)
            that.game.remove_player(that);
        console.log('Player Disconnected: ' + that.id);
    });
}

Player.prototype.bind_tcp_client = function(socket)
{
    this.socket = socket;
    
    var trans_length = 0;
    var buffer = '';
    
    var that = this;
    socket.on('data', function (data) {
        buffer += data
        // Buffer and parse transactions
        while(buffer.length >= trans_length && buffer.length > 0) {
            if(trans_length > 0) {
                var trans = buffer.slice(0, trans_length);
                buffer = buffer.slice(trans_length);
                try {
                    var data_obj = JSON.parse(trans);
                    if(that.game)
                        that.game.message(data_obj.type, data_obj.data, that);
                } catch(ex) {
                    console.log('Failed to process TCP message: ' + trans + ', ' + ex);
                    console.log('Disconnecting player: ' + that.id);
                    socket.end();
                }
            }
            
            trans_length = 0;
            if(buffer.length > 0) {
                var idx = buffer.indexOf("\n");
                if(idx != -1) {
                    var len_str = buffer.slice(0, idx);
                    buffer = buffer.slice(idx+1);
                    try {
                        trans_length = parseInt(len_str);
                        if(trans_length > 9999)
                            throw "Transaction too large"
                    } catch(ex) {
                        console.log('Invalid transaction length: ' + len_str + ', ' + ex);
                        console.log('Disconnecting player: ' + that.id);
                        socket.end();
                    }
                } else {
                    return;
                }
            }
        }        
    });
    socket.on('close', function () {
        that.socket = null;
        if(that.game)
            that.game.remove_player(that);
        console.log('Player Disconnected: ' + that.id);
    });
    socket.on('error', function (ex) {
        console.log("Caught exception: " + ex);
        console.log('Disconnecting player: ' + that.id);
        socket.end();
    });
}

Player.prototype.join_game = function(game)
{
    this.leave_game();
    
    if(game) {
        this.game = game;
        game.add_player(this);
    }
}

Player.prototype.leave_game = function()
{
    if(this.game) {
        this.game.remove_player(this);
        this.game = null;
    }
}

Player.prototype.reset = function()
{
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
}

Player.prototype.data_object = function() {
    var that = this;
    return {
        id: that.id,
        name: that.name,
        score: that.score,
        color: that.color,
        path: that.path,
        ready: that.ready,
    };
}

Player.last_id = -1;

Player.new_id = function() {
    return ++Player.last_id;
}

Player.prototype.send = function(type, data, player) {
    if(!data) { data = ''; }
    if(player) { player = player.id; }
    
    var packet = JSON.stringify({type: type, data: data, player: player})
    if(this.client)
        this.client.send(packet);
    else if(this.socket) {
        var trans = packet + '\n';
        this.socket.write(trans.length + '\n' + trans);
    }
}

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
}

// Stats collecting
Player.prototype.on_score = function(score, tiles)
{
    this.sets_claimed++;
    if(score > this.largest_score)
        this.largest_score = score;
    
    this.tiles_claimed += tiles;
    if(tiles > this.largest_set)
        this.largest_set = tiles;
        
    if(this.smallest_set == 0 || tiles < this.smallest_set)
        this.smallest_set = tiles;
}

Player.prototype.on_steal = function(score, player)
{
    this.points_stolen += score;
    if(score > this.largest_steal) {
        this.largest_steal_player = player;
        this.largest_steal = score;
    }
}

Player.prototype.on_denied = function(score, player)
{
    this.points_denied += score;
    this.sets_denied++;
    if(score > this.largest_set_denied) {
        this.largest_set_denied_player = player;
        this.largest_set_denied = score;
    }
}

exports.Player = Player;
