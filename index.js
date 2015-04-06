var express = require('express');
var app = express();
var uuid = require('node-uuid');

// List of allowed origins
var origins = ["http://www.northeastern.edu",
    "http://localhost:63342", 
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

// configure node-twitter-api with flock application information
var twitterAPI = require('node-twitter-api');
var twitter = new twitterAPI({
    consumerKey: flockConsumerKey,
    consumerSecret: flockConsumerSecret,
    callback: flockRedirectUrl
});

app.get('/checkSession', function(request, response) {
    var sessionId = request.query.session_id;
    console.log(request.query.session_id);
    console.log(sessions);
    if (sessions[sessionId] && sessionId != flockGuestSessionId && sessions[sessionId].hasOwnProperty('accessToken')){
        response.send("session found");
    } else {
        response.send("session not found");
    }
});

// Make a call to Twitter to get a request token and token secret for the user
// that is logging into Flock. Generate a session Id for the user and return
// both the session Id and the Twitter sign in page Url
app.get('/requestToken', function(request, response) {
    twitter.getRequestToken(function(error, requestToken, requestTokenSecret, results) {
        if (error) {
            console.log("Error getting OAuth request token : " + error);
            console.log(error);
            response.status(502);
            response.send("Twitter request token call failed");
        } else {
            var sessionId = uuid.v4();
            var currDate = new Date();
            sessions[sessionId] = {
                                      requestToken: requestToken,
                                      requestTokenSecret: requestTokenSecret,
                                      expireDate: currDate.setDate(currDate.getDate() + 1)
                                  };
            console.log(requestToken);
            console.log(requestTokenSecret);
            console.log(results);
            //store token and tokenSecret somewhere, you'll need them later; redirect user
            response.send([sessionId, twitter.getAuthUrl(requestToken)]);
        }
    });
});

app.get('/guestSession', function(request, response) {
    var guestData = {
                        sessionId: flockGuestSessionId,
                        screen_name: 'Guest',
                        profile_image_url: 'http://abs.twimg.com/sticky/default_profile_images/default_profile_2_normal.png'
                    }
    response.send(guestData);
    
});

app.get('/accessToken', function(request, response) {
    var sessionId = request.query.session_id;
    var oauth_token = request.query.oauth_token;
    var oauth_verifier = request.query.oauth_verifier;
    console.log(sessions);
    console.log(sessionId);
    sess = sessions[sessionId]
    if (!sess) {
    	response.status(403);
        response.send('Session expired');
    }
    requestToken = sess.requestToken;
    requestTokenSecret = sess.requestTokenSecret;
    console.log('requestToken from sess: ' + requestToken);
    console.log('requestTokenSecret from sess: ' + requestTokenSecret);
    
    twitter.getAccessToken(requestToken, requestTokenSecret, oauth_verifier, function(error, accessToken, accessTokenSecret, results) {
        if (error) {
            console.log(error);
        } else {
            //store accessToken and accessTokenSecret somewhere (associated to the user)
            //Step 4: Verify Credentials belongs here
            twitter.verifyCredentials(accessToken, accessTokenSecret, function(error, data, result) {
                if (error) {
                    //something was wrong with either accessToken or accessTokenSecret
                    //start over with Step 1
                } else {
                    //accessToken and accessTokenSecret can now be used to make api-calls (not yet implemented)
                    //data contains the user-data described in the official Twitter-API-docs
                    //you could e.g. display his screen_name
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

app.get('/tweets', function(request, response) {

	// TODO: Return error if sessionId not included in request
    var sessionId = request.query.session_id;
    var sess = sessions[sessionId];
    if (!sess){
        response.status(403);
        response.send('Session expired');
    }
    delete request.query.session_id;
    console.log('User session id: ' + sessionId);
    console.log(request.query);
    console.log(sess.accessToken);
    console.log(sess.accessTokenSecret);
    
    twitter.search(request.query, 
        sess.accessToken,
        sess.accessTokenSecret,
        function(error, data, twitterResponse){
            console.log('TWITTERRESPONSE');
            console.log(twitterResponse.headers);
            var headers = twitterResponse.headers;
            data.rate_limit = headers['x-rate-limit-limit'];
            data.rate_limit_remaining = headers['x-rate-limit-remaining'];
            data.rate_limit_reset = headers['x-rate-limit-reset'];
            // TODO: return appropriate error if call fails
            console.log(data.rate_limit);
            response.send(data);
    	}
    );
});

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});
