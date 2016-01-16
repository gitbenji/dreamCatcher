

var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
var port = 6000;
var app = {};
var child_process = require('child_process').exec;
var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');

var dotenv = require('dotenv').load();
var mongoose = require('mongoose');
var Q = require('q');


var e = app.e = express();
app.server = app.server = http.createServer(e);


e.use(express.static(__dirname + '/public'));
e.use(bodyParser.json()); //HELP this doesn't allow post to run
e.use(bodyParser.urlencoded({ extended: true })); //HELP what is extension


var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({ extended: true });



// set up mongodb mongoose connection & models
mongoose.connect(process.env.MONGO_URI);
var Video = require('./models/video');


app.server.listen(port, function() {
	console.log('Listening on port ' + port + '\n');
});


//-----------------------------------CONCATENATE THAT VIDEO SHIT--------------------------------------------//



//testing purposes
//var vidarr=['../videoslicer/"dog slices"/1368547613.mp4','../videoslicer/"dog slices"/1814283056.mp4','../videoslicer/"dog slices"/1386206500.mp4','../videoslicer/"dog slices"/1706709066.mp4','../videoslicer/"dog slices"/1726081069.mp4','../videoslicer/"dog slices"/5044944993.mp4','../videoslicer/"dog slices"/4859706534.mp4']
//receive(vidarr);
//----------------

//create array of random integers for unique temporary file names
function receive(videos, res) {
	var temparr = [];
	child_process('mkdir tempVids', function (err, data) {
		// console.log('tempVids made');
	})
	for(var i = 0; i < videos.length; i++) {
		temparr[i] = Math.floor(Math.random() * (9999999999 - 1000000000 +1)) + 1000000000
		if (i === videos.length-1) {
			concat(videos, temparr, res);
		}
	}
}

function concat(videos, temparr, res) {
	console.log(videos.length-1);
	for(var i = 0; i < videos.length; i++) {
		(function(index){
			child_process('ffmpeg -i ' + process.env.PATH_TO_DIR + process.env.PATH_TO_VIDEO_CLIPS + videos[index] + ' -qscale:v 1 ./tempVids/' + temparr[index] + '.mpg', function (err, data) {
				//console.log(video[i]);
				if (index === videos.length-1) {
					//console.log('call merge');
					merge(videos, temparr, res);
				}
			});
		})(i);
	}
}

function merge(videos, temparr, res) {
	// console.log('merge');
	var string = "cat ";
	for (var i = 0; i < videos.length; i++){
		string += './tempVids/'+temparr[i]+".mpg "
		if (i === videos.length-1) {
			// console.log('execute');
			execute(string, res);
		}
	}
}

function execute(string, res) {
	string += "> intermediate_all.mpg";
	console.log(string);
	child_process(string, function (err, data) {
 		// console.log('call finish');
 		finish(res);
	});
}

function finish(res) {
	var randomPath = (Math.floor(Math.random() * (9999999999 - 1000000000 +1)) + 1000000000) + '.mp4';
	var filepath = process.env.PATH_TO_DIR + process.env.PATH_TO_MERGED_CLIPS + randomPath;
	child_process('ffmpeg -i intermediate_all.mpg -qscale:v 2 ' + filepath, function (err, data) {
		if(err)
			console.log(err);

		
		res.send({video: 'http://' + process.env.IP_ADDR + '/' + process.env.PATH_TO_MERGED_CLIPS + randomPath, image: 'http://i.imgur.com/wSNPtJZ.png' });

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

// var proc = ffmpeg('output.mp4')
// 	.takeScreenshots({
// 		count: 1,
// 		timemarks: [ '2' ]
// 	}, '/', function(err) {
// 		console.log('screenshots were saved');
// 	});


//------------------------------------THUMBNAIL, YO-------------------------------------------------------------------//


e.get('/api/dreamText', jsonParser, function(req, res) {
// req.query.dream
//function dreamTextTest(wordd){
	//console.log('foo');
	//console.log(req.query.dream);


	//var res;

	var noPunctuation = req.query.dream.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
	var words = noPunctuation.split(" ");
	console.log(words);

	var fileList = [];
	// loop through all words in the dream text paragraph

	// jesus
	// create an array of functions to which q.all waits til all of the
	// arrays have been returned and then it returns those arrays in an array to the .then
	Q.all(words.map(function(word){
			var deferred = Q.defer();
			findByTag(word).then(function(fileArr){
				deferred.resolve(fileArr);
			});	
			return deferred.promise
	})).then(function(arrays){
		// loop through and merge filenames
		for(var i = 0; i < arrays.length; i++){
			fileList = mergeWithoutDuplicates([fileList, arrays[i]]);
		}

		console.log(fileList);
		receive(fileList, res);
		
	});

	// get dream text
	// go through each word and query mongo
	// get list of file names that are relevant

	// pass to get video concatenated 
	// save that video in the root directory 
	// pass url through response 



	


	

});


// merge arrays without adding duplicates
function mergeWithoutDuplicates(arguments){
	var finalArr = [];
	for(var i = 0; i < arguments.length; i++){
		var current = arguments[i];
		for(var j = 0; j < current.length; j++){
			// if it's not found, then push to array
			if(finalArr.indexOf(current[j]) === -1){
				finalArr.push(current[j]);
			}
		}
	}

	return finalArr;
}




// return array of relevant video filenames
function findByTag(word){
	var deferred = Q.defer();

	Video.find({ tags: word }).exec(function(err, videos) {
	  if (err) throw err;

	  //console.log('--------- begining of searching ---------')
	  // log relevant videos
	  //console.log(videos);
	  //console.log('--------- end of searching ---------')

	  var fileArr = [];
	  for(var i = 0; i < videos.length; i++){
	  	fileArr.push(videos[i].filename);
	  	console.log(videos[i].filename);
	  }

	  deferred.resolve(fileArr);
	});

	return deferred.promise;
}


var testString = 'Running through the snow with family and friends. Outside with the dog, indoors with technology';
//dreamTextTest(testString);









