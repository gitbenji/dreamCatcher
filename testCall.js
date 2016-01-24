var dotenv = require('dotenv').load();
var request = require('request');

var testUrl = 'http://9bc0d504.ngrok.io/api/dreamText';

var dreamText = 'Running through the snow with family and friends. Outside with the dog, indoors with technology';

var data = {
	dream: dreamText
};

request({
    url: testUrl, 
    method: 'GET',
    qs: data
}, function(error, response, body){
    if(error) {
        console.log(error);
    } else {
        console.log(response.statusCode, body);
	}
});