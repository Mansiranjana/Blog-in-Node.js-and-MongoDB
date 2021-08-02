require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require('lodash');

const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static("public"));

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


// app.use(function(req,res,next){
//   res.locals.isAuthenticated=req.isAuthenticated();
//   next();
// });

const homeStartingContent = "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

mongoose.connect("mongodb://localhost:27017/blogDB", {
  useNewUrlParser: true
});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,

});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

//Creating mongoose model after creating Schema
const User = new mongoose.model("User", userSchema);
const Post = mongoose.model("Post", postSchema);


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
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));



app.get("/", function(req, res) {
  var mysort = {
    _id: -1
  };
  Post.find({}, function(err, posts) {
    res.render("home", {
      startingContent: homeStartingContent,
      posts: posts
    });
  }).sort(mysort);

});



app.get("/auth/google",
  passport.authenticate('google', {
    scope: ["profile"]
  })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', {
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Successful authentication, redirect to myblog.
    res.redirect("/myblog");
  });


app.get("/about", function(req, res) {
  res.render("about", {
    aContent: aboutContent
  });
});

app.get("/contact", function(req, res) {
  res.render("contact", {
    aContact: contactContent
  });
});
app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/myblog", function(req, res) {
  if (!req.isAuthenticated()) {
    res.redirect("/login");
  } else {
    var userid = req.user.id;

    Post.find({
      postedBy: userid
    }, (err, posts) => {
      if (err) {
        console.log(err);
      } else {
        res.render("myblog", {
          currentUser: req.user,
          posts: posts
        });
      }

    });
  }
});

app.get("/compose", function(req, res) {
  if (req.isAuthenticated()) {
    console.log(req.user.id)
    res.render("compose");
  } else {
    res.redirect("/login");
  }
});

app.post("/compose", function(req, res) {
  const post = new Post({
    title: req.body.posTitle,
    content: req.body.postContent,
    postedBy: req.user.id
  });

  post.save(function(err) {
    if (!err) {
      res.redirect("/");
    }
  });
});


app.get('/posts/:postId', function(req, res) {
  const requestedPostId = req.params.postId;
  Post.findOne({
    _id: requestedPostId
  }, function(err, post) {

    res.render("post", {

      title: post.title,

      content: post.content

    });

  });
});



app.get("/edit/:postId", (req, res) => {
  const requestedPostId = req.params.postId;

  Post.findById({
    _id: requestedPostId
  }, function(err, post) {


    res.render("edit", {
      post: post

    });


  });
});


app.post("/edit/:postId", function(req, res) {
  const requestedPostId = req.params.postId;
  var userid = req.user.id;
  Post.findByIdAndUpdate({
      _id: requestedPostId
    }, {

      title: req.body.title,
      content: req.body.content,
      postedBy: userid
    }

    , {
      overwrite: true
    }, (function(err, update) {
      if (err) {

        console.log(err);
      } else {

        res.redirect("/myblog")
      }



    }));
});



app.get("/logout", function(req, res) {
  req.logout();

  res.redirect("/");
});





app.post("/register", function(req, res) {

  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/compose");
      });
    }
  });

});

app.post("/login", function(req, res) {

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {

      passport.authenticate("local")(req, res, function() {
        const userid = req.user.id;
        console.log(userid);

        // let username = req.cookies.username;
        // res.cookie("username", username);
        // console.log(username);
        res.redirect("/compose");
      });
    }
  });

});

app.post("/delete", (req, res) => {
  const deletePost = req.body.delete;

  Post.findByIdAndDelete(deletePost, (err) => {
    if (!err) {
      res.redirect("/");
    }
  });
});


app.listen(3000, function() {
  console.log("Server started on port 3000");
});
