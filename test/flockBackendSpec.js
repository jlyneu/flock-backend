var should = require('should');
var assert = require('assert');
var request = require('supertest');

describe('The Flock backend REST API', function() {
    var url = 'http://flock-backend.herokuapp.com';
    //var url = "http://localhost:5000";
    
	// expected default Guest session information
	var guestId = '4cbd71d5-4594-4f53-950b-d27941afe77d';
	var guestScreenName = 'Guest';
	var guestProfileImageUrl = 'http://abs.twimg.com/sticky/default_profile_images/default_profile_2_normal.png';
	
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
                guestSess.sessionId.should.equal(guestId);
                guestSess.screen_name.should.equal(guestScreenName);
                guestSess.profile_image_url.should.equal(guestProfileImageUrl);
                done();
            });
    });
    it('should test the GET /checkSession endpoint', function(done) {
        
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
                tempSession[0].should.be.ok;
                tempSession[0].length.should.equal(36);
                tempSession[1].should.be.ok;
                tempSession[1].should.startWith('https://twitter.com/oauth/authenticate?');
                done();
            });
    });
    it('should test the GET /accessToken endpoint', function(done) {
        request(url)
            .get('/accessToken')
            .send({ session_id : 'foo',
                    oauth_token : 'foo',
                    oauth_verifier : 'foo' })
        	.expect(403)
        	.end(function(err, res) {
        	    if (err) {
        	        throw err;
        	    }
        	    res.text.should.equal('Session not found');
        	    done();
        	});
    });
    it('should test the GET /tweets endpoint', function(done) {
        request(url)
            .get('/tweets?session_id=' + guestId + '&q=twitter')
            .send()
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                var twitterRes = res.body;
                twitterRes.statuses.should.be.ok;
                twitterRes.rate_limit.should.equal('180');
                twitterRes.rate_limit_remaining.should.be.ok;
                twitterRes.rate_limit_reset.should.be.ok;
                done();
            });
    });
});