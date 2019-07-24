const router = require('express').Router();
const crypto = require("crypto");
const mongoose = require('mongoose')
const async = require("async");
const sgMail = require('@sendgrid/mail');
const passportConfig = require('../config/passport');
const User = require('../models/user');
const Review = require('../models/review');
const UserDetails = require('../models/userdetails');
const Subscription = require('../models/subscription');
const Token = require('../models/token');
const Code = require('../models/code');
const multer = require('multer');
const middleware = require("../middleware");
const upload = require('./upload');
const africastalking = require('africastalking');
const Activity = require('../models/activity');
const Card = require('../models/cards');
const unirest = require('unirest');
const config = require('../config/secret');
var request = require('request');
var paystack = require("paystack-api")(config.paystack_sk);


var Transactions = paystack.transaction;

// User DashBoard
router.route('/dashboard')
  .get(middleware.isLoggedIn, (req, res, next) => {
    User.findOne({ _id: req.user._id }, function (err, user) {
      if (err) return next(err)
      if (!user) {
        req.flash('error', 'User does not exist');
        res.redirect('/auth/login');
      }
      console.log('here')

      Activity.find({ owner: user._id }, (err, activities) => {
        if (err) return next(err);

        var notifications = []
        activities.forEach((activity) => {
          if (activity.read === false) {
            notifications.push({
              content: activity.content,
              created: timeDifference(activity.created)
            });
          }
        })
        if (user.role === 2) {
          console.log(user)
          res.render('customer/dashboard', { user: user, notifications: notifications, page: 'Dashboard' })
        }
      })      
    })
  })
  .post(middleware.isLoggedIn, (req, res, next) => {
    Code.findOne({ code: req.body.verification }, function (err, code) {
      if (err) return next(err);
      // Checking if code exists
      if (!code) {
        req.flash('error', 'Code does not exists, or may have expired')
        return res.redirect('/sms-verification')
      }

      User.findOne({ _id: code._userId }, function (err, user) {
        // Checking if user owns code
        if (!user) {
          req.flash('error', 'We were unable to find a user for this code.')
          return res.redirect('/sms-verification')
        }

        //Checking if user is verified already 
        if (user.isVerified === true) {
          req.flash('error', 'This user has already been verified.');
          return res.redirect('/sms-verification')
        }

        user.isVerified = true;
        user.save(function (err) {
          if (err) return next(err);
          console.log(user)
          req.flash('success', 'Your account has been verified. Please Continue.');
          return res.redirect('/user-registration');
        });
      })

    })
  })


router.route('/transactions')
  .get(middleware.isLoggedIn, (req, res, next) => {
    User.findOne({ _id: req.user._id }, function (err, user) {
      if (err) return next(err)
      if (!user) {
        req.flash('error', 'User does not exist');
        res.redirect('/auth/login');
      }

      console.log('dashboard')

      if (user.role === 2) {
        console.log(user)
        res.render('customer/transactions', { user: user, page: 'Transactions' })
      }

    })
  })

router.post('/change-password', middleware.isLoggedIn, (req, res, next) => {
  User.findById({ _id: req.user._id }, function (err, user) {
    if (err) return next(err);

    var old_password = req.body.old_password,
      new_password = req.body.new_password,
      conf_password = req.body.conf_password;

    var is_same = user.comparePassword(old_password);
    if (is_same === false) {
      req.flash('error', 'Your old password is incorrect!')
    }

    if (old_password === "" || new_password === "" || conf_password === "") {
      req.flash('error', 'All fields are required!');
      res.redirect('/settings');
    }
    if (new_password !== conf_password) {
      req.flash('error', 'New password and confirm password do not match!')
    }

    user.password = new_password;
    user.save((err) => {
      if (err) return next(err);

      var activity = new Activity();
      activity.owner = user._id;
      activity.content = "Password was changed!";
      activity.color = "yellow";
      activity.markModified('Activity');

      activity.save((err) => {
        if (err) return next(err);

        req.flash('success', 'Your password has been changed successfully');
        res.redirect('/settings');
      })
    })
  })
})


router.route('/profile')
  .get(middleware.isLoggedIn, (req, res, next) => {
    User.findById({ _id: req.user._id }, function (err, user) {
      if (err) return next(err)
      if (!user) {
        req.flash('error', 'User does not exist');
        res.redirect('/auth/login');
      }

      console.log('Profile route');

      Activity.find({ owner: user._id }, (err, activities) => {
        if (err) return next(err);

        var notifications = []
        activities.forEach((activity) => {
          if (activity.read === false) {
            activity.created = timeDifference(activity.created);
            notifications.push(activity);
          }
        })
        if (user.role === 2) {
          console.log(user)
          res.render('customer/profile', { user: user, notifications: notifications, page: 'Profile' })
        }
      })
    })
  })
  .post(middleware.isLoggedIn, (req, res, next) => {
    User.findById({ _id: req.user._id }, function (err, user) {
      if (err) return next(err);

      console.log(req.body)

      if (!user) {
        req.flash('error', 'User does not exist');
        res.redirect('/auth/login');
      }

      if (req.body.fullname) {
        user.fullname = req.body.fullname
      }
      if (req.body.gender) {
        user.gender = req.body.gender;
      }
      if (req.body.dob) {
        user.dob = req.body.dob;
      }
      if (req.body.address) {
        user.address = req.body.address;
      }
      if (req.body.state) {
        user.state = req.body.state
      }
      if (req.body.city) {
        user.city = req.body.city;
      }
      if (req.body.country) {
        user.country = req.body.country;
      }
      if (req.body.zip) {
        user.zip = req.body.zip;
      }

      if (req.body.twitter) {
        user.twitter = req.body.twitter;
      }
      if (req.body.instagram) {
        user.instagram = req.body.instagram;
      }

      if (req.body.fxcm_api_key) {
        user.fxcm_api_key = req.body.fxcm_api_key;
      }
      if (req.body.fxcm_api_secret) {
        user.fxcm_api_secret = req.body.fxcm_api_secret;
      }

      user.save((err) => {
        if (err) next(err);

        var activity = new Activity();
        activity.owner = user._id;
        activity.content = "Profile was updated!";
        activity.color = "blue";
        activity.markModified('Activity');

        activity.save((err) => {
          if (err) return next(err);

          req.flash('success', 'Profile updated successfully');
          res.redirect('/profile');
        })
      })

    })
  })

  router.route('/new-bot')
  .get(middleware.isLoggedIn, (req, res, next) => {
    User.findOne({ _id: req.user._id }, function (err, user) {
      if (err) return next(err)
      if (!user) {
        req.flash('error', 'User does not exist');
        res.redirect('/auth/login');
      }

      console.log('New Bot route');

      Activity.find({ owner: user._id }, (err, activities) => {
        if (err) return next(err);

        var notifications = []
        activities.forEach((activity) => {
          if (activity.read === false) {
            activity.created = timeDifference(activity.created);
            notifications.push(activity);
          }
        })

        if (user.role === 2) {
          console.log(user)
          res.render('customer/new_bot', { user: user, notifications: notifications, page: 'New Bot' })
        }
      })

    })
  })

router.route('/settings')
  .get(middleware.isLoggedIn, (req, res, next) => {
    User.findOne({ _id: req.user._id }, function (err, user) {
      if (err) return next(err)
      if (!user) {
        req.flash('error', 'User does not exist');
        res.redirect('/auth/login');
      }

      console.log('Settings route');

      Activity.find({ owner: user._id }, (err, activities) => {
        if (err) return next(err);

        var notifications = []
        activities.forEach((activity) => {
          if (activity.read === false) {
            activity.created = timeDifference(activity.created);
            notifications.push(activity);
          }
        })

        if (user.role === 2) {
          console.log(user)
          res.render('customer/settings', { user: user, notifications: notifications, page: 'Settings' })
        }
      })

    })
  })



// FORGOTTEN PASSWORD
router.post('/forgot', (req, res, next) => {
  async.waterfall([

    function (done) {
      crypto.randomBytes(16, function (err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },

    function (token, done) {
      User.findOne({ email: req.body.email }, function (err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.passwordResetToken = token;
        user.passwordResetExpires = Date.now() + 3600000; // 1 hour

        user.save(function (err) {
          done(err, token, user);
        });
      });
    },

    function (token, user, done) {
      sgMail.setApiKey(config.sendgrid_key);
      const msg = {
        to: user.email,
        from: 'BoroMe <noreply@kureen.co>',
        subject: 'Password Reset',
        html: '<p>' + 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' + 'If you did not request this, please ignore this email and your password will remain unchanged.\n </p>',
      }
      sgMail.send(msg, function (err) {
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      })
    }
  ],

    function (err) {
      if (err) return next(err);
      res.redirect('/forgot');
    })
})

// PASSWORD RESET
router.route('/reset/:token')
  .get((req, res) => {
    User.findOne({
      passwordResetToken: req.params.token,
      passwordResetExpires: {
        $gt: Date.now()
      }
    }, function (err, user) {
      if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot');
      }
      res.render('web/reset', {
        user: req.user
      });
    });
  })
  .post((req, res) => {
    async.waterfall([
      function (done) {
        User.findOne({
          passwordResetToken: req.params.token,
          passwordResetExpires: {
            $gt: Date.now()
          }
        }, function (err, user) {
          if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('back');
          }

          user.password = req.body.password;
          user.resetPasswordToken = undefined;
          user.resetPasswordExpires = undefined;

          user.save(function (err) {
            req.logIn(user, function (err) {
              done(err, user);
            });
          });
        });
      },
      function (user, done) {
        sgMail.setApiKey(config.sendgrid_key);
        const msg = {
          to: user.email,
          from: 'BoroMe <noreply@kureen.co>',
          subject: 'Your password has been changed',
          text: 'Hello,\n\n' +
            'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
        };
        sgMail.send(msg, function (err) {
          req.flash('success', 'Success! Your password has been changed.');
          done(err);
        });
      }
    ], function (err) {
      res.redirect('/reset/' + req.params.token);
    });
  });


//RESEND EMAIL CONFIRMATION TOKEN
router.route('/resend')
  .get((req, res, next) => {
    res.render('web/token_resender')
  })
  .post((req, res, next) => {
    User.findOne({ email: req.body.email }, function (err, user) {
      if (!user) {
        req.flash('error', 'We were unable to find a user with that email.')
        return res.redirect('/resend')
      }
      if (user.isVerified) {
        req.flash('success', 'This account has already been verified. Please log in.')
        return res.redirect('/auth/login')
      }

      // Create a verification token, save it, and send email
      var token = new Token({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });

      // Save the verification token
      token.save(function (err) {
        if (err) { req.flash('error', err.message); }

        sgMail.setApiKey(process.env.SENDGRID_MAIL);
        const msg = {
          to: user.email,
          from: 'BoroMe <noreply@kureen.co>',
          subject: 'Account Verification Token',
          html: '<p>Hello,\n\n' + 'Please verify your account by clicking this link: \nhttp:\/\/' + req.headers.host + '\/confirmation\/' + token.token + '.\n</p>',
        }
        sgMail.send(msg)
        req.flash('success', 'A verification email has been sent to ' + user.email + '.')
        return res.redirect('/resend')
      })
    })
  })

// USER DETAILS
router.get('/notification/:id', (req, res, next) => {
  Activity.findById({ _id: req.params.id }, function (err, notification) {
    console.log(notification)
    if (err) throw err;
    if (notification) {
      var notificationObj = {}
      notification.read = true
      notification.save(function (err) {
        Subscription.findById({ _id: notification.loan }, (err, loan) => {
          notificationObj.content = notification.content;
          notificationObj.amount = loan.amount;
          console.log(notificationObj)
          res.render('customer/view_notification', { notification: notificationObj })
        })
        // res.redirect('/transactions')
      })
    }
  })
})

// USER DETAILS
router.get('/notification/all/:id', (req, res, next) => {
  Activity.find({ recepient: req.params.id }, function (err, notifications) {
    console.log(notifications)
    if (err) throw err;
    if (notifications) {
      notifications.forEach((notification) => {
        notification.read = true
        notification.save(function (err) {

        })
      })
      res.redirect('/transactions')
    }
  })
})

router.post('/paystack-webhook', (req, res, next) => {
  var hash = crypto.createHmac('sha512', process.env.TEST_PAYSTACK_KEY).update(JSON.stringify(req.body)).digest('hex');
  if (hash == req.headers['x-paystack-signature']) {
    // Retrieve the request's body
    var event = req.body;
    console.log(event)
    // Do something with event  
    if (event.event === "charge.success") {
      if (event.data.channel === "ussd") {
        var loanId = event.data.metadata.custom_fields[0].value;
        Subscription.findById({ _id: loanId }, function (err, loan) {
          console.log(loan)
          if (err) throw err;
          if (loan) {
            loan.hasPaid = true;
            loan.dateRepaid = Date.now();
            loan.Refno = event.data.reference;
            loan.save(function (err) {
              User.findById({ _id: req.user._id }, (err, user) => {
                var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
                var diffDays = Math.round(((Date.now() - loan.returndate / (oneDay))));
                var now = Date.now()
                // user.hasPaid = true
                user.hasApplied = false
                if (now.toString() === loan.returndate.toString()) {
                  user.creditScore = user.creditScore + 20
                }
                if (parseInt(diffDays) === 1) {
                  user.creditScore = user.creditScore + 30
                }
                if (parseInt(diffDays) >= 7 && parseInt(diffDays) < 14) {
                  user.creditScore = user.creditScore + 35
                }
                if (parseInt(diffDays) >= 14) {
                  user.creditScore = user.creditScore + 40
                }
                user.save((err) => {
                  res.redirect('/dashboard')
                })
              })
            })
          }
        })
      }
    }
  }
})


router.get('/initialize/:email', (req, res, next) => {
  var auth = ''
  Transactions.initialize({
    email: req.params.email,
    amount: 50 * 100
  }, function (error, body) {
    if (!error) {
      console.log(body)
      // res.setHeader("Content-Type", "application/javascript");
      // res.send(JSON.stringify(body.data));
      // return;
      res.redirect(JSON.stringify(response.body.data.authorization_url))

    }
    // response.writeHead(400, {"Content-Type": "application/javascript"});
    // response.end(error.toString());
  })
  // request.post(
  //     'https://api.paystack.co/transaction/initialize',
  //     {
  //       json: {
  //         // data: {
  //         'email': req.body.email,
  //         'amount': 50*100,
  //         // }
  //       },
  //       headers: {
  //         'Authorization': 'Bearer ' + process.env.TEST_PAYSTACK_SECRET,
  //         'Content-Type': 'application/json'
  //       }
  //     },
  //     function (error, response, body) {
  //       if (!error && response.statusCode == 200){
  //         console.log(response.body)
  //         // res.json({
  //         //   authorization_url: response.body.data.authorization_url
  //         // })
  //         auth = response.body.data.authorization_url
  //         console.log(response.body.data.authorization_url)

  //       }
  //     }
  // )
  // console.log(auth)
  // res.json({auth})
})

router.get('/paystack-callback/:id', (req, res, next) => {
  console.log(req.body)
  var url = '/verify-ref/' + req.params.ref
  res.redirect(url)
})

//Verify Payment
router.get('/verify-ref/:ref', (req, res, next) => {
  var url = 'https://api.paystack.co/transaction/verify/' + req.params.ref
  request.get(
    url,
    {
      headers: {
        'Authorization': 'Bearer ' + process.env.TEST_PAYSTACK_SECRET,
        'Content-Type': 'application/json'
      }
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {

        body = JSON.parse(body)
        console.log(body)

        Card.find({ owner: req.user._id }, (err, cards) => {
          console.log('1')
          console.log(req.body)
          var auth = body.data.authorization
          var cust = body.data.customer

          var last4 = auth.last4

          cards.forEach((card) => {
            if (card) {


              if (last4 === card.last4 && card.expMonth === auth.exp_month) {
                req.flash('Error', 'Card already exists')
                res.redirect('/banking-info')
              }
            }
          })
          console.log('2')
          User.findById({ _id: req.user.id }, (err, user) => {
            console.log(user)
            console.log('3')
            var card = new Card({
              owner: req.user.id,
              last4: last4,
              authorization_code: auth.authorization_code,
              expMonth: auth.exp_month,
              expYear: auth.exp_year,
              brand: auth.brand,
              channel: auth.channel,
              card_type: auth.card_type,
              bank: auth.bank,
              country_code: auth.country_code,
              reusable: auth.reusable,
              signature: auth.signature,
              customer: {
                id: cust.id,
                first_name: cust.first_name,
                last_name: cust.last_name,
                email: cust.email,
                customer_code: cust.customer_code,
                phone: cust.phone,
                risk_action: cust.risk_action
              }
            })
            card.save((err) => {
              console.log('4')
              User.update(
                {
                  _id: req.user.id
                },
                {
                  $push: { cards: card._id }
                }, function (err, count) {
                  console.log('5')
                  if (err) {
                    return next(err)
                  }

                  req.flash('success', 'Card added Successfully')
                  res.redirect('/banking-info')
                }
              )
            })
          })
        })
      } else {
        req.flash('error', 'Could not charge card')
        res.redirect('/banking-info')
      }
    }
  )
})


//Verify Add Card on Subscription Apply Page
router.get('/verify-addcard/:ref', (req, res, next) => {
  var url = 'https://api.paystack.co/transaction/verify/' + req.params.ref
  request.get(
    url,
    {
      headers: {
        'Authorization': 'Bearer ' + process.env.TEST_PAYSTACK_SECRET,
        'Content-Type': 'application/json'
      }
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {

        body = JSON.parse(body)
        console.log(body)

        Card.find({ owner: req.user._id }, (err, cards) => {
          console.log('1')
          console.log(req.body)
          var auth = body.data.authorization
          var cust = body.data.customer

          var last4 = auth.last4

          cards.forEach((card) => {
            if (card) {


              if (last4 === card.last4 && card.expMonth === auth.exp_month) {
                req.flash('Error', 'Card already exists')
                res.redirect('back')
              }
            }
          })
          console.log('2')
          User.findById({ _id: req.user.id }, (err, user) => {
            console.log(user)
            console.log('3')
            var card = new Card({
              owner: req.user.id,
              last4: last4,
              authorization_code: auth.authorization_code,
              expMonth: auth.exp_month,
              expYear: auth.exp_year,
              brand: auth.brand,
              channel: auth.channel,
              card_type: auth.card_type,
              bank: auth.bank,
              country_code: auth.country_code,
              reusable: auth.reusable,
              signature: auth.signature,
              customer: {
                id: cust.id,
                first_name: cust.first_name,
                last_name: cust.last_name,
                email: cust.email,
                customer_code: cust.customer_code,
                phone: cust.phone,
                risk_action: cust.risk_action
              }
            })
            card.save((err) => {
              console.log('4')
              User.update(
                {
                  _id: req.user.id
                },
                {
                  $push: { cards: card._id }
                }, function (err, count) {
                  console.log('5')
                  if (err) {
                    return next(err)
                  }

                  req.flash('success', 'Card added Successfully')
                  res.redirect('back')
                }
              )
            })
          })
        })
      } else {
        req.flash('error', 'Could not charge card')
        res.redirect('back')
      }
    }
  )
})



router.route('/reviews')
  .post(middleware.isLoggedIn, (req, res, next) => {
    if (!req.body.rating) {
      return next(error)
    } else {
      var review = new Review({
        owner: req.user._id,
        rating: req.body.rating,
        review: req.body.review
      })
      review.save((err) => {
        res.redirect('/dashboard')
      })
    }
  })

//PROFILE PICTURE
router.post('/upload', (req, res) => {
  User.findOne({ _id: req.user._id }, function (err, user) {
    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        req.flash('error', 'Your file is too large, try reducing the size')
        return res.redirect('/user-registration')
      }
      else if (err) {
        return next(err)
      }
      else if (req.files == undefined) {
        console.log('file is undefined')
      }
      else {
        /** Create new record in mongoDB*/
        var fullPath = req.files[0].filename;
        user.photo = fullPath;
        user.save(function (err) {
          req.flash('success', 'Your profile picture have been successfully uploaded')
          res.redirect('/dashboard')
        });
      }
    })
  })
})


//LOGOUT ROUTE
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/auth/login');
});

// Function to generate 8 digit numbers
function getRandom(length) {
  return Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1));
}

function timeDifference(timeStamp) {

  var now = new Date(),
    secondsPast = (now.getTime() - timeStamp.getTime()) / 1000;
  if (secondsPast < 60) {
    return parseInt(secondsPast) + 's';
  }
  if (secondsPast < 3600) {
    return parseInt(secondsPast / 60) + 'm';
  }
  if (secondsPast <= 86400) {
    return parseInt(secondsPast / 3600) + 'h';
  }
  if (secondsPast > 86400) {
    day = timeStamp.getDate();
    month = timeStamp.toDateString().match(/ [a-zA-Z]*/)[0].replace(" ", "");
    year = timeStamp.getFullYear() == now.getFullYear() ? "" : " " + timeStamp.getFullYear();
    return day + " " + month + year;
  }
}

module.exports = router;
