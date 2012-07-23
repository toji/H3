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
    Converter = require("montage/core/converter/converter").Converter;

exports.Main = Montage.create(Component, {
    content: {
        value: null
    },

    gameState: {
        value: null
    },

    templateDidLoad: {
        value: function() {
            this.gameState = GameState.create().init();
        }
    },

    fadeOut: {
        value: false
    },

    _pendingStage: {
        value: "lobby"
    },

    pendingStage: {
        get: function() {
            return this._pendingStage;
        },
        set: function(value) {
            if(this._currentStage != value) {
                this._pendingStage = value;
                this.fadeOut = true;
                this.needsDraw = true;
            }
            
        }
    },

    currentStage: {
        value: "lobby"
    },

    // Triggers when the scene is done fading out
    handleWebkitTransitionEnd: {
        value: function(event) {
            if(this.fadeOut) {
                this.fadeOut = false;
                this.currentStage = this._pendingStage;
                this.needsDraw = true;
            }
        }
    },

    prepareForDraw: {
        value: function() {
            this.content._element.addEventListener("webkitTransitionEnd", this, false);
        }
    },

    draw: {
        value: function() {
            if(this.fadeOut) {
                this.content._element.classList.add("fade");
            } else {
                this.content._element.classList.remove("fade");
            }
        }
    }
});
