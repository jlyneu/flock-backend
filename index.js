var express = require('express');
var session = require('express-session');
var app = express();

// allowed origins
var origins = ["http://localhost:63342", 
    "http://localhost:8000", 
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

app.use(session({secret: 'ssshhhhhh'}));

var twitterAPI = require('node-twitter-api');
var twitter = new twitterAPI({
    consumerKey: 'pEaf5TgKTpz0Tf1M9uyqZSysQ',
    consumerSecret: 'dTV7OuEkgauN8syVrOT5T9XzK8CnXpSvjMEELlZshz1aqdsAVW',
    callback: 'http://zachbachiri.com/Flock/#/redirect'
});

var sess;

app.get('/requestToken', function(request, response) {
    sess = request.session;
    twitter.getRequestToken(function(error, requestToken, requestTokenSecret, results) {
        if (error) {
            console.log("Error getting OAuth request token : " + error);
            console.log(error);
            response.send("Call failed");
        } else {
            console.log(requestToken);
            console.log(requestTokenSecret);
            console.log(results);
            sess.requestToken = requestToken;
            sess.requestTokenSecret = requestTokenSecret;
            //store token and tokenSecret somewhere, you'll need them later; redirect user
            response.send(twitter.getAuthUrl(requestToken));
        }
    });
});

app.get('/accessToken', function(request, response) {
    var oauth_token = request.query.oauth_token;
    var oauth_verifier = request.query.oauth_verifier;
    sess = request.session;
    requestToken = sess.requestToken;
    requestTokenSecret = sess.requestTokenSecret;
    
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
                    sess.accessToken = accessToken;
                    sess.accessTokenSecret = accessTokenSecret;
                    response.status(200).end();
                }
            });
        }
    });
});

app.get('/tweets', function(request, response) {

	// TODO: Return error if sessionId not included in request
    sess = request.session;
    
    twitter.search('tweets', 
        request.query, 
        sessionInfo.accessToken,
        sessionInfo.accessTokenSecret,
        function(error, data, twitterResponse){
            // TODO: return appropriate error if call fails
            console.log(data);
            response.send(twitterResponse);
    	}
    );
});

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});
