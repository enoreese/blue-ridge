const router = require('express').Router();
const passport = require('passport');
const crypto = require("crypto");
const sgMail = require('@sendgrid/mail');
const User = require('../models/user');
const Token = require('../models/token');
const config = require('../config/secret');
const Code = require('../models/code');
const africastalking = require('africastalking');
var unirest = require('unirest');

const admin = 1;
const kustomer = 2;
const kureener = 3;


/* SIGNUP ROUTE */
router.route('/register')
  .get((req, res, next) => {
    res.render('auth/register', { page: 'Sign Up' });
  })
  .post((req, res, next) => {
    User.findOne({ email: req.body.email }, function (err, existingUser) {
      if (existingUser) {
        if (existingUser.isVerified === false) {
          console.log('not verified email')
          req.flash('error', 'A verification email was sent to ' + user.email + '. Please verify your email')
          res.redirect('/auth/register')
        } else {
          req.flash('failure', 'User already exists!')
          return res.redirect('/auth/register');
        }
      } else {

        const user = new User();
        const { fullname, email, password, rpassword } = req.body;
        if (!fullname || !email || !password || !rpassword) {
          req.flash('error', 'Please enter input fields');
          return res.redirect('/auth/register')
        }

        if (password != rpassword) {
          req.flash('error', 'Passwords do not match');
          return res.redirect('/auth/register')
        }
        user.fullname = fullname;
        user.email = email;
        user.password = password;
        user.role = kustomer;
        user.photo = user.gravatar();
        user.save(function (err) {
          if (err) {
            req.flash('error', err.message);
            return next(err);
          }
          // Create a verification token for this user
          var token = new Token({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });

          // Save the verification token
          token.save(function (err) {
            if (err) { req.flash('error', err.message); }

            sgMail.setApiKey(config.sendgrid_key);
            const msg = {
              to: user.email,
              from: 'Kureen Homes <noreply@kureen.co>',
              subject: 'Account Verification Token',
              html: '<p>Hello,\n\n' + 'Please verify your account by clicking this link: \nhttp:\/\/' + req.headers.host + '\/confirmation\/' + token.token + '.\n</p>',
              templateId: 'd-5c6a81387a8f4e9fbaae472dbda2f790',
              dynamic_template_data: {
                name: user.fullname,
                address: 'http:\/\/' + req.headers.host + '\/confirmation\/' + token.token + '.',
              }
            }
            sgMail.send(msg)
            req.flash('success', 'A verification email has been sent to ' + user.email + '.')
            req.logIn(user, function (err) {
              if (err) return next(err);
              res.redirect('/auth/login')
            });
          })
        });
      }
    });
  });


//TOKEN CONFIRMATION 
router.get('/confirmation/:token_id', (req, res, next) => {
  // Find a matching token
  Token.findOne({ token: req.params.token_id }, function (err, token) {
    if (!token) {
      req.flash('error', 'We were unable to find a valid token. Your token may have expired, <a href=\"/resend\">Click here to resend token</a>')
      return res.redirect('/auth/login')
    }

    // If we found a token, find a matching user
    User.findOne({ _id: token._userId }, function (err, user) {
      if (!user) {
        req.flash('error', 'We were unable to find a user for this token.')
        return res.redirect('/register')
      }

      if (user.isEmailVerified) {
        req.flash('error', 'This users email has already been verified.');
        return res.redirect('/login')
      }

      // Verify and save the user
      user.isVerified = true;
      user.save(function (err) {
        if (err) return next(err);
        console.log(user)
        req.flash('success', 'Your account has been verified. Please log in.');
        return res.redirect('/login');
      });
    });
  });
});

/* TWITTER ROUTE */
// router.get('/twitter', passport.authenticate('twitter'));

/* TWITTER CALLBACK ROUTE */
// router.get('/auth/twitter/callback',
//   passport.authenticate('twitter', {
//     successRedirect: '/dashboard', // redirect to the secure profile section
//     failureRedirect: '/auth/login', // redirect back to the login page if there is an error
//     failureFlash: true // allow flash messages
//   }));


/* SIGNUP ROUTE */
router.route('/login')
  .get((req, res, next) => {
    res.render('auth/login', { page: 'Sign In' });
  })
  .post(passport.authenticate('local-login', {
    successRedirect: '/dashboard', // redirect to the secure profile section
    failureRedirect: '/auth/login', // redirect back to the login page if there is an error
    failureFlash: true // allow flash messages
  }));

// Function to generate 8 digit numbers
function getRandom(length) {
  return Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1));
}






module.exports = router;