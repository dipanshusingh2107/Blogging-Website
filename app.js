//jshint esversion:6

require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const ObjectId = require('mongodb').ObjectID;
const User = require("./models/User");
const Post = require("./models/Post");


const homeStartingContent ="This platform is for all the bloggers out there to post day to day news related stuff, articles etc.";

const app = express();

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: true})); 
app.use(express.json());
app.use(express.static("public"));

app.use(session ({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));


app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/sample2DB", 
{useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);


passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/blog",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

// **** Display home page *****
app.get("/", function(req, res) {
  Post.find({}).then((posts)=>{
    res.render("home", {startingContent: homeStartingContent, posts: posts});
  });
});

// **** Display loggedin home page *****
app.get("/homeloggedin/:anything", function(req, res) {
  const requestedUserID = req.params.anything;

  if(req.isAuthenticated()) {
    Post.find({}).then((posts)=>{
      res.render("homeloggedin", 
      {startingContent: homeStartingContent, posts: posts, userid: requestedUserID});
    });
  }
  else 
  res.redirect("/login");
});

// **** Display google page *****
app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

// **** Callback from google *****
app.get("/auth/google/blog", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect("/homeloggedin/"+req.user._id);
  });

// **** Display compose page *****
app.get("/compose/:anything", function(req, res) {
  const requestedUserID = req.params.anything;
  if (req.isAuthenticated()) {
      res.render("compose",{userid: requestedUserID});
  } else {
      res.redirect("/login");
  }
});

// **** Display login page *****
app.get("/login", function(req, res) {
  res.render("login");
});

// **** Display register page *****
app.get("/register", function(req, res) {
  res.render("register");
});

// **** Display a post when user loggedin *****
app.get("/posts/:anything/:anything2", function(req, res) {
  const requestedPostID = req.params.anything;
  const requestedUserID = req.params.anything2;

  Post.findOne({_id: new ObjectId(requestedPostID)}).then((post)=>{
    if (req.isAuthenticated())  {
      res.render("loggedinpost", 
      {title: post.title, image: post.image, content: post.body, 
      comments: post.comments, id: requestedPostID, userid: requestedUserID});  
    } else  {
        res.render("post", 
        {title: post.title, image: post.image, content: post.body, 
        comments: post.comments, id: requestedPostID});
      }
  });
});

// **** Display a post *****
app.get("/posts/:anything", function(req, res) {
  const requestedPostID = req.params.anything;

  Post.findOne({_id: new ObjectId(requestedPostID)}).then((post)=>{
    if (req.isAuthenticated())  {
      res.render("loggedinpost", 
      {title: post.title, image: post.image, content: post.body, 
      comments: post.comments, id: requestedPostID});  
    } else  {
        res.render("post", 
        {title: post.title, image: post.image, content: post.body, 
        comments: post.comments, id: requestedPostID});
      }
  });
});

// **** Display particular user posts *****
app.get("/myposts/:anything", function(req, res) {
  const requestedUserID = req.params.anything;
  if (req.isAuthenticated()) {
    Post.find({user: requestedUserID}).then((posts)=>{
      res.render("myposts", {posts: posts, userid: requestedUserID});
    });
  } else {
      res.redirect("/login");
  }
});

// **** Logging out *****
app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

// **** CREATING a POST *****
app.post("/compose/:anything", function(req, res) {
  const newPost = new Post({
    title : req.body.postTitle,
    image : req.body.postImage,
    body : req.body.postBody,
    comments:[],
    user: req.params.anything
  });
  newPost.save((err,data)=>{
    if(err)
    {
      console.log(err);
      res.send('Post not saved');
      return err;
    }
    else
    {
      res.redirect("/myposts/"+req.params.anything);
    }
  });
});

// ******* Posting Comments ************
app.post("/posts/:anything/:anything2", function(req, res) {
  const singlecomment = {
    postedcomment : req.body.postComment
  };

  const requestedID = req.params.anything;
  const requestedUserID = req.params.anything2;

  let oldcomments = [];

  Post.findOne({_id: new ObjectId(requestedID)}).then((post)=>{
    oldcomments = [...post.comments];
    let newcomments=[];
  
    for(let i=0;i<oldcomments.length;i++) {
      let x = {postedcomment:oldcomments[i].postedcomment};
      newcomments.push(x);
    }
  
    if (req.isAuthenticated())  {
      newcomments.push(singlecomment);
      Post.findOneAndUpdate({_id:requestedID} ,{comments:newcomments},{returnOriginal:false},(err,result)=>{});
      res.redirect("/posts/"+requestedID+"/"+requestedUserID); 
    }  else  {
        res.redirect("/login");
      }
  });
});

// **** Posting Comments without login *****
app.post("/posts/:anything", function(req, res) {
    res.redirect("/login");
});

// **** Deleting POST *****
app.post("/deletepost/:anything/:anything2",(req,res)=>{
  const requestedPostID = req.params.anything;
  const requestedUserID = req.params.anything2;

  if(req.isAuthenticated()) {
    Post.deleteOne({_id:requestedPostID},(err)=>{
      if(err) {
        console.log(err);
      } else {
        res.redirect("/myposts/"+requestedUserID);
      }
    });
  }
  else res.redirect("/login");
});

// **** Register a user *****
app.post("/register", function(req,res) {

  User.register({name: req.body.name, email: req.body.email, username: req.body.username}, req.body.password,
     function(err, user) {
      if(err) {
          console.log(err);
          res.redirect("/register");
      } else {
          passport.authenticate("local")(req, res, function() {
              res.redirect("/homeloggedin/"+ req.user._id);
          });
      }
  });
});

// **** Loging in a user *****
app.post('/login',
  passport.authenticate('local',{failureRedirect: '/login'}),
  (req, res)=>{ 
  res.redirect('/homeloggedin/' + req.user._id); 
  });


app.listen(3000, function() {
  console.log("Server started on port 3000");
});
