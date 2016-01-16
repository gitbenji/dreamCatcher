var mongoose = require('mongoose');

var Schema = mongoose.Schema;

// create a schema
var videoSchema = new Schema({
  filename: String,
  docid: String,
  tags: Array
});

// the schema is useless so far
// we need to create a model using it
var Video = mongoose.model('Video', videoSchema);

// make this available to our users in our Node applications
module.exports = Video;