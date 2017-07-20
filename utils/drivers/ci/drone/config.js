'use strict';

module.exports = {
  api: {
    url: {
      listRepos: '/api/user/repos',	// GET
      listRepo: '/api/repos/#REPO#',	// GET
      listRepoBuilds: '/api/repos/#OWNER#/#REPO#/builds',	// GET
      listEnvVars: '/api/repos/#OWNER#/#REPO#/secrets',	// GET
      addEnvVar: '/api/repos/#OWNER#/#REPO#/secrets',	// POST
      deleteEnvVar: '/api/repos/#OWNER#/#REPO#/secrets/#SECRET_NAME#',	// DELETE
      setHook: '/api/repos/#OWNER#/#REPO#',	// PATCH
    },
  },
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
};
