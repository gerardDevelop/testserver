var GLOBAL_CD_TIME = 1500;
var UPDATE_TIME = 1/60;

var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var userMap = new Map();
var userArray = [];

server.listen(8081, function(){
	console.log("Server is now running...");
	setInterval(update,UPDATE_TIME);
});

io.on('connection', function(socket) {
	socket.on('login', function(data) {
		var username = data.username;

		console.log(username + " connected!");
		userArray.push(socket.id);


		// set its position here and put it inside userObject pass it back 


		var userObject = new userObj(socket.id, username, 0.0, 0.0, 3.0, 3.0);


		userMap.set(socket.id, userObject);


		var data = { 
			id : socket.id			
							};

		socket.emit('loggedin', data);
		
		// broadcast new user object
		socket.broadcast.emit('user_connected', userObject);

		////////////////////////////////////////
		socket.on('disconnect', function() {
			var tempUser = userMap.get(socket.id);	
			console.log(tempUser.username + " disconnected");

			for(var i = 0; i < userArray.length; i++) {
				if(userArray[i] == socket.id) {
					userArray.splice(i, 1);	// find id and delete it
				}
			}

			userMap.delete(socket.id);
			// TODO broadcast to other users that 
			// a user has left the server
			var data = { id : socket.id };
			socket.broadcast.emit('user_disconnected', data);
		});
		/////////////////////////////////////////
		socket.on('serverinfo_request', function() {
			console.log("received request for data");
			// send user array so client knows the ids that reference the objects in the map
			var objArray = [];

			for(var value of userMap.values()) {
				objArray.push(value);
			}


			socket.emit('server_info', userArray, objArray);
		});
		socket.on('kinematic_update', function(data) {
			// send user array so client knows the ids that reference the objects in the map
			data.id = socket.id;	



			socket.broadcast.emit('kinematic_update', data);

			userMap.get(socket.id).x = data.x;
			userMap.get(socket.id).y = data.y;
			userMap.get(socket.id).vx = data.vx;
			userMap.get(socket.id).vy = data.vy;

		});
	});
	/*
	socket.on('creatematch', function(data)  {
		var matchObj = {
			roomId : 'randomstring',	// create random string here
			name : data.name,
			type : data.type,
			team1 : [ socket.id ],
			team2 : []
		};

		waitingMatchMap.set(roomId, matchObj);

		socket.emit('matchreply', matchObj);
	});
	*/
});

function update() {
	var time = Date.now();  

}

function userObj(id, username, vx, vy, x, y) {
	this.id = id;
	this.username = username;
	this.vx = vx;
	this.vy = vy;
	this.x = x;
	this.y = y;
}

// match object

// room id
// name 
// owner id
// 