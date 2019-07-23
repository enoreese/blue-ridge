module.exports = {
    database: process.env.DATABASE_URL || "mongodb://localhost/blueridge-db" ,
    port: process.env.PORT|| 3033,
    paystack_sk: process.env.PAYSTACK_SK || 'sk_test_53dfd2d8d2d7a8dbe632c06579f40ad2f1744a2a',
    paystack_pk: process.env.PAYSTACK_PK || '',
    sendgrid_key: process.env.SENDGRID_KEY || '',
    twitter_consumer_key: process.env.TWITTER_CONSUMER_KEY || '',
    twitter_consumer_secret: process.env.TWITTER_CONSUMER_SECRET || ''
}