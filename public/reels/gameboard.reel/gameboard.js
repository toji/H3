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
    Globals = require("reels/globals").Globals,
    CanvasRenderer = require("reels/render").CanvasRenderer;

exports.Gameboard = Montage.create(Component, {
    tileLayer: {
        value: null
    },

    effectLayer: {
        value: null
    },

    renderer: {
        value: null
    },

    gameState: {
        value: null
    },

    inputActive: {
        value: false
    },

    message: {
        value: null
    },

    messageText: {
        value: null
    },

    templateDidLoad: {
        value: function() {
            this.gameState.addEventListener("startCountdown", this, false);
            this.gameState.addEventListener("startRound", this, false);
            this.gameState.addEventListener("endRound", this, false);
        }
    },

    handleStartCountdown: {
        value: function() {
            var self = this;
            this.gameState.redrawAll();
            this.needsDraw = true;
            this.pushMessage("3", 1000, function() {
                self.pushMessage("2", 1000, function() {
                    self.pushMessage("1", 1000);
                });
            });
        }
    },

    handleStartRound: {
        value: function() {
            var self = this;
            this.pushMessage("Go!", 500);
            this._lastFrameTime = this.timeStarted;
            this.needsDraw = true;
        }
    },

    handleEndRound: {
        value: function() {
            var self = this;
            this.pushMessage("Stop!", 2000, function() {
                self.gameState.currentStage = "awards";
            });
        }
    },

    _showingMessage: {
        value: false
    },

    pushMessage: {
        value: function(text, timeout, callback) {
            var self = this;
            this.messageText = text;
            this._showingMessage = true;
            this.needsDraw = true;
            setTimeout(function() {
                self._showingMessage = false;
                self.needsDraw = true;
                if(callback) {
                    callback();
                }
            }, timeout);
        }
    },

    handleMousedown: {
        value: function(event) {
            this.inputActive = true;
            this.handleMousemove(event, true);
            return false;
        }
    },

    handleMousemove: {
        value: function(event, first) {
            if(this.inputActive) {
                var target = event.target;
                var x = event.pageX - this._element.offsetLeft;
                var y = event.pageY - this._element.offsetTop;
                
                this.gameState.addPoint(x, y, first);
                return false;
            }
        }
    },

    handleMouseup: {
        value: function() {
            if(this.inputActive) {
                this.inputActive = false;
                this.gameState.finishPath();
                return false;
            }
        }
    },

    handleTouchstart: {
        value: function(event) {
            this.inputActive = true;
            this.handleTouchmove(event, true);
            return false;
        }
    },

    handleTouchmove: {
        value: function(event, first) {
            if(this.inputActive) {
                var target = event.target;
                var x = event.touches[0].pageX - this._element.offsetLeft;
                var y = event.touches[0].pageY - this._element.offsetTop;
                
                this.gameState.addPoint(x * window.devicePixelRatio, y * window.devicePixelRatio, first);

                event.preventDefault();
                return false;
            }
        }
    },

    handleTouchend: {
        value: function() {
            if(this.inputActive) {
                this.inputActive = false;
                this.gameState.finishPath();
                return false;
            }
        }
    },

    handleResize: {
        value: function() {
            this.tileLayer.width = this.tileLayer.offsetWidth * window.devicePixelRatio;
            this.tileLayer.height = this.tileLayer.offsetHeight * window.devicePixelRatio;

            this.effectLayer.width = this.effectLayer.offsetWidth * window.devicePixelRatio;
            this.effectLayer.height = this.effectLayer.offsetHeight * window.devicePixelRatio;

            this.gameState.resize(this.tileLayer.width, this.tileLayer.height);
        }
    },

    addCanvas: {
        value: function(name) {
            //return document.getElementById(name);

            var canvasEl = document.createElement("canvas");
            canvasEl.classList.add(name);
            this._element.appendChild(canvasEl);
            return canvasEl;
        }
    },

    prepareForDraw: {
        value: function() {
            this.tileLayer = this.addCanvas("tileLayer");
            this.effectLayer = this.addCanvas("effectLayer");

            this.renderer = CanvasRenderer.create().init(this);
            this.gameState.render = this.renderer;

            this.handleResize();
            // Listen to window resize here?
            window.addEventListener("resize", this, false);

            this.effectLayer.addEventListener("mousedown", this, false);
            this.effectLayer.addEventListener("mousemove", this, false);
            document.addEventListener("mouseup", this, false);

            this.effectLayer.addEventListener("touchstart", this, false);
            this.effectLayer.addEventListener("touchmove", this, false);
            document.addEventListener("touchend", this, false);

            this.handleStartCountdown();
        }
    },

    _lastFrameTime: {
        value: null
    },

    draw: {
        value: function() {
            if(this._showingMessage) {
                this.message.classList.add("show");
            } else {
                this.message.classList.remove("show");
            }

            var newFrameTime = Date.now();
            this.gameState.onFrame(newFrameTime, newFrameTime - this._lastFrameTime);
            this._lastFrameTime = newFrameTime;

            if(!this.gameState.roundStarted) { return; }

            this.needsDraw = true; // Schedule the next draw
        }
    }
});
