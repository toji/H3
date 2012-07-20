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

    chatInput: {
        value: null
    },

    chatForm: {
        value: null
    },

    templateDidLoad: {
        value: function() {
            this.chatForm.addEventListener("submit", this, false);
        }
    },

    handleReadyAction: {
        value: function(event) {
            this.gameState.sendMessage('sync_player', { ready: this.gameState.localPlayer.ready });
        }
    },

    handleSubmit: {
        value: function(event) {
            this.gameState.sendMessage('chat', this.chatInput.value);
            this.chatInput.value = "";
            event.preventDefault();
            return false;
        }
    },
    
    draw: {
        value: function() {
            
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
