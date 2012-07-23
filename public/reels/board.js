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
    Globals = require("reels/globals").Globals;

// Tile definition
var TileType = function(imagePath, multiplier, frequency, neutral) {
    this.imagePath = imagePath;
    this.multiplier = multiplier ? multiplier : 1.0;
    this.frequency = frequency ? frequency : 1.0;
    this.neutral = neutral ? neutral : false;
    this.image = null;
};

exports.Board = Montage.create(Montage, {
    columns: {
        value: 8
    },

    rows: {
        value: 9
    },

    boardSize: {
        value: 0
    },

    tilePadding: {
        value: 0.075
    },

    tileSize: {
        value: null
    },

    tiles: {
        value: [],
        distinct: true
    },

    offset: {
        value: null
    },

    tileTypes: {
        value: [
            new TileType('red.png'),
            new TileType('green.png'),
            new TileType('blue.png'),
            new TileType('teal.png'),
            new TileType('mult2x.png', 2.0, 0.05, true)
        ]
    },

    init: {
        value: function(left, top, width, height, theme) {
            this.boardSize = this.rows * this.columns;

            this.calculateTileDimensions(left, top, width, height);
            this.initializeTileTypes(theme);
            // Omitted server-side only stuff

            return this;
        }
    },

    dataObject: {
        value: function() {
            return {
                tiles: this.tiles
            };
        }
    },

    sync: {
        value: function(data) {
            this.tiles = data.tiles;
        }
    },

    initializeTileTypes: {
        value: function(theme) {
            for(var i in this.tileTypes) {
                this.tileTypes[i].image = new Image();
                this.tileTypes[i].image.src = '/img/' + theme + '/' + this.tileTypes[i].imagePath;
            }
        }
    },

    getAdjacentTiles: {
        value: function(a) {
            var adjacent = [];
            var boardSize = this.rows * this.columns;
            
            if(a < 0 || a >= boardSize)
                return null;
                
            var row = a % this.rows;
            var column = Math.floor(a / this.rows);
            var oddColumn = Math.floor(a / this.rows) % 2;
            var columnOffset = oddColumn ? 0 : -1;
            
            // Tile above the current one
            if(row !== 0)
                adjacent.push(a-1);
                
            if(row < this.rows - 1)
                adjacent.push(a+1);
                
            if(column !== 0) {
                var upperLeft = a - this.rows + columnOffset;
                if(oddColumn || row !== 0)
                    adjacent.push(upperLeft);
                if(!oddColumn || row < this.rows - 1)
                    adjacent.push(upperLeft + 1);
            }
                    
            if(column < this.columns - 1) {
                var upperRight = a + this.rows + columnOffset;
                if(oddColumn || row !== 0)
                    adjacent.push(upperRight);
                if(!oddColumn || row < this.rows - 1)
                    adjacent.push(upperRight + 1);
            }
            
            return adjacent;
        }
    },

    tilesAdjacent: {
        value: function(a, b) {
            // a is below b?
            if((a - 1) == b && a % this.rows !== 0)
                return true;
                
            // a is above b?
            if((a + 1) == b && a % this.rows != this.rows - 1)
                return true;
            
            // a is one column to the left or right of b?
            if(Math.abs(a - b) == this.rows)
                return true;
            
            // odd or even column?
            var oddColumn = Math.floor(a / this.rows) % 2;
            if(!oddColumn) {
                if((a - (this.rows + 1)) == b)
                    return true;
                
                if((a + (this.rows - 1)) == b)
                    return true;
            } else {
                if((a - (this.rows - 1)) == b)
                    return true;
                
                if((a + (this.rows + 1)) == b)
                    return true;
            }
            
            return false;
        }
    },

    // Thank you to http://www.gamedev.net/reference/articles/article1800.asp
    // for providing some of the basic formulas used here!

    // Translates a tile id to it's associated x/y position in the grid.
    // (Coordinates are in tiles, not pixels)
    tileToGrid: {
        value: function(id) {
            var x = Math.floor(id / this.rows);
            return { x: x, y: id - (x * this.rows) };
        }
    },

    // Translates a grid coordinate into a tile id
    gridToTile: {
        value: function(x, y) {
            if(x < 0 || x >= this.columns || y < 0 || y >= this.rows) { return -1; }
            return (x * this.rows + y);
        }
    },

    // Returns the upper left corner of the tile's bounding box
    // Note: The tile will not contain this point!
    tileToPixel: {
        value: function(tile) {
            var grid = this.tileToGrid(tile);
    
            var pt = {
                x: grid.x * (this.tileSize.h + this.tileSize.s) + this.offset.x,
                y: grid.y * (2 * this.tileSize.r) + this.offset.y
            };
            
            if(grid.x % 2)
                pt.y += this.tileSize.r;
                
            return pt;
        }
    },

    // Does a hit test on the tiles to determine which (if any) contain the given point
    pixelToTile: {
        value: function(x, y) {
            var tileSize = this.tileSize;

            // TODO: Yuck!
            function getTileInternal(x, y) {
                var sx = Math.floor(x / (tileSize.h + tileSize.s));
                var sy = Math.floor(y / (2 * tileSize.r));

                var px = x % (tileSize.h + tileSize.s);
                var py = y % (2 * tileSize.r);

                var sa = sx % 2;
                
                var m = tileSize.h / tileSize.r;
                
                if(sa) {
                    if(py >= tileSize.r) {
                        if(px < (2 * tileSize.h - py * m))
                            return { x: sx - 1, y: sy };
                            
                        return { x: sx, y: sy };
                    }
                    
                    // left side
                    if(py < tileSize.r) {
                        if(px < py * m)
                            return { x: sx - 1, y: sy };
                        
                        return { x: sx, y: sy - 1 };
                    }
                } else {
                    // left edge
                    if(px < tileSize.h - py * m)
                        return { x: sx - 1, y: sy - 1 };
                    
                    // right edge
                    if(px < -tileSize.h + py * m)
                        return { x: sx - 1, y: sy };
                        
                    // center
                    return { x: sx, y: sy };
                }
            }
            
            var tileCoord = getTileInternal(x - this.offset.x, y - this.offset.y);
            
            return this.gridToTile(tileCoord.x, tileCoord.y);
        }
    },

    // Calculate the optimal size for the tiles based on the board width and height
    calculateTileDimensions: {
        value: function(left, top, width, height) {
            // 0.52358 = PI * 0.16666
            var sideXRatio = Math.sin(0.52358);
            var sideYRatio = Math.cos(0.52358);
            
            // Figure out which direction fits best
            var tileWidth = width / (this.columns + (sideXRatio * (this.columns+1)));
            var tileHeight = height / (((this.rows*2)+1) * sideYRatio);
            
            var tileSide = tileWidth < tileHeight ? tileWidth : tileHeight;
            
            this.tileSize = {};
            
            this.tileSize.padding = tileSide * this.tilePadding;
            this.tileSize.s = tileSide; // Length of one side of a hexagon (in pixels)
            this.tileSize.h = sideXRatio * this.tileSize.s;
            this.tileSize.r = sideYRatio * this.tileSize.s;
            this.tileSize.b = this.tileSize.h * 2 + this.tileSize.s;
            this.tileSize.a = this.tileSize.r * 2;
            
            var ts = this.tileSize;
            
            // Pre-calculate the coordinates of a tile at (0, 0)
            this.tileCoords = [
                {x: ts.h, y: 0},
                {x: ts.h + ts.s, y: 0},
                {x: ts.b, y: ts.r},
                {x: ts.h + ts.s, y: ts.a},
                {x: ts.h, y: ts.a},
                {x: 0, y: ts.r}
            ];
            
            var boardWidth = (this.columns * (this.tileSize.h + this.tileSize.s)) + this.tileSize.h;
            var boardHeight = (this.rows * this.tileSize.a) + this.tileSize.r;
            
            this.offset = {
                x: ((width - boardWidth) / 2) + left,
                y: ((height - boardHeight) / 2)  + top,
                width: boardWidth,
                height: boardHeight
            };
        }
    },

    scalePoint: {
        value: function(pt) {
            var x = (pt.x - this.offset.x) / this.offset.width;
            var y = (pt.y - this.offset.y) / this.offset.height;
            return {x: x, y: y};
        }
    },

    unscalePoint: {
        value: function(pt) {
            var x = (pt.x * this.offset.width) + this.offset.x;
            var y = (pt.y * this.offset.height) + this.offset.y;
            return {x: x, y: y};
        }
    },

    compatibleTile: {
        value: function(tile, path) {
            var typeId = this.tiles[tile];
            if(typeId < 0)
                return false;
                
            var tileType = this.tileTypes[typeId];
            if(!tileType) {
                return false;
            }
            
            // If this is the the first tile in the path and it's non-neutral it's always allowed
            if(path.length === 0 && !tileType.neutral)
                return true;
            
            if(path.length > 0) {
                // Already in the path? Don't add again
                if(path.indexOf(tile) != -1)
                    return false;
                
                // Tile must be the same color as the rest of the path or neutral
                var pathType = this.tileTypes[this.tiles[path[0]]];
                
                if(tileType == pathType || tileType.neutral) {
                    // And must be adjacent to a tile already in the path
                    for(var i in path) {
                        if(this.tilesAdjacent(tile, path[i]))
                            return true;
                    }
                }
            }
            
            return false;
        }
    }
});
