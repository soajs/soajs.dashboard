"use strict";

var collName = "git_accounts";

var model = {
    "getAuthToken": function (mongo, options, cb) {
        mongo.findOne(collName, {_id: options.accountId}, {token: 1, _id: 0}, function (error, tokenRecord) {
            return cb(error, (tokenRecord) ? tokenRecord.token : null);
        });
    },

    "getAccount": function (mongo, options, cb) {
        if (options.accountId) {
            mongo.findOne(collName, {_id: options.accountId}, function (error, accountRecord) {
                return cb(error, accountRecord);
            });
        }
        else if (options.owner && options.repo) {
            model.searchForAccount(mongo, options, cb);
        }
    },

    "getRepo": function (mongo, options, cb) {
        mongo.findOne(collName, {_id: options.accountId, 'repos.name': options.repoLabel}, {'repos.$': 1}, function (error, record) {
            return cb(error, record);
        });
    },

    "searchForAccount": function (mongo, options, cb) {
        var repoLabel = options.owner + '/' + options.repo;
        mongo.findOne(collName, {'repos.name': repoLabel}, function (error, accountRecord) {
            return cb(error, accountRecord);
        });
    },

    "saveNewAccount": function (mongo, record, cb) {
        mongo.insert(collName, record, function (error) {
            return (error) ? cb (error) : cb (null, true);
        });
    },

    "removeAccount": function (mongo, recordId, cb) {
        mongo.remove(collName, {_id: recordId}, function (error) {
            return (error) ? cb (error) : cb (null, true);
        });
    },

    "checkIfAccountExists": function (mongo, record, cb) {
        mongo.count(collName, {owner: record.owner, provider: record.provider}, function (error, count) {
            return cb (error, count);
        });
    },

    "listGitAccounts": function (mongo, cb) {
        mongo.find(collName, {}, {token: 0, repos: 0}, function (error, records) {
            return cb(error, records);
        });
    },

    "addRepoToAccount": function (mongo, options, cb) {
        mongo.update(collName, {_id: options.accountId}, {'$addToSet': {'repos': options.repo}}, function (error, result) {
            return cb(error, result);
        });
    },

    "removeRepoFromAccount": function (mongo, options, cb) {
        mongo.update(collName, {_id: options.accountId}, {'$pull': {'repos': {'name': options.repoLabel}}}, function (error, result) {
            return cb(error, result);
        });
    },

    "updateRepoInfo": function (mongo, options, cb) {
        var set = {
            '$set': {}
        };
        set['$set']['repos.$.' + options.property] = options.value;
        var propName = 'repos.$.' + options.property;
        mongo.update(collName, {_id: options.accountId, 'repos.name': options.repoLabel}, set, function (error, result) {
            return cb(error, result);
        });
    }
};

module.exports = model;
