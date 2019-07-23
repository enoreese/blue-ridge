const router = require('express').Router();
const async = require('async');
const crypto = require("crypto");
const multer = require('multer')
const sgMail = require('@sendgrid/mail');
const UserDetails = require('../models/userdetails');
const User = require('../models/user')
const Subscription = require('../models/subscription');
const File = require('../models/file');
const Code = require('../models/code');
const Token = require('../models/token');
const upload = require('./upload')
const bankUpload = require('./bankUpload')
const uuidv1 = require('uuid/v4');
const middleware = require("../middleware")
const africastalking = require('africastalking');
const unirest = require('unirest')
const passport = require('passport')

const admin = 1;
const borrower = 2;

//HOMEPAGE ROUTE
router.get('/', (req, res, next) => {
    res.render('web/home');
});

//FORGOT PASSWORD
router.get('/forgot', (req, res, next) => {
    res.render('web/forgot');
})

//ABOUT US
router.get('/about', (req, res, next) => {
    res.render('web/about');
})

//ABOUT US
router.get('/how-it-works', (req, res, next) => {
    res.render('web/how_it_works');
})


//FAQ
router.get('/faq', (req, res, next) => {
    res.render('web/faq');
})

//FAQ
router.get('/card', (req, res, next) => {
    res.render('web/card');
})

//FEATURES
router.get('/features', (req, res, next) => {
    res.render('web/features');
})

//TERMS OF SERVICE
router.get('/terms', (req, res, next) => {
    res.render('web/terms');
})

//PRIVACY POLICY
router.get('/privacy', (req, res, next) => {
    res.render('web/privacy');
})

//CAREERS
router.get('/careers', (req, res, next) => {
    res.render('web/careers');
})

//BLOG
router.get('/blog', (req, res, next) => {
    res.render('web/blog-grid');
})

//CONTACT US
router.route('/contact')
    .get((req, res, next) => {
        res.render('web/contact');
    })
    .post((req, res, next) => {
        sgMail.setApiKey(process.env.SENDGRID_MAIL);
        const msg = {
            to: 'info@borome.ng',
            from: 'BoroMe <noreply@borome.ng>',
            subject: 'You have been contacted',
            text: 'Hello,\n\n' +
                'You have been contacted by ' + req.body.fullname + ' .\n' +
                'Email ' + req.body.email + ' .\n' +
                'Phone ' + req.body.phone + ' .\n' +
                'Message ' + req.body.message + ' .\n'
        };
        sgMail.send(msg);
        res.render('web/contact')
    })

// USER DETAILS
router.route('/user-registration')
    .get(middleware.isLoggedIn, (req, res, next) => {
        res.render('web/user_info')
    })
    .post(middleware.isLoggedIn, (req, res, next) => {
        async.waterfall([
            function (callback) {
                upload(req, res, (err) => {
                    console.log(req.files)
                    if (err instanceof multer.MulterError) {
                        req.flash('error', 'Your file is too large, try reducing the size')
                        return res.redirect('/user-registration')
                    } else if (err) {
                        return next(err)
                    }
                    else if (req.files == undefined) {
                        console.log('file is undefined')
                    }
                    else {
                        // const { gender, mstatus, address, identity, accountnumb, accountname, bvn, bankname } = req.body;
                        /** Create new record in mongoDB*/

                        var fullPath = req.files[0].filename;
                        // var passport = req.files[1].filename;
                        // var profilePhotoPath = req.files[1].filename
                        // if(!gender || !mstatus || !address || !identity  || !accountnumb || !accountname || !bvn || !bankname){
                        //     req.flash('error',  'Please enter input fields');
                        //     return res.redirect('/user-registration')
                        // }
                        if (!req.body.facebook && !req.body.instagram) {
                            req.flash('error', 'Enter atleast one or both of your social media links')
                            return res.redirect('/user-registration')
                        }
                        var document = {
                            upload: fullPath,
                            owner: req.user._id,
                            gender: req.body.gender,
                            marital: req.body.mstatus,
                            dateofbirth: req.body.dateofbirth,
                            education: req.body.education,
                            state: req.body.state,
                            lga: req.body.lga,
                            address: req.body.address,
                            facebook: req.body.facebook,
                            instagram: req.body.instagram,
                            city: req.body.city,
                            street: req.body.street,
                            houseNo: req.body.houseNo,
                            altphone: req.body.altphone,
                            identity: req.body.identity,
                            accountnumber: req.body.accountnumb,
                            accountname: req.body.accountname,
                            bvn: req.body.bvn,
                         
                            Idnum: req.body.Idnum,
                            bankname: req.body.bankname,
                            personalInfoFilled: true,
                            backDetailsFilled: true
                        };

                        var userdetail = new UserDetails(document);
                        userdetail.save(function (err) {
                            callback(err, userdetail)
                        })
                    }
                })
            },
            function (userdetail, callback) {
                User.update(
                    {
                        _id: req.user._id
                    },
                    {
                        $push: { userdetails: userdetail._id },
                    }, function (err, count) {
                        if (err) {
                            return next(err)
                        }
                        req.flash('success', 'Your details was saved Succesfully')
                        res.redirect('/complete-user-registration');
                    }
                )
            }
        ])
    })

// Complete User Registeration
router.route('/complete-user-registration')
    .get(middleware.isLoggedIn, (req, res, next) => {
        res.render('web/complete_user_info')
    })
    .post(middleware.isLoggedIn, (req, res, next) => {
        async.waterfall([
            function (callback) {
                User.findOne({ _id: req.user._id }, function (err, user) {
                    if (err) return next(err);
                    console.log(req.body)
                    UserDetails.findOne({ owner: req.user._id }, function (err, userdetails) {
                        if (err) { return next(err) }
                        upload(req, res, (err) => {
                            if (err instanceof multer.MulterError) {
                                req.flash('error', 'Your file is too large, try reducing the size')
                                return res.redirect('/complete-user-registration')
                            }
                            else if (err) {
                                return next(err)
                            }
                            else if (req.files == undefined) {
                                console.log('file is undefined')
                            }
                            else {
                                var fullPath = req.files[0].filename;
                                userdetails.workId = fullPath;
                                if (req.body.self_employed) { userdetails.workStatus = true }
                                userdetails.nextofkinname = req.body.kin_name,
                                    userdetails.nextofkinphone = req.body.kin_phone,
                                    userdetails.nextofkinemail = req.body.kin_email,
                                    userdetails.nextofkinaddress = req.body.kin_address,
                                    userdetails.occupation = req.body.occupation,
                                    userdetails.relationship = req.body.kin_relationship,
                                    userdetails.employername = req.body.employer_name,
                                    userdetails.self_employed = req.body.self_employed,
                                    userdetails.estatus = req.body.estatus,
                                    userdetails.companyaddress = req.body.employer_address,
                                    userdetails.companyphone = req.body.employer_phone,
                                    userdetails.bizname = req.body.bizname,
                                    userdetails.bizaddress = req.body.bizaddress,
                                    userdetails.income = req.body.income,
                                    userdetails.nextofkinFilled = true
                                userdetails.save(function (err) {
                                    req.flash('success', 'Your details was saved Succesfully')
                                    res.redirect('/file-uploads')
                                });
                            }
                        })

                    })
                    console.log(user)
                })
            },
        ])
    })

//UPLOAD BANK ACCT STATEMENT
// router.route('/file-uploads')
//     .get(middleware.isLoggedIn, (req, res, next) => {
//         res.render('web/file')
//     })
//     .post(middleware.isLoggedIn, (req, res, next) => {
//         async.waterfall([
//             function (done) {
//                 User.findOne({ _id: req.user._id }, function (err, user) {
//                     if (err) return next(err);
//                     console.log(req.body)
//                     UserDetails.findOne({ owner: req.user._id }, function (err, userdetails) {
//                         if (err) { return next(err) }
                        
//                         if (req.body.caption === 'bankStatement') {
//                             bankUpload(req, res, (err) => {
//                                 if (err instanceof multer.MulterError) {
//                                     req.flash('error', 'Your file is too large, try reducing the size')
//                                     return res.redirect('/file-uploads')
//                                 }
//                                 else if (err) {
//                                     return next(err)
//                                 }
//                                 else if (req.files == undefined) {
//                                     console.log('file is undefined')
//                                 }
//                                 else {
//                                     console.log(req.files)
//                                     let bank = req.files[0].filename;
//                                     userdetails.bankstatement = bank;
//                                     userdetails.save(function (err) {
//                                         if (err) return next(err)
//                                         if (userdetails.bankstatement && userdetails.utilityBill) {
//                                             req.flash('success', 'Your file was uploaded succesfully')
//                                             res.redirect('/loan-apply');
//                                         } else {
//                                             req.flash('success', 'Please upload all required documents')
//                                             res.redirect('/file-uploads');
//                                         }
//                                     });
//                                 }
//                             })

//                         } else {
//                             upload(req, res, (err) => {
//                                 if (err instanceof multer.MulterError) {
//                                     req.flash('error', 'Your file is too large, try reducing the size')
//                                     return res.redirect('/file-uploads')
//                                 }
//                                 else if (err) {
//                                     return next(err)
//                                 }
//                                 else if (req.files == undefined) {
//                                     console.log('file is undefined')
//                                 }
//                                 else {
//                                     console.log(req.files)
//                                     let bank = req.files[0].filename;
//                                     userdetails.utilityBill = bank;
//                                     userdetails.save(function (err) {
//                                         if (err) return next(err)
//                                         if (userdetails.bankstatement && userdetails.utilityBill) {
//                                             req.flash('success', 'Your file was uploaded succesfully')
//                                             res.redirect('/loan-apply');
//                                         } else {
//                                             req.flash('success', 'Please upload all required documents')
//                                             res.redirect('/file-uploads');
//                                         }
//                                     });
//                                 }
//                             })

                            
//                         }
//                         // userdetails.caption = req.body.caption;
                        
                            
                        

//                 })
//             })
//     }
//         ])
//     })

//UPLOAD BANK ACCT STATEMENT
router.route('/file-uploads')
    .get(middleware.isLoggedIn, (req, res, next) => {
        res.render('web/file')
    })
    .post(middleware.isLoggedIn, (req, res, next) => {
        async.waterfall([
            function (done) {
                User.findOne({ _id: req.user._id }, function (err, user) {
                    if (err) return next(err);
                    console.log(req.body)
                    UserDetails.findOne({ owner: req.user._id }, function (err, userdetails) {
                        if (err) { return next(err) }
                            upload(req, res, (err) => {
                                if (err instanceof multer.MulterError) {
                                    req.flash('error', 'Your file is too large, try reducing the size')
                                    return res.redirect('/file-uploads')
                                }
                                else if (err) {
                                    return next(err)
                                }
                                else if (req.files == undefined) {
                                    console.log('file is undefined')
                                }
                                else {
                                    console.log(req.files)
                                    let bank = req.files[0].filename;
                                    if(req.body.caption === 'bankStatement'){
                                        userdetails.bankstatement = bank;
                                        userdetails.bankstatementFilled = true;
                                    }else{
                                        userdetails.utilityBill = bank;
                                        userdetails.utilityFilled = true;
                                    }
                                    userdetails.save(function (err) {
                                        if (err) return next(err)
                                        if (userdetails.bankstatement && userdetails.utilityBill) {
                                            req.flash('success', 'Your file was uploaded succesfully')
                                            res.redirect('/loan-apply');
                                        } else {
                                            req.flash('success', 'Please upload all required documents')
                                            res.redirect('/file-uploads');
                                        }
                                    });
                                }
                            })
                        
                })
            })
        }
        ])
    })


// APPLY FOR LOAN
router.route('/loan-apply')
    .get(middleware.isLoggedIn, (req, res, next) => {
        const keyPublishable = process.env.TEST_PAYSTACK_KEY

        console.log('apply')
        if (req.user) {
            UserDetails.findOne({ owner: req.user._id }, (err, userdetail) => {
                console.log(userdetail)
                res.render('web/apply', { userdetails: userdetail, keyPublishable: keyPublishable });
            })
        }
    })
    .post(middleware.isLoggedIn, (req, res, next) => {
        if (req.user.role === 2) {
            async.waterfall([
                function (done) {
                    User.findOne({ _id: req.user._id }, function (err, user) {
                        //    if(user.hasApplied){
                        //        req.flash('error', 'You cannot apply for loan now')
                        //        res.redirect('back')
                        //    }else{
                        //        user.hasApplied = true;
                        //        user.save(function (err) {
                        //            done(err, user)
                        //        })
                        //    }
                        user.hasApplied = true;
                        user.save(function (err) {
                            done(err, user)
                        })
                    })
                },
                function (user, done) {
                    const loan = new Subscription();

                    const { amount, days, reasons, repay, returndate } = req.body;

                    if (amount === '' || days === '' || reasons === '' || repay === '' || returndate === '') {
                        req.flash('error', 'Input fields cannot be empty')
                        return res.redirect('back')
                    } else if (amount < 10000 || amount > 50000) {
                        req.flash('error', 'Sorry, you can only apply for an amount between &#8358;10,000 and &#8358;50,000')
                        return res.redirect('back')
                    }
                    else {
                        loan.owner = req.user._id;
                        loan.amount = amount;
                        loan.days = days;
                        loan.repay = repay;
                        loan.returndate = returndate;
                        loan.reasons = reasons;
                        uniq = uuidv1()
                        var timestamp = new Date().valueOf();
                        var now = new Date();

                        var d = new Date(),
                            month = '' + (d.getMonth() + 1),
                            day = '' + d.getDate(),
                            year = d.getFullYear().toString();
                        year = year.substr(year.length - 2);

                        if (month.length < 2) month = '0' + month;
                        if (day.length < 2) day = '0' + day;

                        timestamp = [year, month, day].join('-');

                        var stamp = timestamp + '-' + uniq.substr(uniq.length - 7);

                        loan.uniqueId = stamp;
                        loan.save(function (err) {
                            done(err, user, loan)
                        })
                    }
                },
                function (user, loan, done) {
                    sgMail.setApiKey(process.env.SENDGRID_MAIL);
                    const msg = {
                        to: user.email,
                        from: 'BoroMe <noreply@borome.ng>',
                        subject: 'Subscription Application',
                        html: '<p>Hello,\n\n' +
                            'You have successfully applied for &#8358;' + loan.amount + ' loan.\n</p>',
                        templateId: 'd-ba8832762f904e50854a6e4e7708c74c',
                        dynamic_template_data: {
                            name: user.fullname,
                            amount: loan.amount,
                            date: loan.created.toDateString(),
                            repay: loan.repay,
                            datedue: loan.returndate.toDateString(),
                        }
                    };
                    sgMail.send(msg)

                    const message = {
                        to: ['patrickfaithchi@gmail.com', 'ewerepromise247@gmail.com'],
                        from: 'BoroMe <noreply@borome.ng>',
                        subject: 'New User has Applied',
                        html: '<p>Hello,\n\n' + user.fullname + 'just applied for a &#8358;' + loan.amount + ' loan. Please check.\n</p>',
                    };
                    sgMail.sendMultiple(message)

                    User.update(
                        {
                            _id: user._id
                        },
                        {
                            $push: { loans: loan._id }
                        }, function (err, count) {
                            if (err) { return next(err) }
                            req.flash('success', 'Your loan application was sent successfully')
                            res.redirect('/dashboard');

                        }
                    );
                }
            ])
        }
    })




//LOAN APPLICATION
// router.route('/loan-apply')
//     .get(middleware.isLoggedIn, (req, res, next) => {
//         const keyPublishable = process.env.TEST_PAYSTACK_KEY

//         console.log('apply')
//         if (req.user){
//             UserDetails.findOne({ owner: req.user._id }, (err, userdetail) => {
//                 console.log(userdetail)
//                 res.render('web/apply', { userdetails: userdetail, keyPublishable : keyPublishable });
//             })            
//         }
//     })
//     .post(middleware.isLoggedIn, (req, res, next) => {
//         if (req.user.role === 2) {
//             console.log(req.body)
//             async.waterfall([

//                 function (done) {
//                     User.findOne({ _id: req.user._id }, function (err, user) {
//                         if (err) return next(err);
//                         console.log(user)
//                         if (req.body.amount === '' || req.body.days === '' || req.body.reasons === '' ||
//                             req.body.repay === '' || req.body.returndate === '') {
//                             res.redirect('/dashboard')
//                         } else {
//                             user.hasApplied = true;
//                             user.save(function (err) {
//                                 done(err, user)
//                             })
//                         }
//                     })
//                 },

//                 function (user, done) {
//                     const loan = new Subscription();

//                     const { amount, days, reasons, repay, returndate } = req.body;

//                     if (amount === '' || days === '' || reasons === '' || repay === '' || returndate === '') {
//                         res.redirect('/dashboard')
//                     } else {
//                         loan.owner = req.user._id;
//                         loan.amount = amount;
//                         loan.days = days;
//                         loan.repay = repay;
//                         loan.returndate = returndate;
//                         loan.reasons = reasons;
//                         uniq = uuidv1()
//                         var timestamp = new Date().valueOf();
//                         var now = new Date();

//                         var d = new Date(),
//                             month = '' + (d.getMonth() + 1),
//                             day = '' + d.getDate(),
//                             year = d.getFullYear().toString();
//                         year = year.substr(year.length - 2);

//                         if (month.length < 2) month = '0' + month;
//                         if (day.length < 2) day = '0' + day;

//                         timestamp = [year, month, day].join('-');

//                         // var year = now.getFullYear().toString();
//                         // year = year.substr(year.length - 2);
//                         // var month = (now.getMonth() < 10 ? '0' : '') + now.getMonth().toString();
//                         // var day = (now.getDate() < 10 ? '0' : '') + now.getDate().toString();
//                         // day = day.substr(day.length - 12);

//                         var stamp = timestamp + '-' + uniq.substr(uniq.length - 7);

//                         // timestamp = now.getFullYear().toString(); // 2011
//                         // timestamp += (now.getMonth < 9 ? '0' : '') + now.getMonth().toString(); // JS months are 0-based, so +1 and pad with 0's
//                         // timestamp += (now.getDate < 10 ? '0' : '') + now.getDate().toString(); 
//                         // timestamp += (now.getHours < 10 ? '0' : '') + now.getHours().toString(); 
//                         // timestamp += (now.getMinutes < 10 ? '0' : '') + now.getMinutes().toString(); 
//                         // timestamp += (now.getSeconds < 10 ? '0' : '') + now.getSeconds().toString(); 
//                         // timestamp += (now.getMilliseconds < 10 ? '0' : '') + now.getMilliseconds().toString(); 
//                         // timestamp += uniq.substr(uniq.length - 4);

//                         // loan.uniqueId = String(Date.now()) + '_' + uniq.substr(uniq.length - 12);
//                         loan.uniqueId = stamp;
//                         loan.save(function (err) {
//                             done(err, user, loan)
//                         })
//                     }
//                 },

//                 function (user, loan, done) {
//                     sgMail.setApiKey(process.env.SENDGRID_MAIL);
//                     const msg = {
//                         to: user.email,
//                         from: 'BoroMe <noreply@borome.ng>',
//                         subject: 'Subscription Application',
//                         html: '<p>Hello,\n\n' +
//                             'You have successfully applied for &#8358;' + loan.amount + ' loan.\n</p>',
//                         templateId: 'd-ba8832762f904e50854a6e4e7708c74c',
//                         dynamic_template_data: {
//                             name: user.fullname,
//                             amount: loan.amount,
//                             date: loan.created.toDateString(),
//                             repay: loan.repay,
//                             datedue: loan.returndate.toDateString(),
//                         }
//                     };
//                     sgMail.send(msg)

//                     const message = {
//                         to: ['ajaomahmud@gmail.com', 'patrickfaithchi@gmail.com'],
//                         from: 'BoroMe <noreply@borome.ng>',
//                         subject: 'New User has Applied',
//                         html: '<p>Hello,\n\n' + user.fullname + 'just applied for a &#8358;' + loan.amount + ' loan. Please check.\n</p>',
//                         // templateId: 'd-ba8832762f904e50854a6e4e7708c74c',
//                         // dynamic_template_data: {
//                         //     name: user.fullname,
//                         //     amount: loan.amount,
//                         //     date: loan.created.toDateString(),
//                         //     repay: loan.repay,
//                         //     datedue: loan.returndate.toDateString(),
//                         // }
//                     };
//                     sgMail.sendMultiple(message)

//                     User.update(
//                         {
//                             _id: user._id
//                         },
//                         {
//                             $push: { loans: loan._id }
//                         }, function (err, count) {
//                             if (err) { return next(err) }
//                             req.flash('success', 'Your loan application was sent successfully')
//                             res.redirect('/dashboard');

//                         }
//                     );

//                 }
//             ])
//         }
//     })

// //Register Page
// router.get('/register', (req, res, next)=>{
//     res.render('web/register')
// })


// Phone Registration and SMS
// router.post('/phone-registration', (req, res, next) => {
//     User.findOne({ phonenumber: req.body.phone }, function (err, existingUserPhone) {
//         if (existingUserPhone) {
//           req.flash('error', 'Account with that phone number already exists.');
//           return res.redirect('/register')
//         }
//         else {
//             const user = new User();   
//             const { phone } = req.body;  
//             if (!phone) {
//                 req.flash('error', 'Please enter input fields');
//                 return res.redirect('/register')
//             }
//             user.phonenumber = phone;
//             user.role = borrower;
//             user.photo = user.gravatar();
//             user.save((err) => {
//                 if (err) {
//                     req.flash('error', err.message);
//                     return next(err);
//                 }
//              //Create an 8 random number
//              var code = new Code({ _userId: user._id, code: getRandom(6) });
//              // Save the code
//              code.save(function (err) {
//                 if (err) { req.flash('error', err.message) }

//                 unirest.post( 'https://v2.sling.com.ng/api/v1/send-sms')
//                 .header({'Accept' : 'application/json', 'Authorization' : 'Bearer sling_sjalccx24mwklh2nmkma0pwczk9tsjytofl3ntzii7bh8b17moopvv'})
//                 .send({
//                   'to' : `234${user.phonenumber}`,
//                   'message' : `Your BoroMe registration is received, Use this code ${code.code} to verify your BoroMe account, DO NOT reply to this message`,
//                   'channel' : 1001
//                 })
//                 .end(function (response) {
//                     console.log(response.body);
//                 });


//                 // const AfricasTalking = new africastalking({
//                 //     apiKey: process.env.AFRICASTALKING_KEY,
//                 //     username: process.env.AFRICASTALKING_USERNAME
//                 // }, { debug: true })
//                 // //Initialize a service e.g. SMS
//                 // const sms = AfricasTalking.SMS
//                 //     //Send code to user
//                 //     sms.send({
//                 //     to: `+234${user.phonenumber}`,
//                 //     message: `Your BoroMe registration is received, Use this code to verify your BoroMe account, DO NOT reply this message. ${code.code}`,
//                 //     from: 'BOROME ID'
//                 // },
//                 // function (err, response) {
//                 //     if (err) console.log(err)
//                 // })
//                 req.logIn(user, function (err) {
//                     if (err) return next(err);
//                     console.log(user)
//                     res.redirect('/register')
//                 });

//              })

//             })
//           } 

//       })
//   })




//   //SMS VERIFICATION
//   router.post('/sms-verify', (req, res, next) => {
//     Code.findOne({ code: req.body.verification }, function (err, code) {
//       if (err) return next(err);
//       // Checking if code exists
//       if (!code) {
//         req.flash('error', 'Code does not exists, or may have expired')
//         return res.redirect('/register')
//       }

//       User.findOne({ _id: code._userId }, function (err, user) {
//         // Checking if user owns code
//         if (!user) {
//           req.flash('error', 'We were unable to find a user for this code.')
//           return res.status(404).send("We were unable to find a user for this code.");
//         }

//         //Checking if user is verified already 
//         if (user.isVerified === true) {
//           req.flash('error', 'This user has already been verified.');
//           return res.status(404).send("This user has already been verified.");
//         }

//         user.isVerified = true;
//         user.save(function (err) {
//           if (err) return next(err);
//           console.log(user)
//           req.logIn(user, function (err) {
//             if (err) return next(err);
//             req.flash('success', 'Your account has been verified. Please Continue.');
//             res.status(200).send("Your phone has been verified");
//           });
//           //return res.redirect('/signup');
//         });
//       })

//     })
//   })


//Email, password and other detauils
// router.post('/register-details', (req, res, next) => {
//     User.findOne({ email: req.body.email }, function (err, existingUser) {
//       if (existingUser) {
//         req.flash('error', 'Account with that email address already exists.');
//         if (existingUser.isVerified === false) {
//           console.log('not verified email')
//           return res.redirect('/register')
//         } else {
//           return res.redirect('/register');
//         }        
//       } else {
//         // const { fullname, email, password, location } = req.body;
//         // if (!fullname || !email || !password || !location) {
//         //   req.flash('error', 'Please enter input fields');
//         //   return res.redirect('/auth/register')
//         // }
//         User.findById(req.user._id, function (err, user) {
//             if (err) throw err;
//             if (user) {
//               if (req.body.fullname) user.fullname = req.body.fullname;
//               if (req.body.phonenumber) user.phonenumber = req.body.phonenumber;
//               if (req.body.email) user.email = req.body.email;
//               if (req.body.password) user.password = req.body.password;
//               if (req.body.location) user.location = req.body.location;
//               user.save(function (err) {
//                 if (err) {
//                     req.flash('error', err.message);
//                     return next(err);
//                 }

//                 var token = new Token({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });

//                 // Save the verification token
//                 token.save(function (err) {
//                     if (err) { req.flash('error', err.message); }

//                     sgMail.setApiKey(process.env.SENDGRID_MAIL);
//                     const msg = {
//                     to: user.email,
//                     from: 'BoroMe <noreply@borome.ng>',
//                     subject: 'Account Verification Token',
//                     html: '<p>Hello,\n\n' + 'Please verify your account by clicking this link: \nhttp:\/\/' + req.headers.host + '\/confirmation\/' + token.token + '.\n</p>',
//                     templateId: 'd-5c6a81387a8f4e9fbaae472dbda2f790',
//                     dynamic_template_data: {
//                         name: user.fullname,
//                         address: 'http:\/\/' + req.headers.host + '\/confirmation\/' + token.token + '.',
//                     }
//                     }
//                     sgMail.send(msg)
//                     req.flash('success', 'Registration successful, please continue.')
//                     res.redirect('/user-registration')
//                 })

//               })
//             }
//         })

//       }
//     });
//   });


//CHANGE PHONE NUMBER
router.post('/change-phone-number', (req, res, next) => {
    User.findOne({ _id: req.user._id }, function (err, user) {
        console.log(user)
        if (err) throw err;
        if (user) {
            if (req.body.phone_number) user.phonenumber = req.body.phone_number;
            user.save(function (err) {
                req.flash('success', 'Your phone number was changed successfully')
                res.redirect('/sms-verification')
            })
        }
    })
})

//REMINDER FOR USERS TO RETURN
router.post('/return-reminder', (req, res, next) => {
    User.findObne({ _id: req.user._id }, function (err, user) {

    })
})



//Sign Up
// router.get('/signup', (req, res, next)=>{
//     res.render('web/signup')
// })




// Function to generate 8 digit numbers
function getRandom(length) {
    return Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1));
}

module.exports = router;