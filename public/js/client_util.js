//
// Hexflip Utilities
// Brandon Jones, 2011
//

var global = {
    board: { width: 480, height: 640, background: '#BBB' },
    highlight_width: 4,
    trail_width: 16,
    max_trail_length: 20,
    trail_life: 250,
    tile_size: 16,
    theme: 'emboss'
};

function dist(pt0, pt1) 
{
    var dx = (pt1.x - pt0.x);
    var dy = (pt1.y - pt0.y);
    return Math.sqrt((dx * dx) + (dy * dy));
}

/*function turns(pt0, pt1, pt2) 
{
    var cross = (pt1.x-pt0.x)*(pt2.y-pt0.y) - (pt2.x-pt0.x)*(pt1.x-pt0.y);
    return ((cross>0.0) ? 1 : ((cross==0.0) ? 0 : -1));
}

Game.prototype.get_tile_corner = function(pt, corner) {
    var ts = this.tile_size;
    
    switch(corner) {
        case 0: return {x: pt.x+ts.h, y: pt.y};
        case 1: return {x: pt.x+ts.h+ts.s, y: pt.y};
        case 2: return {x: pt.x+ts.b, y: pt.y+ts.r};
        case 3: return {x: pt.x+ts.h+ts.s, y: pt.y+ts.a};
        case 4: return {x: pt.x+ts.h, y: pt.y+ts.a};
        case 5: return {x: pt.x, y: pt.y+ts.r};
        default: return null; 
    }
}

Game.prototype.line_intersects_tile = function(tile, pt0, pt1) {
    var pt = this.tile_to_pixel(tile);

    // first see if it intersects the infinite line
    var side1 = turns(pt0, pt1, this.get_tile_corner(pt, 0));
    if (side1==0) return 1;
    
    for (var i=1; i<6; ++i) {
        j = turns(pt0, pt1, this.get_tile_corner(pt, i));
        if (j==0 || j!=side1) return 1;
    }
    return 0;
}

// Thank you to http://www.gamedev.net/reference/articles/article1800.asp 
// for providing some of the basic formulas used here!

// Translates a tile id to it's associated x/y position in the grid.
// (Coordinates are in tiles, not pixels)
Game.prototype.tile_to_grid = function(id)
{
    var x = Math.floor(id / this.rows);
    return { x: x, y: id - (x * this.rows) };
}

// Translates a grid coordinate into a tile id
Game.prototype.grid_to_tile = function(x, y)
{
    if(x < 0 || x >= this.columns || y < 0 || y >= this.rows) { return -1; }
    
    return (x * this.rows + y);
}

// Returns the upper left corner of the tile's bounding box
// Note: The tile will not contain this point!
Game.prototype.tile_to_pixel = function(tile) 
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
Game.prototype.pixel_to_tile = function(x, y) 
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

// Tests two tiles (by id) to see if they are adjacent
Game.prototype.tiles_adjacent = function(a, b) 
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
    oddColumn = Math.floor(a / this.rows) % 2;
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
}*/

