
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect('mongodb://127.0.0.1:27017/userDB')
  .then(() => console.log('Connected!'));

const userSchema =  new mongoose.Schema({
    email: String,
    password: String
});

const secret = "Thisisourlittlesecret";
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });

const User = new mongoose.model("User", userSchema);

app.get("/", function(req, res){
    res.render("home");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/login", function(req, res){
    res.render("login");
});

app.post("/register", function(req, res){
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });

    newUser.save().then(function(){
        res.render("secrets");
    })
    .catch(function(err){
        console.log(err);
    })
});

app.post("/login", function(req, res){
    const userName = req.body.username;
    const userPassword = req.body.password;

    User.findOne({email: userName}).then(function(userFound){
        if(userFound){
            if(userFound.password === userPassword){
                res.render("secrets");
            } else {
                res.send ("<h1>Sorry there must be a typo, please check and try angain.</h1>");
            };
        }

    })
    .catch(function(err){
      console.log(err);
    });
});

app.listen(3000, function(){
    console.log("Server is up and running on port 3000");
});