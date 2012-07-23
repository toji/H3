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

var RenderBase = exports.RenderBase = Montage.create(Montage, {
    frameStartCallbacks: {
        value: [],
        distinct: true
    },

    frameEndCallbacks: {
        value: [],
        distinct: true
    },

    game: {
        value: null
    },

    board: {
        value: null
    },

    bindGame: {
        value: function(game) {
            this.game = game;
            this.board = game.board;
        }
    },

    drawTile: {
        value: function(tile) {
            var type = this.board.tiles[tile];
            if(type >= 0)
                this.drawTileEx(false, tile, type, 1, 1);
            else
                this.clearTile(tile);
        }
    },

    startFrame: {
        value: function(frameTime) {
            for(var i = this.frameStartCallbacks.length - 1; i >= 0; --i) {
                var keep = this.frameStartCallbacks[i](frameTime);
                if(!keep) {
                    this.frameStartCallbacks.splice(i, 1);
                }
            }
        }
    },

    endFrame: {
        value: function(frameTime) {
            for(var i = this.frameEndCallbacks.length - 1; i >= 0; --i) {
                var keep = this.frameEndCallbacks[i](frameTime);
                if(!keep) {
                    this.frameEndCallbacks.splice(i, 1);
                }
            }
        }
    },

    clearTiles: {
        value: function(path, lastTile, out) {
            var totalLife = 500;
            var life = totalLife;
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
                
                that.drawTileEx(true, tile, type, 1, 1);
                that.clearTile(tile);
            
                var life = totalLife + parseInt(i, 10) * 5;
                
                that.frameStartCallbacks.push(function(frame_time) {
                    var mod, linearMod;
                    if(out) {
                        //mod = jQuery.easing.easeOutBack(null, totalLife - life, 0, 1, totalLife);
                        linearMod = (totalLife - life) / totalLife;
                        that.drawTileEx(true, tile, type, 1 + (linearMod*0.5), 1-linearMod);
                    } else {
                        //mod = jQuery.easing.easeOutCubic(null, totalLife - life, 0, 1, totalLife);
                        linearMod = (totalLife - life) / totalLife;
                        that.drawTileEx(true, tile, type, 1-linearMod, 1-linearMod);
                    }
                    
                    life -= frame_time;
                    
                    return life > 0;
                });
                
                setTimeout(function() {
                    var adjacent = that.board.getAdjacentTiles(tile);
                    for(var i in adjacent)
                        animate(adjacent[i]);
                }, 50);
            }
            
            animate(lastTile);
        }
    },

    pushTiles: {
        value: function(tiles) {
            var totalLife = 400;
            var that = this;
            
            for(var t in tiles) {
                function animate() {
                    var i = t;
                    var life = totalLife + parseInt(i, 10) * 5;
                    
                    that.frameEndCallbacks.push(function(frame_time) {
                        //var mod = jQuery.easing.easeOutBack(null, Math.max(totalLife - life, 0), 0, 1, totalLife);
                        var linearMod = (totalLife - life) / totalLife;
                    
                        that.drawTileEx(true, i, tiles[i], linearMod, linearMod);
                        
                        life -= frame_time;
                        
                        if(life <= 0) {
                            // Not 100% convinced this should be here, don't care at the moment, though.
                            that.game.setTile(i, tiles[i]);
                        }
                        
                        return life > 0;
                    });
                }
                animate();
            }
        }
    }
});

//
// Canvas Based Renderer
//

var CanvasRenderer = exports.CanvasRenderer = Montage.create(RenderBase, {
    gameboard: {
        value: null
    },

    tileContext: {
        value: null
    },

    effectContext: {
        value: null
    },

    emptyTile: {
        value: null
    },

    init: {
        value: function(gameboard) {
            this.gameboard = gameboard;
            this.tileContext = gameboard.tileLayer.getContext('2d');
            this.effectContext = gameboard.effectLayer.getContext('2d');

            this.emptyTile = new Image();
            this.emptyTile.src = '/img/' + Globals.theme + '/empty.png';

            return this;
        }
    },

    clear: {
        value: function() {
            // clear the entire board
            this.effectContext.clearRect(0, 0, Globals.board.width, Globals.board.height);
        }
    },

    drawTileEx: {
        value: function(effect, tile, type, scale, opacity) {
            var ctx;
            if(effect)
                ctx = this.effectContext;
            else
                ctx = this.tileContext;
            
            if(type < 0 || type >= this.board.tileTypes.length)
                return;
                
            ctx.save();
            
            try {
                var img = this.board.tileTypes[type].image;
                var pt = this.board.tileToPixel(tile);
                var ts = this.board.tileSize;

                var sizeX = (ts.b - ts.padding);
                var sizeY = (ts.a - ts.padding);
                
                var offsetX = pt.x + (ts.padding * 0.5);
                var offsetY = pt.y + (ts.padding * 0.5);
                
                offsetX -= ((sizeX * scale) - sizeX) * 0.5;
                offsetY -= ((sizeY * scale) - sizeY) * 0.5;
                
                ctx.globalAlpha = opacity >= 0 ? opacity : 0;
                ctx.drawImage(img, offsetX, offsetY, sizeX * scale, sizeY * scale);
                
                if(!effect) {
                    this.drawPadding(ctx, pt, ts.padding);
                }
                
            } catch(ex) {
                //console.log('Draw Tile failed: ' + ex);
            }
            
            ctx.restore();
        }
    },

    clearTile: {
        value: function(tile) {
            var pt = this.board.tileToPixel(tile);
            var tc = this.board.tileCoords;
            var ctx = this.tileContext;
            var ts = this.board.tileSize;
            
            this.drawPadding(ctx, pt, ts.padding);
            
            var sizeX = (ts.b - ts.padding);
            var sizeY = (ts.a - ts.padding);
            
            var offsetX = pt.x + (ts.padding * 0.5);
            var offsetY = pt.y + (ts.padding * 0.5);
            
            ctx.globalAlpha = 1;
            ctx.drawImage(this.emptyTile, offsetX, offsetY, sizeX, sizeY);
        }
    },

    drawPadding: {
        value: function(ctx, pt, width) {
            var tc = this.board.tileCoords;
            
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
    },

    // draw a player highlight around a tile (passed by id)
    drawHighlight: {
        value: function(tile, player, ring) {
            var pt = this.board.tileToPixel(tile);
            
            var ctx = this.effectContext;
            var tc = this.board.tileCoords;
            var ts = this.board.tileSize;
            if(!ring)
                ring = 1;
            
            ctx.save();
            
            ctx.translate(pt.x, pt.y);
            
            var scale = 1.0 - (0.2 * (ring-1));
            if(ring != 1) {
                ctx.translate(-ts.b * 0.5 * scale, -ts.a * 0.5 * scale);
                ctx.scale(scale, scale);
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
            
            ctx.strokeStyle = player.cssColor;
            ctx.lineWidth = Globals.highlightWidth * (1/scale);
            ctx.stroke();
            
            ctx.restore();
        }
    },

    drawTrail: {
        value: function(player, lastPt) {
            var ctx = this.effectContext;
            
            if(player.trail.length < 2)
                return;
            
            ctx.save();
            
            var pt = player.trail[0];
            
            ctx.strokeStyle = player.cssColor;
            ctx.lineCap = 'round';
            
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            
            for(var i = 1; i < player.trail.length; ++i) {
                pt = player.trail[i];
                
                var mod = pt.life / Globals.trailLife;
                
                ctx.lineTo(pt.x, pt.y);
                
                //ctx.globalAlpha = pt.life / global.trailLife;
                ctx.lineWidth = Globals.trailWidth * mod;
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(pt.x, pt.y);
            }
            
            if(lastPt) {
                ctx.lineTo(lastPt.x, lastPt.y);
                
                ctx.globalAlpha = 1.0;
                ctx.lineWidth = Globals.trailWidth;
                ctx.stroke();
            }
            
            //ctx.closePath();
            
            ctx.globalAlpha = 1;
            
            ctx.restore();
        }
    },

    // Clears toasts when the transition ends
    // Note: Will be called when the first transition ends, so all transitions need to end around the same time.
    handleWebkitTransitionEnd: {
        value: function(event) {
            var parentElement = event.target.parentElement;
            if(parentElement) {
                parentElement.removeChild(event.target);
            }
        }
    },

    addToast: {
        value: function(x, y, text, toastClass) {
            var toastElement = document.createElement("div");
            toastElement.classList.add("toast");

            toastElement.appendChild(document.createTextNode(text));
            toastElement.style.left = x + "px";
            toastElement.style.top = y + "px";

            toastElement.addEventListener("webkitTransitionEnd", this, false);
            
            this.gameboard._element.appendChild(toastElement);

            if(toastClass) {
                setTimeout(function() {
                    toastElement.classList.add(toastClass);
                }, 10);
                
            }
        }
    },

    drawText: {
        value: function(text, x, y, opacity) {
            var ctx = this.effectContext;
            ctx.font = 'bold 24px sans-serif';
            ctx.fillStyle = '#000';
            ctx.globalAlpha = opacity;
            ctx.fillText(text, x, y);
            ctx.globalAlpha = 1.0;
        }
    },

    drawClock: {
        value: function(timeLeft) {
            var ctx = this.effectContext;
            ctx.font = 'bold 28px sans-serif';
            ctx.fillStyle = '#FFF';
            ctx.fillText(time_left, (Globals.board.width*0.5)+2, 38);
            
            ctx.drawImage(this.clockImg, (Globals.board.width*0.5)-34, 10, 32, 32);
        }
    }
});
