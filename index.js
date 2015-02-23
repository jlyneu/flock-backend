var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:63342");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var twitterAPI = require('node-twitter-api');
var twitter = new twitterAPI({
    consumerKey: 'pEaf5TgKTpz0Tf1M9uyqZSysQ',
    consumerSecret: 'dTV7OuEkgauN8syVrOT5T9XzK8CnXpSvjMEELlZshz1aqdsAVW',
    callback: 'http://zachbachiri.com/Flock/#redirect'
});

var requestToken;
var requestTokenSecret;

app.get('/', function(request, response) {
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
            response.redirect(302, twitter.getAuthUrl(requestToken));
        }
    });
});
/*
app.get('/getAuthToken', function(
*/
/*

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
                console.log(data["screen_name"]);
            }
        });
    }
});
*/
app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});
