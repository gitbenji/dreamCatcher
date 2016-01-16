

var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
var port = 6000;
var app = {};
var child_process = require('child_process').exec;
var ffmpeg = require('fluent-ffmpeg');

var dotenv = require('dotenv').load();
var mongoose = require('mongoose');
var glob = require('glob');
var Q = require('q');


var e = app.e = express();
app.server = app.server = http.createServer(e);


e.use(express.static(__dirname + '/public'));
e.use(bodyParser.json()); //HELP this doesn't allow post to run
e.use(bodyParser.urlencoded({ extended: true })); //HELP what is extension


var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({ extended: true });

// set up clarafai client
var Clarifai = require('./lib/clarifai_node.js');
Clarifai.initAPI(process.env.CLIENT_ID, process.env.CLIENT_SECRET);

// set up mongodb mongoose connection & models
mongoose.connect(process.env.MONGO_URI);
var Video = require('./models/video');


app.server.listen(port, function() {
	console.log('Listening on port ' + port + '\n');
});


//-----------------------------------CONCATENATE THAT VIDEO SHIT--------------------------------------------//



//////////////////////   NOTE I COMMENTED OUT THE CONCAT FUNCTION CALL
//testing purposes
var arr=['../videoslicer/"dog slices"/1368547613.mp4','../videoslicer/"dog slices"/1814283056.mp4','../videoslicer/"dog slices"/1386206500.mp4','../videoslicer/"dog slices"/1706709066.mp4','../videoslicer/"dog slices"/1726081069.mp4','../videoslicer/"dog slices"/5044944993.mp4','../videoslicer/"dog slices"/4859706534.mp4']
// concat(arr);
//----------------

function concat(video) {
	console.log(video.length-1);
	for(var i = 0; i < video.length; i++) {
		child_process('ffmpeg -i ' + video[i] + ' -qscale:v 1 intermediate'+[i]+'.mpg', function (err, data) {
			//console.log(video[i]);
		});
		if (i === video.length-1) {
			//console.log('call merge');
			merge(video);
		}
	}
}

function merge(video) {
	console.log('merge');
	var string = "cat ";
	for (var i = 0; i < video.length; i++){
		string += "intermediate"+[i]+".mpg "
		if (i === video.length-1){
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
    	console.log('done, bitch');
    	// console.log(data);
    });
}


//------------------------------------STOP CONCATENATING BECAUSE YOU FUCKING DID IT-----------------------------------//
//------------------------------------THUMBNAIL, YO-------------------------------------------------------------------//

// var proc = ffmpeg('output.mp4')
// 	.takeScreenshots({
// 		count: 1,
// 		timemarks: [ '4' ]
// 	}, '/', function(err) {
// 		console.log('screenshots were saved');
// 	});


//------------------------------------THUMBNAIL, YO-------------------------------------------------------------------//


//e.get('/api/dreamText', jsonParser, function(req, res) {
// req.query.dream
function dreamTextTest(wordd){
	//console.log('foo');
	//console.log(req.query.dream);

	var words = wordd.split(" ");

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

		
	});

	// get dream text
	// go through each word and query mongo
	// get list of file names that are relevant

	// pass to get video concatenated 
	// save that video in the root directory 
	// pass url through response 



	// res.send({video: 'http://104.236.30.131/videos/2_to_4.mp4', image: 'http://i.imgur.com/wSNPtJZ.png' });


	

}


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





// create entry in mongodb 
function storeVideoInfo(file, id, tagArr){
	var vid = new Video({
	  filename: file,
	  docid: id,
	  tags: tagArr
	});

	// TO DO:
	// 		only save to mongo if the filename doesn't already exist
	// 		to not have duplicates


	// call the built-in save method to save to the database
	vid.save(function(err) {
	  if (err) throw err;

	  console.log('Video ' + file + ' saved!');
	});
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


// Setting a throttle handler lets you know when the service is unavailable because of throttling. It will let
// you know when the service is available again. Note that setting the throttle handler causes a timeout handler to
// be set that will prevent your process from existing normally until the timeout expires. If you want to exit fast
// on being throttled, don't set a handler and look for error results instead.

Clarifai.setThrottleHandler( function( bThrottled, waitSeconds ) { 
	console.log( bThrottled ? ["throttled. service available again in",waitSeconds,"seconds"].join(' ') : "not throttled");
});


// callback function for clarafai API to handle the errors
function commonResultHandler( err, res ) {
	console.log('request handler!');
	if( err != null ) {
		console.log(' there was an error!');
		if( typeof err["status_code"] === "string" && err["status_code"] === "TIMEOUT") {
			console.log("TAG request timed out");
		}
		else if( typeof err["status_code"] === "string" && err["status_code"] === "ALL_ERROR") {
			console.log("TAG request received ALL_ERROR. Contact Clarifai support if it continues.");				
		}
		else if( typeof err["status_code"] === "string" && err["status_code"] === "TOKEN_FAILURE") {
			console.log("TAG request received TOKEN_FAILURE. Contact Clarifai support if it continues.");				
		}
		else if( typeof err["status_code"] === "string" && err["status_code"] === "ERROR_THROTTLED") {
			console.log("Clarifai host is throttling this application.");				
		}
		else {
			console.log("TAG request encountered an unexpected error: ");
			console.log(err);				
		}
	}
	else {
		// if some images were successfully tagged and some encountered errors,
		// the status_code PARTIAL_ERROR is returned. In this case, we inspect the
		// status_code entry in each element of res["results"] to evaluate the individual
		// successes and errors. if res["status_code"] === "OK" then all images were 
		// successfully tagged.


		// This is where it's successful, or partially successful
		if( typeof res["status_code"] === "string" && 
			( res["status_code"] === "OK" || res["status_code"] === "PARTIAL_ERROR" )) {

			console.log('-- RESULTS --');
			console.log(res.results);
			// the request completed successfully
			for(i = 0; i < res.results.length; i++) {
				if( res["results"][i]["status_code"] === "OK" ) {

					// get values from clarafai result
					var docid = res.results[i].docid;
					var filename = res.results[i].local_id;
					var tags = res["results"][i].result["tag"]["classes"];
					var tagArr = tags[0];
					console.log(tagArr);

					// store in database
					storeVideoInfo(filename, docid, tagArr);

					// logs and ish
					console.log( 'docid: '+res.results[i].docid + '\n' +
						' local_id: '+res.results[i].local_id + '\n' +
						' tags: '+res["results"][i].result["tag"]["classes"] )
				}
				else {
					console.log( 'docid='+res.results[i].docid +
						' local_id='+res.results[i].local_id + 
						' status_code='+res.results[i].status_code +
						' error = '+res.results[i]["result"]["error"] )
				}
			}

		}		
	}
}

// run through directory of files and pass them into clarafai to get tagged
// which then gets saved in mongodb
function runThroughFiles(dir){
	glob(dir + "/*.mp4", function (err, files) {
	  // files is an array of filenames.
	  // If the `nonull` option is set, and nothing
	  // was found, then files is ["**/*.js"]
	  // er is an error object or null.

	  if(err)
	  	console.log('-- ERROR GETTING FILES WITH GLOB --');

	  console.log(files);

	  // loop through filenames 	  
	  for(var i = 0; i < files.length; i++){
	  	var filepath = files[i];
	  	var index = filepath.lastIndexOf('/');
	  	var ourId = filepath.substring(index + 1);
	  	console.log(ourId);
		var testURL = 'http://' + process.env.IP_ADDR + '/' + process.env.PATH_TO_VIDEO_CLIPS + ourId;

		// make call to clarafai to get the tags for that certain video
		Clarifai.tagURL(testURL , ourId, commonResultHandler);
	  } 
	});
}

// run through files and tag them and then store them
var folderPath = '../test_videos';
//runThroughFiles(folderPath);


var testString = 'Running through the snow with family and friends. Outside with the dog, indoors with technology';
dreamTextTest(testString);

//process.env.PATH_TO_VIDEO_CLIPS)

// init throttle handler
Clarifai.clearThrottleHandler();










