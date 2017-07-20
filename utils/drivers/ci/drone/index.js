/* jshint esversion: 6 */

'use strict';
const async = require('async');
const request = require('request');
const _ = require('lodash');
const config = require('./config.js');
const utils = require('../utils.js');

let lib = {
  /**
   * Generate a travis token from a Github token
   * @param opts
   * @param cb
   */
  generateToken (opts, cb) {
    return cb(null, 'Not supported by Drone');
  },

  /**
   * Lists all repos or a specific repo for a repo owner
   * @param opts
   * @param cb
   * Repos Response Format:
   * {
        "id": 1,
        "owner": "OWNER",
        "name": "repo_name",
        "full_name": "OWNER/repo_name",
        "link_url": "https://git.ypg.com/projects/OWNER/repos/repo_name/browse",
        "scm": "git",
        "clone_url": "https://git.ypg.com/scm/OWNER/repo_name.git",
        "default_branch": "master",
        "timeout": 60,
        "private": true,
        "trusted": false,
        "allow_pr": true,
        "allow_push": true,
        "allow_deploys": false,
        "allow_tags": false
    }
   */
  listRepos (opts, cb) {
    let repos = [];

    //check if an access token is provided
    utils.checkError(!opts.settings.ciToken, { code: 974 }, cb, () => {
      //check if the repositories owner name is provided
        let uri = `http://${opts.settings.domain}`;
      
      // getting repos list or one repo is 2 different endpoints completely
      if (opts.settings.owner && opts.settings.repo) {
        uri += config.api.url.listRepo
          .replace('#OWNER#', opts.settings.owner)
          .replace('#REPO#', opts.settings.repo);
      } else {
        uri += config.api.url.listRepos
      }
      const params = {
        uri: uri,
        qs: {
          access_token: opts.settings.ciToken
        },
        headers: config.headers,
        json: true
      };
      
      opts.log.debug(params);
      // send the request to obtain the repos
      request.get(params, function (error, response, body) {
        if (!Array.isArray(body)) {
          body = [body];
        }
        // Check for errors in the request function
        utils.checkError(error, { code: 971 }, cb, () => {
          // Check if the requested owner has repos
          if (body && Array.isArray(body) && body.length > 0) {
            async.each(body, updateRepoVars, function (error, response) {
              utils.checkError(error, { code: 978 }, cb, () => {
                return cb(null, repos);
              })
            });
          }
          else {
            return cb(null, repos);
          }
        });
      });
    });

    function updateRepoVars (oneRepo, cb) {
    	if(!oneRepo){
    		return cb(new Error("Unexpected error while fetching Repo Information."));
	    }
      let myRepo = {
        id: oneRepo.id,
        name: `${oneRepo.owner}/${oneRepo.name}`,
        active: true, // In Drone, only active repos are returned
        description: '' // Drone does not return a description
      };

      // grab owner/name from the repo, to get its builds
      opts.settings.owner = oneRepo.owner;
      opts.settings.repo = oneRepo.name;
	    
      lib.listRepoBranches(opts, (errBranches, branches) => {
        myRepo.branches = branches;
        repos.push(myRepo);
        return cb(null, true);
      });
    }
  },

  /**
   * Lists the branches of a repository
   * @param opts
   * @param cb
   */
  listRepoBranches(opts, cb) {
    let branches = [];
    const params = {
      uri: `http://${opts.settings.domain}${config.api.url.listRepoBuilds}`
        .replace('#OWNER#', opts.settings.owner)
        .replace('#REPO#', opts.settings.repo),
      qs: {
        access_token: opts.settings.ciToken
      },
      headers: config.headers,
      json: true
    };
	  
    opts.log.debug(params);
    //send the request to obtain the repository variables
    request.get(params, function (error, response, body) {
      // standardize response
	    utils.checkError(error, { code: 971 }, cb, () => {
		    // Check if the requested owner has repos
		    if (body && body.length > 0) {
			    body.forEach(function (oneBuild) {
				    const existingBranch = _.find(branches, { name: oneBuild.branch });
				
				    // if this branch is not added yet, add it
				    // they're already sorted from latest to oldest,
				    // so added one is always the latest
				    if (!existingBranch) {
					    const branch = {
						    name: oneBuild.branch,
						    lastCommit: new Date(oneBuild.created_at * 1000),
						    lastBuild: new Date(oneBuild.started_at * 1000),
						    state: oneBuild.status,
					    };
					
					    branches.push(branch);
				    }
			    });
		    }
		    return cb(null, branches);
	    });
    });
  },

  /**
   * modifies the environment variables of a repo based on the supplied env variables
   * @param opts
   * @param id
   * @param cb
   */
  ensureRepoVars(opts, cb) {
    // If there are no variables, skip the check
    if (!opts.params.variables || (opts.params.variables && Object.keys(opts.params.variables).length === 0))
      return cb();
    else {
      // list the environment variables of each repo
      let options = {
        settings: {
          domain: opts.settings.domain,
          owner: opts.settings.owner,
          repo: opts.settings.repo,
          ciToken: opts.settings.ciToken
        }
      };

      // List the env variables
      lib.listEnvVars(options, (err, repoVars) => {
        // delete all the environment variables
        async.eachSeries(repoVars, function (oneVar, callback) {
          options.settings.name = oneVar.name;
          lib.deleteEnvVar(options, callback);
        }, (err) => {
          let inputVariables = opts.params.variables;

          if (options.settings.name)
            delete options.settings.name;

          // add the supplied environment variables
          async.eachSeries(Object.keys(inputVariables), function (inputVar, callback) {
            // set up the env variable record
            options.settings.envVar = {
              name: inputVar,
              value: inputVariables[inputVar],
            };

            lib.addEnvVar(options, callback);
          }, () => cb(null, true));
        });
      });
    }
  },

  /**
   * Generate a travis token from a Github token
   * @param opts
   * @param cb
   */
  listEnvVars (opts, cb) {
    const params = {
      uri: `http://${opts.settings.domain}${config.api.url.listEnvVars}`
        .replace('#OWNER#', opts.settings.owner)
        .replace('#REPO#', opts.settings.repo),
      qs: {
        access_token: opts.settings.ciToken
      },
      headers: config.headers,
      json: true
    };
	  
    opts.log.debug(params);
    // send the request to obtain the secrets
    request.get(params, function (error, response, body) {
      //Check for errors in the request function
      utils.checkError(error, { code: 971 }, cb, () => {
        //Standardize the response
        let envVars = [];
        if (body) {
          body.forEach(function (envVar) {
            let oneVar = {
              id: envVar.id,
              name: envVar.name,
              value: envVar.value, // never returned by drone...
              public: false, // they're all considered private in drone
              owner: `${opts.settings.owner}/${opts.settings.repo}`
            };
            envVars.push(oneVar);
          });
        }
        return cb(null, envVars);
      });
    });
  },

  /**
   * Adds an environment variable to a repository
   * @param opts
   * @param cb
   */
  addEnvVar (opts, cb) {
    const params = {
      uri: `http://${opts.settings.domain}${config.api.url.addEnvVar}`
        .replace('#OWNER#', opts.settings.owner)
        .replace('#REPO#', opts.settings.repo),
      qs: {
        access_token: opts.settings.ciToken
      },
      body: opts.settings.envVar,
      headers: config.headers,
      json: true
    };
	  
    opts.log.debug(params);
    // send the request to obtain the Travis token
    request.post(params, function (error, response, body) {
      // Check for errors in the request function
      utils.checkError(error, { code: 971 }, cb, () => {
        return cb(null, true);
      });
    });
  },

  /**
   * Updates an environment variable in a repository
   * @param opts
   * @param cb
   */
  updateEnvVar (opts, cb) {
    // adding a secret with the same name will update current one's value
    lib.addEnvVar(opts, cb);
  },

  /**
   * Deletes an environment variable in a repository
   * @param opts
   * @param cb
   */
  deleteEnvVar (opts, cb) {
    const params = {
      uri: `http://${opts.settings.domain}${config.api.url.deleteEnvVar}`
        .replace('#OWNER#', opts.settings.owner)
        .replace('#REPO#', opts.settings.repo)
        .replace('#SECRET_NAME#', opts.settings.name),
      qs: {
        access_token: opts.settings.ciToken
      },
      headers: config.headers
    };
	  
    opts.log.debug(params);
    // send the request to obtain the Travis token
    request.delete(params, function (error, response, body) {
      // Check for errors in the request function
      utils.checkError(error, { code: 971 }, cb, () => {
        return cb(null, true);
      });
    });
  },

  /**
   * activate/deactivate hook
   * @param opts
   * @param cb
   */
  setHook (opts, cb) {
    const params = {
      uri: `http://${opts.settings.domain}${config.api.url.setHook}`
        .replace('#OWNER#', opts.settings.owner)
        .replace('#REPO#', opts.settings.repo),
      qs: {
        access_token: opts.settings.ciToken
      },
      body: {
        owner: opts.settings.owner,
        name: opts.settings.repo
      },
      headers: config.headers,
      json: true
    };

    // allow_push/allow_pr/allow_deploy/etc = true/false
    params.body = Object.assign(params.body, opts.hook);

    opts.log.debug(params);
    //send the request to obtain the Travis token
    request.patch(params, function (error, response, body) {
      //Check for errors in the request function
      utils.checkError(error, { code: 971 }, cb, () => {
        return cb(null, true);
      });
    });
  },

  /**
   * Function that lists general settings of a travis repo
   * @param  {Object}   opts
   * @param  {Function} cb
   *
   */
  listSettings (opts, cb) {
    return cb(null, 'Not supported by Drone');
  },

  /**
   * Function that updates general settings of a travis repo
   * @param  {Object}   opts
   * @param  {Function} cb
   *
   */
  updateSettings(opts, cb) {
    return cb(null, 'Not supported by Drone');
  }
};

module.exports = lib;
