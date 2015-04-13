var express = require('express');
var app = express();
var uuid = require('node-uuid');

// List of allowed origins
var origins = ["http://www.northeastern.edu",
    "http://localhost:63342",
    "http://localhost:9876",
    "http://localhost:8000", 
    "http://zachbachiri.com"];
    
// Flock application information
var flockConsumerKey = 'pEaf5TgKTpz0Tf1M9uyqZSysQ';
var flockConsumerSecret = 'dTV7OuEkgauN8syVrOT5T9XzK8CnXpSvjMEELlZshz1aqdsAVW';

// Default Guest access token and secret
var flockAccessToken = '3029162194-GAze2tNS3Y4rPvIwvXZ1j813hZriXKWNpWjo3dd';
var flockAccessSecret = 'ndsckIxbSpvDuTZGdmzP4pGac6fsBjfQAVkL5EoTzpd3M';

// URL to redirect user from Twitter sign in page
//var flockRedirectUrl = 'http://zachbachiri.com/Flock/#/redirect';
var flockRedirectUrl = 'http://www.northeastern.edu/flock/#/redirect';

// Default Guest session Id
var flockGuestSessionId = '4cbd71d5-4594-4f53-950b-d27941afe77d';

// Object to hold all session information
var sessions = {}

// Create default guest session object
sessions[flockGuestSessionId] = {
                                    accessToken: flockAccessToken,
                                    accessTokenSecret: flockAccessSecret
                                };

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
    @name:    removeExpiredSessions
    @author:  Jimmy Ly
    @created: Mar 28, 2015
    @purpose: Search for sessions that have expired and remove them from 'sessions' object
    @return:  void
    @modhist:
*/
var removeExpiredSessions = function(){
    var session;
    // get current date and time to determine if a session has expired
    var currDate = new Date();
    for (var sessId in sessions){
        if (sessions.hasOwnProperty(sessId)){
            var sess = sessions.sessId;
            // delete session object if expireDate has already past
            if (sess.hasOwnProperty('expireDate') && sess.expireDate - currDate < 0){
                delete sessions.sessId;
            }
        }
    }
}

/*
    @name:    GET /checkSession
    @author:  Jimmy Ly
    @created: Mar 28, 2015
    @purpose: Check if the given session id is valid (not Guest id, not expired, and has accessToken)
    @param:   request - parameters/headers passed in with request
    @param:   response - parameters/headers sent to requester
    @return:  "session found" if the given id is valid and "session not found" otherwise
    @modhist:
*/
app.get('/checkSession', function(request, response) {

    // retrieve the session id from the incoming request object
    var sessionId = request.query.session_id;
    
    console.log(request.query.session_id);
    console.log(sessions);
    
    // remove any expired sessions from the sessions object
    removeExpiredSessions();
    
    // send a response to the user based on whether or not the sessionId is valid
    if (sessions[sessionId] && sessionId != flockGuestSessionId && sessions[sessionId].hasOwnProperty('accessToken')){
        response.send("session found");
    } else {
        response.send("session not found");
    }
});

/*
    @name:    GET /requestToken
    @author:  Jimmy Ly
    @created: Mar 28, 2015
    @purpose: obtain a requestToken and requestTokenSecret from the Twitter API
              to return to the user. create a new session id for the user and 
              also store the information in the sessions object
    @param:   request - parameters/headers passed in with request
    @param:   response - parameters/headers sent to requester
    @error:   sends a 502 error if call to the Twitter API fails
    @return:  the newly created sessionId and the Twitter sign-in url based on the
              request tokens obtained
    @modhist:
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
            // generate a new session id
            var sessionId = uuid.v4();
            // keep generating new ids until one is found that is not in use
            while (sessions[sessionId]) {
                sessionId = uuid.v4();
            }
            
            var currDate = new Date();
            // add the session information to the sessions object
            sessions[sessionId] = {
                                      requestToken: requestToken,
                                      requestTokenSecret: requestTokenSecret,
                                      expireDate: currDate.setDate(currDate.getDate() + 1)
                                  };
            console.log(requestToken);
            console.log(requestTokenSecret);
            console.log(results);
            // send both the session id and the Twitter sign-in url to the user
            response.send([sessionId, twitter.getAuthUrl(requestToken)]);
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
    @return:  default Guest session id, screen name, and profile image url
    @modhist:
*/
app.get('/guestSession', function(request, response) {
    var guestData = {
                        sessionId: flockGuestSessionId,
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
              API for the user based on the sessionId found in the request object.
              also verify the access token to obtain user information
    @param:   request - parameters/headers passed in with request
    @param:   response - parameters/headers sent to requester
    @error:   send 403 error if session not found or access token verification fails
              send 502 if Twitter fails to return an access token
    @return:  user's Twitter screen name and profile image url
    @modhist:
*/
app.get('/accessToken', function(request, response) {
    var sessionId = request.query.session_id;
    var oauth_token = request.query.oauth_token;
    var oauth_verifier = request.query.oauth_verifier;
    console.log(sessions);
    console.log(sessionId);
    sess = sessions[sessionId]
    if (!sess) {
        response.status(403);
        response.send('Session not found');
    }
    requestToken = sess.requestToken;
    requestTokenSecret = sess.requestTokenSecret;
    console.log('requestToken from sess: ' + requestToken);
    console.log('requestTokenSecret from sess: ' + requestTokenSecret);
    
    // using request token from session object and oauth params from user, get acces token and secret
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
                    sess.accessToken = accessToken;
                    sess.accessTokenSecret = accessTokenSecret;
                    console.log('access token and secret set');
                    var user_info = {
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
              REST API for the user determined by the given session id in the
              request object.
    @param:   request - parameters/headers passed in with request
    @param:   response - parameters/headers sent to requester
    @error:   send 403 error if session not found
    @return:  Twitter response containing tweet results, metadata and rate limit information
    @modhist:
*/
app.get('/tweets', function(request, response) {
    var sessionId = request.query.session_id;
    console.log('SESSION ID: ' + sessionId);
    var sess = sessions[sessionId];
    console.log(sess);
    // if the session is not found then send the user back an error
    if (!sess){
        response.status(403);
        response.send('Session expired');
    }
    delete request.query.session_id;
    console.log('User session id: ' + sessionId);
    console.log(request.query);
    console.log(sess.accessToken);
    console.log(sess.accessTokenSecret);
    
    // query the Twitter API to tweets based on the given search params using
    // the access token and token secret of the user
    twitter.search(request.query, 
        sess.accessToken,
        sess.accessTokenSecret,
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

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});
