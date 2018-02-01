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
				"listSettings": "/repos/#REPO_ID#/settings",
				"updateSettings": "/repos/#REPO_ID#/settings",
				"listRepoBranches": "/repos/#REPO_ID#/branches",
				"listRepoBuilds": "/repos/#REPO_ID#/builds",
				"getJob": "/jobs/#JOB_ID#",
				"jobLogs": "/jobs/#JOB_ID#/log"
			},
		},
		"userAgent": "Travis/1.0.0",
		"accept": "application/vnd.travis-ci.2+json",
		"contentType": "application/json"
	}
};
