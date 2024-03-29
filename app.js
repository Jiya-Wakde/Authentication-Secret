require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: "I am always gonna be a main character.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://127.0.0.1:27017/userDB')
  .then(() => console.log('Connected!'));

const userSchema =  new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
    res.render("home");
});

app.get("/auth/google", 
    passport.authenticate("google", {scope: ["profile"]})
);

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/secrets");
  });

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/secrets", function(req, res){

  User.find({"secret": {$ne: null}}).then(function(foundUsers){
    res.render("secrets", {usersWithSecrets: foundUsers});
  })
  .catch(function(err){
    console.log(err);
  });

});

app.get("/logout", function(req, res){
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
});

app.get("/submit", function(req, res){
  if(req.isAuthenticated()){
    res.render("submit");
} else {
    res.redirect("/login");
};
});

app.post("/register", function(req, res){
    User.register({username: req.body.username , active: false}, req.body.password , function(err, user) {
        if (err) { 
            console.log(err);
            res.redirect("/register");
         } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets")
            });
         }
      });
});

app.post("/login", function(req, res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err){
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/submit", function(req, res){
  const submitedSecret = req.body.secret;
  console.log(req.user.id)

   User.findById(req.user.id).then(function(foundUser){
        foundUser.secret = submitedSecret;
        foundUser.save().then(
          res.redirect("/secrets")
      )
      .catch(function(err){
        console.log(err);
      })
      .catch(function(err){
        console.log(err);
      });   
    });
});

app.listen(3000, function(){
    console.log("Server is up and running on port 3000");
});