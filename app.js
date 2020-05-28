//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _  = require('lodash');
const Request = require('request');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

var editText, editTitle;
var editedId;
var isEdited = 0;

const homeStartingContent = "Bine ai venit pe pagina principala a blogului meu, TECH JOURNAL. Acest blog este legat in totalitate de noutatile din domeniul IT din Romania si din restul lumii. Sper sa iti placa aceasta idee si, de asemenea, daca vrei sa aflii mai multe, nu uita sa te abonezi la newsletter-ul meu zilnic, astfel vei primi zilnic noutatile importante de pe blog.";
const aboutContent = "Salut! Numele meu este Darius Capolna, sunt elev in clasa XII MI la Colegiul National Pedagogic 'Regina Maria' Deva iar acesta este proiectul meu pentru atestatul de informatica. Am o pasiune pentru tot ceea ce tine de informatica, in mod special algoritmica. In clasa a XI-a am reusit sa obtin locul I la Olimpiada Judeteana de Informatica, in clasa a XII reusind mai apoi sa ma calific la faza Nationala. Am realizat acest proiect incercand sa folosesc tot ceea ce am invatat pana la momentul actual legat de programare WEB.";
const contactContent = "Pentru a ma contacta, accesati unul din urmatoarele link-uri sau imi puteti trimite un mail : dariuscapolna@yahoo.com";

const app = express();
const adminId = "dariuscapolna@yahoo.com";

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
  }));

app.use(passport.initialize());
app.use(passport.session());

var db1 = mongoose.createConnection("mongodb+srv://DariusDC:darkus123@cluster0-yujmk.mongodb.net/userDB", { useNewUrlParser: true,  useUnifiedTopology: true  });
var db2 = mongoose.createConnection("mongodb+srv://DariusDC:darkus123@cluster0-yujmk.mongodb.net/blog", { useNewUrlParser: true,  useUnifiedTopology: true  });

mongoose.set("useCreateIndex", true);  

const postSchema = {
    title: String,
    text: String
}

const userSchema = new mongoose.Schema({
    username: String,
    password: String
});

userSchema.plugin(passportLocalMongoose);

const User = db1.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

const Post = db2.model("Post", postSchema);

const post1 = new Post({
    title: "Test",
    text: "Acesta este un test"
});

// post1.save();


//////////// Register & Login /////////////////

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", (req, res) => {
    //Facem un nou
    User.register({username: req.body.username}, req.body.password, (err, user) =>{
        if (err) {
            console.log(err);
            res.redirect("/register"); 
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/");
            });
        }
    });

});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    //Facem userul
    
    if (req.isAuthenticated()){
        res.redirect("/");
    } else {
        const user = new User({
            username: req.body.username,
            password: req.body.password
        });
    
        req.login(user, (err) =>{
            if (err) {
                console.log(err);
                res.redirect("/login");
            } else {
                passport.authenticate("local")(req, res, () => {
                    res.redirect("/");
                });
            }
        });
        
    }

});

app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
});


app.get("/", (req, res) => {

    res.redirect("/page/1");
});



app.get("/page/:pg", async(req, res) => {
    
    var page = req.params.pg || 1
    const limit = 5
    page = parseInt(page)
    
    var prev, nxt
    if (page > 1)
        prev = 1
    else 
        prev = 0
    
    var count;
    count = await Post.countDocuments().exec()

     if (page*limit < count)
        nxt = 1
    else
         nxt = 0
     console.log(count, page)
    Post.find({}).limit(limit).skip( Math.max(count - page * limit, 0) ).exec((err, post) => {
        if (err) {
            console.log(err);
        } else {
            res.render("home", {HomeText: homeStartingContent, posts: post, page: page, prev: prev, next: nxt})
        }
    })

})



app.get('/posts/:currentPost', (req, res) => {
    Post.findOne({_id: req.params.currentPost}, (err, foundPost) => {
        if (err){
            console.log("Not found");
        }
        else {
            editTitle = foundPost.title;
            editText = foundPost.text;
            editedId = foundPost._id;

            var adminRights;
            if (req.isAuthenticated() && req.user.username === adminId)
                adminRights = 1;
            else
                adminRights = 0;

            res.render('post', {post: foundPost, adminConnected: adminRights});
        }
    });
});


app.get("/compose", (req, res) => {

    if (req.isAuthenticated() && req.user.username=== adminId) {
        res.render("compose", {
            editTitle: "",
            editText: ""
        });
    } else {
        res.redirect("/");
    }

});


app.post("/compose", (req, res) => {
    var newTitle = req.body.titleBox;
    var newText = req.body.textBox;

    //Adaugam noua postare in baza de date
    if (!isEdited)
    {
        const newPost = new Post({
            title: newTitle,
            text: newText
        });
        console.log("Nu editam");
        newPost.save();
    }
    else {
        console.log("Editam");
        console.log(editedId);
        
        Post.findOneAndUpdate(
            {_id: editedId},
            {$set: {text: newText, title:newTitle}},
            (err, doc) => {
                if (err)
                    console.log("err");
                console.log("e ook");
            }
        )
        isEdited = 0;
    }
    res.redirect("/");
    
});

var editTitle = "";
var editText = "";

app.get('/compose/edit', (req, res) => {
    res.render('compose', {editTitle: editTitle, editText: editText});
});


 app.post("/edit", (req, res) => {

    isEdited = 1;
    res.redirect('compose/edit');
 });

app.post("/delete", (req, res) => {

    const currentId = req.body.deleteBTN;
    
    Post.findByIdAndDelete(currentId, (err) => {
        if (err){
            console.log(err);
        }
        else {
            res.redirect('/');
        }
    });

    // for (var i = 0; i < posts.length; i++) {
    //     if (_.kebabCase(posts[i].title) ===  _.kebabCase(shownPost.title))
    //        {
    //         posts.splice(i, 1);
    //         console.log("Eliminat la pozitia " + i);
    //        }
    // }

});


app.get("/contact", (req, res) => {

    res.render("contact", {ContactText: contactContent});
});


app.get("/about", (req, res) => {
    res.render("about", {AboutText: aboutContent});
});




// Newsletter


app.get("/newsletter", function(req, res){
    res.render('newsletter');
})

app.post("/newsletter", function(req, res){
    var fName = req.body.inputFirst;
    var lName = req.body.inputLast;
    var Email = req.body.inputEmail;

    console.log(fName, lName, Email);

    //construct required data
    const data = {
        members: [
          {
            email_address: Email,
            status: 'subscribed',
            merge_fields: {
              FNAME: fName,
              LNAME: lName
            }
          }
        ]
      };
    
    const postData = JSON.stringify(data);

    const options = {
        url: 'https://us8.api.mailchimp.com/3.0/lists/3ba3c3b202',
        method: 'POST',
        headers: {
           Authorization: 'auth 0f04f636621091d55a8398cc1afff8a7-us8'
        },
        body: postData
    };

    Request (options, function(error, response, body){
        if (error)
            console.log(error);
        else
            console.log(response.statusCode);
            
        if (error)
            res.redirect('/failure')
        else{
            if (response.statusCode === 200)
                res.redirect("/succes");
            else
               res.redirect('/failure');
        }
    });

});

app.get('/succes', (req, res) => {

    res.render("succes");
})

app.get('/failure', (req, res) => {

    res.render('failure');
})

app.post("/failure", function(req, res){
    res.redirect("/newsletter");
});




//API Key
// 0f04f636621091d55a8398cc1afff8a7-us8

//Lists
//ID : 3ba3c3b202
//Authrozation : darius1

var PORT = process.env.PORT || 3000;

app.listen(PORT, function(){

    console.log("Server started on port " + PORT);
});
