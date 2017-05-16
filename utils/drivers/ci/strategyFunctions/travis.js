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
};

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
							return cb(null, body.access_token);
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
				
				if (opts.settings.repo) {
					finalUrl += "/" + opts.settings.repo;
				}

				if(opts.settings.ciToken){
					finalUrl += + "&access_token=" + opts.settings.ciToken;
				}
				
				params.uri = "https://" + opts.settings.domain + finalUrl;
				
				params.headers = {
					"User-Agent": config.travis.headers.userAgent,
					"Accept": config.travis.headers.accept,
					"Content-Type": config.travis.headers.contentType,
					"Host": opts.settings.domain
				};
				params.json = true;
				
				//send the request to obtain the repos
				request.get(params, function (error, response, body) {
					//Check for errors in the request function
					utils.checkError(error, {code: 971}, cb, () => {
						//Check if the requested owner has repos
						utils.checkError(Array.isArray((body.repos)) && body.repos.length === 0, {code: 976}, cb, () => {
							//check if the requested repo is found
							utils.checkError(body.file && body.file === 'not found', {code: 977}, cb, () => {
								
								//todo: need to map the response
								body = body.repos;
								
								var repos = [];
								
								body.forEach(function (oneRepo) {
									
									var myRepo = {
										id: oneRepo.id,
										name: oneRepo.slug,
										active: oneRepo.active,
										description: oneRepo.description
									};
									
									var build = {};
									if(oneRepo.last_build_id){
										build.id = oneRepo.last_build_id;
									}
									
									if(oneRepo.last_build_number){
										build.number = oneRepo.last_build_number;
									}
									
									if(oneRepo.last_build_state){
										build.state = oneRepo.last_build_state;
									}
									
									if(oneRepo.last_build_duration){
										build.duration = oneRepo.last_build_duration;
									}
									
									if(oneRepo.last_build_started_at){
										build.started = oneRepo.last_build_started_at;
									}
									
									if(oneRepo.last_build_finished_at){
										build.finished = oneRepo.last_build_finished_at;
									}
									
									if(Object.keys(build).length > 0){
										myRepo.build = build;
									}
									
									repos.push(myRepo);
								});
								
								return cb(null, repos)
							});
						});
					});
				});
			});
		});
		
	},

    /**
     * Generate a travis token from a Github token
     * @param opts
     * @param cb
     */
    listEnvVars (opts, cb) {
        let params = {};

        params.uri = "https://" + opts.settings.domain + config.travis.headers.api.url.listEnvVars + opts.settings.repoId + "&access_token=" + opts.settings.ciToken;
        params.headers = {
            "User-Agent": config.travis.headers.userAgent,
            "Accept": config.travis.headers.accept,
            "Content-Type": config.travis.headers.contentType,
            "Host": opts.settings.domain
        };
        params.json = true;

        //send the request to obtain the environment variables
        request.get(params, function (error, response, body) {
            //Check for errors in the request function
            utils.checkError(error, {code: 971}, cb, () => {
                utils.checkError(body === "no access token supplied" || body === "access denied", {code: 974}, cb, () => {
                	//Standardize the reponse
					let envVars = [];

                	body.env_vars.forEach(function(envVar){
						let oneVar = {
							"id": envVar.id,
							"name": envVar.name,
							"value": envVar.value, //returned only if public is set to true
							"public": envVar.public,
							"repoId": envVar.repository_id
						}
						envVars.push(oneVar);
					});

                	return cb (null, envVars);
                });

            });
        });
    },

    /**
	 * Adds an environment variable to a repository
     * @param opts
     * @param cb
     */
    addEnvVar (opts, cb) {
        let params = {};

        params.uri = "https://" + opts.settings.domain + config.travis.headers.api.url.addEnvVar + opts.settings.repoId + "&access_token=" + opts.settings.ciToken;
        params.headers = {
            "User-Agent": config.travis.headers.userAgent,
            "Accept": config.travis.headers.accept,
            "Content-Type": config.travis.headers.contentType,
            "Host": opts.settings.domain
        };
        params.json = true;

        params.body = {
            "env_var": opts.settings.envVar
        };

        //send the request to obtain the Travis token
        request.post(params, function (error, response, body) {
            //Check for errors in the request function
            utils.checkError(error, {code: 971}, cb, () => {
                utils.checkError(body === "no access token supplied" || body === "access denied", {code: 974}, cb, () => {
					return cb(null, true);
                });
            });
        });
    },

    /**
     * Updates an environment variable in a repository
     * @param opts
     * @param cb
     */
    updateEnvVar (opts, cb) {
        utils.checkError(!opts.settings.varID, {code: 978}, cb, () => {
            let params = {};

            //replace the environment variable ID in the URI
            params.uri = "https://" + opts.settings.domain + config.travis.headers.api.url.updateEnvVar + opts.settings.repoId + "&access_token=" + opts.settings.ciToken;
			params.uri = params.uri.replace("#ENV_ID#", opts.settings.varID);

            params.headers = {
                "User-Agent": config.travis.headers.userAgent,
                "Accept": config.travis.headers.accept,
                "Content-Type": config.travis.headers.contentType,
                "Host": opts.settings.domain
            };
            params.json = true;

            params.body = {
                "env_var": opts.settings.envVar
            };

            //send the request to obtain the Travis token
            request.patch(params, function (error, response, body) {
                //Check for errors in the request function
                utils.checkError(error, {code: 971}, cb, () => {
                    utils.checkError(body === "no access token supplied" || body === "access denied", {code: 974}, cb, () => {
                        utils.checkError(body.error === "Could not find a requested setting", {code: 979}, cb, () => {
                    		return cb(null, true);
                        });
                    });
                });
            });
		});
    },

    /**
     * Deletes an environment variable in a repository
     * @param opts
     * @param cb
     */
    deleteEnvVar (opts, cb) {
        utils.checkError(!opts.settings.varID, {code: 978}, cb, () => {
            let params = {};

            //replace the environment variable ID in the URI
            params.uri = "https://" + opts.settings.domain + config.travis.headers.api.url.deleteEnvVar + opts.settings.repoId + "&access_token=" + opts.settings.ciToken;
            params.uri = params.uri.replace("#ENV_ID#", opts.settings.varID);

            params.headers = {
                "User-Agent": config.travis.headers.userAgent,
                "Accept": config.travis.headers.accept,
                "Content-Type": config.travis.headers.contentType,
                "Host": opts.settings.domain
            };
            params.json = true;

            params.body = {
                "env_var": opts.settings.envVar
            };

            //send the request to obtain the Travis token
            request.delete(params, function (error, response, body) {
                //Check for errors in the request function
                utils.checkError(error, {code: 971}, cb, () => {
                    utils.checkError(body === "no access token supplied" || body === "access denied", {code: 974}, cb, () => {
                        utils.checkError(body.error === "Could not find a requested setting", {code: 979}, cb, () => {
                            return cb(null, true);
                        });
                    });
                });
            });
        });
    }
};

module.exports = lib;