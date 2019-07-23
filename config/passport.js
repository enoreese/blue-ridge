const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
TwitterStrategy = require('passport-twitter').Strategy;
const config = require('./secret');
const User = require('../models/user');

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


/* Sign in using Email and Password */
passport.use('local-login', new LocalStrategy({
  // by default, local strategy uses username and password, we will override with email
  usernameField : 'email',
  passwordField : 'password',
  passReqToCallback : true // allows us to pass back the entire request to the callback
}, function(req, email, password, done) { // callback with email and password from our form

  // find a user whose email is the same as the forms email
  // we are checking to see if the user trying to login already exists
  User.findOne({ email:  email }, function(err, user) {
    // if there are any errors, return the error before anything else
    if (err)
    return done(err);

    // if no user is found, return the message
    if (!user)
    return done(null, false, req.flash('error', 'No user found.')); // req.flash is the way to set flashdata using connect-flash

    // if the user is found but the password is wrong
    if (!user.comparePassword(password))
    return done(null, false, req.flash('error', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata

     // Make sure the user has been verified
  //  if (!user.isVerified) 
  //  return done(null, false, req.flash('loginMessage', 'Your account has not been verified!')); 

    // all is well, return successful user
    return done(null, user);
  });

}));


/* Sign up with twitter */
// passport.use(new TwitterStrategy({
//   consumerKey: config.TWITTER_CONSUMER_KEY,
//   consumerSecret: config.TWITTER_CONSUMER_SECRET,
//   callbackURL: "http://app.kureen.co/auth/twitter/callback"
// },
// function(token, tokenSecret, profile, done) {
//   User.findOne({twitter_id: profile.id}, function(err, user) {
//     if (err) { return done(err); }

//     if (!user){
//       var new_user = new User();
//       new_user.twitter_id = profile.id;
//       new_user.email = profile.emails[0].value;
//       new_user.twitter_object.id = profile.id;
//       new_user.twitter_object.display_name = profile.displayName;
//       new_user.twitter_object.name.family_name = profile.name.familyName;
//       new_user.twitter_object.name.given_name = profile.name.givenName;
//       new_user.twitter_object.name.middle_name =profile.name.middleName;
//       new_user.emails.forEach((email)=> {
//         new_user.twitter_object.emails.push({
//           value: email.value,
//           type: email.type
//         })
//       })
//       profile.photos.forEach((photo)=> {
//         new_user.twitter_object.photos.push({
//           value: photo.value
//         })
//       })

//       new_user.save((err)=>{
//         if (err) {return next(err);}

//         done(null, new_user);
//       })
//     }else{
//       done(null, user);
//     }    
//   });
// }
// ));


exports.isAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect('/auth/login');
}
