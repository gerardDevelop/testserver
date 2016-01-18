var GLOBAL_CD_TIME = 1500;
var UPDATE_TIME = 1/60;


var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);


var redis = require('redis');
var redisClient = redis.createClient();

var creatingMatch1v1 = false;

redisClient.on('connect', function() {
	console.log('connected to redis');
});
redisClient.on('error', function (err) {
	console.log("error" + err);
});

// I need to transfer these arrays/ convert them into hashmaps

// and place inside redis


//var players = [];	// I dont really know what to use this for right now.
var playersOnline = [];	
var autoMatch1 = [];	// holds all players waiting for 1v1 match
var match1v1running = [];	// holds all running matches



var randomChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

var tempUpdateInt = 0;

server.listen(8081, function(){
	console.log("Server is now running...");
	setInterval(update,UPDATE_TIME);
});

io.on('connection', function(socket){
	console.log("A user has connected!");
	

	socket.on('register_account', function(data) {
		var email = data.email;
		var username = "user_" + data.username;	// indentifies is as a username
		var password = data.password;

		redisClient.exists(username, function(err, reply) {
			if(reply == 1) {
				// failure, cannot create username
				socket.emit("register_failure");

			}
			else {
				// success

				// create new username
				redisClient.hmset(username, 'email', email, 
											'password', password,
											'socket_id', 'not_online', function(err, reply) {
					console.log("adding " + username);				
				});
				redisClient.sadd(['users', username], function(err, reply) {});
				
				socket.emit("register_success");
			}
		});
	});

	socket.on('loginattempt', function(data) {
		data.id = socket.id;
		data.num = playersOnline.length;
		var username = "user_" + data.usr;
		console.log(username + " is trying to sign in");

		redisClient.exists(username, function(err, reply) {
			if(reply == 1) {
				socket.emit('loginsuccess', data);
			
			redisClient.sadd(['players_online', username], function(err, reply) {
				console.log("Players online: " + reply);
			}); 

			// set socketid for main username key
			redisClient.hset(username, 'socket_id', socket.id);

			// create temporary socketid hash for this session
			redisClient.hmset(socket.id, 'username', username);
			redisClient.expire(socket.id, 10000);
			// fill in match id and character id later					

			console.log(data.usr + " has joined the lobby");
			} else {
			// send failure message
			data.reason = "username does not exist";

			socket.emit('login_failure', data);
			// could add reason for failure into data later
			}
		});
	});

	socket.on('ping', function(){
		socket.emit('pong');
	});

	socket.on('disconnect', function() {
			console.log("User disconnected from lobby");
			//remove socketid from user key
			redisClient.hget(socket.id, function(err, reply) {
				redisClient.hset(reply, 'socket_id', 'not_online');
			});
			//remove temporary socketid key
			redisClient.del(socket.id, function(err,reply) {});
			// get socket.id and get the associated username 
			// remove username from list
			// set isOnline to false in main user key
			redisClient.srem('automatch1v1', socket.id);

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
		
		// add socketid to some kind of redis automatch set

		redisClient.sadd('automatch1v1', socket.id);				
/*
		for(var i = 0; i < playersOnline.length; i++) {
			if(playersOnline[i].id == socket.id) {
				//autoMatch1.push(playersOnline[i]);
				
				autoMatch1.push(new player(playersOnline[i].id, 0, 0, 0, "null", false, playersOnline[i].username));

				console.log("Server received 1v1 match request");
				console.log(autoMatch1.length + " players waiting for 1v1 match");
				socket.emit("automatchwaiting");
			}
		}
		*/
		// add to array
		//autoMatch1.push()
		// check if array if big enough.
		// drop 2 off and add them to a new match array
		// send confirmation of new match as well id of match etc
	});

	socket.on('automatching1', function(){
		
		//var length = 0;
/*)
		redisClient.scard('automatch1v1', function(err, reply){
			length = reply;
		});

		if(length > 1) {
			// create new id for match
			var rString = randomString(32, randomChars);	

			//var players = [];
			redisClient.sadd(socket.id)

*/
			/*
			players.push(autoMatch1[0]);
			players.push(autoMatch1[1]);

			match1v1running.push(new match1v1(players, rString, "1v1"));
			*/
/*

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

		*/
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
				match1v1running[i].players[0].character.hp = 100;
				match1v1running[i].players[0].character.dead = false;
				match = match1v1running[i]
			}
			else if(socket.id == match1v1running[i].players[1].id) {
				match1v1running[i].players[1].loaded = true;
				match1v1running[i].players[1].character.hp = 100;
				match1v1running[i].players[1].character.dead = false;
				match = match1v1running[i]
			}
		}

		for(var i = 0; i < match1v1running.length; i++) {
			if(match1v1running[i].namespace == gamedata.namespace) {
				// this is the correct 'room' to send to
				// broadcast to players in this room
				gamedata.firstLoaded = match1v1running[i].players[0].loaded;
				gamedata.secondLoaded = match1v1running[i].players[1].loaded;
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
			

			for(var i = 0; i < match1v1running.length; i++) {
				for(var j = 0; j < match1v1running[i].players.length; j++) {
					if(match1v1running[i].players[j].id == socket.id) {
						if(match1v1running[i].players[j].character.globalCooldownReady) {
							if(match1v1running[i].players[j].character.charType == "WARRIOR") {
								if(data.GameAction == "WARRIOR_ATTACK") {
									data.success = true;// flesh this out later
									data.magnitude = generateDamage(30,40);	// will change to a random value later...just testing for now
									match1v1running[i].players[j].character.globalCooldown = Date.now() + 1500;
									match1v1running[i].players[j].character.globalCooldownReady = false;
								}
							}	
						}
					}
				}
			}
			
			socket.emit('actionResponse',data);
				
			if(data.success) {
				socket.broadcast.emit('actionBroadcast',data);
			}

			for(var i = 0; i < match1v1running.length; i++) {
				for(var j = 0; j < match1v1running[i].players.length; j++) {
					if(match1v1running[i].players[j].id == data.target) {
						match1v1running[i].players[j].character.hp -= data.magnitude;
						console.log("HP: " + match1v1running[i].players[j].character.hp);
					}
				}
			}
		});

		socket.on('exitGameScreen', function() {
			// check if gameover
			//remove players from match1v1running
			

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

function update() {
    

	// check automatch1v1set for players
	

	if(!creatingMatch1v1) {
		redisClient.scard('automatch1v1', function(err, reply) {
			numberOfPlayers = reply;

			if(reply > 1) {
				creatingMatch1v1 = true;

				var id_1 = "";
				var id_2 = "";

				var matchString = 'match_' + randomString(32, randomChars);
			// remove and get 2 ids from the auto match list
				redisClient.srandmember('automatch1v1', 1, function(err, reply2) {
					id_1 = reply2;
					redisClient.hset(matchString, 'id_1', reply2, function(err, obj){});
					redisClient.srem('automatch1v1', reply2, function(err,obj){});
					//redisClient.smove('automatch1v1', matchString, reply2);
					
					redisClient.srandmember('automatch1v1', 1, function(err, reply3) {
						id_2 = reply3;

						redisClient.hset(matchString, 'id_2', reply3, function(err, obj){});
						redisClient.srem('automatch1v1', reply3, function(err,obj){});
						//redisClient.smove('automatch1v1', matchString, reply2);
						console.log(matchString);

						//var matchdata 

						io.to(id_1).emit('1v1started');
						io.to(id_2).emit('1v1started');
						//io.emit('1v1started');

						// add to a matchid to a match list to run through
						// the update loop
						
						
							
						creatingMatch1v1 = false;
					});
				});
			}
		});
	}




	var time = Date.now();

    // check cooldowns 
    for(var i = 0; i < match1v1running.length; i++) {
    	for(var j = 0; j <match1v1running[i].players.length; j++) {
    		if(time > match1v1running[i].players[j].character.globalCooldown) {
    			if(!match1v1running[i].players[j].character.globalCooldownReady) {
    				match1v1running[i].players[j].character.globalCooldownReady = true;	
    				io.to(match1v1running[i].players[j].id).emit("globalCdFinished");
    			}
    		}
    		if(match1v1running[i].players[j].character.hp <= 0 && !match1v1running[i].players[j].character.dead) { //death
  			match1v1running[i].players[j].character.dead = true;
    		console.log("DEATH!!!");
  			// since this is a 1v1 match, it means the 
   			 // other player wins
    		var data = { };
    		data.losingId = match1v1running[i].players[j].id; 
    		// TODO change to 'losingteam'
    		// give each player a team to belong to
    		// 0 or 1

    		for(var k = 0; k < match1v1running[i].players.length; k++) {
    			io.to(match1v1running[i].players[k].id).emit("gameover", data);
    		}
    	}
    	}
    }
}

function player(id, x, y, r, target, loaded, username) {
	this.id = id;
	this.x = x;
	this.y = y;
	this.r = r;
	this.target = target;
	this.loaded = loaded;
	this.username = username;
	this.character = new character("WARRIOR", id);
	
}

function character(charType, id) {
	// global cooldown to begin with
	this.charType = charType;
	this.globalCooldown = 0;
	this.globalCooldownReady = true;
	this.id = id;
	this.hp = 100;
	this.dead = false;
	//create different cooldowns here according to each class type

	// TODO - need to instantiate character 
	//during game initialization inside player object
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

function generateDamage(minDmg, maxDmg) {
	return Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
}
