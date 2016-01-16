// node_example.js - Example showing use of Clarifai node.js API



var stdio = require('stdio');
var dotenv = require('dotenv').load();
var mongoose = require('mongoose');
var glob = require('glob');

var Clarifai = require('./lib/clarifai_node.js');
Clarifai.initAPI(process.env.CLIENT_ID, process.env.CLIENT_SECRET);

mongoose.connect('mongodb://localhost:27017/mongodb_dream');
var Video = require('./models/video');


// support some command-line options
var opts = stdio.getopt( {
	'print-results' : { description: 'print results'},
	'print-http' : { description: 'print HTTP requests and responses'},
	'verbose' : { key : 'v', description: 'verbose output'}
});
var verbose = opts["verbose"];
Clarifai.setVerbose( verbose );
if( opts["print-http"] ) {
	Clarifai.setLogHttp( true );
}


// create entry in mongoose 
function storeVideoInfo(file, id, tagArr){
	var vid = new Video({
	  filename: file,
	  docid: id,
	  tags: tagArr
	});


	// call the built-in save method to save to the database
	vid.save(function(err) {
	  if (err) throw err;

	  console.log('Video ' + file + ' saved!');
	});
}



// return array of relevant video filenames
function findByTag(word, callback){
	Video.find({ tags: word }).exec(function(err, videos) {
	  if (err) throw err;

	  // log relevant videos
	  console.log(videos);

	  var fileArr = [];
	  for(var i = 0; i < videos.length; i++){
	  	fileArr.push(videos[i].filename);
	  }

	  callback(fileArr);
	});
}




// Setting a throttle handler lets you know when the service is unavailable because of throttling. It will let
// you know when the service is available again. Note that setting the throttle handler causes a timeout handler to
// be set that will prevent your process from existing normally until the timeout expires. If you want to exit fast
// on being throttled, don't set a handler and look for error results instead.

Clarifai.setThrottleHandler( function( bThrottled, waitSeconds ) { 
	console.log( bThrottled ? ["throttled. service available again in",waitSeconds,"seconds"].join(' ') : "not throttled");
});

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
		if( typeof res["status_code"] === "string" && 
			( res["status_code"] === "OK" || res["status_code"] === "PARTIAL_ERROR" )) {

			console.log('-- RESULTS --');
			console.log(res.results);
			// the request completed successfully
			for(i = 0; i < res.results.length; i++) {
				if( res["results"][i]["status_code"] === "OK" ) {
					var docid = res.results[i].docid;
					var filename = res.results[i].local_id;
					var tags = res["results"][i].result["tag"]["classes"];
					var tagArr = tags[0];
					console.log(tagArr);


					storeVideoInfo(filename, docid, tagArr);


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
	  	console.log('ERROR GETTING FILES WITH GLOB');

	  console.log(files);
	  
	  for(var i = 0; i < files.length; i++){
	  	var filepath = files[i];
	  	var index = filepath.lastIndexOf('/');
	  	var ourId = filepath.substring(index + 1);
	  	console.log(ourId);
		var testURL = 'http://' + process.env.IP_ADDR + '/' + process.env.PATH_TO_VIDEO_CLIPS + ourId;

		Clarifai.tagURL(testURL , ourId, commonResultHandler);
	  } 
	});
}

var folderPath = '../test_videos';
//runThroughFiles(folderPath);

findByTag('face', function(fileArr){
	console.log(fileArr);
});


//process.env.PATH_TO_VIDEO_CLIPS)


//exampleTagSingleURL();
//exampleTagMultipleURL();
//exampleFeedback();

Clarifai.clearThrottleHandler();












/*


// exampleTagMultipleURL() shows how to request the tags for multiple images URLs
function exampleTagMultipleURL() {
	var testImageURLs = [ 
	"http://www.clarifai.com/img/metro-north.jpg", 
	"http://www.clarifai.com/img/metro-north.jpg" ];
	var ourIds =  [ "train station 1", 
	                "train station 2" ]; // this is any string that identifies the image to your system

	Clarifai.tagURL( testImageURLs , ourIds, commonResultHandler ); 
}

// exampleFeedback() shows how to send feedback (add or remove tags) from 
// a list of docids. Recall that the docid uniquely identifies an image previously
// presented for tagging to one of the tag methods.
function exampleFeedback() {
// these are docids that just happen to be in the database right now. this test should get 
// upgraded to tag images and use the returned docids.
var docids = [
	"15512461224882630000",
	"9549283504682293000"
	];
	var addTags = [
	"addTag1",
	"addTag2"
	];
	Clarifai.feedbackAddTagsToDocids( docids, addTags, null, function( err, res ) {
		if( opts["print-results"] ) {
			console.log( res );
		};
	} );

	var removeTags = [
	"removeTag1",
	"removeTag2"
	];
	Clarifai.feedbackRemoveTagsFromDocids( docids, removeTags, null, function( err, res ) {
		if( opts["print-results"] ) {
			console.log( res );
		};
	} );
}

*/


