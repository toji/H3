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

exports.Player = Montage.create(Montage, {
    id: {
        value: 0
    },

    game: {
        value: null
    },

    name: {
        value: null
    },

    color: {
        value: {r: 255, g: 255, b: 255 }
    },

    cssColor: {
        get: function() {
            return 'rgb(' + this.color.r + ',' + this.color.g + ',' + this.color.b + ')';
        }
    },

    path: {
        value: [],
        distinct: true
    },

    trail: {
        value: [],
        distinct: true
    },

    score: {
        value: 0
    },

    ready: {
        value: false
    },

    init: {
        value: function(id, game) {
            this.id = id;
            this.game = game;
            this.name = 'Player ' + this.id;
            return this;
        }
    },

    sync: {
        value: function(data) {
            if(data.name) {
                this.name = data.name;
            }
                
            if(data.hasOwnProperty('score')) {
                this.score = data.score;
            }
            
            if(data.color) {
                this.color = data.color;
            }
            
            if(data.trail) {
                this.trail = data.trail;
            }
            
            if(data.hasOwnProperty('ready')) {
                this.ready = data.ready;
            }
                
            if(data.path) {
                this.path = data.path;
            }
        }
    },

    updateTrail: {
        value: function(pt) {
            if(this.trail.length === 0) {
                this.trail.push({ x: pt.x, y: pt.y, life: Globals.trail_life });
                return true;
            }
            
            var pt2 = this.trail[this.trail.length - 1];
            
            // If the point isn't far enough from last one on the line, don't add it
            if(dist(pt, pt2) < 10)
                return false;
                
            this.trail.push({ x: pt.x, y: pt.y, life: Globals.trail_life });
            
            // Make sure the trail never grows too long
            while(this.trail.length > Globals.max_trail_length) {
                this.trail.shift();
            }
            
            return true;
        }
    },

    fadeTrail: {
        value: function(time) {
            for(var i = this.trail.length - 1; i >= 0; --i) {
                var pt = this.trail[i];
                pt.life -= time;
                if(pt.life <= 0) {
                    this.trail.splice(0, i);
                    i = 0;
                }
            }
        }
    }
});

