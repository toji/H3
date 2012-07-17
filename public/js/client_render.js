//
// Hexflip Render
// Brandon Jones, 2011
//

RenderBase = function()
{
    this.frame_start_callbacks = [];
    this.frame_end_callbacks = [];
}

RenderBase.prototype.bind_game = function(game)
{
    this.game = game;
    this.board = game.board;
}

// draw a given tile (passed by id)
RenderBase.prototype.draw_tile = function(tile) 
{
    var type = this.board.tiles[tile];
    if(type >= 0)
        this.draw_tile_ex(false, tile, type, 1, 1);
    else
        this.clear_tile(tile);
}

RenderBase.prototype.start_frame = function(frame_time)
{
    for(var i = this.frame_start_callbacks.length - 1; i >= 0; --i) {
        var keep = this.frame_start_callbacks[i](frame_time);
        if(!keep) {
            this.frame_start_callbacks.splice(i, 1);
        }
    }
}

RenderBase.prototype.end_frame = function(frame_time)
{
    for(var i = this.frame_end_callbacks.length - 1; i >= 0; --i) {
        var keep = this.frame_end_callbacks[i](frame_time);
        if(!keep) {
            this.frame_end_callbacks.splice(i, 1);
        }
    }
}

RenderBase.prototype.clear_tiles = function(path, last_tile, out) 
{
    var total_life = 500;
    var life = total_life;
    var tiles = [];
    var that = this;
    
    for(var i in path) {
        var tile = path[i];
        tiles[tile] = this.board.tiles[tile];
    }
    
    function animate(tile) {        
        if(!tiles.hasOwnProperty(tile))
            return;
        
        var type = tiles[tile];
        
        delete tiles[tile];
        
        that.draw_tile_ex(true, tile, type, 1, 1);
        that.clear_tile(tile);
    
        var life = total_life + parseInt(i) * 5;
        
        that.frame_start_callbacks.push(function(frame_time) {
            
            if(out) {
                var mod = jQuery.easing.easeOutBack(null, total_life - life, 0, 1, total_life);
                var linear_mod = (total_life - life) / total_life;
                that.draw_tile_ex(true, tile, type, 1 + (mod*0.5), 1-linear_mod);
            } else {
                var mod = jQuery.easing.easeOutCubic(null, total_life - life, 0, 1, total_life);
                that.draw_tile_ex(true, tile, type, 1-mod, 1-mod);
            }
            
            life -= frame_time;
            
            return life > 0;
        });
        
        setTimeout(function() {
            var adjacent = that.board.get_adjacent_tiles(tile);
            for(var i in adjacent)
                animate(adjacent[i]);
        }, 50);
    };
    
    animate(last_tile);
}

RenderBase.prototype.push_tiles = function(tiles) 
{
    var total_life = 400;
    var that = this;
    
    for(var t in tiles) {
        function animate() {
            var i = t;
            var life = total_life + parseInt(i) * 5;
            
            that.frame_end_callbacks.push(function(frame_time) {
                var mod = jQuery.easing.easeOutBack(null, Math.max(total_life - life, 0), 0, 1, total_life);
            
                that.draw_tile_ex(true, i, tiles[i], mod, mod);
                
                life -= frame_time;
                
                if(life <= 0) {
                    // Not 100% convinced this should be here, don't care at the moment, though.
                    that.game.set_tile(i, tiles[i]);
                }
                
                return life > 0;
            });
        };
        animate();
    }  
}

RenderBase.prototype.add_toast = function(pt, text)
{
    var total_life = 1000;
    var life = total_life;
    var that = this;
    
    this.frame_end_callbacks.push(function(frame_time) {
        var mod = jQuery.easing.easeOutSine(null, total_life - life, 0, 1, total_life);
        
        that.draw_text(text, pt.x, pt.y - (100*mod), 1.0 - mod);
        
        life -= frame_time;
        
        return life > 0;
    });
}

//
// Canvas Based Renderer
//

CanvasRenderer = function()
{    
    this.tileContext = $('#tileLayer').get(0).getContext('2d');
    this.effectContext = $('#effectLayer').get(0).getContext('2d');
    this.empty_tile = new Image();
    this.empty_tile.src = '/img/' + global.theme + '/empty.png';
}

CanvasRenderer.prototype = new RenderBase();

CanvasRenderer.prototype.constructor = CanvasRenderer;

// clear the whole board
CanvasRenderer.prototype.clear = function() 
{
    this.effectContext.clearRect(0, 0, global.board.width, global.board.height);
}

CanvasRenderer.prototype.draw_tile_ex = function(effect, tile, type, scale, opacity) 
{
    var ctx;
    if(effect)
        ctx = this.effectContext;
    else
        ctx = this.tileContext;
    
    if(type < 0 || type >= this.board.tile_types.length)
        return;
        
    ctx.save();
    
    try {
        var img = this.board.tile_types[type].image;
        var pt = this.board.tile_to_pixel(tile);
        var ts = this.board.tile_size;

        var size_x = (ts.b - ts.padding);
        var size_y = (ts.a - ts.padding);
        
        var offset_x = pt.x + (ts.padding * 0.5);
        var offset_y = pt.y + (ts.padding * 0.5);
        
        offset_x -= ((size_x * scale) - size_x) * 0.5;
        offset_y -= ((size_y * scale) - size_y) * 0.5;
        
        ctx.globalAlpha = opacity >= 0 ? opacity : 0;
        ctx.drawImage(img, offset_x, offset_y, size_x * scale, size_y * scale);
        
        if(!effect) {
            this.draw_padding(ctx, pt, ts.padding);
        }
        
    } catch(ex) {
        //console.log('Draw Tile failed: ' + ex);
    }
    
    ctx.restore();
}

CanvasRenderer.prototype.clear_tile = function(tile) 
{
    var pt = this.board.tile_to_pixel(tile);
    var tc = this.board.tile_coords;
    var ctx = this.tileContext;

    var pt = this.board.tile_to_pixel(tile);
    var ts = this.board.tile_size;
    var tc = this.board.tile_coords;
    
    this.draw_padding(ctx, pt, ts.padding);
    
    var size_x = (ts.b - ts.padding);
    var size_y = (ts.a - ts.padding);
    
    var offset_x = pt.x + (ts.padding * 0.5);
    var offset_y = pt.y + (ts.padding * 0.5);
    
    ctx.globalAlpha = 1;
    ctx.drawImage(this.empty_tile, offset_x, offset_y, size_x, size_y);
}

CanvasRenderer.prototype.draw_padding = function(ctx, pt, width) {
    var tc = this.board.tile_coords;
    
    ctx.save();

    ctx.translate(pt.x, pt.y);
    
    ctx.beginPath();
    
    ctx.moveTo(tc[0].x, tc[0].y);
    ctx.lineTo(tc[1].x, tc[1].y);
    ctx.lineTo(tc[2].x, tc[2].y);
    ctx.lineTo(tc[3].x, tc[3].y);
    ctx.lineTo(tc[4].x, tc[4].y);
    ctx.lineTo(tc[5].x, tc[5].y);

    ctx.closePath();
    
    ctx.strokeStyle = '#AAA';
    ctx.lineWidth = width;
    ctx.stroke();
    
    ctx.restore();
}

// draw a player highlight around a tile (passed by id)
CanvasRenderer.prototype.draw_highlight = function(tile, player, ring) 
{
    var pt = this.board.tile_to_pixel(tile);
    
    var ctx = this.effectContext;
    var tc = this.board.tile_coords;
    var ts = this.board.tile_size;
    if(!ring)
        ring = 1;
    
    ctx.save();
    
    ctx.translate(pt.x, pt.y);
    
    var scale = 1.0 - (0.2 * (ring-1));
    if(ring != 1) {
        ctx.translate(-ts.b * 0.5 * scale, -ts.a * 0.5 * scale);
        ctx.scale(scale, scale)
        ctx.translate(ts.b * 0.5 * (1/scale), ts.a * 0.5 * (1/scale));
    }
    
    ctx.beginPath();
    
    ctx.moveTo(tc[0].x, tc[0].y);
    ctx.lineTo(tc[1].x, tc[1].y);
    ctx.lineTo(tc[2].x, tc[2].y);
    ctx.lineTo(tc[3].x, tc[3].y);
    ctx.lineTo(tc[4].x, tc[4].y);
    ctx.lineTo(tc[5].x, tc[5].y);

    ctx.closePath();
    
    ctx.strokeStyle = player.css_color();
    ctx.lineWidth = global.highlight_width * (1/scale);
    ctx.stroke();
    
    ctx.restore();
}

// draw cursor path for a given player
CanvasRenderer.prototype.draw_trail = function(player, last_pt) 
{
    var ctx = this.effectContext;
    
    if(player.trail.length < 2)
        return;
    
    ctx.save();
    
    var pt = player.trail[0];
    
    ctx.strokeStyle = player.css_color();
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    
    for(var i = 1; i < player.trail.length; ++i) {
        pt = player.trail[i];
        
        var mod = pt.life / global.trail_life;
        
        ctx.lineTo(pt.x, pt.y);
        
        //ctx.globalAlpha = pt.life / global.trail_life;
        ctx.lineWidth = global.trail_width * mod;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
    }
    
    if(last_pt) {
        ctx.lineTo(last_pt.x, last_pt.y);
        
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = global.trail_width;
        ctx.stroke();
    }
    
    //ctx.closePath();
    
    ctx.globalAlpha = 1;
    
    ctx.restore();
}

CanvasRenderer.prototype.draw_text = function(text, x, y, opacity)
{
    var ctx = this.effectContext;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#000';
    ctx.globalAlpha = opacity;
    ctx.fillText(text, x, y);
    ctx.globalAlpha = 1.0;
}

CanvasRenderer.prototype.draw_clock = function(time_left) 
{
    var ctx = this.effectContext;
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#FFF';
    ctx.fillText(time_left, (global.board.width*0.5)+2, 38);
    
    ctx.drawImage(this.clock_img, (global.board.width*0.5)-34, 10, 32, 32);
}


