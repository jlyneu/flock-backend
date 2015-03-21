var express = require('express');
var app = express();

// allowed origins
var origins = ["http://localhost:63342/", 
    "http://localhost:8000/", 
    "http://zachbachiri.com", 
    "http://northeastern.edu"];

// imports library to create uuids used as session ids
var uuid = require('node-uuid');

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

app.use(function(req, res, next) {
  // can only set one allowed origin per response, therefore
  // check to see if origin of request is in origins list and
  // set header if so
  for (origin in origins) {
      if (req.headers.origin.indexOf(origin) > -1){
          res.header("Access-Control-Allow-Origin", origin);
          break;
      }
  }
  res.header("Access-Control-Allow-Methods", "GET");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var twitterAPI = require('node-twitter-api');
var twitter = new twitterAPI({
    consumerKey: 'pEaf5TgKTpz0Tf1M9uyqZSysQ',
    consumerSecret: 'dTV7OuEkgauN8syVrOT5T9XzK8CnXpSvjMEELlZshz1aqdsAVW',
    callback: 'http://zachbachiri.com/Flock/#/redirect'
});

// keys: session IDs -> values: {accessToken:..., accessTokenSecret:...}
var sessions = {}

app.get('/requestToken', function(request, response) {
    twitter.getRequestToken(function(error, requestToken, requestTokenSecret, results) {
        if (error) {
            console.log("Error getting OAuth request token : " + error);
            console.log(error);
            response.send("Call failed");
        } else {
            console.log(requestToken);
            console.log(requestTokenSecret);
            console.log(results);
            //store token and tokenSecret somewhere, you'll need them later; redirect user
            //response.redirect(302, twitter.getAuthUrl(requestToken));
            response.redirect(302, 'http://www.google.com/');
        }
    });
});

app.get('/accessToken', function(request, response) {
    var oauth_token = request.query.oauth_token;
    var oauth_verifier = request.query.oauth_verifier;
    
    twitter.getAccessToken(requestToken, requestTokenSecret, oauth_verifier, function(error, accessToken, accessTokenSecret, results) {
        if (error) {
            console.log(error);
        } else {
            //store accessToken and accessTokenSecret somewhere (associated to the user)
            //Step 4: Verify Credentials belongs here
            twitter.verifyCredentials(accessToken, accessTokenSecret, function(error, data, response) {
                if (error) {
                    //something was wrong with either accessToken or accessTokenSecret
                    //start over with Step 1
                } else {
                    //accessToken and accessTokenSecret can now be used to make api-calls (not yet implemented)
                    //data contains the user-data described in the official Twitter-API-docs
                    //you could e.g. display his screen_name
                    console.log(data);
                    console.log(response);
                    var accessInfo = {
                                         'accessToken': accessToken,
                                         'accessTokenSecret': accessTokenSecret
                                     }
				    var sessionId = uuid.v4();
				    sessions[uuid.v4()] = accessInfo;
                    response.send({ 'sessionId': sessionId });
                }
            });
        }
    });
});

app.get('/tweets', function(request, response) {

	// TODO: Return error if sessionId not included in request

    var sessionId = request.query.sessionId;
    var sessionInfo = sessions[sessionId];
    delete request.query.sessionId;
    
    twitter.search('tweets', 
        request.query, 
        sessionInfo.accessToken,
        sessionInfo.accessTokenSecret,
        function(error, data, twitterResponse){
            // TODO: return appropriate error if call fails
            response.send(twitterResponse);
    	}
    );
});

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});
