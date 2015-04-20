var should = require('should');
var assert = require('assert');
var request = require('supertest');

// Test the behavior of various endpoint of the Flock backend
describe('The Flock backend REST API', function() {
    var url = 'http://flock-backend.herokuapp.com';
    //var url = "http://localhost:5000";
    
   // Encrypted Guest access token and access token secret
    var guestAccessToken = '31c4e57b83e28607356f878e10162774ef874f2dd0f84b5484376e7ff8f5f0894df8604b27ad' +
                           'd2aa066fd9b8c542b4c65f5df3beae3d089cef2a2963a00dfe36';
    var guestAccessSecret = 'd3c46a874b4a8b82c9d1f6625e9ecf33ee49e074e48e3753a27cd35ccd4e80f5fb953efa77c' +
                            '0e8accdf561d259ae133e';

    // expected default Guest information
    var guestScreenName = 'Guest';
    var guestProfileImageUrl = 'http://abs.twimg.com/sticky/default_profile_images/default_profile_2_normal.png';
    
    // Test to make sure that the GET /guestSession endpoint returns
    // the correct default Guest user profile information
    it('should test the GET /guestSession endpoint', function(done) {
    
        // make a call to GET /guestSession and check to see that the correct
        // default Guest session information is returned
        request(url)
            .get('/guestSession')
            .send()
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                var guestSess = res.body;
                // check to make sure the correct Guest access token/secret, screen name, and
                // profile image url is returned
                guestSess.accessToken.should.equal(guestAccessToken);
                guestSess.accessTokenSecret.should.equal(guestAccessSecret);
                guestSess.screen_name.should.equal(guestScreenName);
                guestSess.profile_image_url.should.equal(guestProfileImageUrl);
                done();
            });
    });
    
    // Test to see that the requestToken endpoint does return both a session id
    // and a Twitter sign-in URL
    it('should test the GET /requestToken endpoint', function(done) {
        request(url)
            .get('/requestToken')
            .send()
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                var tempSession = res.body;
                // check to see that the encrypted request token is returned
                tempSession[0].should.be.ok;
                tempSession[0].length.should.equal(96);
                // check to see that the encrypted request token secret is returned
                tempSession[1].should.be.ok;
                tempSession[1].length.should.equal(96);
                // check to see that a Twitter sign-in URL is returned
                tempSession[2].should.be.ok;
                tempSession[2].should.startWith('https://twitter.com/oauth/authenticate?');
                done();
            });
    });
    
    // Test to see that the accessToken endpoint sends the correct 502 error
    // when attempting to make a request with an invalid access token/secret
    it('should test the GET /accessToken endpoint', function(done) {
        var badRequestToken = '1263657eaddcf09ba718009e315f9df1';
        var badRequestSecret = '1263657eaddcf09ba718009e315f9df1';
        // send a request to GET /accessToken with invalid access token/secret
        request(url)
            .get('/accessToken?requestToken=' + badRequestToken + '&requestTokenSecret=' + 
                 badRequestSecret + '&oauth_token=foo&oauth_verifier=foo')
            // check to make sure the correct error is sent back
            .expect(502)
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                // check to make sure correct error message is returned
                res.text.should.equal('Twitter access token call failed');
                done();
            });
    });
    
    // Test to see that GET /tweets endpoint is actually returning
    // Twitter data/metadata and also rate limit information
    it('should test the GET /tweets endpoint', function(done) {
        // use the guest tokens to search for tweets related to Twitter
        request(url)
            .get('/tweets?accessToken=' + guestAccessToken + '&accessTokenSecret=' + guestAccessSecret + '&q=twitter')
            .send()
            // check to see that the response came back successfully
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                // check that tweets are present in the response, as well as
                // rate limit information
                var twitterRes = res.body;
                twitterRes.statuses.should.be.ok;
                twitterRes.rate_limit.should.equal('180');
                twitterRes.rate_limit_remaining.should.be.ok;
                twitterRes.rate_limit_reset.should.be.ok;
                done();
            });
    });
});