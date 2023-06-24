require('dotenv').config();
//console.log(process.env)
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.json());
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

 //mongoose.connect('mongodb://127.0.0.1:27017/coLab');
const uri = process.env.MONGODB_URI;
mongoose.connect(uri,{ useNewUrlParser: true });

const userSchema = new mongoose.Schema({
    email: String,
    password:String,
    googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
// use static serialize and deserialize of model for passport session support
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
done(null, user);
});
//  passport.deserializeUser(function(id, done){
//     User.findById(id, function(err, user){
//         done(err, user);
//     });
//   });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/success"
  },
  function(accessToken, refreshToken, profile, cb) {
    //console.log(profile);
    User.findOrCreate({username: profile.displayName, googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
    res.sendFile(__dirname+"/index.html");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
  );

  app.get('/auth/google/success', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect success.
    res.redirect('/success');
  });

app.get("/register", function(req, res){
    res.sendFile(__dirname+"/register.html");
});

app.get("/login", function(req, res){
    res.sendFile(__dirname+"/login.html");
});

app.get("/success", function(req, res){
    if(req.isAuthenticated()){
        res.sendFile(__dirname + "/success.html");
    }
    else{
        res.redirect("/login");
    }
});

app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/login');
    });
  });

app.post("/", function(req, res){
    console.log(req.body.username);
    console.log(req.body.pwd);
    res.send("Thanks for posting that");
});

app.post("/register", function(req, res){
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("local")(req, res, function(){
                //res.send("You have successfylly registered");
                res.redirect("/success");
            })
        }
    })
});

app.post("/login", function(req, res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function(err){
        if(err){
            console.log(err);
        }
        else{
            passport.authenticate("local")(req, res, function(){
                //res.send("You have successfylly registered");
                res.redirect("/success");
            });
        }
    });
});

let port = process.env.PORT;
if(port == "" || port == null){
    port = 3000;
}
app.listen(port, function(){
    console.log("Server has started successfully");
});