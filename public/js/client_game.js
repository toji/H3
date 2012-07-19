//
// Hexflip Game
// Brandon Jones, 2011
//

var Game = function(ui_handler, renderer) 
{    
    // Server state
    this.id = -1;
    this.player_limit = 4;
    this.players = {};
    
    this.board = new Board(10, 48, global.board.width-20, global.board.height-58, global.theme);
    
    // Client state
    this.local_player_id = -1;
    this.last_mouse_pt = null;
    this.round_started = false;
    
    // UI Handler
    this.ui = ui_handler;
    this.ui.bind_game(this);
    
    // Renderer
    this.render = renderer;
    this.render.bind_game(this);
    this.frame_timeout = null;
    
    // Audio
    // It's a little awkward to put these here, but I don't care to abstract it any further just yet
    this.claimSnd = document.getElementById('claimSnd');
    this.pushSnd = document.getElementById('pushSnd');
    this.stealSnd = document.getElementById('stealSnd');
    
    // Socket connection
    var game = this;
    
    this.socket = io.connect(); 
    this.socket.on('connect', function() {
        game.ui.on_connected();
    });
    this.socket.on('message', function(packet){
        var data = JSON.parse(packet); 
        console.log(data.type + ', ' + data.player + ': ');
        console.log(data.data);
        game.on_message(data.type, data.data, data.player);
    });
}

Game.prototype.on_message = function(type, data, player_id)
{
    var player = null;
    if(player_id in this.players)
        player = this.players[player_id];
    
    switch(type)
    {
        case 'player_id':
            this.local_player_id = player_id;
            break;
        
        case 'sync_player':
            if(!player)
            {
                player = new Player(player_id, this);
                this.add_player(player);
            }   
            player.sync(data, this.ui);
            break;
            
        case 'remove_player':
            this.remove_player(player);
            break;
            
        case 'sync_game':
            this.sync(data);
            break;
            
        case 'start_round':
            this.sync(data);
            this.start_round();
            break;
        
        case 'end_round':
            this.end_round(data);
            break;
            
        case 'break_path':
            player.path = [];
            if(player_id == this.local_player_id) {
                // Do something that makes the player feel sad.
                this.stealSnd.play();
            }
            break;
            
        case 'clear_tiles':
            this.clear_tiles(data.path, data.last_tile, player);
            break;
            
        case 'push_tiles':
            this.push_tiles(data);
            break;
        
        case 'add_tile':
            player.path.push(data);
            this.render.draw_highlight(data, player);
            break;
        
        case 'add_trail':
            player.update_trail(this.board.unscale_point(data));
            this.render.draw_trail(player);
            break;
        
        case 'chat':
            this.ui.on_chat(player, data);
            break;
    }
}

Game.prototype.send_message = function(type, data)
{
    this.socket.send(JSON.stringify({type: type, data: data}));
}

Game.prototype.start_round = function()
{
    var that = this;
    var frame_time = 33;
    
    this.start_time = new Date().getTime();
    this.round_started = true;
    
    this.ui.start_round(this.time_limit);
    
    var last_frame_time = this.start_time;
    // Start redraw loop (Maybe should be part of renderer? I don't know...) 
    this.frame_timeout = setInterval(function() {
        var new_frame_time = new Date().getTime();
        that.on_frame(new_frame_time - last_frame_time);
        last_frame_time = new_frame_time;
    }, frame_time); 
}

Game.prototype.end_round = function(data)
{
    clearInterval(this.frame_timeout);
    this.ui.end_round(data);
    this.round_started = false;
}

Game.prototype.on_frame = function(frame_time)
{
    for(var p in this.players)
        this.players[p].fade_trail(frame_time);
    
    this.redraw_board(frame_time);
}

Game.prototype.add_point = function(x, y, first)
{
    var pt0 = this.last_mouse_pt;
    var pt1 = {x: x, y: y};
    this.last_mouse_pt = pt1;
    
    var sync_pt = this.local_player.update_trail(this.last_mouse_pt);
    
    if(sync_pt) {
        this.send_message('add_trail', this.board.scale_point(this.last_mouse_pt));
    }
    
    this.render.draw_trail(this.local_player, this.last_mouse_pt);

    var tile;
    
    // Try and iterate over the line that was drawn and add any tiles to the path]
    // TODO: This is a very brute-force approach. I'd like to try and optimize it later.
    if(!first) 
    {
        var d = dist(pt0, pt1);
        var dx = (pt1.x - pt0.x) / d;
        var dy = (pt1.y - pt0.y) / d;
        
        for(var i = 1; i < d; ++i)
        {
            var newTile = this.board.pixel_to_tile(pt0.x+(dx*i), pt0.y+(dy*i));
            if(tile != newTile && newTile != -1 && this.board.compatible_tile(newTile, this.local_player.path))
            {
                tile = newTile;
                this.local_player.path.push(tile);
                this.render.draw_highlight(tile, this.local_player);
                this.send_message('add_tile', tile);
            }
        }
    }
    
    // Make sure to include the final point
    tile = this.board.pixel_to_tile(x, y);
    if(tile != -1 && this.board.compatible_tile(tile, this.local_player.path))
    {
        this.local_player.path.push(tile);
        this.render.draw_highlight(tile, this.local_player);
        this.send_message('add_tile', tile);
    }
}

Game.prototype.finish_path = function()
{
    // TODO: Claim path
    this.send_message('claim_tiles');
    
    var path = this.local_player.path;
    this.local_player.path = [];
}

Game.prototype.sync = function(data)
{   
    if(data.id)
        this.id = data.id;
    
    if(data.board) 
    {
        this.board.sync(data.board);
        for(var i in this.board.tiles) 
            this.render.draw_tile(i);
    }
    
    if(data.players)
    {
        for(var i in data.players) 
        {
            var id = data.players[i].id;
            if(id in this.players)
            {
                this.players[id].sync(data.players[i], this.ui);
            } 
            else 
            {
                var player = new Player(id, this);
                player.sync(data.players[i], this.ui);
                this.add_player(player);
            }
        }
    }
    
    if(data.time_limit)
    {
        this.time_limit = data.time_limit;
    }
}

Game.prototype.add_player = function(player)
{
    this.players[player.id] = player;
    if(player.id == this.local_player_id)
    {
        this.local_player = player;
    }
    this.ui.add_player(player);
}

Game.prototype.remove_player = function(player)
{
    this.ui.remove_player(player);
    delete this.players[player.id];
}

Game.prototype.clear_tiles = function(path, last_tile, player)
{
    this.claimSnd.play();
    
    this.render.clear_tiles(path, last_tile, player == this.local_player);
    
    for(var i in path) {
        this.board.tiles[path[i]] = -1;
    }
}

Game.prototype.push_tiles = function(new_tiles)
{
    this.pushSnd.play();

    if(this.round_started)
        this.render.push_tiles(new_tiles);
}

Game.prototype.set_tile = function(tile, type)
{
    this.board.tiles[tile] = type;
    this.render.draw_tile(tile);
}

Game.prototype.redraw_board = function(frame_time)
{
    this.render.clear();
    
    this.render.start_frame(frame_time);
    
    this.render_highlights(frame_time);
    
    for(var p in this.players)
    {
        if(p == this.local_player_id)
            this.render.draw_trail(this.players[p], this.last_mouse_pt);
        else
            this.render.draw_trail(this.players[p]);
    }
    
    this.render.end_frame(frame_time);
}

Game.prototype.render_highlights = function(frame_time)
{
    var highlight_count = [];
    
    // Ensure that space is reserved for the local players highlights
    // Which are always the outer-most ring
    var player = this.local_player;
    for(var i in player.path) {
        highlight_count[player.path[i]] = 1;
    }
    
    // Render all other players highlights, which nest inside one another when overlapping
    for(var p in this.players)
    {
        var player = this.players[p];
        if(player == this.local_player)
            continue;
            
        for(var i in player.path) {
            var tile = player.path[i];
            if(!highlight_count[tile])
                highlight_count[tile] = 1;
            else
                highlight_count[tile] += 1;
            this.render.draw_highlight(tile, player, highlight_count[tile]);
        }
    }
    
    // Render the local players highlights (done last so nothing else covers the,)
    var player = this.local_player;
    for(var i in player.path) {
        this.render.draw_highlight(player.path[i], player, 1);
    }
}

