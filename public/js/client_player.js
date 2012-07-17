//
// Hexflip Player
// Brandon Jones, 2011
//

var Player = function(id, game) 
{
    this.id = id;
    this.game = game;
    this.name = 'Player ' + this.id;
    this.color = {r: 255, g: 255, b: 255 };
    this.path = [];
    this.trail = [];
    this.score = 0;
    this.ready = false;
}

Player.prototype.sync = function(data, ui)
{
    if(data.name) {
        this.name = data.name;
        ui.update_name(this);    
    }
        
    if(data.hasOwnProperty('score')) {
        this.score = data.score;
        ui.update_score(this, data.change);
    }
    
    if(data.color) {
        this.color = data.color;
        ui.update_color(this);    
    }
    
    if(data.trail) {
        this.trail = data.trail;
    }
    
    if(data.hasOwnProperty('ready')) {
        this.ready = data.ready;
        ui.update_ready(this);    
    }
        
    if(data.path)
        this.path = data.path;
}

Player.prototype.css_color = function()
{
    return 'rgb(' + this.color.r + ',' + this.color.g + ',' + this.color.b + ')';
}

Player.prototype.update_trail = function(pt)
{
    if(this.trail.length == 0) {
        this.trail.push({ x: pt.x, y: pt.y, life: global.trail_life });
        return true;
    }
    
    var pt2 = this.trail[this.trail.length - 1];
    
    // If the point isn't far enough from last one on the line, don't add it
    if(dist(pt, pt2) < 10)
        return false;
        
    this.trail.push({ x: pt.x, y: pt.y, life: global.trail_life });
    
    // Make sure the trail never grows too long
    while(this.trail.length > global.max_trail_length) {
        this.trail.shift();
    }
    
    return true;
}

Player.prototype.fade_trail = function(time)
{
    for(var i = this.trail.length - 1; i >= 0; --i)
    {
        var pt = this.trail[i];
        pt.life -= time;
        if(pt.life <= 0) {
            this.trail.splice(0, i);
            i = 0;
        }
    }
}

