"use strict";

module.exports = {
	"headers": {
		"api": {
			"url": {
				"githubAuth": "/auth/github",
				"listRepos": "/repos",
				"listEnvVars": "/settings/env_vars?repository_id=",
				"addEnvVar": "/settings/env_vars?repository_id=",
				"updateEnvVar": "/settings/env_vars/#ENV_ID#?repository_id=",
				"deleteEnvVar": "/settings/env_vars/#ENV_ID#?repository_id=",
				"setHook": "/hooks/",
				"listSettings": "/repos/#REPO_ID#/settings"
			},
		},
		"userAgent": "Travis/1.0.0",
		"accept": "application/vnd.travis-ci.2+json",
		"contentType": "application/json"
	}
};
