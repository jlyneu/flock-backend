var express = require('express');
var app = express();
// imports library to create uuids used as session ids
var uuid = require('node-uuid');

// allowed origins
var origins = ["http://localhost:63342", 
    "http://localhost:8000", 
    "http://zachbachiri.com", 
    "http://northeastern.edu"];
    
// Flock application token and token secret
var flockConsumerKey = 'pEaf5TgKTpz0Tf1M9uyqZSysQ';
var flockConsumerSecret = 'dTV7OuEkgauN8syVrOT5T9XzK8CnXpSvjMEELlZshz1aqdsAVW';
var flockAccessToken = '3029162194-GAze2tNS3Y4rPvIwvXZ1j813hZriXKWNpWjo3dd';
var flockAccessSecret = 'ndsckIxbSpvDuTZGdmzP4pGac6fsBjfQAVkL5EoTzpd3M';
var flockRedirectUrl = 'http://zachbachiri.com/Flock/#/redirect';
var flockGuestSessionId = '4cbd71d5-4594-4f53-950b-d27941afe77d';

var sessions = {}
sessions[flockGuestSessionId] = {
                                    accessToken: flockAccessToken,
                                    accessTokenSecret: flockAccessSecret
                                };


app.use(function(req, res, next) {
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
  next();
});

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));


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
    if (sessions[sessionId] && sessionId != flockGuestSessionId){
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
            response.send("Call failed");
        } else {
            var sessionId = uuid.v4();
            sessions[sessionId] = {
                                      requestToken: requestToken,
                                      requestTokenSecret: requestTokenSecret
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
    response.send(flockGuestSessionId);
});

app.get('/accessToken', function(request, response) {
    var sessionId = request.query.session_id;
    var oauth_token = request.query.oauth_token;
    var oauth_verifier = request.query.oauth_verifier;
    console.log(sessions);
    console.log(sessionId);
    sess = sessions[sessionId]
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
    delete request.query.session_id;
    console.log('User session id: ' + sessionId);
    console.log(request.query);
    console.log(sess.accessToken);
    console.log(sess.accessTokenSecret);
    
    twitter.search(request.query, 
        sess.accessToken,
        sess.accessTokenSecret,
        function(error, data, twitterResponse){
            // TODO: return appropriate error if call fails
            //console.log(data);
            //console.log(twitterResponse);
            //console.log(twitterResponse);
            console.log(twitterResponse);
            response.send(data);
    	}
    );
});

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});
