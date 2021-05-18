const mongoose = require("mongoose");

//const PostedCommentSchema = new mongoose.Schema({ postedcomment: String });

const Post = mongoose.model('post',{
    title:{
        type:String,
        required: true
    },
    image:{
        type: String
    },
    body:{
        type: String
    },
    // comments:{ 
    //     type: [{postedcomment : String}]  //NOT NEEDED
    // },
    user:{
        type:String
    }

});

module.exports = Post;