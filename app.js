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
const { toArray } = require('lodash');
const Comment = require("./models/Comment");


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


//write this and comment below to use locally and not in production
// mongoose.connect("mongodb://localhost:27017/sample2DB", 
// {useNewUrlParser: true, useUnifiedTopology: true});
// mongoose.set("useCreateIndex", true);
// mongoose.set('useFindAndModify', false); 

const URI = process.env.MONGODB_URI;
mongoose.connect(URI, 
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
  //callbackURL: "http://localhost:3000/auth/google/blog",
  callbackURL: "https://dailyjournaldbms.herokuapp.com/auth/google/blog",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile.email);
  User.findOrCreate({ googleId: profile.id, email:profile.email}, function (err, user) {
    return cb(err, user);
  });
}
));

// **** Display home page *****
app.get("/", function(req, res) {
  const postlimit = 10;
  Post.find({}).sort({"_id": -1}).limit(postlimit).then((posts)=>{
    res.render("home", 
    {startingContent: homeStartingContent, posts: posts});
 });
});

app.get("/get-posts/:start/:limit", function(req, res) {
  var postskipped = parseInt(req.params.start);
  var postlimit = parseInt(req.params.limit);
  Post.find({}).sort({"_id": -1}).skip(postskipped).limit(postlimit).then((posts)=>{
    res.send(posts);
 });
});

// **** Display loggedin home page *****
app.get("/homeloggedin", function(req, res) {
  const postlimit = 10;
  if(req.isAuthenticated()) {
    Post.find({}).sort({"_id": -1}).limit(postlimit).then((posts)=>{
      res.render("homeloggedin", 
      {startingContent: homeStartingContent, posts: posts});
    });
  }
  else 
  res.redirect("/login");
});

app.get("/get-postsloggedin/:start/:limit", function(req, res) {
  var postskipped = parseInt(req.params.start);
  var postlimit = parseInt(req.params.limit);
  if(req.isAuthenticated()) {
    Post.find({}).sort({"_id": -1}).skip(postskipped).limit(postlimit).then((posts)=>{
      res.send(posts);
    });
  }
  else 
  res.redirect("/login");
});

// **** Display google page *****
app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile","email"] })
);

// **** Callback from google *****
app.get("/auth/google/blog", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect("/homeloggedin");
  });

// **** Display compose page *****
app.get("/compose", function(req, res) {
  if (req.isAuthenticated()) {
      res.render("compose");
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

// **** Display a post *****
app.get("/posts/:anything", function(req, res) {
  const requestedPostID = req.params.anything;

  Post.findOne({_id: new ObjectId(requestedPostID)}).then((post)=>{
    Comment.find({postID: new ObjectId(requestedPostID)}).then((comm)=>{
      console.log(comm);
      if (req.isAuthenticated())  
      {
        res.render("loggedinpost", 
        {title: post.title, image: post.image, content: post.body, 
        comments: comm, id: requestedPostID});  
      } 
      else  
      {
        res.render("post", 
        {title: post.title, image: post.image, content: post.body, 
        comments: comm, id: requestedPostID});
      }
    });

    });
    
});

// **** Display user posts *****
app.get("/myposts", function(req, res) {
  
  if (req.isAuthenticated()) {
    const requestedUserID = req.user._id.valueOf();
    Post.find({user: requestedUserID}).sort({"_id": -1}).then((posts)=>{
      res.render("myposts", {posts: posts});
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
app.post("/compose", function(req, res) {
  const newPost = new Post({
    title : req.body.postTitle,
    image : req.body.postImage,
    body : req.body.postBody,
    comments:[],
    user: req.user._id
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
      res.redirect("/myposts");
    }
  });
});

// ******* Posting Comments ************
app.post("/posts/:anything", function(req, res) {
  // const singlecomment = {
  //   postedcomment : req.body.postComment
  // };

  const requestedID = req.params.anything;

  if (req.isAuthenticated())  
  {
    const comm = new Comment({
    userID : req.user._id,
    postID : requestedID,
    postedcomment : req.body.postComment
    });

    comm.save((err,data)=>{
    if(err)
    {
      console.log(err);
      res.send('Post not saved');
      return err;
    }
    else
    {
      res.redirect("/posts/"+requestedID); 
    }
    });
  }
  else
  {
    res.redirect("/login");
  }


  // let oldcomments = [];

  // Post.findOne({_id: new ObjectId(requestedID)}).then((post)=>{
  //   oldcomments = [...post.comments];
  //   let newcomments=[];
  
  //   for(let i=0;i<oldcomments.length;i++) {
  //     let x = {postedcomment:oldcomments[i].postedcomment};
  //     newcomments.push(x);
  //   }
  
  //   if (req.isAuthenticated())  {
  //     newcomments.push(singlecomment);
  //     Post.findOneAndUpdate({_id:requestedID} ,{comments:newcomments},{returnOriginal:false},(err,result)=>{});
  //     res.redirect("/posts/"+requestedID); 
  //   }  else  {
  //       res.redirect("/login");
  //     }
  // });
});


// **** Deleting POST *****
app.post("/deletepost/:anything",(req,res)=>{
  const requestedPostID = req.params.anything;

  if(req.isAuthenticated()) {
    Post.deleteOne({_id:requestedPostID},(err)=>{
      if(err) 
      {
        console.log(err);
      } 
      else 
      {
        Comment.deleteMany({postID:requestedPostID},(error)=>{
          if(error)
          console.log(error);
          else
          res.redirect("/myposts");
        }); 
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
              res.redirect("/homeloggedin");
          });
      }
  });
});

// **** Loging in a user *****
app.post('/login',
  passport.authenticate('local',{failureRedirect: '/login'}),
  (req, res)=>{ 
  res.redirect('/homeloggedin'); 
  });



const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log(`Server is listing at ${PORT}`);
});
