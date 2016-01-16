


var dotenv = require('dotenv').load();
var mongoose = require('mongoose');
var glob = require('glob');


// set up mongodb mongoose connection & models
mongoose.connect(process.env.MONGO_URI);
var Video = require('./models/video');


// set up clarafai client
var Clarifai = require('./lib/clarifai_node.js');
Clarifai.initAPI(process.env.CLIENT_ID, process.env.CLIENT_SECRET);




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



	child_process('mv ./toBeTagged/*.mp4 ' + process.env.PATH_TO_DIR + process.env.PATH_TO_VIDEO_CLIPS, function(err){
		if (err)
			console.log(err);
		else
			console.log('All clips moved!');
	});
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
		var testURL = 'http://' + process.env.IP_ADDR + '/' + process.env.PATH_TO_TAGGING_CLIPS + ourId;

		// make call to clarafai to get the tags for that certain video
		Clarifai.tagURL(testURL , ourId, commonResultHandler);
	  } 
	});
}

// run through files and tag them and then store them
var folderPath = './toBeTagged';
runThroughFiles(folderPath);



// init throttle handler
Clarifai.clearThrottleHandler();




