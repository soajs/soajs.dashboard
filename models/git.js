"use strict";

var collName = "git_accounts";

var methods = {
    "getAuthToken": function (soajs, model, options, cb) {
        var opts = {
            collection: collName,
            conditions: { _id: options.accountId },
            fields: { token: 1, _id: 0 }
        };
        model.findEntry(soajs, opts, function (error, tokenRecord) {
            return cb(error, ((tokenRecord) ? tokenRecord.token : null));
        });
    },

    "getAccount": function (soajs, model, options, cb) {
        var opts = {
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
        var opts = {
            collection: collName,
            conditions: { _id: options.accountId },
            fields: { '$addToSet': { 'repos': options.repo } }
        };
        model.updateEntry(soajs, opts, cb);
    },

    "removeRepoFromAccount": function (soajs, model, options, cb) {
        var opts = {
            collection: collName,
            conditions: { _id: options.accountId },
            fields: { '$pull': {'repos': { 'name': options.repoLabel } } }
        };
        model.updateEntry(soajs, opts, cb);
    },

    "updateRepoInfo": function (soajs, model, options, cb) {
        var set = {
            '$set': {}
        };
        set['$set']['repos.$.' + options.property] = options.value;

        var opts = {
            collection: collName,
            conditions: {_id: options.accountId, 'repos.name': options.repoLabel},
            fields: set
        };
        model.updateEntry(soajs, opts, cb);
    }
};

module.exports = methods;
