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
    Component = require("montage/ui/component").Component,
    GameState = require("reels/game-state").GameState,
    CanvasRenderer = require("reels/render").CanvasRenderer;

exports.Gameboard = Montage.create(Component, {
    tileLayer: {
        value: null
    },

    effectLayer: {
        value: null
    },

    gameState: {
        value: null
    },

    renderer: {
        value: null
    },

    templateDidLoad: {
        value: function() {
            this.renderer = CanvasRenderer.create().init(this.tileLayer, this.effectLayer);
            this.gameState = GameState.create().init(this.renderer);

            this.gameState.addEventListener("startRound", this, false);
            this.gameState.addEventListener("endRound", this, false);
        }
    },

    handleStartRound: {
        value: function() {
            this._lastFrameTime = Date.now();
            this.needsDraw = true;
        }
    },

    handleEndRound: {
        value: function() {
            
        }
    },

    _lastFrameTime: {
        value: null
    },

    draw: {
        value: function() {
            if(!this.gameState.roundStarted) { return; }

            var newFrameTime = Date.now();
            this.gameState.onFrame(newFrameTime - this._lastFrameTime);
            this._lastFrameTime = newFrameTime;

            this.needsDraw = true; // Schedule the next draw
        }
    }
});
