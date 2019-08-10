const router = require('express').Router();
const async = require('async');
const User = require('../models/user')
const sgMail = require('@sendgrid/mail');
const Subscription = require('../models/subscription')
const Review = require('../models/review')
const middleware = require("../middleware");
const UserDetails = require('../models/userdetails');
const SMS = require('../models/sms');
const d3 = require('d3');
const bcrypt = require('bcrypt-nodejs')
const Notification = require('../models/activity')
const Card = require('../models/cards')
const cron = require('node-cron')
var request = require('request');
var unirest = require('unirest')

const paystack = require('paystack')(process.env.PAYSTACK_SECRET);



/*********************/
// BORROWERS ROUTES 
/**********************/

//DASHBOARD ROUTE
router.get('/dashboard', middleware.isLoggedIn, (req, res, next) => {
    //ADMIN DASHBOARD
    if (req.user.role !== 2) {
        User.find({})
            .populate('loans')
            .exec(function (err, users) {
                userArr = []
                var totalSubscription = 0
                users.forEach((user) => {
                    if (user.role == 1) {
                        totalSubscription = user.totalSubscription
                    }
                    user.loans.sort((a, b) => (b.created) - (a.created))
                    console.log(user)
                    // userArr.push(user)
                    var status = 0
                    if (!user.loans.length === false) {
                        if (user.loans[0].granted === true) {
                            status = 1
                        }
                        if (user.loans[0].disbursed === true) {
                            status = 2
                        }
                        if (user.loans[0].hasPaid === true) {
                            status = 3
                        }
                        // Calculate amount of days past-due
                        var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
                        var diffDays = Math.round(((Date.now() - user.loans[0].returndate / (oneDay))));
                        console.log(diffDays)

                        if (diffDays === 0 && user.loans[0].hasPaid === false) {
                            status = 4
                        }
                        if (diffDays < 0 && user.loans[0].hasPaid === false) {
                            status = 5
                        }

                        userArr.push({
                            'id': user._id,
                            'fullname': user.fullname,
                            'role': user.role,
                            'loanId': user.loans[0]._id,
                            'hasApplied': user.hasApplied,
                            'email': user.email,
                            'created': formatDate(user.loans[0].created),
                            'amount': user.loans[0].amount,
                            'status': status,
                            'score': user.creditScore,
                            'repay': user.loans[0].repay,
                            'returndate': formatDate(user.loans[0].returndate),
                            'uniqueId': user.loans[0].uniqueId
                        })
                    }

                })

                //LOANS APPLIED TODAY
                Subscription.find({
                    "created": {
                        $lt: new Date(new Date().setHours(23, 59, 59)),
                        $gte: new Date(new Date().setHours(00, 00, 00))
                    }
                })
                    .sort('-created')
                    .populate('owner')
                    .deepPopulate('owner.loans')
                    .populate('reviewedBy')
                    .exec(function (err, loans) {
                        // console.log(loans)
                        if (err) return next(err)
                        var loanArr = []
                        loans.forEach((loan) => {
                            var status = 0
                            if (loan.granted === true) {
                                status = 1
                            }
                            if (loan.declined === true) {
                                status = 6
                            }
                            if (loan.disbursed === true) {
                                status = 2
                            }
                            if (loan.hasPaid === true) {
                                status = 3
                            }
                            if (loan.return === true) {
                                status = 7
                            }
                            // Calculate amount of days past-due
                            var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
                            var diffDays = Math.round(((Date.now() - loan.returndate / (oneDay))));
                            console.log(diffDays)

                            if (diffDays === 0 && loan.hasPaid === false) {
                                status = 4
                            }
                            if (diffDays < 0 && loan.hasPaid === false) {
                                status = 5
                            }


                            const userDeclines = loan.owner.loans.map(decline => {
                                const rDecline = decline.declined
                                return rDecline;
                            })
                            const declines = userDeclines.filter(v => v).length;


                            loanArr.push({
                                'id': loan.owner._id,
                                'loanId': loan._id,
                                'owner': loan.owner.fullname,
                                'loansDeclined': declines,
                                'uniqueId': loan.uniqueId,
                                'created': loan.created.toLocaleString('en-us'),
                                'amount': loan.amount,
                                'hasPaid': loan.hasPaid,
                                'days': loan.days,
                                'repay': loan.repay,
                                'score': loan.owner.creditScore,
                                'returndate': loan.returndate.toLocaleString('en-us'),
                                'status': status,
                                'granted': loan.granted,
                                'declined': loan.declined
                            })
                        })

                        //EXPECTED LOANS REFUND TODAY
                        Subscription.find({
                            "returndate": {
                                $lt: new Date(),
                                $gte: new Date(new Date().setDate(new Date().getDate() - 1))
                            }
                        })
                            .sort('-returndate')
                            .populate('owner')
                            .deepPopulate('owner.cards')
                            .exec(function (err, loans) {
                                // console.log(loans)
                                if (err) return next(err)
                                var loanArre = []
                                loans.forEach((loan) => {
                                    var status = 0
                                    if (loan.granted === true) {
                                        status = 1
                                    }
                                    if (loan.declined === true) {
                                        status = 6
                                    }
                                    if (loan.disbursed === true) {
                                        status = 2
                                    }
                                    if (loan.hasPaid === true) {
                                        status = 3
                                    }
                                    // Calculate amount of days past-due
                                    var date0 = new Date(loan.returndate);
                                    var date1 = new Date();

                                    var numberOfDays = Math.ceil((date1 - date0) / 8.64e7);
                                    console.log('the remaining days are: ' + numberOfDays)

                                    if (numberOfDays === 1 && loan.hasPaid === false) {
                                        status = 4
                                    }
                                    if (numberOfDays > 1 && loan.hasPaid === false) {
                                        status = 5
                                    }
                                    if (loan.owner) {
                                        loanArre.push({
                                            'id': loan.owner._id,
                                            'loanID': loan._id,
                                            'owner': loan.owner.fullname,
                                            'uniqueId': loan.uniqueId,
                                            'created': loan.created.toLocaleString(),
                                            'amount': loan.amount,
                                            'days': loan.days,
                                            'debit': loan.owner.cards.length > 0,
                                            'hasPaid': loan.hasPaid,
                                            'repay': loan.repay,
                                            'score': loan.owner.creditScore,
                                            'returndate': loan.returndate.toLocaleString(),
                                            'status': status,
                                            'disbursed': loan.disbursed
                                        })
                                    }
                                })


                                //USERS PAID TODAY
                                Subscription.find({
                                    "dateRepaid": {
                                        $lt: new Date(),
                                        $gte: new Date(new Date().setDate(new Date().getDate() - 1))
                                    }
                                })
                                    .sort('-dateRepaid')
                                    .populate('owner')
                                    .exec(function (err, loans) {
                                        // console.log(loans)
                                        if (err) return next(err)
                                        var loanPaid = []
                                        loans.forEach((loan) => {
                                            var status = 0
                                            if (loan.granted === true) {
                                                status = 1
                                            }
                                            if (loan.declined === true) {
                                                status = 6
                                            }
                                            if (loan.disbursed === true) {
                                                status = 2
                                            }
                                            if (loan.hasPaid === true) {
                                                status = 3
                                            }
                                            // Calculate amount of days past-due
                                            var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
                                            var diffDays = Math.round(((Date.now() - loan.returndate / (oneDay))));
                                            console.log(diffDays)

                                            if (diffDays === 0 && loan.hasPaid === false) {
                                                status = 4
                                            }
                                            if (diffDays < 0 && loan.hasPaid === false) {
                                                status = 5
                                            }


                                            loanPaid.push({
                                                'id': loan.owner._id,
                                                'owner': loan.owner.fullname,
                                                'uniqueId': loan.uniqueId,
                                                'created': loan.created.toLocaleString(),
                                                'amount': loan.amount,
                                                'days': loan.days,
                                                'hasPaid': loan.hasPaid,
                                                'repaid': loan.dateRepaid.toLocaleString(),
                                                'repay': loan.repay,
                                                'score': loan.owner.creditScore,
                                                'returndate': loan.returndate.toLocaleString(),
                                                'status': status
                                            })

                                        })


                                        // AMOUNT PAID TODAY
                                        Subscription.find({
                                            "dateRepaid": {
                                                $lt: new Date(new Date().setHours(23, 59, 59)),
                                                $gte: new Date(new Date().setHours(00, 00, 00))
                                            }
                                        })
                                            .sort('-dateRepaid')
                                            .populate('owner')
                                            .exec(function (err, loans) {
                                                // console.log(loans)
                                                if (err) return next(err)
                                                var amountPaidToday = []
                                                loans.forEach((loan) => {
                                                    var status = 0
                                                    if (loan.granted === true) {
                                                        status = 1
                                                    }
                                                    if (loan.declined === true) {
                                                        status = 6
                                                    }
                                                    if (loan.disbursed === true) {
                                                        status = 2
                                                    }
                                                    if (loan.hasPaid === true) {
                                                        status = 3
                                                    }
                                                    // Calculate amount of days past-due
                                                    var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
                                                    var diffDays = Math.round(((Date.now() - loan.returndate / (oneDay))));
                                                    console.log(diffDays)

                                                    if (diffDays === 0 && loan.hasPaid === false) {
                                                        status = 4
                                                    }
                                                    if (diffDays < 0 && loan.hasPaid === false) {
                                                        status = 5
                                                    }


                                                    amountPaidToday.push({
                                                        'id': loan.owner._id,
                                                        'owner': loan.owner.fullname,
                                                        'uniqueId': loan.uniqueId,
                                                        'created': loan.created.toLocaleString(),
                                                        'amount': loan.amount,
                                                        'days': loan.days,
                                                        'hasPaid': loan.hasPaid,
                                                        'repaid': loan.dateRepaid.toLocaleString(),
                                                        'repay': loan.repay,
                                                        'score': loan.owner.creditScore,
                                                        'returndate': loan.returndate.toLocaleString(),
                                                        'status': status
                                                    })

                                                })


                                                //USERS REGISTERED TODAY
                                                User.find({
                                                    "createdAt": {
                                                        $lt: new Date(new Date().setHours(23, 59, 59)),
                                                        $gte: new Date(new Date().setHours(00, 00, 00))
                                                    }
                                                })
                                                    .sort('-createdAt')
                                                    .populate('loans')
                                                    .exec(function (err, users) {

                                                        if (err) return next(err)
                                                        var usersRegToday = []
                                                        users.forEach((loan) => {
                                                            var status = 0
                                                            if (loan.granted === true) {
                                                                status = 1
                                                            }
                                                            if (loan.declined === true) {
                                                                status = 6
                                                            }
                                                            if (loan.disbursed === true) {
                                                                status = 2
                                                            }
                                                            if (loan.hasPaid === true) {
                                                                status = 3
                                                            }
                                                            // Calculate amount of days past-due
                                                            var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
                                                            var diffDays = Math.round(((Date.now() - loan.returndate / (oneDay))));
                                                            console.log(diffDays)

                                                            if (diffDays === 0 && loan.hasPaid === false) {
                                                                status = 4
                                                            }
                                                            if (diffDays < 0 && loan.hasPaid === false) {
                                                                status = 5
                                                            }

                                                            usersRegToday.push({
                                                                'id': loan._id,
                                                                'owner': loan.fullname,
                                                                'role': loan.role,
                                                                'created': loan.createdAt.toLocaleString(),
                                                                'email': loan.email,
                                                                'applied': loan.loans.length,
                                                                'phone': loan.phonenumber,
                                                                'location': loan.location,
                                                                'credit': loan.creditScore,
                                                            })

                                                            // console.log(usersRegToday)

                                                        })


                                                        //ALL APPLIED LOANS
                                                        Subscription.find({})
                                                            .sort('-created')
                                                            .populate('owner')
                                                            .populate('reviewedBy')
                                                            .exec(function (err, allSubscriptions) {
                                                                if (err) return next(err)
                                                                var allAppliedSubscriptions = []
                                                                var allSubscriptionsApplied = []
                                                                // var amountPaidTotal = []
                                                                allSubscriptions.forEach((loan) => {
                                                                    var status = 0
                                                                    if (loan.granted === true) {
                                                                        status = 1
                                                                    }
                                                                    if (loan.declined === true) {
                                                                        status = 6
                                                                    }
                                                                    if (loan.disbursed === true) {
                                                                        status = 2
                                                                    }
                                                                    if (loan.hasPaid === true) {
                                                                        status = 3
                                                                    }
                                                                    if (loan.return === true) {
                                                                        status = 7
                                                                    }

                                                                    // Calculate amount of days past-due
                                                                    var date0 = new Date(loan.returndate);
                                                                    var date1 = new Date();

                                                                    var numberOfDays = Math.ceil((date1 - date0) / 8.64e7);
                                                                    console.log('the remaining days are: ' + numberOfDays)

                                                                    if (numberOfDays === 1 && loan.hasPaid === false) {
                                                                        status = 4
                                                                    }
                                                                    if (numberOfDays > 1 && loan.hasPaid === false) {
                                                                        status = 5
                                                                    }

                                                                    if (loan.owner) {
                                                                        allAppliedSubscriptions.push({
                                                                            'id': loan.owner._id,
                                                                            'loanId': loan._id,
                                                                            'owner': loan.owner.fullname,
                                                                            'uniqueId': loan.uniqueId,
                                                                            'created': loan.created.toLocaleString('en-us'),
                                                                            'amount': loan.amount,
                                                                            'days': loan.days,
                                                                            'hasPaid': loan.hasPaid,
                                                                            'repaid': loan.dateRepaid,
                                                                            'repay': loan.repay,
                                                                            'score': loan.owner.creditScore,
                                                                            'returndate': loan.returndate.toLocaleString('en-us'),
                                                                            'status': status,
                                                                            'granted': loan.granted,
                                                                            'declined': loan.declined
                                                                        })
                                                                        console.log(allAppliedSubscriptions)
                                                                    }
                                                                    if (loan.owner && loan.hasPaid === true) {
                                                                        allSubscriptionsApplied.push({
                                                                            'id': loan.owner._id,
                                                                            'owner': loan.owner.fullname,
                                                                            'uniqueId': loan.uniqueId,
                                                                            'created': loan.created.toLocaleString('en-us'),
                                                                            'amount': loan.amount,
                                                                            'days': loan.days,
                                                                            'hasPaid': loan.hasPaid,
                                                                            'repaid': loan.dateRepaid,
                                                                            'repay': loan.repay,

                                                                        })
                                                                    }



                                                                })


                                                                //ALL REGISTERED USERS
                                                                User.find({})
                                                                    .sort('-createdAt')
                                                                    .populate('loans')
                                                                    .exec(function (err, users) {
                                                                        if (err) return next(err)
                                                                        var allRegTotal = []
                                                                        users.forEach((loan) => {
                                                                            var status = 0
                                                                            if (loan.granted === true) {
                                                                                status = 1
                                                                            }
                                                                            if (loan.declined === true) {
                                                                                status = 6
                                                                            }
                                                                            if (loan.disbursed === true) {
                                                                                status = 2
                                                                            }
                                                                            if (loan.hasPaid === true) {
                                                                                status = 3
                                                                            }
                                                                            // Calculate amount of days past-due
                                                                            var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
                                                                            var diffDays = Math.round(((Date.now() - loan.returndate / (oneDay))));
                                                                            console.log(diffDays)

                                                                            if (diffDays === 0 && loan.hasPaid === false) {
                                                                                status = 4
                                                                            }
                                                                            if (diffDays < 0 && loan.hasPaid === false) {
                                                                                status = 5
                                                                            }

                                                                            allRegTotal.push({
                                                                                'id': loan._id,
                                                                                'owner': loan.fullname,
                                                                                'totalSubscription': loan.totalDisbursed,
                                                                                'role': loan.role,
                                                                                'created': loan.createdAt.toLocaleString(),
                                                                                'email': loan.email,
                                                                                'applied': loan.hasApplied,
                                                                                'phone': loan.phonenumber,
                                                                                'location': loan.location,
                                                                                'credit': loan.creditScore,
                                                                            })

                                                                        })

                                                                        // if (err) { return next(err) }
                                                                        //     res.render('admin/dashboard', { users, userArr, totalSubscription, loanArr, loanArre, 
                                                                        //         loanPaid, amountPaidToday, usersRegToday, allAppliedSubscriptions, allRegTotal,  });

                                                                        //AMOUNT LOANED TODAY
                                                                        Subscription.find({
                                                                            "dateDisbursed": {
                                                                                $lt: new Date(new Date().setHours(23, 59, 59)),
                                                                                $gte: new Date(new Date().setHours(00, 00, 00))
                                                                            }
                                                                        })
                                                                            .sort('-created')
                                                                            .populate('owner')
                                                                            .populate('disbursedBy')
                                                                            .exec(function (err, loans) {
                                                                                if (err) return next(err)
                                                                                var amountSubscriptionedToday = []
                                                                                loans.forEach((loan) => {
                                                                                    var status = 0
                                                                                    if (loan.granted === true) {
                                                                                        status = 1
                                                                                    }
                                                                                    if (loan.declined === true) {
                                                                                        status = 6
                                                                                    }
                                                                                    if (loan.disbursed === true) {
                                                                                        status = 2
                                                                                    }
                                                                                    if (loan.hasPaid === true) {
                                                                                        status = 3
                                                                                    }
                                                                                    // Calculate amount of days past-due
                                                                                    var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
                                                                                    var diffDays = Math.round(((Date.now() - loan.returndate / (oneDay))));
                                                                                    console.log(diffDays)

                                                                                    if (diffDays === 0 && loan.hasPaid === false) {
                                                                                        status = 4
                                                                                    }
                                                                                    if (diffDays < 0 && loan.hasPaid === false) {
                                                                                        status = 5
                                                                                    }



                                                                                    amountSubscriptionedToday.push({
                                                                                        'id': loan._id,
                                                                                        'owner': loan.owner.fullname,
                                                                                        'todaySubscription': loan.amount,

                                                                                    })

                                                                                })



                                                                                //USERS TO REPAY TOTAL
                                                                                Subscription.find({})
                                                                                    .sort('returndate')
                                                                                    .populate('owner')
                                                                                    .populate('disbursedBy')
                                                                                    .exec(function (err, loans) {
                                                                                        if (err) return next(err)
                                                                                        var usersToRepayTotal = []
                                                                                        loans.forEach((loan) => {
                                                                                            var status = 0
                                                                                            if (loan.granted === true) {
                                                                                                status = 1
                                                                                            }
                                                                                            if (loan.declined === true) {
                                                                                                status = 6
                                                                                            }
                                                                                            if (loan.disbursed === true) {
                                                                                                status = 2
                                                                                            }
                                                                                            if (loan.hasPaid === true) {
                                                                                                status = 3
                                                                                            }
                                                                                            // Calculate amount of days past-due
                                                                                            var date0 = new Date(loan.returndate);
                                                                                            var date1 = new Date();

                                                                                            var numberOfDays = Math.ceil((date1 - date0) / 8.64e7);
                                                                                            console.log('the remaining days are: ' + numberOfDays)

                                                                                            if (numberOfDays === 1 && loan.hasPaid === false) {
                                                                                                status = 4
                                                                                            }
                                                                                            if (numberOfDays > 1 && loan.hasPaid === false) {
                                                                                                status = 5
                                                                                            }


                                                                                            if (loan.owner && loan.hasPaid === false && (loan.granted === true)) {
                                                                                                usersToRepayTotal.push({
                                                                                                    'id': loan.owner._id,
                                                                                                    'owner': loan.owner.fullname,
                                                                                                    'uniqueId': loan.uniqueId,
                                                                                                    'created': loan.created.toLocaleString('en-US'),
                                                                                                    'amount': loan.amount,
                                                                                                    'returndate': loan.returndate.toLocaleString('en-US'),
                                                                                                    'days': loan.days,
                                                                                                    'granted': loan.granted,
                                                                                                    'hasPaid': loan.hasPaid,
                                                                                                    'repaid': loan.dateRepaid,
                                                                                                    'repay': loan.repay,
                                                                                                    'status': status
                                                                                                })
                                                                                            }
                                                                                        })


                                                                                        //OUTSTANDING LOANS
                                                                                        Subscription.find({})
                                                                                            .sort('returndate')
                                                                                            .populate('owner')
                                                                                            .populate('disbursedBy')
                                                                                            .populate('reviewedBy')
                                                                                            .deepPopulate('owner.cards')
                                                                                            .exec(function (err, loans) {
                                                                                                if (err) return next(err)
                                                                                                var outStandingSubscriptions = []
                                                                                                loans.forEach((loan) => {
                                                                                                    var status = 0
                                                                                                    if (loan.granted === true) {
                                                                                                        status = 1
                                                                                                    }
                                                                                                    if (loan.declined === true) {
                                                                                                        status = 6
                                                                                                    }
                                                                                                    if (loan.disbursed === true) {
                                                                                                        status = 2
                                                                                                    }
                                                                                                    if (loan.hasPaid === true) {
                                                                                                        status = 3
                                                                                                    }
                                                                                                    // Calculate amount of days past-due
                                                                                                    var date0 = new Date(loan.returndate);
                                                                                                    var date1 = new Date();

                                                                                                    var numberOfDays = Math.ceil((date1 - date0) / 8.64e7);
                                                                                                    console.log('the remaining days are: ' + numberOfDays)

                                                                                                    if (numberOfDays === 1 && loan.hasPaid === false) {
                                                                                                        status = 4
                                                                                                    }
                                                                                                    if (numberOfDays > 1 && loan.hasPaid === false) {
                                                                                                        status = 5
                                                                                                    }

                                                                                                    let newAmountRepay = 0;
                                                                                                    if (numberOfDays > 7) {
                                                                                                        var overdueInterest = loan.repay / 100
                                                                                                        newAmountRepay = overdueInterest + loan.repay
                                                                                                    }
                                                                                                    //console.log('the new amount to pay is:' + newAmountRepay)

                                                                                                    if (loan.owner && loan.hasPaid === false && loan.granted === true && numberOfDays > 1) {
                                                                                                        outStandingSubscriptions.push({
                                                                                                            'id': loan.owner._id,
                                                                                                            'loanID': loan._id,
                                                                                                            'owner': loan.owner.fullname,
                                                                                                            'creditScore': loan.owner.creditScore,
                                                                                                            'uniqueId': loan.uniqueId,
                                                                                                            'email': loan.owner.email,
                                                                                                            'created': loan.created.toLocaleString('en-US'),
                                                                                                            'amount': loan.amount,
                                                                                                            'repayAmount': newAmountRepay,
                                                                                                            'approved': loan.reviewedBy.fullname,
                                                                                                            'debit': loan.owner.cards.length > 0,
                                                                                                            'returndate': formatDate(loan.returndate),
                                                                                                            'days': loan.days,
                                                                                                            'granted': loan.granted,
                                                                                                            'hasPaid': loan.hasPaid,
                                                                                                            'repaid': loan.dateRepaid,
                                                                                                            'repay': loan.repay,
                                                                                                            'status': status
                                                                                                        })
                                                                                                    }
                                                                                                    //console.log('Your Outstanding loans'+ outStandingSubscriptions)  
                                                                                                    // console.log(JSON.stringify(loan) )  
                                                                                                })


                                                                                                //YESTERDAY LOANS
                                                                                                Subscription.find({
                                                                                                    "created": {
                                                                                                        $lt: new Date(new Date().setHours(23, 59, 59) - 864e5),
                                                                                                        $gte: new Date(new Date().setHours(00, 00, 00) - 864e5)
                                                                                                    }
                                                                                                })
                                                                                                    .sort('-created')
                                                                                                    .populate('owner')
                                                                                                    .populate('disbursedBy')
                                                                                                    .exec(function (err, loans) {
                                                                                                        if (err) return next(err)
                                                                                                        var yesterdaySubscriptions = []
                                                                                                        loans.forEach((loan) => {
                                                                                                            var status = 0
                                                                                                            if (loan.granted === true) {
                                                                                                                status = 1
                                                                                                            }
                                                                                                            if (loan.declined === true) {
                                                                                                                status = 6
                                                                                                            }
                                                                                                            if (loan.disbursed === true) {
                                                                                                                status = 2
                                                                                                            }
                                                                                                            if (loan.hasPaid === true) {
                                                                                                                status = 3
                                                                                                            }
                                                                                                            if (loan.return === true) {
                                                                                                                status = 7
                                                                                                            }
                                                                                                            // Calculate amount of days past-due
                                                                                                            var date0 = new Date(loan.returndate);
                                                                                                            var date1 = new Date();

                                                                                                            var numberOfDays = Math.ceil((date1 - date0) / 8.64e7);
                                                                                                            console.log('the remaining days are: ' + numberOfDays)

                                                                                                            if (numberOfDays === 1 && loan.hasPaid === false) {
                                                                                                                status = 4
                                                                                                            }
                                                                                                            if (numberOfDays > 1 && loan.hasPaid === false) {
                                                                                                                status = 5
                                                                                                            }


                                                                                                            if (loan.owner) {
                                                                                                                yesterdaySubscriptions.push({
                                                                                                                    'id': loan.owner._id,
                                                                                                                    'loanId': loan._id,
                                                                                                                    'owner': loan.owner.fullname,
                                                                                                                    'uniqueId': loan.uniqueId,
                                                                                                                    'created': loan.created.toLocaleString(),
                                                                                                                    'amount': loan.amount,
                                                                                                                    'days': loan.days,
                                                                                                                    //'approved': loan.reviewedBy.fullname,
                                                                                                                    'repay': loan.repay,
                                                                                                                    'score': loan.owner.creditScore,
                                                                                                                    'returndate': loan.returndate.toLocaleString(),
                                                                                                                    'status': status,
                                                                                                                    'granted': loan.granted,
                                                                                                                    'declined': loan.declined
                                                                                                                })
                                                                                                            }
                                                                                                        })

                                                                                                        if (err) { return next(err) }
                                                                                                        res.render('admin/dashboard', {
                                                                                                            users, userArr, totalSubscription, loanArr, loanArre,
                                                                                                            loanPaid, amountPaidToday, usersRegToday, allAppliedSubscriptions, allRegTotal,
                                                                                                            amountSubscriptionedToday, allSubscriptionsApplied, usersToRepayTotal, outStandingSubscriptions,
                                                                                                            yesterdaySubscriptions
                                                                                                        });

                                                                                                    })
                                                                                            })


                                                                                    })

                                                                            })

                                                                    })
                                                            })
                                                    })
                                            })
                                    })
                            })

                    })

            })
    } else {
        //USER DASHBOARD
        console.log(req.user.fullname)
        if (!req.user.isVerified) {
            return res.redirect('/sms-verification');
        }
        const keyPublishable = process.env.TEST_PAYSTACK_KEY
        const raveKeyPublishable = process.env.TEST_RAVE_KEY
        Subscription.find({ owner: req.user._id })
            .sort("-created")
            .populate('owner')
            .populate('userdetails')
            .exec(function (err, loans) {
                if (err) return next(err)
                var loanArr = []
                // if (loans.userdetails)
                // console.log(loans)
                UserDetails.findOne({ owner: req.user._id }, (err, userdetails) => {
                    // var area = req.ip;
                    // console.log(area)
                    // var Request = unirest.get(`http://api.ipstack.com/${area}?access_key=c8d46595917c17e0692686adbe57265e`)
                    // Request
                    // .header('Accept', 'application/json')
                    // .end(function (response) {
                    //     console.log(response.body.message)
                    // })

                    Notification.find({ recepient: req.user._id, read: false }, (err, notifications) => {
                        // console.log(notifications)
                        if (err) return next(err)
                        notificationArr = []

                        // console.log(notificationArr)
                        var loanIsEmpty = true;
                        if (loans.length > 0) {
                            loanIsEmpty = false;
                        }

                        loans.forEach((loan) => {
                            var status = 0
                            if (loan.granted === true) {
                                status = 1
                            }
                            if (loan.declined === true) {
                                status = 6
                            }
                            if (loan.disbursed === true) {
                                status = 2
                            }
                            if (loan.hasPaid === true) {
                                status = 3
                            }
                            if (loan.return === true) {
                                status = 7
                            }
                            // Calculate amount of days past-due
                            var date0 = new Date(loan.returndate);
                            var date1 = new Date();

                            var numberOfDays = Math.ceil((date1 - date0) / 8.64e7);

                            if (numberOfDays === 0 && loan.hasPaid === false) {
                                status = 4
                            }
                            if (numberOfDays > 0 && loan.hasPaid === false) {
                                status = 5
                            }


                            loanArr.push({
                                'id': loan._id,
                                'uniqueId': loan.uniqueId,
                                'created': loan.created.toLocaleString('en-US'),
                                'amount': loan.amount,
                                'repay': loan.repay,
                                'returndate': loan.returndate,
                                'status': status,
                                'days': loan.days,
                                'return': loan.return
                            })
                        })


                        loanArr.sort((a, b) => (b.created) - (a.created))
                        res.render('customer/dashboard', {
                            userdetails: userdetails,
                            loans: loanArr,
                            // loans: loans,
                            // repay: repay,
                            keyPublishable: keyPublishable,
                            raveKeyPublishable: raveKeyPublishable,
                            loanIsEmpty: loanIsEmpty,
                            Notifications: notifications
                        });
                    })
                })
            })
    }

});

//EDIT THIS LOAN
router.post('/edit-loan', middleware.isLoggedIn, (req, res, next) => {
    const loanID = req.body.loan_id
    Subscription.findOne({ _id: loanID }, function (err, loan) {
        if (err) return next(err)
        if (req.body.amount) loan.amount = req.body.amount;
        if (req.body.days) loan.days = req.body.days;
        if (req.body.repay) loan.repay = req.body.repay;
        if (req.body.returndate) loan.returndate = req.body.returndate;
        if (req.body.reasons) loan.reasons = req.body.reasons;
        loan.save(function (err) {
            if (err) return next(err)
            req.flash('success', 'Your Subscription was updated successfully')
            res.redirect('/dashboard')
        })
    })
})

//charge saved card
router.post('/charge-saved-card', (req, res, next) => {
    const loan_id = req.body.loanID
    Subscription.findOne({ _id: loan_id })
        .populate('owner')
        .deepPopulate('owner.cards')
        .exec(function (err, loan) {
            if (loan.owner) {
                unirest.post('https://api.paystack.co/transaction/charge_authorization')
                    .header({
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${process.env.TEST_PAYSTACK_SECRET}`
                    })
                    .send({
                        'authorization_code': loan.owner.cards[0].authorization_code,
                        'amount': loan.repay * 100,
                        'email': loan.owner.email,
                        'custom_fields': [
                            {
                                display_name: "Mobile Number",
                                variable_name: loan.owner.fullname,
                                value: loan.owner.phonenumber
                            }
                        ]

                    })
                    .end(function (response) {
                        // Check if response was a success
                        if (response.body.data.status = 'success') {
                            unirest.post('https://borome.ng/loan-repay')
                                .header({ 'Accept': 'application/json' })
                                .send({
                                    'loan_id': loan_id,
                                    'Refno': response.body.data.reference
                                })
                                .end(function (response) {
                                    console.log(response.body);
                                });

                            //SEND A MAIL for successful debit
                            sgMail.setApiKey(process.env.SENDGRID_MAIL);
                            const msg = {
                                to: loan.owner.email,
                                from: 'BoroMe <noreply@borome.ng>',
                                subject: 'Payment Successful',
                                // html: '<p>Hello,\n\n' +
                                //     'Your Subscription has been Approved for &#8358;' + loan.amount + ' loan.\n</p>',
                                templateId: 'd-21bd64c180a848b4aa557a07345c726a',
                                dynamic_template_data: {
                                    name: loan.owner.fullname,
                                    amount: loan.amount
                                }
                            };
                            sgMail.send(msg)
                        }
                        req.flash('success', response.body.data.gateway_response)
                        res.redirect('/dashboard')
                    });
            }
        })
})

//DIRECT DEBIT
function directUserDebit() {
    Subscription.find({})
        .populate('owner')
        .deepPopulate('owner.cards')
        .exec(function (err, loans) {
            if (err) return next(err)
            loans.forEach((loan) => {
                var date0 = new Date(loan.returndate);
                var date1 = new Date();
                var numberOfDays = Math.ceil((date1 - date0) / 8.64e7);
                if (loan.granted === true && loan.declined === false && loan.hasPaid === false && numberOfDays > 0 && (loan.owner.cards.length > 0)) {
                    console.log('debit paystack endpoint')
                    unirest.post('https://api.paystack.co/transaction/charge_authorization')
                        .header({
                            'Accept': 'application/json',
                            'Authorization': `Bearer ${process.env.TEST_PAYSTACK_SECRET}`
                        })
                        .send({
                            'authorization_code': loan.owner.cards[0].authorization_code,
                            'amount': loan.repay * 100,
                            'email': loan.owner.email,
                            'custom_fields': [
                                {
                                    display_name: "Mobile Number",
                                    variable_name: loan.owner.fullname,
                                    value: loan.owner.phonenumber
                                }
                            ]
                        })
                        .end(function (response) {
                            // Send email for successful debit
                            console.log('Send Subscription Repay');
                            if (response.body.data.status = 'success') {
                                unirest.post('https://borome.ng/loan-repay')
                                    .headers({ 'Accept': 'application/json' })
                                    .send({
                                        'loan_id': loan._id,
                                        'Refno': response.body.data.reference
                                    })
                                    .end(function (response) {
                                        console.log(response.body);
                                    });

                                sgMail.setApiKey(process.env.SENDGRID_MAIL);
                                const msg = {
                                    to: loan.owner.email,
                                    from: 'BoroMe <noreply@borome.ng>',
                                    subject: 'Payment Successful',
                                    templateId: 'd-21bd64c180a848b4aa557a07345c726a',
                                    dynamic_template_data: {
                                        name: loan.owner.fullname,
                                        amount: loan.repay,
                                    }
                                };
                                sgMail.send(msg)
                            }
                        });
                }
            })

        })
}


function getSum(total, num) {
    return total + num;
}


//BANKING INFORMATION
router.get('/banking-info', middleware.isLoggedIn, (req, res, next) => {
    const keyPublishable = process.env.TEST_PAYSTACK_KEY
    UserDetails.find({ owner: req.user._id }, function (err, userdetails) {
        Notification.find({ recepient: req.user._id }, (err, notifications) => {
            Card.find({ owner: req.user._id }, (err, cards) => {
                console.log(userdetails)
                var cardIsEmpty = true;
                if (cards.length > 0) {
                    cardIsEmpty = false;
                }
                res.render('customer/banking-info', {
                    userdetails: userdetails,
                    Notifications: notifications,
                    Cards: cards,
                    keyPublishable: keyPublishable,
                    cardIsEmpty: cardIsEmpty
                });
            })
        })
    })
});

function addInterest() {
    Subscription.find({})
        .populate('owner')
        .exec(function (err, loans) {
            if (err) return next(err)
            loans.forEach(function (loan) {
                var date0 = new Date(loan.returndate);
                var date1 = new Date();
                var numberOfDays = Math.ceil((date1 - date0) / 8.64e7);
                if (loan.owner && loan.hasPaid === false && loan.granted === true && numberOfDays > 7) {
                    var overdueInterest = loa.amount / 100
                    loan.repayAmount += overdueInterest
                    loan.save((err) => {
                        if (err) return next(err)
                        res.json('Interest added!')
                    })
                }
            })
        })
}

//SCHEDULED TO SEND TO LOAN DEFAULTERS
function sendMailtoOutstanding() {
    Subscription.find({})
        .populate('owner')
        .exec(function (err, loans) {
            if (err) return next(err)
            loans.forEach(function (loan) {
                var date0 = new Date(loan.returndate);
                var date1 = new Date();
                var numberOfDays = Math.ceil((date1 - date0) / 8.64e7);
                if (loan.owner && loan.hasPaid === false && loan.granted === true && numberOfDays > 7) {
                    sgMail.setApiKey(process.env.SENDGRID_MAIL);
                    const msg = {
                        to: loan.owner.email,
                        from: 'BoroMe <noreply@borome.ng>',
                        subject: 'Subscription Repayment Reminder',
                        html: `<p>Dear ${loan.owner.fullname}, kindly note that We shall be publishing your face as a fraudster on the social media, nairaland, blognaija, 
                        and other popular blog pages and website. We’ll make sure you're fished out. we have also informed the police and we will get it on Tv stations Human 
                        right radio, & all notifications will be tagged "wanted fraudster" etc. Your BVN is sufficient information for us, and we will definitely get you. 
                        The credit bureau has been duly notified. Also note that you will be liable to repay all our loan recovery expenditures. </p>`
                    };
                    sgMail.send(msg)
                }
            })
        })
}


//SChEDULED SEVEN DAYS SMS
function scheduledSevenDaysSMS() {
    Subscription.find({})
        .populate('owner')
        .exec(function (err, loans) {

            loans.forEach(function (loan) {
                var date0 = new Date(loan.returndate);
                var date1 = new Date();
                var numberOfDays = Math.ceil((date1 - date0) / 8.64e7);
                if (loan.granted === true && loan.declined === false && loan.hasPaid === false && numberOfDays === -7) {
                    unirest.post('https://v2.sling.com.ng/api/v1/send-sms')
                        .header({ 'Accept': 'application/json', 'Authorization': 'Bearer sling_sjalccx24mwklh2nmkma0pwczk9tsjytofl3ntzii7bh8b17moopvv' })
                        .send({
                            'to': `234${loan.owner.phonenumber}`,
                            'message': `Dear ${loan.owner.fullname} please be reminded that your BoroMe loan of ₦${loan.repay} will be due on ${loan.returndate.toDateString()}.
                    please kindly repay back your loan. Disregard if you've paid. Regards.`,
                            'channel': 1001
                        })
                        .end(function (response) {
                            console.log(response.body);
                        });

                    const message = `Dear ${loan.owner.fullname} please be reminded that your BoroMe loan of ₦${loan.repay} will be due on ${loan.returndate.toDateString()}.
                please kindly repay back your loan. Disregard if you've paid. Regards.`

                    const sms = new SMS()
                    sms.sentBy = 'Scheduled SMS';
                    sms.phone = loan.owner.phonenumber,
                        sms.message = message;
                    sms.status = true;
                    sms.save(function (err) {
                        if (err) return next(err)
                    })

                    sgMail.setApiKey(process.env.SENDGRID_MAIL);
                    const msg = {
                        to: loan.owner.email,
                        from: 'BoroMe <noreply@borome.ng>',
                        subject: 'Subscription Repayment Reminder',
                        html: `<p>Dear ${loan.owner.fullname} kindly note that your BoroMe loan of ₦${loan.repay} will be due on ${loan.returndate.toDateString()}.
                        You may pay with your card or credit our cooperate acc STANBIC IBTC 0032072593 BOROME LTD. Regards </p>`
                    };
                    sgMail.send(msg)
                }
            })
        })
}

//SCHEDULED THREE DAYS SMS
function scheduledThreeDaysSMS() {
    Subscription.find({})
        .populate('owner')
        .exec(function (arr, loans) {

            loans.forEach(function (loan) {
                var date0 = new Date(loan.returndate);
                var date1 = new Date();
                var numberOfDays = Math.ceil((date1 - date0) / 8.64e7);
                if (loan.granted === true && loan.declined === false && loan.hasPaid === false && numberOfDays === -3) {
                    unirest.post('https://v2.sling.com.ng/api/v1/send-sms')
                        .header({ 'Accept': 'application/json', 'Authorization': 'Bearer sling_sjalccx24mwklh2nmkma0pwczk9tsjytofl3ntzii7bh8b17moopvv' })
                        .send({
                            'to': `234${loan.owner.phonenumber}`,
                            'message': `Dear ${loan.owner.fullname} please be reminded that your BoroMe loan of ₦${loan.repay} will be due on ${loan.returndate.toDateString()}.
                    please kindly repay back your loan. Disregard if you've paid. Regards.`,
                            'channel': 1001
                        })
                        .end(function (response) {
                            console.log(response.body);
                        });

                    const message = `Dear ${loan.owner.fullname} please be reminded that your BoroMe loan of ₦${loan.repay} will be due on ${loan.returndate.toDateString()}.
                please kindly repay back your loan. Disregard if you've paid. Regards.`

                    const sms = new SMS()
                    sms.sentBy = 'Scheduled SMS';
                    sms.phone = loan.owner.phonenumber,
                        sms.message = message;
                    sms.status = true;
                    sms.save(function (err) {
                        if (err) return next(err)
                    })

                    sgMail.setApiKey(process.env.SENDGRID_MAIL);
                    const msg = {
                        to: loan.owner.email,
                        from: 'BoroMe <noreply@borome.ng>',
                        subject: 'Subscription Repayment Reminder',
                        html: `<p>Dear ${loan.owner.fullname} kindly note that your BoroMe loan of ₦${loan.repay} will be due on ${loan.returndate.toDateString()}.
                        You may pay with your card or credit our cooperate acc STANBIC IBTC 0032072593 BOROME LTD. Regards </p>`
                    };
                    sgMail.send(msg)
                }
            })
        })
}

//SCHEDULED ONE DAYS SMS
function scheduledOneDaySMS() {
    Subscription.find({})
        .populate('owner')
        .exec(function (err, loans) {

            loans.forEach(function (loan) {
                var date0 = new Date(loan.returndate);
                var date1 = new Date();
                var numberOfDays = Math.ceil((date1 - date0) / 8.64e7);
                if (loan.granted === true && loan.declined === false && loan.hasPaid === false && numberOfDays === 1) {
                    unirest.post('https://v2.sling.com.ng/api/v1/send-sms')
                        .header({ 'Accept': 'application/json', 'Authorization': 'Bearer sling_sjalccx24mwklh2nmkma0pwczk9tsjytofl3ntzii7bh8b17moopvv' })
                        .send({
                            'to': `234${loan.owner.phonenumber}`,
                            'message': `Dear ${loan.owner.fullname} you're to pay the sum of ₦${loan.repay} into our corporate account STANBIC IBTC 0032072593 BOROME LTD
                    today unfailingly, also NOTE that if we involve the loan recovery team all recovery expenses including Legal and Police will borne by you. Regards`,
                            'channel': 1001
                        })
                        .end(function (response) {
                            console.log(response.body);
                        });

                    const message = `Dear ${loan.owner.fullname} you're to pay the sum of ₦${loan.repay} into our corporate account STANBIC IBTC 0032072593 BOROME LTD
                today unfailingly, also NOTE that if we involve the loan recovery team all recovery expenses including Legal and Police will borne by you. Regards`

                    const sms = new SMS()
                    sms.sentBy = 'Scheduled SMS';
                    sms.phone = loan.owner.phonenumber,
                        sms.message = message;
                    sms.status = true;
                    sms.save(function (err) {
                        if (err) return next(err)
                    })

                    sgMail.setApiKey(process.env.SENDGRID_MAIL);
                    const msg = {
                        to: loan.owner.email,
                        from: 'BoroMe <noreply@borome.ng>',
                        subject: 'Subscription Repayment Reminder',
                        html: `<p>Dear ${loan.owner.fullname} you're to pay the sum of ₦${loan.repay} into our corporate account STANBIC IBTC 0032072593 BOROME LTD
                    today unfailingly, also NOTE that if we involve the loan recovery team all recovery expenses including Legal and Police will borne by you. Regards</p>`
                    };
                    sgMail.send(msg)
                }
            })
        })
}

function reduceCreditScore() {
    Subscription.find({})
        .populate('owner')
        .exec(function (err, loans) {
            if (err) return next(err)
            loans.forEach((loan) => {
                var date0 = new Date(loan.returndate);
                var date1 = new Date();
                var numberOfDays = Math.ceil((date1 - date0) / 8.64e7);
                if (loan.granted === true && loan.declined === false && loan.hasPaid === false && numberOfDays > 3) {
                    User.findOne({ _id: loan.owner }, function (err, user) {
                        console.log('reductions loans' + user)
                        if (err) return next(err)
                        user.creditScore = user.creditScore - 20
                        user.save((err) => {
                            if (err) return next(err)
                            res.json('Credit Score Reduced!')
                        })
                    })
                }
            })
        })
}

// Schedule SMS tasks to be run on the server every 11:00pm
const job = cron.schedule('00 11 * * *', function () {
    scheduledSevenDaysSMS()
    scheduledThreeDaysSMS()
    scheduledOneDaySMS()
    directUserDebit()
    sendMailtoOutstanding()
})
console.log('SMS has been sent')
job.start();

//Schedule Direct Debit tasks to be run on the server every 12:04am
const task = cron.schedule('04 00 * * *', function () {
    directUserDebit()
    addInterest()
})
console.log('task started...')
task.start();

//Schedule for credit score reduction to be run on the server every 10:00am on sunday
const work = cron.schedule('00 00 10 * * 7', function () {
    reduceCreditScore()
})
console.log('work started...')
work.start();

//USER SECURITY
router.route('/security')
    .get(middleware.isLoggedIn, (req, res, next) => {
        UserDetails.find({ owner: req.user._id }, function (err, userdetails) {
            Notification.find({ recepient: req.user._id }, (err, notifications) => {
                console.log(userdetails)
                res.render('customer/security', { Notifications: notifications });
            })
        })
    })
    .post(middleware.isLoggedIn, (req, res, next) => {
        User.findById({ _id: req.user._id }, (err, user) => {
            console.log(user)
            if (req.body.newPassword !== req.body.confirmNewPassword) {
                if (err) throw err;
            } else {
                var isSame = bcrypt.compareSync(req.body.oldPassword, user.password)
                if (!isSame) {
                    if (err) { next(err) }
                } else {
                    user.password = req.body.newPassword;
                }


                user.save(function (err) {
                    if (err) { next(err) }
                    else {
                        req.flash('success', 'Your password have been successfully updated')
                        res.redirect('/dashboard');
                    }
                })
            }
        })
    })

// UPDATING BANKING INFORMATION
router.post('/banking-details', middleware.isLoggedIn, (req, res, next) => {
    UserDetails.findOne({ owner: req.user._id }, function (err, userdetails) {
        console.log(userdetails)
        if (err) throw err;
        if (userdetails) {
            if (req.body.accountnumb) userdetails.accountnumber = req.body.accountnumb;
            if (req.body.accountname) userdetails.accountname = req.body.accountname;
            if (req.body.bankname) userdetails.bankname = req.body.bankname;
            userdetails.save(function (err) {
                if (err) throw err;
                req.flash('success', 'Your bank details have been successfully updated')
                res.redirect('/banking-info')
            })
        }
    })
})

//TRANSACTIONS INFORMATION
router.get('/transactions', middleware.isLoggedIn, (req, res, next) => {
    if (req.user.role === 2) {
        Subscription.find({ owner: req.user._id }, function (err, loans) {
            Notification.find({ recepient: req.user._id }, (err, notifications) => {
                var loanArr = []

                loans.forEach((loan) => {
                    var status = 0
                    if (loan.granted === true) {
                        status = 1
                    }
                    if (loan.declined === true) {
                        status = 6
                    }
                    if (loan.disbursed === true) {
                        status = 2
                    }
                    if (loan.hasPaid === true) {
                        status = 3
                    }
                    // Calculate amount of days past-due
                    var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
                    var diffDays = Math.round(((Date.now() - loan.returndate / (oneDay))));
                    console.log(diffDays)

                    if (diffDays === 0 && loan.hasPaid === false) {
                        status = 4
                    }
                    if (diffDays < 0 && loan.hasPaid === false) {
                        status = 5
                    }
                    loanArr.push({
                        'uniqueId': loan.uniqueId,
                        'created': loan.created.toLocaleDateString("en-US"),
                        'amount': loan.amount,
                        'days': loan.days,
                        'repay': loan.repay,
                        'returndate': loan.returndate.toLocaleDateString("en-US"),
                        'status': status
                    })
                })
                res.render('customer/transactions', { loans: loanArr, Notifications: notifications });
            })
        }).sort("-created")
    }

});

//TRANSACTIONS INFORMATION
router.get('/loans', middleware.isLoggedIn, (req, res, next) => {
    if (req.user.role === 2) {

        const keyPublishable = process.env.TEST_PAYSTACK_KEY

        UserDetails.find({ owner: req.user._id }, function (err, userdetails) {
            Notification.find({ recepient: req.user._id }, (err, notifications) => {
                console.log(userdetails)
                if (!userdetails.length === false) {
                    var notEmpty = true
                } else {
                    var notEmpty = false
                }
                console.log(notEmpty)
                User.findById(req.user._id, function (err, user) {

                    res.render('customer/loans', {
                        keyPublishable: keyPublishable,
                        userProfile: user,
                        userdetails: userdetails,
                        notEmpty: notEmpty,
                        Notifications: notifications
                    });
                });

            })
        })
    }
});

// Paystack
router.post('/paystack/webhook/payment', (req, res, next) => {
    //   paystack.plan.create({
    //   name: 'API demo',
    //   amount: amount,
    //   interval: 'monthly'
    // })
    // Retrieve the request's body
    // var event = req.body;
    // // Do something with event
    // res.status(200).json(event);
    // sgMail.setApiKey('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');
    // const msg = {
    //     to: req.user.email,
    //     from: 'BoroMe <borome256@gmail.com>',
    //     subject: 'Your Subscription Application',
    //     text: 'Hello,\n\n' +
    //         'Your Subscription Application was successful.\n'
    // };
    // sgMail.send(msg)

    async.waterfall([

        function (done) {
            var event = req.body;
            res.status(200).json(event);
            done(err, event)
        },
        function (event, done) {
            Subscription.find({ owner: req.user._id }, function (err, loans) {
                if (err) return next(err);
                loans[0].hasPaid = true;
                loans.save(function (err) {
                    if (err) return next(err)
                })
            })

            User.findOne({ _id: req.user._id }, function (err, user) {
                if (err) return next(err);
                console.log(user)
                user.hasPaid = true;
                user.hasApplied = false;
                user.save(function (err) {
                    done(err, event, user)
                })
            })
        }, function (event, user, done) {
            sgMail.setApiKey(process.env.SENDGRID_MAIL);
            const msg = {
                to: user.email,
                from: 'BoroMe <noreply@borome.ng>',
                subject: 'Payment',
                text: 'Hello,\n\n' +
                    'You have successfully paid for your' + loan.amount + ' loan.\n'
            };
            sgMail.send(msg)
            console.log(event)
            res.send(200);

        }
    ])

});





/****************/
// ADMIN ROUTES
/****************/

//CHECKING USER PRofile
router.get('/user/:id', middleware.isLoggedIn, (req, res, next) => {
    User.findById({ _id: req.params.id }, (err, user) => {
        if (err) { return next(err) }
        console.log(user)
        Subscription.find({ owner: user._id }, (err, loans) => {
            if (err) { return next(err) }
            UserDetails.findOne({ owner: user._id }, (err, userdetails) => {
                if (err) { return next(err) }
                if (loans) {
                    loans.sort((a, b) => (b.created) - (a.created))

                    var status = 0
                    if (loans[0].granted === true) {
                        status = 1
                    }
                    if (loans[0].disbursed === true) {
                        status = 2
                    }
                    if (loans[0].hasPaid === true) {
                        status = 3
                    }
                    if (loans[0].declined === true) {
                        status = 6
                    }
                    // // Calculate amount of days past-due
                    // var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
                    // var diffDays = Math.round(((Date.now() - loans[0].returndate / (oneDay))));
                    // // console.log(diffDays)

                    // if (diffDays === 0 && loans[0].hasPaid === false) {
                    //     status = 4
                    // }
                    // if (diffDays < 0 && loans[0].hasPaid === false) {
                    //     status = 5
                    // }
                    // Calculate amount of days past-due
                    var date0 = new Date(loans[0].returndate);
                    var date1 = new Date();

                    var numberOfDays = Math.ceil((date1 - date0) / 8.64e7);
                    // console.log('the remaining days are: ' + numberOfDays)

                    if (numberOfDays === 1 && loans[0].hasPaid === false) {
                        status = 4
                    }
                    if (numberOfDays > 1 && loans[0].hasPaid === false) {
                        status = 5
                    }
                }

                Card.find({ owner: user._id }, function (err, cards) {
                    if (err) { return next(err) }
                    var cardIsEmpty = true
                    if (cards.length < 0) {
                        cardIsEmpty = false
                    }
                    // console.log(status)
                    res.render('admin/user_page', {
                        userdetails: userdetails,
                        loans: loans,
                        user: user,
                        status: status,
                        cardIsEmpty: cardIsEmpty,
                        cards: cards
                    });
                })
            })
        })
    })
    // User.findById({ _id: req.params.id })
    //     .populate('userdetails')
    //     // .populate('loans')
    //     .exec(function (err, user) {
    //         console.log(user)
    //         user.loans.sort((a, b) => (b.created) - (a.created))
    //         var status = ''
    //         if (user.loans[0].granted === false && user.loans[0].declined === false) {
    //             status = 'Pending'
    //         } else {
    //             status = 'Complete'
    //         }

    //         console.log(status)
    //         // if (err) { return next(err) }
    //         res.render('admin/user_page', { user, status });
    //     })
});

//EMAIL USERS
router.route('/email-users')
    .get(middleware.isLoggedIn, (req, res, next) => {
        User.find({}, function (err, users) {
            res.render('admin/email', { users: users })
        })
    })
    .post(middleware.isLoggedIn, (req, res, next) => {
        // User.findOne({}, function(err, user){
        sgMail.setApiKey(process.env.SENDGRID_MAIL);
        const msg = {
            to: req.body.customer,
            from: 'BoroMe <noreply@borome.ng>',
            subject: req.body.subject,
            text: req.body.message,
            templateId: 'd-0207f06170464cf1980f668b8e930aa8',
            dynamic_template_data: {
                message: req.body.message,
                subject: req.body.subject
            }
        };
        sgMail.send(msg);
        // })
        req.flash('success', 'Your mail sent successfully')
        res.redirect('back')
    })

//SMS USERS
router.route('/sms-users')
    .get(middleware.isLoggedIn, (req, res, next) => {
        User.find({}, function (err, users) {
            SMS.find({})
                .populate('owner')
                .exec(function (err, allsms) {
                    var smsSent = []
                    allsms.forEach((sms) => {
                        if (sms.owner || sms.sentBy) {
                            smsSent.push({
                                'fullname': sms.owner.fullname,
                                'sentBy': sms.sentBy,
                                'message': sms.message,
                                'smsId': sms._id,
                                'phone': sms.phone,
                                'created': sms.created.toLocaleString(),
                                'status': sms.status
                            })
                        }
                    })
                    res.render('admin/sms', { users: users, smsSent: smsSent })
                })
        })
    })
    .post(middleware.isLoggedIn, (req, res, next) => {
        async.waterfall([
            function (done) {
                User.findOne({ _id: req.user._id }, function (err, user) {
                    const sms = new SMS()
                    sms.owner = req.user._id;
                    // sms.recepient = user._id,
                    sms.phone = req.body.customer,
                        sms.message = req.body.message;
                    sms.status = true;
                    sms.save(function (err) {
                        done(err, sms)
                    })
                    unirest.post('https://v2.sling.com.ng/api/v1/send-sms')
                        .header({ 'Accept': 'application/json', 'Authorization': 'Bearer sling_sjalccx24mwklh2nmkma0pwczk9tsjytofl3ntzii7bh8b17moopvv' })
                        .send({
                            'to': `234${req.body.customer}`,
                            'message': req.body.message,
                            'channel': 1001
                        })
                        .end(function (response) {
                            console.log(response.body);
                        });
                })
            },
            function (sms, user, done) {
                User.update(
                    {
                        _id: user._id
                    },
                    {
                        $push: { sms: sms._id }
                    }, function (err, count) {
                        if (err) { return next(err) }
                        req.flash('success', 'Your sms was sent successfully')
                        res.redirect('back')
                    }
                );
            }
        ])
    })

//ADMIN SECURITY
router.route('/admin-security')
    .get(middleware.isLoggedIn, (req, res, next) => {
        UserDetails.find({ owner: req.user._id }, function (err, userdetails) {
            Notification.find({ recepient: req.user._id }, (err, notifications) => {
                console.log(userdetails)
                res.render('admin/security', { Notifications: notifications });
            })
        })
    })
    .post(middleware.isLoggedIn, (req, res, next) => {
        User.findById({ _id: req.user._id }, (err, user) => {
            console.log(user)
            if (req.body.newPassword !== req.body.confirmNewPassword) {
                if (err) throw err;
            } else {
                var isSame = bcrypt.compareSync(req.body.oldPassword, user.password)
                if (!isSame) {
                    if (err) { next(err) }
                } else {
                    user.password = req.body.newPassword;
                }


                user.save(function (err) {
                    if (err) { next(err) }
                    else {
                        req.flash('success', 'Your password have been successfully updated')
                        res.redirect('/dashboard');
                    }
                })
            }
        })
    })

//BORROWERS
router.get('/loans-applied', middleware.isLoggedIn, (req, res, next) => {
    if (req.user.role !== 2) {
        Subscription.find({})
            .populate('owner')
            .exec(function (err, loans) {
                if (err) return next(err)
                var loansArr = []

                var status = 0
                loans.forEach((loan) => {

                    if (loan.granted === true) {
                        status = 1
                    }
                    if (loan.disbursed === true) {
                        status = 2
                    }
                    if (loan.declined === true) {
                        status = 6
                    }
                    if (loan.hasPaid === true) {
                        status = 3
                    }
                    // Calculate amount of days past-due
                    var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
                    var diffDays = Math.round(((Date.now() - loan.returndate / (oneDay))));
                    console.log(diffDays)

                    if (diffDays === 0 && loan.hasPaid === false) {
                        status = 4
                    }
                    if (diffDays < 0 && loan.hasPaid === false) {
                        status = 5
                    }
                    if (loan.owner) {
                        loansArr.push({
                            'id': loan.owner._id,
                            'loanId': loan._id,
                            'fullname': loan.owner.fullname,
                            'role': loan.owner.role,
                            'hasApplied': loan.owner.hasApplied,
                            'email': loan.owner.email,
                            'created': loan.created.toLocaleDateString("en-US"),
                            'amount': loan.amount,
                            'dateRepaid': loan.dateRepaid,
                            'status': status,
                            'score': loan.owner.creditScore,
                            'days': loan.days,
                            'returndate': loan.returndate.toLocaleDateString("en-US"),
                            'uniqueId': loan.uniqueId
                        })
                    }
                    console.log(loansArr)

                })
                res.render('admin/Borrowers', { loans: loansArr });
            })
    }
});

//CREATE NEW USER
router.get('/createnewuser', middleware.isLoggedIn, (req, res, next) => {
    if (req.user.role === 1) {
        Subscription.find({})
            .populate('owner')
            .exec(function (err, loans) {
                if (err) return next(err)
                res.render('admin/create_user', { loans });
            })
    }
});

//VIEW EMPLOYEES
router.get('/employees', middleware.isLoggedIn, (req, res, next) => {
    if (req.user.role === 1) {
        userArr = []
        User.find({}, (err, users) => {
            users.forEach((user) => {
                if (user.role !== 1 && user.role !== 2) {
                    userArr.push(user)
                }
            })
        })
        Subscription.find({})
            .populate('owner')
            .exec(function (err, loans) {
                if (err) return next(err)
                res.render('admin/employees', { loans: loans, users: userArr });
            })
    }
});

//REVIEWS
router.get('/user-reviews', middleware.isLoggedIn, (req, res, next) => {
    Review.find({})
        .populate('owner')
        .exec(function (err, reviews) {
            console.log(reviews)
            var reviewArr = [];
            if (err) return next(err);
            reviews.forEach((review) => {
                reviewArr.push({
                    'id': review._id,
                    'fullname': review.owner.fullname,
                    'email': review.owner.email,
                    'rating': review.rating,
                    'review': review.review,
                    'created': review.created
                })
            })
            res.render('admin/review', { reviews: reviewArr });
        })
});

//BORROWERS ACCOUNT NUMBER
router.get('/borrowers-account-number', middleware.isLoggedIn, (req, res, next) => {
    UserDetails.find({})
        .populate('owner')
        .exec(function (err, userdetails) {
            var usersAccount = []
            if (err) return next(err);
            userdetails.forEach((user) => {
                if (user.owner) {
                    usersAccount.push({
                        'id': user.owner._id,
                        'fullname': user.owner.fullname,
                        'bankname': user.bankname,
                        'accountname': user.accountname,
                        'bvn': user.bvn,
                        'accountnumber': user.accountnumber,
                        'role': user.owner.role
                    })
                }
            })
            res.render('admin/account_numb', { usersAccount });
        })
})

//ADMIN ANALYTICS
router.get('/admin-analytics', middleware.isLoggedIn, (req, res, next) => {

    User.find({})
        .populate('userdetails')
        .exec((err, user) => {
            var results = []
            var userResult = []
            var dateParse = d3.timeFormat('%Y-%m-%d');
            if (err) return next(err);
            user.forEach(function (v) {
                v.createdAt = dateParse(v.createdAt);
                if (!this[v.createdAt]) {
                    this[v.createdAt] = {
                        date: dateParse(v.createdAt),
                        value1: 0,
                    }
                    userResult.push(this[v.createdAt])
                }
                this[v.createdAt].value1 += 1
            }, Object.create(null));

            var dateValueMap = userResult.reduce(function (r, v) {
                r[v.date] = v.value;
                return r;
            }, {});

            var dateExtent = d3.extent(userResult.map(function (v) {
                return v.date;
            }));

            // make data have each date within the extent
            var fullDayRange = d3.timeDay.range(
                dateExtent[0],
                d3.timeDay.offset(dateExtent[1], 1)
            );
            fullDayRange.forEach(function (date) {
                if (!(date.toISOString() in dateValueMap)) {
                    userResult.push({
                        'date': date,
                        'value': 0
                    });
                }
            });
            userResult = userResult.sort(function (a, b) {
                return a.date - b.date;
            });
            Subscription.find({})
                .populate('owner')
                .exec(function (err, loans) {
                    if (err) return next(err);
                    loans.forEach(function (v) {
                        console.log('1')
                        v.created = dateParse(v.created);
                        if (!this[v.created]) {
                            this[v.created] = {
                                date: dateParse(v.created),
                                value1: 0,
                                value2: 0,
                                value3: 0,
                                amtApprov: 0,
                                amtDeclin: 0
                            }
                            // if (v.granted == true) {
                            //     this[v.created].value2 = 0
                            // }
                            console.log(v.declined)
                            // if (v.declined == true) {
                            //     console.log('3')
                            //     this[v.created].value3 = 0
                            // }
                            results.push(this[v.created])
                        }
                        this[v.created].value1 += 1
                        if (v.granted == true) {
                            this[v.created].amtApprov += v.amount
                            this[v.created].value2 += 1
                        }
                        if (v.declined == true) {
                            this[v.created].amtDeclin += v.amount
                            this[v.created].value3 += 1
                        }
                        console.log(this)
                    }, Object.create(null));

                    var dateValueMap = results.reduce(function (r, v) {
                        r[v.date] = v.value;
                        return r;
                    }, {});

                    var dateExtent = d3.extent(results.map(function (v) {
                        return v.date;
                    }));

                    // make data have each date within the extent
                    var fullDayRange = d3.timeDay.range(
                        dateExtent[0],
                        d3.timeDay.offset(dateExtent[1], 1)
                    );
                    fullDayRange.forEach(function (date) {
                        if (!(date.toISOString() in dateValueMap)) {
                            results.push({
                                'date': date,
                                'value': 0
                            });
                        }
                    });

                    results = results.sort(function (a, b) {
                        return a.date - b.date;
                    });
                    // console.log(results)
                    Subscription.find({})
                        .populate('owner')
                        .exec((err, loans) => {
                            UserDetails.find({}, (err, userdetails) => {
                                var loansArr = []

                                var status = 0
                                loans.forEach((loan) => {

                                    if (loan.granted === true) {
                                        status = 1
                                    }
                                    if (loan.disbursed === true) {
                                        status = 2
                                    }
                                    if (loan.declined === true) {
                                        status = 6
                                    }
                                    if (loan.hasPaid === true) {
                                        status = 3
                                    }
                                    // Calculate amount of days past-due
                                    var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
                                    var diffDays = Math.round(((Date.now() - loan.returndate / (oneDay))));
                                    console.log(diffDays)

                                    if (diffDays === 0 && loan.hasPaid === false) {
                                        status = 4
                                    }
                                    if (diffDays < 0 && loan.hasPaid === false) {
                                        status = 5
                                    }

                                    if (loan.owner) {
                                        loansArr.push({
                                            'id': loan.owner._id,
                                            'loanId': loan._id,
                                            'fullname': loan.owner.fullname,
                                            'role': loan.owner.role,
                                            'hasApplied': loan.owner.hasApplied,
                                            'email': loan.owner.email,
                                            'phonenumber': loan.owner.phonenumber,
                                            'created': loan.created.toLocaleDateString("en-US"),
                                            'amount': loan.amount,
                                            'status': status,
                                            'score': loan.owner.creditScore,
                                            'repay': loan.repay,
                                            'returndate': loan.returndate.toLocaleDateString("en-US"),
                                            'uniqueId': loan.uniqueId
                                        })
                                    }
                                    console.log(loansArr)

                                })
                                res.render('admin/analytics', {
                                    results: results,
                                    userResult: userResult,
                                    userArr: user,
                                    userdetailsArr: userdetails,
                                    loanArr: loansArr
                                });
                            })
                        })
                })
        })
})

// REVIEW AND RATING
router.route('/feedback')
    .get(middleware.isLoggedIn, (req, res, next) => {
        User.findOne({ _id: req.user._id }, function (err, user) {
            Notification.find({ recepient: req.user._id }, function (err, notifications) {
                if (err) return next(err)
                res.render('customer/feedback', { user: user, Notifications: notifications })
            })
        })
    })
    .post(middleware.isLoggedIn, (req, res, next) => {
        async.waterfall([
            function (done) {
                User.findOne({ _id: req.user._id }, function (err, user) {
                    if (err) return next(err)
                    user.hasRated = true;
                    user.save(function (err) {
                        done(err, user)
                    })
                })
            },
            function (user, done) {
                const review = new Review()
                const { rate, message } = req.body;

                review.owner = req.user._id;
                review.rating = rate;
                review.review = message;
                review.save(function (err) {
                    done(err, review, user)
                    console.log(review)
                })
            }, function (review, user, done) {
                User.update(
                    {
                        _id: req.user._id
                    },
                    {
                        $push: { review: review._id }
                    }, function (err) {
                        if (err) { return next(err) }
                        req.flash('success', 'Your feedback was sent! Thank you')
                        res.redirect('/feedback');
                    }
                )
            }
        ])
    })


// CREATE NEW USER
router.post('/createnewuser', middleware.isLoggedIn, (req, res, next) => {
    var user = new User()
    user.email = req.body.email,
        user.fullname = req.body.fullname,
        user.isVerified = true,
        user.password = req.body.password,
        user.phonenumber = req.body.phonenumber,
        user.password = req.body.password,
        user.role = req.body.role,
        user.address = req.body.address,
        user.city = req.body.city,
        user.photo = '/files/1548154303513-file.png'
    user.save((err) => {
        if (err) { return next(err) }
        req.flash('success', 'User has been created')
        res.redirect('/dashboard');
    })
})



//FOR LOANS GRANTED
router.post('/granted', middleware.isLoggedIn, (req, res, next) => {
    async.waterfall([
        function (done) {
            const loandID = req.body.loan_id;
            Subscription.findOne({ _id: loandID }, function (err, loan) {
                if (err) return next(err)
                // Verify and save the user
                loan.granted = true;
                loan.reviewedBy = req.user._id;
                if (req.body.comment) {
                    loan.comment = req.body.comment;
                }
                loan.save(function (err) {
                    if (err) return next(err);
                    var notification = new Notification({
                        recepient: loan.owner,
                        sender: req.user._id,
                        loan: loan._id,
                        content: 'Your loan has been Approved!'
                    })
                    notification.save((err) => {
                        if (err) return next(err);

                        User.findById({ _id: loan.owner }, (err, user) => {
                            sgMail.setApiKey(process.env.SENDGRID_MAIL);
                            const msg = {
                                to: user.email,
                                from: 'BoroMe <noreply@borome.ng>',
                                subject: 'Subscription Approved',
                                // html: '<p>Hello,\n\n' +
                                //     'Your Subscription has been Approved for &#8358;' + loan.amount + ' loan.\n</p>',
                                templateId: 'd-5573c820abc448bd904800da848d00b2',
                                dynamic_template_data: {
                                    name: user.fullname,
                                    amount: loan.amount,
                                }
                            };
                            sgMail.send(msg)
                        })

                        console.log(loan)
                        done(err, loan)
                    })
                });
            })
            console.log('user function')
            const loanTotal = req.body.loan_amount;

            User.findById(req.user._id, (err, user) => {
                console.log(user)
                user.totalSubscription = (parseInt(loanTotal)) + user.totalSubscription;
                user.update(
                    {
                        $push: {
                            loanInfo: { loandID, loanTotal }
                        }
                    }
                )
                user.save((err) => {
                    if (err) return next(err);
                    res.json('Subscription granted')
                })
            })
        }
    ])
})

//FOR DECLINED LOANS
router.post('/declined', middleware.isLoggedIn, (req, res, next) => {
    async.waterfall([
        function (done) {
            const loandID = req.body.loan_id;
            console.log(req.body)
            Subscription.findOne({ _id: loandID }, function (err, loan) {
                if (err) return next(err)
                console.log(loan)
                // Verify and save the user
                loan.declined = true;
                loan.return = false;
                loan.reviewedBy = req.user._id;
                if (req.body.comment) {
                    loan.comment = req.body.comment;
                }
                loan.save(function (err) {
                    if (err) return next(err);

                    var notification = new Notification({
                        recepient: loan.owner,
                        sender: req.user._id,
                        loan: loan._id,
                        content: 'Your loan has been Declined!'
                    })
                    notification.save((err) => {
                        if (err) return next(err);
                        console.log(notification)

                        User.findById({ _id: loan.owner }, (err, user) => {
                            if (err) return next(err);
                            console.log(user)
                            user.hasApplied = false;

                            user.save((err) => {
                                if (err) return next(err);

                                sgMail.setApiKey(process.env.SENDGRID_MAIL);
                                const msg = {
                                    to: user.email,
                                    from: 'BoroMe <noreply@borome.ng>',
                                    subject: 'Subscription Declined',
                                    // html: '<p>Hello,\n\n' +
                                    //     'Your Subscription has been Approved for &#8358;' + loan.amount + ' loan.\n</p>',
                                    templateId: 'd-0ee7798b40b94c3fab674c35f1f01c2d',
                                    dynamic_template_data: {
                                        name: user.fullname,
                                        amount: loan.amount,
                                    }
                                };
                                sgMail.send(msg)
                                res.json('Subscription declined')
                                done(err, user)
                            })
                        })
                    })
                });
            })
            console.log('declined function')
        }
    ])
})

//FOR DISBURSED
router.post('/disbursed', middleware.isLoggedIn, (req, res, next) => {
    async.waterfall([
        function (done) {
            const loandID = req.body.loan_id;
            const loanAmount = req.body.loan_amount;
            console.log(req.body)
            Subscription.findOne({ _id: loandID }, function (err, loan) {
                if (err) return next(err)
                console.log(loan)
                // Verify and save the user
                loan.disbursed = true;
                loan.disbursedBy = req.user._id;
                loan.dateDisbursed = Date.now()
                loan.save(function (err) {
                    if (err) return next(err);


                    var notification = new Notification({
                        recepient: loan.owner,
                        sender: req.user._id,
                        loan: loan._id,
                        content: 'Your loan has been Disbursed!'
                    })
                    notification.save((err) => {
                        if (err) return next(err);
                        console.log(notification)

                        User.findById({ _id: loan.owner }, (err, user) => {
                            if (err) return next(err);
                            console.log(user)

                            // user.save((err) => {
                            //     if (err) return next(err);                            
                            User.findById({ _id: req.user._id }, (err, admin) => {
                                if (err) return next(err);

                                admin.totalDisbursed = (parseInt(loanAmount)) + admin.totalDisbursed;

                                admin.save((err) => {
                                    sgMail.setApiKey(process.env.SENDGRID_MAIL);
                                    const msg = {
                                        to: user.email,
                                        from: 'BoroMe <noreply@borome.ng>',
                                        subject: 'Subscription Disbursed',
                                        // html: '<p>Hello,\n\n' +
                                        //     'Your Subscription has been Approved for &#8358;' + loan.amount + ' loan.\n</p>',
                                        templateId: 'd-bef9182c0c1c4ca59988f214b0231f0c',
                                        dynamic_template_data: {
                                            name: user.fullname,
                                            amount: loan.amount,
                                        }
                                    };
                                    sgMail.send(msg)
                                    res.json('Subscription disbursed')
                                    done(err, notification)
                                })
                            })
                            // })
                        })
                    })
                });
            })
            console.log('disbursed function')
        }
    ])
})

//ALL CUSTOMERS 
router.get('/customers', (req, res, next) => {
    User.find({})
        .sort('-createdAt')
        .populate('loans')
        .exec(function (err, users) {
            if (err) return next(err)
            var allCustomers = []
            users.forEach((user) => {
                allCustomers.push({
                    'userId': user._id,
                    'owner': user.fullname,
                    'created': user.createdAt.toLocaleString(),
                    'email': user.email,
                    'applied': user.hasApplied,
                    'phone': user.phonenumber,
                    'location': user.location,
                    'role': user.role,
                    'credit': user.creditScore,
                })
            })
            res.render('admin/users', { allCustomers })
        })
})

//REPAY ON THE SERVER
router.post('/loan-repay', (req, res, next) => {
    async.waterfall([
        function (done) {
            const loandID = req.body.loan_id;
            console.log(loandID)
            Subscription.findOne({ _id: loandID }, function (err, loan) {
                if (err) return next(err)
                console.log(loan)
                // Verify and save the user
                loan.hasPaid = true;
                loan.dateRepaid = new Date();
                loan.Refno = req.body.Refno;
                if (req.body.comment) {
                    loan.comment = req.body.comment;
                }
                loan.save(function (err) {
                    if (err) return next(err);
                    var notification = new Notification({
                        recepient: loan.owner,
                        sender: loan.reviewedBy,
                        loan: loan._id,
                        content: 'Your Payment has been Confirmed!'
                    })
                    notification.save((err) => {
                        if (err) return next(err);
                        done(err, loan)
                    })
                    if (err) return next(err);
                    //console.log(loan)
                    User.findById({ _id: loan.owner }, (err, user) => {
                        // Calculate amount of days past-due
                        var date0 = new Date(loan.returndate);
                        var date1 = new Date();

                        var numberOfDays = Math.ceil((date1 - date0) / 8.64e7);

                        if (numberOfDays == 0 && loan.hasPaid === false) {
                            status = 4
                        }
                        if (numberOfDays > 0 && loan.hasPaid === false) {
                            status = 5
                        }

                        user.hasApplied = false
                        if (numberOfDays == 1) {
                            user.creditScore = user.creditScore + 20
                        }
                        if (1 > numberOfDays && numberOfDays > -7) {
                            user.creditScore = user.creditScore + 30
                        }
                        if (numberOfDays < -7) {
                            user.creditScore = user.creditScore + 35
                        }
                        if (numberOfDays > 7) {
                            user.creditScore = user.creditScore - 20
                        }
                        user.save((err) => {
                            if (err) return next(err);
                            sgMail.setApiKey(process.env.SENDGRID_MAIL);
                            const msg = {
                                to: user.email,
                                from: 'BoroMe <noreply@borome.ng>',
                                subject: 'Subscription Payment Confirmed',
                                // html: '<p>Hello,\n\n' +
                                //     'Your Subscription has been Approved for &#8358;' + loan.amount + ' loan.\n</p>',
                                templateId: 'd-da9d54ebbf724d57aa3420f07c6b10a0',
                                dynamic_template_data: {
                                    name: user.fullname,
                                    amount: loan.repay,
                                }
                            };
                            sgMail.send(msg)
                            res.json('Payment Confirmed')
                        })
                    })
                });
            })
            console.log('paid function')
        }
    ])
})


//FOR PAID
router.post('/paid', middleware.isLoggedIn, (req, res, next) => {
    async.waterfall([
        function (done) {
            const loandID = req.body.loan_id;
            console.log(req.body)
            Subscription.findOne({ _id: loandID }, function (err, loan) {
                if (err) return next(err)
                console.log(loan)
                // Verify and save the user
                loan.hasPaid = true;
                loan.dateRepaid = new Date();
                loan.reviewedBy = req.user._id;
                if (req.body.comment) {
                    loan.comment = req.body.comment;
                }
                loan.save(function (err) {
                    if (err) return next(err);
                    var notification = new Notification({
                        recepient: loan.owner,
                        sender: req.user._id,
                        loan: loan._id,
                        content: 'Your Payment has been Confirmed!'
                    })
                    notification.save((err) => {
                        if (err) return next(err);
                        done(err, loan)
                    })

                    console.log(loan)
                    User.findById({ _id: loan.owner }, (err, user) => {
                        if (err) return next(err);
                        // Calculate amount of days past-due
                        var date0 = new Date(loan.returndate);
                        var date1 = new Date();

                        var numberOfDays = Math.ceil((date1 - date0) / 8.64e7);

                        if (numberOfDays == 0 && loan.hasPaid === false) {
                            status = 4
                        }
                        if (numberOfDays > 0 && loan.hasPaid === false) {
                            status = 5
                        }

                        user.hasApplied = false
                        if (numberOfDays == 1) {
                            user.creditScore = user.creditScore + 20
                        }
                        if (1 > numberOfDays && numberOfDays > -7) {
                            user.creditScore = user.creditScore + 30
                        }
                        if (numberOfDays < -7) {
                            user.creditScore = user.creditScore + 35
                        }
                        if (numberOfDays > 7) {
                            user.creditScore = user.creditScore - 20
                        }
                        user.save((err) => {
                            if (err) return next(err);
                            sgMail.setApiKey(process.env.SENDGRID_MAIL);
                            const msg = {
                                to: user.email,
                                from: 'BoroMe <noreply@borome.ng>',
                                subject: 'Subscription Payment Confirmed',
                                // html: '<p>Hello,\n\n' +
                                //     'Your Subscription has been Approved for &#8358;' + loan.amount + ' loan.\n</p>',
                                templateId: 'd-da9d54ebbf724d57aa3420f07c6b10a0',
                                dynamic_template_data: {
                                    name: user.fullname,
                                    amount: loan.repay,
                                }
                            };
                            sgMail.send(msg)
                            res.json('Payment Confirmed')
                        })
                    })
                });
            })
            console.log('paid function')
        }
    ])
})

//FOR PAID
router.post('/return-loan', middleware.isLoggedIn, (req, res, next) => {
    async.waterfall([
        function (done) {
            const loanID = req.body.loan_id;
            console.log(req.body)
            Subscription.findOne({ _id: loanID }, function (err, loan) {
                if (err) return next(err)
                console.log(loan)
                // Verify and save the user
                loan.return = true;
                if (req.body.comment) {
                    loan.comment = req.body.comment;
                }
                loan.save(function (err) {
                    if (err) return next(err);
                    var notification = new Notification({
                        recepient: loan.owner,
                        sender: req.user._id,
                        loan: loan._id,
                        content: 'Your Subscription Has Been Returned!'
                    })
                    notification.save((err) => {
                        if (err) return next(err);
                        done(err, loan)
                    })

                    User.findById({ _id: loan.owner }, (err, user) => {
                        if (err) return next(err);
                        sgMail.setApiKey(process.env.SENDGRID_MAIL);
                        const msg = {
                            to: user.email,
                            from: 'BoroMe <noreply@borome.ng>',
                            subject: 'Subscription Returned',
                            // html: '<p>Hello,\n\n' +
                            //     'Your Subscription has been Approved for &#8358;' + loan.amount + ' loan.\n</p>',
                            templateId: 'd-fe5328d52f4e44cdb61d4e68fc11f7d2',
                            dynamic_template_data: {
                                name: user.fullname,
                                amount: loan.amount,
                            }
                        };
                        sgMail.send(msg)
                        res.json('Subscription Returned!')
                    })
                });
            })
        }
    ])
})

//CAlculate SMS SENDER TWO DAYS BEFORE RETURN
// router.post('/sms-reminder', (req, res, next)=>{
//     loans.find({})
//     .exec(function (err, loans) {

//         loans.forEach(function (loan) {
//             var date = loan.returndate;
//             var yesterday = date - 1000 * 60 * 60 * 24 * 2;   // current date's milliseconds - 1,000 ms * 60 s * 60 mins * 24 hrs * (# of days beyond one to go back)
//             yesterday = new Date(yesterday);
//             console.log('All loans return date' + yesterday.toLocaleString())

//             if (loan.returndate){

//             }
//         })


//     })
// })


// function directDebit() {
//     // Get all loans
//     Subscription.find({}, (err, loans) => {
//         loanArr = []
//         loans.forEach((loan) => {
//             // Check if loans have been granted and has not been repaid
//             if (loan.granted === true && loan.hasPaid === false) {
//                 // Calculate amount of days past-due
//                 var oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
//                 var diffDays = Math.round(((Date.now() - loan.returndate / (oneDay))));
//                 console.log(diffDays)
//                 if (diffDays < 0) {
//                     Card.find({ owner: loan.owner }, (err, cards) => {
//                         for (i = 0; i < cards.length; i++) {
//                             // Check if card is reusable
//                             if (card[i].reusable) {
//                                 User.findById({ _id: card[i].owner }, (err, user) => {
//                                     request.post(
//                                         'https://api.paystack.co/transaction/charge_authorization',
//                                         {
//                                             json:
//                                             {
//                                                 authorization_code: card[i].authorization_code,
//                                                 email: user.email,
//                                                 amount: loan.repay * 100
//                                             },
//                                             headers: {
//                                                 'Authorization': 'Bearer' + ' ' + process.env.TEST_PAYSTACK_SECRET,
//                                                 'Content-Type': 'application/json'
//                                             }
//                                         },
//                                         function (error, response, body) {
//                                             if (!error && response.statusCode == 200) {
//                                                 console.log(body)

//                                                 // Send email for successful debit
//                                                 sgMail.setApiKey(process.env.SENDGRID_MAIL);
//                                                 const msg = {
//                                                     to: user.email,
//                                                     from: 'BoroMe <noreply@borome.ng>',
//                                                     subject: 'Payment Successful',
//                                                     // html: '<p>Hello,\n\n' +
//                                                     //     'Your Subscription has been Approved for &#8358;' + loan.amount + ' loan.\n</p>',
//                                                     templateId: 'd-21bd64c180a848b4aa557a07345c726a',
//                                                     dynamic_template_data: {
//                                                         amount: loan.amount,
//                                                     }
//                                                 };
//                                                 sgMail.send(msg)
//                                                 break;
//                                             } else {
//                                                 // Send email for  debit failure
//                                                 sgMail.setApiKey(process.env.SENDGRID_MAIL);
//                                                 const msg = {
//                                                     to: user.email,
//                                                     from: 'BoroMe <noreply@borome.ng>',
//                                                     subject: 'Payment Declined',
//                                                     // html: '<p>Hello,\n\n' +
//                                                     //     'Your Subscription has been Approved for &#8358;' + loan.amount + ' loan.\n</p>',
//                                                     templateId: 'd-347d7aa0a1b44ce3a48b11e83527ba9c',
//                                                     dynamic_template_data: {
//                                                         amount: loan.amount,
//                                                     }
//                                                 };
//                                                 sgMail.send(msg)
//                                             }
//                                         }
//                                     );
//                                 })
//                             }
//                         }
//                     })
//                 }
//             }
//         })
//     })
// }

function formatDate(date) {
    var d = (date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear().toString();
    year = year.substr(year.length - 2);
    time = '' + (d.getTime() + 1)

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}



module.exports = router;