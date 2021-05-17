const mongoose = require('mongoose');
const findOrCreate = require('mongoose-findorcreate');
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema ({
    name: String,
    email: {type:String , unique:true,sparse: true},
    username: {type:String} , 
      index: {
        unique: true,
        partialFilterExpression: { email: { $type: 'string' } },
      },
    default : null,
    password: String,
    googleId: String
  });
  
  userSchema.plugin(passportLocalMongoose, {usernameField: 'email'});
  userSchema.plugin(findOrCreate);
  const User = new mongoose.model("User", userSchema);
  module.exports = User;