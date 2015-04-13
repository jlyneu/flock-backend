var should = require('should');
var assert = require('assert');
var request = require('supertest');

// Test the behavior of various endpoint of the Flock backend
describe('The Flock backend REST API', function() {
    var url = 'http://flock-backend.herokuapp.com';
    //var url = "http://localhost:5000";
    
    // expected default Guest session information
    var guestId = '4cbd71d5-4594-4f53-950b-d27941afe77d';
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
                // check to make sure the correct Guest id, screen name, and
                // profile image url is returned
                guestSess.sessionId.should.equal(guestId);
                guestSess.screen_name.should.equal(guestScreenName);
                guestSess.profile_image_url.should.equal(guestProfileImageUrl);
                done();
            });
    });
    
    // Test to see that the checkSession endpoint correctly rejects invalid
    // session ids (either not in the session object, the Guest id, or does not have a
    // access token and access token secret associated with the id)
    it('should test the GET /checkSession endpoint', function(done) {
    
        // check to see that a bogus session id is rejected
        request(url)
            .get('/checkSession')
            .send({ session_id : 'foo' })
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                res.text.should.equal('session not found');
            });
            
        // check to see that the Guest session id is rejected
        request(url)
            .get('/checkSession')
            .send({ session_id : guestId })
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                res.text.should.equal('session not found');
            });
            
        // check to see that an existing session id with an acces token is rejected
        var tempSession;
        request(url)
            .get('/requestToken')
            .send()
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                tempSession = res.body;
                tempSession[0].should.be.ok;
                tempSession[1].should.be.ok;
                request(url)
                    .get('/checkSession')
                    .send({ session_id : tempSession[0] })
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            throw err;
                        }
                        res.text.should.equal('session not found');
                        done();
                    });
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
                // check to see that the session id is returned
                tempSession[0].should.be.ok;
                tempSession[0].length.should.equal(36);
                // check to see that a Twitter sign-in URL is returned
                tempSession[1].should.be.ok;
                tempSession[1].should.startWith('https://twitter.com/oauth/authenticate?');
                done();
            });
    });
    
    // Test to see that the accessToken endpoint sends the correct 403 error
    // when attempting to retrieve an access token with an invalid session id
    it('should test the GET /accessToken endpoint', function(done) {
        // send a request to GET /accessToken with a bogus session id
        request(url)
            .get('/accessToken')
            .send({ session_id : 'foo',
                    oauth_token : 'foo',
                    oauth_verifier : 'foo' })
            // check to make sure the correct error is sent back
            .expect(403)
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                // check to make sure correct error message is returned
                res.text.should.equal('Session not found');
                done();
            });
    });
    
    // Test to see that GET /tweets endpoint is actually returning
    // Twitter data/metadata and also rate limit information
    it('should test the GET /tweets endpoint', function(done) {
        // use the guest id to search for tweets related to Twitter
        request(url)
            .get('/tweets?session_id=' + guestId + '&q=twitter')
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