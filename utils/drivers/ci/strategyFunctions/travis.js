"use strict";
const request = require("request");
const config = require("./config.js");

let utils = {
    //return an error object if a function generates an error
    "checkError": function (error, options, cb, callback) {
        if (error) {
            if (options && options.code) {
                if (typeof(error) === 'object' && error.code) {
                    error.code = options.code;
                }
                else {
                    error = {
                        code: options.code,
                        message: options.message || error
                    };
                }
            }

            return cb(error);
        }

        return callback();
    }
}

var lib = {
    /**
     * Generate a travis token from a Github token
     * @param opts
     * @param cb
     */
    generateToken (opts, cb) {
        let params = {};

        params.uri = "https://" + opts.settings.domain + config.travis.headers.api.url.githubAuth;
        params.headers = {
            "User-Agent": config.travis.headers.userAgent,
            "Accept": config.travis.headers.accept,
            "Content-Type": config.travis.headers.contentType,
            "Host": opts.settings.domain
        };
        params.json = true;
        params.body = {
            "github_token": opts.settings.gitToken
        };

        //send the request to obtain the Travis token
        request.post(params, function (error, response, body) {
            //Check for errors in the request function
            utils.checkError(error, {code: 971}, cb, () => {
               //github token parameter is null or not passed
               utils.checkError(body && body.error && body.error === "Must pass 'github_token' parameter", {code: 972}, cb, () => {
                   //github token is invalid
                   utils.checkError(body === "not a Travis user", {code: 972}, cb, () => {
                       utils.checkError(!body && !error && response, {code: 973}, cb, () => {
                           //the body contains the travis token: access_token
                           return cb(null, body);
                       });
                   });
               });
            });
        });
    },

    /**
     * Lists all repos or a specific repo for a repo owner
     * @param opts
     * @param cb
     */
    listRepos (opts, cb) {
        let params = {};
        //check if an access token is provided
        utils.checkError(!opts.settings.ciToken, {code: 974}, cb, () => {
            //check if the repositories owner name is provided
            utils.checkError(!opts.settings && !opts.settings.owner, {code: 975}, cb, () => {
                let finalUrl = config.travis.headers.api.url.listRepos + "/" + opts.settings.owner;

                if(opts.settings.repo){
                    finalUrl += "/" + opts.settings.repo;
                }

                params.uri = "https://" + opts.settings.domain + finalUrl;

                params.headers = {
                    "User-Agent": config.travis.headers.userAgent,
                    "Authorization" : opts.settings.ciToken,
                    "Accept": config.travis.headers.accept,
                    "Content-Type": config.travis.headers.contentType,
                    "Host": opts.settings.domain
                };
                params.json = true;

                //send the request to obtain the Travis token
                request.get(params, function (error, response, body) {
                    //Check for errors in the request function
                    utils.checkError(error, {code: 971}, cb, () => {
                        //Check if the requested owner has repos
                        utils.checkError(Array.isArray((body.repos)) && body.repos.length === 0, {code: 976}, cb, () => {
                            //check if the requested repo is found
                            utils.checkError(body.file && body.file === 'not found', {code: 977}, cb, () => {
                                return cb(null, body)
                            });
                        });
                    });
                });
            });
        });

    }

};

module.exports = lib;