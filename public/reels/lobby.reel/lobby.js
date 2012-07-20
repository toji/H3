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
    Converter = require("montage/core/converter/converter").Converter;

exports.Lobby = Montage.create(Component, {
    gameState: {
        value: null
    },

    // TODO: Examine why I can't use chatInput directly
    chatValue: {
        value: ""
    },

    chatForm: {
        value: null
    },

    templateDidLoad: {
        value: function() {
            this.chatForm.addEventListener("submit", this, false);
            this.gameState.addEventListener("startRound", this, false);
            this.gameState.addEventListener("endRound", this, false);
        }
    },

    handleStartRound: {
        value: function() {
            this.gameState.currentStage = "gameboard";
        }
    },

    handleReadyAction: {
        value: function(event) {
            this.gameState.sendMessage("sync_player", { ready: this.gameState.localPlayer.ready });
        }
    },

    handleAwardsAction: {
        value: function(event) {
            this.gameState.currentStage = "awards";
        }
    },

    // Submission of chat messages
    handleSubmit: {
        value: function(event) {
            this.gameState.sendMessage('chat', this.chatValue);
            this.chatValue = "";
            event.preventDefault();
            return false;
        }
    },

    _localPlayerColor: {
        value: {r: 255, g: 255, b: 255}
    },

    localPlayerColor: {
        get: function() {
            return this._localPlayerColor;
        },
        set: function(value) {
            if(!value) { return; }
            if(value.r != this._localPlayerColor.r ||
               value.g != this._localPlayerColor.g ||
               value.b != this._localPlayerColor.b) {
                this._localPlayerColor = value;
                this.gameState.sendMessage('sync_player', { color: value } );
            }
        }
    },

    draw: {
        value: function() {
            // TODO: Aw HELL Naw!
            if(!this.gameState.localPlayer.ready) {
                this.gameState.localPlayer.ready = true;
                this.gameState.localPlayer.ready = false;
            }
        }
    }
});

exports.GameUrlConverter = Montage.create(Converter, {
    convert: {
        value: function(value) {
            return "http://h3.jit.su/game/" + value;
        }
    }
});
