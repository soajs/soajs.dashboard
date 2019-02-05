"use strict";

var collName = "git_accounts";

var methods = {
    "getAuthToken": function (soajs, model, options, cb) {
	    let opts = {
		    collection: collName,
		    conditions: { _id: options.accountId }
	    };
	    model.findEntry(soajs, opts, cb);
    },

    "getAccount": function (soajs, model, options, cb) {
        let opts = {
            collection: collName,
            conditions: { _id: options.accountId }
        };
        if (options.accountId) {
            model.findEntry(soajs, opts, cb);
        }
        else if (options.owner && options.repo) {
            methods.searchForAccount(soajs, model, options, cb);
        }
    },

    "getRepo": function (soajs, model, options, cb) {
        var opts = {
            collection: collName,
            conditions: { _id: options.accountId, 'repos.name': options.repoLabel },
            fields: { 'repos.$': 1 }
        };
        model.findEntry(soajs, opts, cb);
    },

    "searchForAccount": function (soajs, model, options, cb) {
        var repoLabel = options.owner + '/' + options.repo;
        var opts = {
            collection: collName,
            conditions: { 'repos.name': repoLabel }
        };
        model.findEntry(soajs, opts, cb);
    },

    "saveNewAccount": function (soajs, model, record, cb) {
        var opts = {
            collection: collName,
            record: record
        };
        model.insertEntry(soajs, opts, cb);
    },

    "removeAccount": function (soajs, model, recordId, cb) {
        var opts = {
            collection: collName,
            conditions: { _id: recordId }
        };
        model.removeEntry(soajs, opts, cb);
    },

    "checkIfAccountExists": function (soajs, model, record, cb) {
        var opts = {
            collection: collName,
            conditions: { owner: record.owner, provider: record.provider }
        };
        model.countEntries(soajs, opts, cb);
    },

    "listGitAccounts": function (soajs, model, cb) {
        var opts = {
            collection: collName,
            conditions: {},
            fields: { token: 0, repos: 0 }
        };
        
        if(soajs.inputmaskData.fullList){
        	delete opts.fields.repos;
        }
        
        if(soajs.inputmaskData.rms){
        	opts.conditions = {
        		"owner": "soajs",
		        "access": "public"
	        };
        }
        
        model.findEntries(soajs, opts, cb);
    },
	
	"listGitAccountsWithRepos": function (soajs, model, cb) {
		var opts = {
			collection: collName,
			conditions: {},
			fields: { token: 0 }
		};
		model.findEntries(soajs, opts, cb);
	},
	
	"addRepoToAccount": function (soajs, model, options, cb) {
  
		let opts = {
			collection: collName,
			conditions: {_id: options.accountId},
			fields: {}
		};
		opts.fields['$addToSet'] = {'repos': options.repo};
		for (let x = 0; x < soajs.inputmaskData.accountRecord.repos.length; x++) {
			if (soajs.inputmaskData.accountRecord.repos[x].name === options.repo.name) {
				soajs.inputmaskData.accountRecord.repos[x].git = options.repo.git;
				delete opts.fields['$addToSet'];
				opts.fields['$set'] = {'repos': soajs.inputmaskData.accountRecord.repos};
				break;
			}
		}
		model.updateEntry(soajs, opts, cb);
    },
	
	"removeRepoFromAccount": function (soajs, model, options, cb) {
		let opts = {
			collection: collName,
			conditions: {_id: options.accountId}
		};
		if (soajs.inputmaskData.branch) {
			model.findEntry(soajs, opts, (err, account) => {
				if (err) {
					return cb(err);
				}
				let found = false;
				if (account && account.repos && account.repos.length > 0) {
					for (let i = 0; i < account.repos.length ; i++) {
						if (account.repos[i] && account.repos[i].name && account.repos[i].name === options.repoLabel) {
							if (account.repos[i].git && account.repos[i].git.branches && account.repos[i].git.branches.length > 0) {
								for (let j = 0; j < account.repos[i].git.branches.length ; j++) {
									if (account.repos[i].git.branches[j].name === soajs.inputmaskData.branch) {
										account.repos[i].git.branches[j].active = false;
										found = true;
										break;
									}
								}
							}
							break;
						}
					}
					opts.record = account;
					delete opts.conditions;
					if (found){
						model.saveEntry(soajs, opts, cb);
					}
					else {
						return cb(null, true);
					}
				}
				else {
					return cb(null, true);
				}
			});
		}
		else {
			opts.fields = {'$pull': {'repos': {'name': options.repoLabel}}};
			model.updateEntry(soajs, opts, cb);
		}
	},
	
	"updateRepoInfo": function (soajs, model, options, cb) {
		var set = {
			'$set': {}
		};
		var opts = {
			collection: collName,
			conditions: {
				_id: options.accountId,
				'repos.name': options.repoLabel
			},
			fields: set
		};
		if (options.property === 'SHA') {
			soajs.inputmaskData.branches.forEach((oneBranch)=>{
				if (oneBranch.name === soajs.inputmaskData.branch){
					oneBranch.configSHA = options.value.sha;
					if (options.value.swaggerSHA) {
						oneBranch.swaggerSHA  = options.value.swaggerSHA;
					}
				}
			});
			set['$set']['repos.$.git.branches'] = soajs.inputmaskData.branches;
			
		} else {
			set['$set']['repos.$.' + options.property] = options.value;
		}
		opts.fields = set;
		model.updateEntry(soajs, opts, cb);
	}
};

module.exports = methods;
