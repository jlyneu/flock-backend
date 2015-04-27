var express = require('express');
var crypto = require('crypto');
var uuid = require('node-uuid');
var app = express();

// List of allowed origins
var origins = ["http://www.northeastern.edu",
    "http://localhost:63342",
    "http://localhost:9876",
    "http://localhost:8000", 
    "http://zachbachiri.com"];
    
// Encryption information for cookies
var algorithm = 'aes192';
var hashSecret = 'b3riF2ofjA4t3FgjEG';
    
// Flock application information
var flockConsumerKey = 'pEaf5TgKTpz0Tf1M9uyqZSysQ';
var flockConsumerSecret = 'dTV7OuEkgauN8syVrOT5T9XzK8CnXpSvjMEELlZshz1aqdsAVW';

// Default Guest access token and secret
var flockAccessToken = '3029162194-GAze2tNS3Y4rPvIwvXZ1j813hZriXKWNpWjo3dd';
var flockAccessSecret = 'ndsckIxbSpvDuTZGdmzP4pGac6fsBjfQAVkL5EoTzpd3M';

// URL to redirect user from Twitter sign in page
//var flockRedirectUrl = 'http://zachbachiri.com/Flock/#/redirect';
var flockRedirectUrl = 'http://www.northeastern.edu/flock/#/redirect';

// Set Cross Origin Resource Sharing headers 
app.use(function(req, res, next) {
    if (req.headers.origin) {
        // can only set one allowed origin per response, therefore
        // check to see if origin of request is in origins list and
        // set header if so
        var origin;
        for (var i = 0; i < origins.length; i++) {
          origin = origins[i]
          if (req.headers.origin.indexOf(origin) > -1){
              res.header("Access-Control-Allow-Origin", origin);
              break;
          }
        }
        res.header("Access-Control-Allow-Methods", "GET");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    }
    next();
});

// Set port number
app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

// configure node-twitter-api with flock application information
var twitterAPI = require('node-twitter-api');
var twitter = new twitterAPI({
    consumerKey: flockConsumerKey,
    consumerSecret: flockConsumerSecret,
    callback: flockRedirectUrl
});

/*
    @name:    GET /requestToken
    @author:  Jimmy Ly
    @created: Mar 28, 2015
    @purpose: obtain a requestToken and requestTokenSecret from the Twitter API
              to return to the user.
    @param:   request - parameters/headers passed in with request
    @param:   response - parameters/headers sent to requester
    @error:   sends a 502 error if call to the Twitter API fails
    @return:  encrypted request token and secret the Twitter sign-in url based on the
              request tokens obtained
    @modhist: Apr 17 2015 : Jimmy Ly : Removed sessions and return encrypted request
                                       token and secret to user with Twitter sign-in url
*/
app.get('/requestToken', function(request, response) {
    twitter.getRequestToken(function(error, requestToken, requestTokenSecret, results) {
    
        // return an error to the user if the Twitter call fails
        if (error) {
            console.log("Error getting OAuth request token : " + error);
            console.log(error);
            response.status(502);
            response.send("Twitter request token call failed");
        } else {
            console.log('requestToken: ' + requestToken);
            console.log('requestTokenSecret: ' + requestTokenSecret);
            console.log(results);
            // send encrypted request token, encrypted request secret, and the Twitter sign-in url to the user
            response.send([encrypt(requestToken), encrypt(requestTokenSecret), twitter.getAuthUrl(requestToken)]);
        }
    });
});

/*
    @name:    GET /guestSession
    @author:  Jimmy Ly
    @created: Mar 28, 2015
    @purpose: provide the user with information necessary to use the default
              Guest profile for authentication with the Twitter API
    @param:   request - parameters/headers passed in with request
    @param:   response - parameters/headers sent to requester
    @return:  encrypted default Guest access token and secret, screen name, and profile image url
    @modhist: Apr 17 2015 : Jimmy Ly : Remove sessionId from guestData and replace
                                       with encrypted Guest access token and secret
*/
app.get('/guestSession', function(request, response) {
    var guestData = {
                        accessToken: encrypt(flockAccessToken),
                        accessTokenSecret: encrypt(flockAccessSecret),
                        screen_name: 'Guest',
                        profile_image_url: 'http://abs.twimg.com/sticky/default_profile_images/default_profile_2_normal.png'
                    }
    response.send(guestData);
    
});

/*
    @name:    GET /accessToken
    @author:  Jimmy Ly
    @created: Mar 28, 2015
    @purpose: retrieve an access token and access token secret from the Twitter
              API for the user based on the request object.
              also verify the access token to obtain user information
    @param:   request - parameters/headers passed in with request
    @param:   response - parameters/headers sent to requester
    @error:   send 403 error if session not found or access token verification fails
              send 502 if Twitter fails to return an access token
    @return:  user's Twitter screen name and profile image url
    @modhist: Apr 17 2015 : Jimmy Ly : Remove sessions, get encrypted request token and secret
                                       from request object, and send encrypted access
                                       token and secret to user
*/
app.get('/accessToken', function(request, response) {
    var oauth_token = request.query.oauth_token;
    var oauth_verifier = request.query.oauth_verifier;
    requestToken = decrypt(request.query.requestToken);
    requestTokenSecret = decrypt(request.query.requestTokenSecret);
    console.log('requestToken for GET /accessToken: ' + requestToken);
    console.log('requestTokenSecret for GET /accessToken: ' + requestTokenSecret);
    
    // using request token from session object and oauth params from user, get access token and secret from Twitter
    twitter.getAccessToken(requestToken, requestTokenSecret, oauth_verifier, function(error, accessToken, accessTokenSecret, results) {
        if (error) {
            console.log("Error getting access token : " + error);
            console.log(error);
            response.status(502);
            response.send("Twitter access token call failed");
        } else {
            // verify the credentials with the access token and secret to obtain user information
            twitter.verifyCredentials(accessToken, accessTokenSecret, function(error, data, result) {
                if (error) {
                    response.status(403);
                    response.send('Verification of access tokens failed');
                } else {
                    //accessToken and accessTokenSecret can now be used to make api-calls (not yet implemented)
                    //data contains the user-data described in the official Twitter-API-docs
                    //you could e.g. display his/her screen_name
                    console.log('accessToken: ' + accessToken);
                    console.log('accessTokenSecret: ' + accessTokenSecret);
                    var user_info = {
                                        accessToken: encrypt(accessToken),
                                        accessTokenSecret: encrypt(accessTokenSecret),
                                        screen_name: data.screen_name,
                                        profile_image_url: data.profile_image_url
                                    }
                    response.send(user_info);
                }
            });
        }
    });
});

/*
    @name:    GET /tweets
    @author:  Jimmy Ly
    @created: Mar 28, 2015
    @purpose: Use the given query parameters to retrieve tweets from Twitter's
              REST API for the user.
    @param:   request - parameters/headers passed in with request
    @param:   response - parameters/headers sent to requester
    @error:   send 403 error if session not found
    @return:  Twitter response containing tweet results, metadata and rate limit information
    @modhist:
*/
app.get('/tweets', function(request, response) {
    // get encrypted accessToken and accessTokenSecret from request object.
    // decrypt and delete from request.query since we won't pass as query parameters
    // for Twitter call
    var accessToken = decrypt(request.query.accessToken);
    delete request.query.accessToken;
    var accessTokenSecret = decrypt(request.query.accessTokenSecret);
    delete request.query.accessTokenSecret;
    
    // query the Twitter API to tweets based on the given search params using
    // the access token and token secret of the user
    twitter.search(request.query, 
        accessToken,
        accessTokenSecret,
        function(error, data, twitterResponse){
            console.log('TWITTERRESPONSE');
            console.log(twitterResponse.headers);
            var headers = twitterResponse.headers;
            // collect rate limit information - remaining searches and time before limit reset
            data.rate_limit = headers['x-rate-limit-limit'];
            data.rate_limit_remaining = headers['x-rate-limit-remaining'];
            data.rate_limit_reset = headers['x-rate-limit-reset'];
            console.log(data.rate_limit);
            response.send(data);
        }
    );
});

/*
    @name:    encrypt
    @author:  Jimmy Ly
    @created: Apr 19, 2015
    @purpose: Encrypt the given String using the crypto.js library
    @param:   text - String message to be encrypted
    @return:  Encrypted String based on AES192 algorithm and specified hash secret key
*/
var encrypt = function(text){
    var cipher = crypto.createCipher(algorithm, hashSecret);
    return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}

/*
    @name:    decrypt
    @author:  Jimmy Ly
    @created: Apr 19, 2015
    @purpose: Decrypt the given String using the crypto.js library
    @param:   text - String message to be decrypted
    @return:  Decrypted String based on AES192 algorithm and specified hash secret key
*/
var decrypt = function(text){
    var decipher = crypto.createDecipher(algorithm, hashSecret);
    return decipher.update(text, 'hex', 'utf8') + decipher.final('utf8');
}

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});
