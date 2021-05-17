const mongoose = require('mongoose');

const Comment = mongoose.model('comment',{
    postID :{type:String},
    userID :{type:String},
    postedcomment :{type:String}
});

module.exports = Comment;