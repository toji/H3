//
// Hexflip UI
// Brandon Jones, 2011
//

var UiHandler = function() 
{
    var that = this;
    this.mouse_pressed = false;
    this.name_synced = false;
    this.timerInterval = null;
    
    // Initialize the Canvas
    this.gameboard = $('#gameboard').get(0);
    
    this.tileLayer = $('#tileLayer').get(0);
    this.tileLayer.width = global.board.width;
    this.tileLayer.height = global.board.height;
    
    this.effectLayer = $('#effectLayer').get(0);
    this.effectLayer.width = global.board.width;
    this.effectLayer.height = global.board.height;
    
    this.effectLayer.onmousedown = function(event) { that.on_mouse_down(event); return false; }
    this.effectLayer.onmousemove = function(event) { that.on_mouse_move(event, false); return false; }
    document.onmouseup = function(event) { that.on_input_end(); return false; }

    this.effectLayer.ontouchstart = function(event) { that.on_touch_down(event); return false; }
    this.effectLayer.ontouchmove = function(event) { that.on_touch_move(event, false); return false; } 
    document.ontouchend = function(event) { that.on_input_end(); return false; }
    
    this.effectLayer.addEventListener( 'MozTouchDown', function(event) { 
        that.on_mouse_down(event); return false; 
    }, false );
    
    this.effectLayer.addEventListener( 'MozTouchMove', function(event) { 
        that.on_mouse_move(event, false); return false; 
    }, false );
    
    document.addEventListener( 'MozTouchUp', function(event) { 
        that.on_input_end(); return false; 
    }, false );
    
    // Initialize other UI elements
    $('#readyButton').click(function(e) {
        that.toggle_ready();
    });
    $('#resultsButton').click(function(e) {
        that.results_done();
    });
    
    $('#chatInput').keydown(function(e) {
        if(e.keyCode == '13') {
            that.send_chat();
        }
    });
    $('#chatSubmit').click(function(e) { that.send_chat(); });
    
    $('#playerName').keyup(function(e) { that.change_name(); });
    
    $('.colorOption').click(function(e) { that.change_color(e.target); });
}

UiHandler.prototype.bind_game = function(game)
{
    this.game = game;
}

UiHandler.prototype.on_connected = function()
{
    // Try to restore the player name from the last round
    var playerName = jQuery.cookie('player_name');
    if(playerName != null) {
        $('#playerName').val(playerName);
        this.name_synced = true;
        this.game.send_message('sync_player', { 
            name: playerName
        } );
    }
}

UiHandler.prototype.on_mouse_down = function(event)
{
    this.mouse_pressed = true;
    
    this.on_mouse_move(event, true);
}

UiHandler.prototype.on_mouse_move = function(event, first)
{
    if(!this.mouse_pressed)
        return;
    
    var target = event.target;
    var x = event.pageX - this.gameboard.offsetLeft;
    var y = event.pageY - this.gameboard.offsetTop;
    
    this.game.add_point(x, y, first);
}

UiHandler.prototype.on_input_end = function(event)
{
    if(this.mouse_pressed)
    {
        this.mouse_pressed = false;
        
        this.game.finish_path();
    }
}

UiHandler.prototype.on_touch_down = function(event)
{
    this.mouse_pressed = true;
    
    this.on_touch_move(event, true);
}

UiHandler.prototype.on_touch_move = function(event, first)
{
    if(!this.mouse_pressed)
        return;
    
    var target = event.target;
    var x = event.touches.item(0).pageX - this.gameboard.offsetLeft;
    var y = event.touches.item(0).pageY - this.gameboard.offsetTop;
    
    this.game.add_point(x, y, first);
}

UiHandler.prototype.toggle_ready = function()
{
    var button = $('#readyButton');
    var ready = true;
    
    if(button.hasClass('ready')) {
        ready = false;
        button.removeClass('ready');
        button.text('Ready?');
    } else {
        button.addClass('ready');
        button.text('Ready!');
    }
    
    this.game.send_message('sync_player', { ready: ready });
}

UiHandler.prototype.send_chat = function()
{   
    var msg = $('#chatInput').val();
    
    if(msg) {
        this.game.send_message('chat', msg);
        $('#chatInput').val('');
    }
}

UiHandler.prototype.on_chat = function(player, text)
{
    if(player) {
        $('#chatLog').append('<b class="playerName_' + player.id + '">' + player.name  + '</b>: ' + text + '<br/>');
    } else {
        // If no player the chat is directly from the game
        $('#chatLog').append('<i>' + text + '</i><br/>');
    }
    $('#chatLog').animate({ scrollTop: $('#chatLog').attr('scrollHeight') }, 250);
}

UiHandler.prototype.add_player = function(player)
{
    var playerScore = '<div class="playerScore" id="player_' + player.id + '" style="display: none;">';
    
    playerScore += '<div class="color playerColor_' + player.id + '" style="background-color: ' + player.css_color() + '"></div>';
    playerScore += '<span class="name playerName_' + player.id + '">' + player.name  + '</span>';
    playerScore += '<span class="score playerScore_' + player.id + '">' + player.score  + '</span>';
    
    playerScore += '</div>';
    
    var playerNode = $(playerScore);

    $('#playerList').append(playerNode);
    
    playerNode.slideDown();
}

UiHandler.prototype.remove_player = function(player)
{
    $('#player_' + player.id).slideUp('normal', function() {
        $('#player_' + player.id).remove();
    });
}

UiHandler.prototype.change_name = function()
{   
    var newName = $('#playerName').val();
    
    if(this.game.local_player.name != newName) {
        jQuery.cookie("player_name", newName);
    
        this.game.local_player.name = newName;
        this.update_name(this.game.local_player);
        
        this.game.send_message('sync_player', { 
            name: this.game.local_player.name 
        } );
    }
}

UiHandler.prototype.change_color = function(color_div)
{   
    $('.colorOption').removeClass('checked');
    
    var css_color = $(color_div).css('backgroundColor');
    var rgb = css_color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    var color = {r: rgb[1], g: rgb[2], b: rgb[3]};
    
    $(color_div).addClass('checked');
    
    if(this.game.local_player.color != color) {
        this.game.local_player.color = color;
        this.update_color(this.game.local_player);
        
        this.game.send_message('sync_player', { 
            color: color,
        } );
    }
}

UiHandler.prototype.update_name = function(player)
{   
    if(this.game.local_player_id == player.id) {
        if(!this.name_synced) {
            this.name_synced = true;
            $('#playerName').val(player.name);
        }
        $('#localScore .player').text(player.name);
    }
    $('.playerName_' + player.id).text(player.name);
}

UiHandler.prototype.update_score = function(player, change)
{   
    $('.playerScore_' + player.id).text(player.score);
    
    if(change) {
        /*var scoreToast = $('<div class="toast">+' + change + '</div>');
        $('#player_' + player.id).append(scoreToast);
        
        var total_life = 1000;
        var life = total_life;
        
        var interval = setInterval(function() {
            life -= 33;
            
            var mod = jQuery.easing.easeOutSine(null, total_life - life, 0, 1, total_life);
            
            scoreToast.css({opacity: 1.0 - mod, marginRight: (100*mod) + 'px'});
            
            if(life <= 0) {
                scoreToast.remove();
                clearInterval(interval);
            }
        }, 33);*/
        
        if(player == this.game.local_player) {
            $('#localScore .score').text(player.score);
            this.game.render.add_toast(this.game.last_mouse_pt, '+' + change);   
        }
    }
}

UiHandler.prototype.update_color = function(player)
{   
    $('.playerColor_' + player.id).css({ backgroundColor: player.css_color() });
}

UiHandler.prototype.update_ready = function(player)
{   
    if(player.ready) {
        $('.playerColor_' + player.id).addClass('checked');
    } else {
        $('.playerColor_' + player.id).removeClass('checked');
    }
}

UiHandler.prototype.start_round = function(time_limit)
{
    var that = this;
    $('#chatLog').append('<hr/>');
    $('#playerSetup').fadeOut('normal', function() {
        $('#gameboard').fadeIn('normal');
        for(var i in that.game.board.tiles) 
            that.game.render.draw_tile(i);
    });
    
    var start_time = new Date().getTime();
    var time_left = time_limit;
    $('#timer').text(time_left);
    
    // Time will fire a few times a second, and measure actual time elapsed.
    this.timerInterval = setInterval(function() {
        time_left = time_limit - Math.floor((new Date().getTime() - start_time) / 1000);
        $('#timer').text(time_left);
        
        if(time_left <= 0) {
            clearInterval(that.timerInterval);
        }
    }, 250);
    
    $('#localScore .score').text('0');   
}

UiHandler.prototype.end_round = function(stats)
{
    if(this.timerInterval) {
        clearInterval(this.timerInterval);
    }
    
    this.fill_stats(stats);
    $('#gameboard').fadeOut('normal', function() {
        $('#results').fadeIn('normal');
    });
}

UiHandler.prototype.results_done = function()
{
    var button = $('#readyButton');
    button.removeClass('ready');
    button.text('Ready?');
    $('#results').fadeOut('normal', function() {
        $('#playerSetup').fadeIn('normal');
    });
}

UiHandler.prototype.fill_stats = function(stats)
{
    $('#winnerName').text(stats.winner.name);
    $('#winnerScore').text(stats.winner.score);
    
    $('#awards').empty();
    
    for(var i in stats.awards)
    {
        this.build_award(stats.awards[i]);
    }
}

UiHandler.prototype.build_award = function(award)
{
    var awardHtml = '<li>';
    
    awardHtml += '<h3>' + award.name + '</h3>';
	awardHtml += '<div>';
	awardHtml += ' <span class="awardWinner">' + award.player + '</span>'; 
	awardHtml += ' <span class="description">' + award.description + '</span>';
	awardHtml += '</div>';
    
    awardHtml += '</li>';

    $('#awards').append(awardHtml);
}

