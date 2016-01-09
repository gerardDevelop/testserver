var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
//var players = [];	// I dont really know what to use this for right now.
var playersOnline = [];	
var autoMatch1 = [];	// holds all players waiting for 1v1 match
var match1v1running = [];	// holds all running matches

var randomChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

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

	socket.on('ping', function(){
		socket.emit('pong');
	});

	socket.on('disconnect', function() {
			console.log("User disconnected from lobby");
			// remove player from players online
			for(var i = 0; i < playersOnline.length; i++) {
				if(playersOnline[i].id == socket.id) {
					playersOnline.splice(i,1);
				}
			}
			// remove player from automatch queue
			for(var i = 0; i < autoMatch1.length; i++) {
				if(autoMatch1[i].id == socket.id) {
					autoMatch1.splice(i,1);	
				}
			}
		});

	socket.on('automatch1', function() {
		for(var i = 0; i < playersOnline.length; i++) {
			if(playersOnline[i].id == socket.id) {
				//autoMatch1.push(playersOnline[i]);
				
				autoMatch1.push(new player(playersOnline[i].id, 0, 0, 0, "null", false, playersOnline[i].username));

				console.log("Server received 1v1 match request");
				console.log(autoMatch1.length + " players waiting for 1v1 match");
				socket.emit("automatchwaiting");
			}
		}
		// add to array
		//autoMatch1.push()
		// check if array if big enough.
		// drop 2 off and add them to a new match array
		// send confirmation of new match as well id of match etc
	});

	socket.on('automatching1', function(){
		if(autoMatch1.length > 1) {
			// create new namespace for match
			var rString = randomString(32, randomChars);	

			var players = [];

			players.push(autoMatch1[0]);
			players.push(autoMatch1[1]);

			match1v1running.push(new match1v1(players, rString, "1v1"));



			// create a new match out of them
			//match1v1running.push(new match1v1(autoMatch1[0].id, autoMatch1[0].username, autoMatch1[1].id, autoMatch1[1].username, rString));	

			console.log("New 1v1 match between " + autoMatch1[0].username + " and " + autoMatch1[1].username);

			// send msgs to the matched clients
			if(socket.id == autoMatch1[0].id) {
				socket.emit("1v1started");
				socket.broadcast.to(autoMatch1[1].id).emit("1v1started");
			}


			else {	
				socket.emit("1v1started");
				socket.broadcast.to(autoMatch1[0].id).emit("1v1started");
			}

			// determine which player the socket is, then send accordingly



			// splice off first 2 in waiting array
			autoMatch1.splice(0,2);
		} else {
			//send msg that players havent been found yet
			//..or nothing at all
		}
	});

	socket.on('get1v1details', function(data) {
		for(var i =0; i < match1v1running.length; i++) {
			if(socket.id == match1v1running[i].players[0].id || socket.id == match1v1running[i].players[1].id) {
				console.log("sending get1v1details");

				// send info
				data.players = match1v1running[i].players;
				data.namespace = match1v1running[i].namespace;
				data.gametype = match1v1running[i].gametype;

				socket.emit('1v1details', data);
			}
			else {
				// the user requesting isnt 
				//part of this match
			}
		}
	});

	socket.on('1v1gameloaded', function(gamedata) {

		var match = null;

		// check socket id against matches
		for(var i = 0; i < match1v1running.length; i++) {
			if(socket.id == match1v1running[i].players[0].id) {
				match1v1running[i].players[0].loaded = true;
				match = match1v1running[i]
			}
			else if(socket.id == match1v1running[i].players[1].id) {
				match1v1running[i].players[1].loaded = true;
				match = match1v1running[i]
			}
		}

		for(var i = 0; i < match1v1running.length; i++) {
			if(match1v1running[i].namespace == gamedata.namespace) {
				// this is the correct 'room' to send to
				// broadcast to players in this room
				gamedata.firstLoaded = match1v1running[i].players[0].loaded
				gamedata.secondLoaded = match1v1running[i].players[1].loaded
			}
		}
		gamedata.senderid = socket.id;

		socket.emit('gamestarted', gamedata);
		
		//if(socket.id == match.players[0])
		//	socket.broadcast.to(match.players[1].id).emit("gamestarted", gamedata);
		//else {
		//	socket.broadcast.to(match.players[0].id).emit("gamestarted", gamedata);
		//}
		
		//socket.emit('socketID', { id: socket.id });
		//socket.emit('getPlayers', players);
		//socket.broadcast.emit('newPlayer', { id: socket.id});
		socket.on('playerMoved', function(data){
			data.id = socket.id;
			
			var match = null;
			//console.log("received playedMoved");
			// get the match
			for(var i = 0; i < match1v1running.length; i++) {
				if(socket.id == match1v1running[i].players[0].id) {
					// send to opposite player in the match
					socket.broadcast.to(match1v1running[i].players[1].id).emit('playerMoved', data);
					match = match1v1running[i];
					//console.log("emitting playedMoved to player 1");
				}
				else if(socket.id == match1v1running[i].players[1].id) {
					socket.broadcast.to(match1v1running[i].players[0].id).emit('playerMoved', data);
					match = match1v1running[i]
					//console.log("emitting playedMoved to player 0");
				}
			}  
		
			for(var i = 0; i < match.players.length; i++) {
				if(match.players[i].id == data.id) {
					match.players[i].x = data.x;
					match.players[i].y = data.y;
					match.players[i].r = data.r;
				}
				//socket.broadcast.to(match.players[i].id).emit("playerMoved", data);
			}
		});

		socket.on('startMoving', function(data) {
			data.id = socket.id;
			socket.broadcast.emit('startMoving', data);
		});

		socket.on('stopMoving', function() {
			var data = { };
			data.id = socket.id;
			socket.broadcast.emit('stopMoving', data);
		});

		socket.on('newselect', function(data) {
			data.id = socket.id;
			socket.broadcast.emit('newselect', data);
		//	for(var i = 0; i < players.length; i++) {
		//		if(players[i].id == data.id) {
		//			players[i].target = data.selectid;
				//}
			//}
		});
		socket.on('deselect', function(data) {

			data.id = socket.id;
			socket.broadcast.emit('deselect', data);
		//	for(var i = 0; i < players.length; i++) {
		//		if(players[i].id == data.id) {
		//			players[i].target = "null";
		//		}
		//	}
		});
		socket.on("action", function(data) {
			data.id = socket.id;
			data.success = true;// flesh this out later
			data.magnitude = 3;	// will change to a random value later...just testing for now
			socket.emit('actionResponse',data)
			
			if(data.success) {
				socket.broadcast.emit('actionBroadcast',data)
			}
		});

		socket.on('disconnect', function() {
			console.log("Player disconnected")
			socket.broadcast.emit('playerDisconnected', { id: socket.id });
		//	for(var i = 0; i < players.length; i++) {
		//		if(players[i].id == socket.id) {
		//			players.splice(i,1);
		//		}
		//	}
			for(var i = 0; i < playersOnline.length; i++) {
				if(playersOnline[i].id == socket.id) {
					playersOnline.splice(i,1);
				}
			}
		});
	//	players.push(new player(socket.id, 0, 0, 0, "null"));
	});
});
function player(id, x, y, r, target, loaded, username) {
	this.id = id;
	this.x = x;
	this.y = y;
	this.r = r;
	this.target = target;
	this.loaded = loaded;
	this.username = username;
}

function loggedInUser(id, username) {
	this.id = id;
	this.username = username;
}

function match1v1(players, namespace, gametype) {
	this.players = players;	// array
	this.namespace = namespace;
	this.gametype = gametype; 
}

function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}
