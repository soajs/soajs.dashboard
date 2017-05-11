"use strict";

module.exports = {
  "travis":{
      "headers": {
          "api": {
              "url": {
                  "githubAuth": "/auth/github",
                  "listRepos" : "/repos"
              },
          },
          "userAgent": "Travis/1.0.0",
          "accept": "application/vnd.travis-ci.2+json",
          "contentType": "application/json"
      }
  }
};