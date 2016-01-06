var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var players = [];
var playersOnline = [];
var autoMatch1 = [];


server.listen(8081, function(){
	console.log("Server is now running...");
});

io.on('connection', function(socket){
	console.log("Player connected!");
	
	socket.on('inlogin', function() {
		socket.emit('inlogin');
	});

	socket.on('loginattempt', function(data) {
		data.id = socket.id;
		data.num = playersOnline.length;
		socket.emit('loginsuccess', data);
		playersOnline.push(new loggedInUser(socket.id, data.usr));
		console.log(data.usr + " has joined the lobby");
	});

	socket.on('disconnect', function() {
			console.log("User disconnected from lobby");
			for(var i = 0; i < playersOnline.length; i++) {
				if(playersOnline[i].id == socket.id) {
					playersOnline.splice(i,1);
				}
			}
		});

	socket.on('automatch1', function(data) {
		
		for(var i = 0; i < playersOnline; i++) {
			if(playersOnline[i].id == socket.id) {
				automatch1.push(playersOnline[i]);
			}
		}
		// add to array
		autoMatch1.push()
		// check if array if big enough.
		// drop 2 off and add them to a new match array
		// send confirmation of new match as well id of match etc
	});

	socket.on('gamestarted', function(gamedata) {
		socket.emit('gamestarted');
		socket.emit('socketID', { id: socket.id });
		socket.emit('getPlayers', players);
		socket.broadcast.emit('newPlayer', { id: socket.id});
		socket.on('playerMoved', function(data){
			data.id = socket.id;
			socket.broadcast.emit('playerMoved', data);
			for(var i = 0; i < players.length; i++) {
				if(players[i].id == data.id) {
					players[i].x = data.x;
					players[i].y = data.y;
					players[i].r = data.r;
				}
			}
		});
		socket.on('newselect', function(data) {
			data.id = socket.id;
			socket.broadcast.emit('newselect', data);
			for(var i = 0; i < players.length; i++) {
				if(players[i].id == data.id) {
					players[i].target = data.selectid;
				}
			}
		});
		socket.on('deselect', function(data) {
			data.id = socket.id;
			socket.broadcast.emit('deselect', data);
			for(var i = 0; i < players.length; i++) {
				if(players[i].id == data.id) {
					players[i].target = "null";
				}
			}
		});

		socket.on('disconnect', function() {
			console.log("Player disconnected")
			socket.broadcast.emit('playerDisconnected', { id: socket.id });
			for(var i = 0; i < players.length; i++) {
				if(players[i].id == socket.id) {
					players.splice(i,1);
				}
			}
			for(var i = 0; i < playersOnine.length; i++) {
				if(playersOnine[i].id == socket.id) {
					playersOnine.splice(i,1);
				}
			}
		});
		players.push(new player(socket.id, 0, 0, 0, "null"));
	
	});
});
function player(id, x, y, r, target) {
	this.id = id;
	this.x = x;
	this.y = y;
	this.r = r;
	this.target = target;
}

function loggedInUser(id, username) {
	this.id = id;
	this.username = username;
}