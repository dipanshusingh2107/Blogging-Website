const mongoose = require('mongoose');
const findOrCreate = require('mongoose-findorcreate');
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema ({
    name: String,
    email: {type: String},
    username: {type: String},
    password: String,
    googleId: String
  });
  
  userSchema.plugin(passportLocalMongoose, {usernameField: 'email'});
  userSchema.plugin(findOrCreate);
  const User = new mongoose.model("User", userSchema);
  module.exports = User;