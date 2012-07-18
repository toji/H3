// This file is shared between the client and server to prevent the need to code
// some of the uglier bits of managing the Hex grid twice.

// Tile definition
var TileType = function(image_path, multiplier, frequency, neutral) {
    this.image_path = image_path;
    this.multiplier = multiplier ? multiplier : 1.0;
    this.frequency = frequency ? frequency : 1.0;
    this.neutral = neutral ? neutral : false;
}

// Tracks gameboard state
var Board = function(left, top, width, height, theme) {
    this.columns = 8;
    this.rows = 9;
    this.board_size = this.rows * this.columns;
    this.theme = theme;
    
    this.tile_size = null;
    
    this.tiles = [];
    
    this.tile_types = [
            new TileType('red.png'),
            new TileType('green.png'),
            new TileType('blue.png'),
            new TileType('teal.png'),
            new TileType('mult2x.png', 2.0, 0.05, true)
        ];
    
    // If we are provided a width and height, we know that this is a client-side board
    // so we don't need to initialize the tile cache
    if(width && height) {
        this.calculate_tile_dimensions(left, top, width, height);
        this.initialize_tile_types();
    } else {
        this.initialize_tiles();
    }
}

Board.tile_padding = 0.075; // Percentage of tile size resevered for padding

Board.prototype.data_object = function()
{
    var that = this;
    return { 
        tiles: that.tiles,
    };    
}

Board.prototype.sync = function(data)
{
    this.tiles = data.tiles;
}

Board.prototype.initialize_tiles = function() {
    var tile_count = this.board_size * 4;
    this.tile_cache = [];
        
    var freq = 0;
    for(var i in this.tile_types) {
        freq += this.tile_types[i].frequency;
    }

    for(var i in this.tile_types) {
        var tile = this.tile_types[i];
        var amount = tile_count * (tile.frequency / freq);
        // Append the tile id to the queue 'amount' times
        
        for(var x = 0; x < amount; ++x) { 
            this.tile_cache.push(parseInt(i)); 
        }
    }
    
    this.randomize();
}

Board.prototype.randomize = function() {
    function shuffle(v) {
        for(var j, x, i = v.length; i; j = parseInt(Math.random() * i), x = v[--i], v[i] = v[j], v[j] = x);
        return v;
    };

    // Put any current board tiles back into the tile cache and shuffles it
    this.tile_cache = shuffle(this.tile_cache.concat(this.tiles));

    this.tiles = this.tile_cache.slice(0,this.board_size); // Get the first 'board_size' cache tiles
    this.tile_cache = this.tile_cache.slice(this.board_size); // Remove the used tiles from the cache
}

Board.prototype.initialize_tile_types = function() {
    for(var i in this.tile_types) {
        this.tile_types[i].image = new Image();
        this.tile_types[i].image.src = '/img/' + this.theme + '/' + this.tile_types[i].image_path;
    }
}

Board.prototype.cycle_tiles = function(path, delay, callback) {
    // Clear, randomize, and reset tiles in path
    
    // Push each cleared tile back into the cache
    for(var i in path) {
        var t = path[i];
        this.tile_cache.unshift(this.tiles[t]);
        this.tiles[t] = -1;
    }
    
    // Wait for the tiles to "recharge"
    var that = this;
    setTimeout(function() {
        var new_tiles = {};
        
        // Pull new tiles out of the cache
        for(var i in path) {
            var t = path[i];
            that.tiles[t] = that.tile_cache.pop();
            new_tiles[t] = that.tiles[t];
        }
        
        if(callback) {
            callback(new_tiles);
        }
    }, delay);
}

// Return an array of tile ids that are adjacent to the provided id
Board.prototype.get_adjacent_tiles = function(a)
{
    var adjacent = [];
    var board_size = this.rows * this.columns;
    
    if(a < 0 || a >= board_size)
        return null;
        
    var row = a % this.rows;
    var column = Math.floor(a / this.rows);
    var odd_column = Math.floor(a / this.rows) % 2;
    var column_offset = odd_column ? 0 : -1;
    
    // Tile above the current one
    if(row != 0)
        adjacent.push(a-1);
        
    if(row < this.rows - 1)
        adjacent.push(a+1);
        
    if(column != 0) {
        var upper_left = a - this.rows + column_offset;
        if(odd_column || row != 0)
            adjacent.push(upper_left);
        if(!odd_column || row < this.rows - 1)
            adjacent.push(upper_left + 1);
    }
            
    if(column < this.columns - 1) {
        var upper_right = a + this.rows + column_offset;
        if(odd_column || row != 0)
            adjacent.push(upper_right);
        if(!odd_column || row < this.rows - 1)
            adjacent.push(upper_right + 1);
    }
    
    return adjacent;
}

// Tests two tiles (by id) to see if they are adjacent
Board.prototype.tiles_adjacent = function(a, b) 
{
    // a is below b?
    if((a - 1) == b && a % this.rows != 0)
        return true;
        
    // a is above b?
    if((a + 1) == b && a % this.rows != this.rows - 1)
        return true;
    
    // a is one column to the left or right of b?
    if(Math.abs(a - b) == this.rows)
        return true;
    
    // odd or even column?
    var oddColumn = Math.floor(a / this.rows) % 2;
    if(!oddColumn)
    {
        if((a - (this.rows + 1)) == b)
            return true;
        
        if((a + (this.rows - 1)) == b)
            return true;
    } 
    else 
    {
        if((a - (this.rows - 1)) == b)
            return true;
        
        if((a + (this.rows + 1)) == b)
            return true;
    }
    
    return false;
}

// Thank you to http://www.gamedev.net/reference/articles/article1800.asp 
// for providing some of the basic formulas used here!

// Translates a tile id to it's associated x/y position in the grid.
// (Coordinates are in tiles, not pixels)
Board.prototype.tile_to_grid = function(id)
{
    var x = Math.floor(id / this.rows);
    return { x: x, y: id - (x * this.rows) };
}

// Translates a grid coordinate into a tile id
Board.prototype.grid_to_tile = function(x, y)
{
    if(x < 0 || x >= this.columns || y < 0 || y >= this.rows) { return -1; }
    
    return (x * this.rows + y);
}

// Returns the upper left corner of the tile's bounding box
// Note: The tile will not contain this point!
Board.prototype.tile_to_pixel = function(tile) 
{
    var grid = this.tile_to_grid(tile);
    
    var pt = { 
        x: grid.x * (this.tile_size.h + this.tile_size.s) + this.offset.x, 
        y: grid.y * (2 * this.tile_size.r) + this.offset.y 
    };
    
    if(grid.x % 2)
        pt.y += this.tile_size.r;
        
    return pt;
}

// Does a hit test on the tiles to determine which (if any) contain the given point
Board.prototype.pixel_to_tile = function(x, y) 
{
    var tile_size = this.tile_size;
    function getTileInternal(x, y) 
    {
        var sx = Math.floor(x / (tile_size.h + tile_size.s));
        var sy = Math.floor(y / (2 * tile_size.r));

        var px = x % (tile_size.h + tile_size.s);
        var py = y % (2 * tile_size.r);

        var sa = sx % 2;
        
        var m = tile_size.h / tile_size.r;
        
        if(sa)
        {
            if(py >= tile_size.r)
            {
                if(px < (2 * tile_size.h - py * m))
                    return { x: sx - 1, y: sy };
                    
                return { x: sx, y: sy };
            }
            
            // left side
            if(py < tile_size.r)
            {
                if(px < py * m)
                    return { x: sx - 1, y: sy };
                
                return { x: sx, y: sy - 1 };
            }
        }
        else
        {
            // left edge
            if(px < tile_size.h - py * m)
                return { x: sx - 1, y: sy - 1 };
            
            // right edge
            if(px < -tile_size.h + py * m)
                return { x: sx - 1, y: sy };
                
            // center
            return { x: sx, y: sy };
        }
    }
    
    var tileCoord = getTileInternal(x - this.offset.x, y - this.offset.y);
    
    return this.grid_to_tile(tileCoord.x, tileCoord.y);
}

// Calculate the optimal size for the tiles based on the board width and height
Board.prototype.calculate_tile_dimensions = function(left, top, width, height)
{
    // 0.52358 = PI * 0.16666
    var side_x_ratio = Math.sin(0.52358);
    var side_y_ratio = Math.cos(0.52358);
    
    // Figure out which direction fits best
    var tile_width = width / (this.columns + (side_x_ratio * (this.columns+1)));
    var tile_height = height / (((this.rows*2)+1) * side_y_ratio);
    
    var tile_side = tile_width < tile_height ? tile_width : tile_height;
    
    this.tile_size = {};
    
    this.tile_size.padding = tile_side * Board.tile_padding;
    this.tile_size.s = tile_side; // Length of one side of a hexagon (in pixels)
    this.tile_size.h = side_x_ratio * this.tile_size.s;
    this.tile_size.r = side_y_ratio * this.tile_size.s;
    this.tile_size.b = this.tile_size.h * 2 + this.tile_size.s;
    this.tile_size.a = this.tile_size.r * 2;
    
    var ts = this.tile_size;
    
    // Pre-calculate the coordinates of a tile at (0, 0)
    this.tile_coords = [
        {x: ts.h, y: 0},
        {x: ts.h + ts.s, y: 0},
        {x: ts.b, y: ts.r},
        {x: ts.h + ts.s, y: ts.a},
        {x: ts.h, y: ts.a},
        {x: 0, y: ts.r},
    ];
    
    var boardWidth = (this.columns * (this.tile_size.h + this.tile_size.s)) + this.tile_size.h;
    var boardHeight = (this.rows * this.tile_size.a) + this.tile_size.r;
    
    this.offset = {
        x: ((width - boardWidth) / 2) + left, 
        y: ((height - boardHeight) / 2)  + top,
        width: boardWidth,
        height: boardHeight,
    };
}

Board.prototype.scale_point = function(pt)
{
    var x = (pt.x - this.offset.x) / this.offset.width;
    var y = (pt.y - this.offset.y) / this.offset.height;
    return {x: x, y: y};
}

Board.prototype.unscale_point = function(pt) 
{
    var x = (pt.x * this.offset.width) + this.offset.x;
    var y = (pt.y * this.offset.height) + this.offset.y;
    return {x: x, y: y};
}

Board.prototype.compatible_tile = function(tile, path)
{
    var type_id = this.tiles[tile];
    if(type_id < 0)
        return false;
        
    var tile_type = this.tile_types[type_id];
    if(!tile_type) {
        //console.log('Attempted to match undefined tile type: ' + type_id);
        return false;
    }
    
    // If this is the the first tile in the path and it's non-neutral it's always allowed
    if(path.length == 0 && !tile_type.neutral)
        return true;
    
    if(path.length > 0)
    {
        // Already in the path? Don't add again
        if(path.indexOf(tile) != -1)
            return false;
        
        // Tile must be the same color as the rest of the path or neutral
        var path_type = this.tile_types[this.tiles[path[0]]];
        
        if(tile_type == path_type || tile_type.neutral)
        {
            // And must be adjacent to a tile already in the path
            for(var i in path)
            {
                if(this.tiles_adjacent(tile, path[i]))
                    return true;
            }
        }
    }
    
    return false;
}

// Allows this file to be used client and server side
try {
    exports.Board = Board;
} catch(ex) {
    // Fail silently, only expected to work on the server side.
    //console.log('Board import failed: ' + ex);
}
