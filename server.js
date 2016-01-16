

var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
var port = 6000;
var app = {};
var child_process = require('child_process').exec;
var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');


var e = app.e = express();
app.server = app.server = http.createServer(e);


e.use(express.static(__dirname + '/public'));
e.use(bodyParser.json()); //HELP this doesn't allow post to run
e.use(bodyParser.urlencoded({ extended: true })); //HELP what is extension


var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({ extended: true });


app.server.listen(port, function() {
	console.log('Listening on port ' + port + '\n');
});


//-----------------------------------CONCATENATE THAT VIDEO SHIT--------------------------------------------//

//testing purposes
var vidarr=['../videoslicer/"dog slices"/1368547613.mp4','../videoslicer/"dog slices"/1814283056.mp4','../videoslicer/"dog slices"/1386206500.mp4','../videoslicer/"dog slices"/1706709066.mp4','../videoslicer/"dog slices"/1726081069.mp4','../videoslicer/"dog slices"/5044944993.mp4','../videoslicer/"dog slices"/4859706534.mp4']
receive(vidarr);
//----------------

//create array of random integers for unique temporary file names
function receive(videos) {
	var temparr = [];
	child_process('mkdir tempVids', function (err, data) {
		// console.log('tempVids made');
	})
	for(var i = 0; i < videos.length; i++) {
		temparr[i] = Math.floor(Math.random() * (9999999999 - 1000000000 +1)) + 1000000000
		if (i === videos.length-1) {
			concat(videos, temparr);
		}
	}
}

function concat(videos, temparr) {
	console.log(videos.length-1);
	for(var i = 0; i < videos.length; i++) {
		(function(index){
			child_process('ffmpeg -i ' + videos[index] + ' -qscale:v 1 ./tempVids/' + temparr[index] + '.mpg', function (err, data) {
				//console.log(video[i]);
				if (index === videos.length-1) {
					//console.log('call merge');
					merge(videos, temparr);
				}
			});
		})(i);
	}
}

function merge(videos, temparr) {
	// console.log('merge');
	var string = "cat ";
	for (var i = 0; i < videos.length; i++){
		string += './tempVids/'+temparr[i]+".mpg "
		if (i === videos.length-1) {
			// console.log('execute');
			execute(string);
		}
	}
}

function execute(string) {
	string += "> intermediate_all.mpg";
	console.log(string);
	child_process(string, function (err, data) {
 		// console.log('call finish');
 		finish();
	});
}

function finish() {
	child_process('ffmpeg -i intermediate_all.mpg -qscale:v 2 output.mp4', function (err, data) {
		console.log(err);
    	console.log('done, bitch');
    	console.log(data);
    });
    deleteTemps();
}

function deleteTemps() {
	child_process('rm -r ./tempVids', function(err){
		if (err)
			console.log(err);
	});
}

// function deleteTemps() {
// 	fs.unlink('./tempVids/', function(err){
// 		console.log(err);
// 		console.log('deleted?')
// 	});
// }

//------------------------------------STOP CONCATENATING BECAUSE YOU FUCKING DID IT-----------------------------------//

//------------------------------------THUMBNAIL, YO-------------------------------------------------------------------//

var proc = ffmpeg('output.mp4')
	.takeScreenshots({
		count: 1,
		timemarks: [ '2' ]
	}, '/', function(err) {
		console.log('screenshots were saved');
	});


//------------------------------------THUMBNAIL, YO-------------------------------------------------------------------//


e.get('/api/dreamText', jsonParser, function(req, res) {
	//console.log('foo');
	console.log(req.query.dream);

	res.send({video: 'http://104.236.30.131/videos/2_to_4.mp4',
		image: 'http://i.imgur.com/wSNPtJZ.png' });

	

});