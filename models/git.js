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
            mongo.findOne(collName, {_id: options.accountId}, function(error, account) {
                return cb(error, account);
            });
        }
        else if (options.owner && options.repo) {
            model.searchForAccount(mongo, options, function(error, account) {
                return cb(error, account);
            });
        }
    },

    "getRepo": function (mongo, options, cb) {
        mongo.findOne(collName, {_id: options.accountId, 'repos.name': options.repoLabel}, {'repos.$': 1}, cb);
    },

    "searchForAccount": function (mongo, options, cb) {
        var repoLabel = options.owner + '/' + options.repo;
        mongo.findOne(collName, {'repos.name': repoLabel}, cb);
    },

    "saveNewAccount": function (mongo, record, cb) {
        mongo.insert(collName, record, function (error) {
            return cb(error, true);
        });
    },

    "removeAccount": function (mongo, recordId, cb) {
        mongo.remove(collName, {_id: recordId}, function (error) {
            return cb(error, true);
        });
    },

    "checkIfAccountExists": function (mongo, record, cb) {
        mongo.count(collName, {owner: record.owner, provider: record.provider}, cb);
    },

    "listGitAccounts": function (mongo, cb) {
        mongo.find(collName, {}, {token: 0, repos: 0}, cb);
    },

    "addRepoToAccount": function (mongo, options, cb) {
        mongo.update(collName, {_id: options.accountId}, {'$addToSet': {'repos': options.repo}}, cb);
    },

    "removeRepoFromAccount": function (mongo, options, cb) {
        mongo.update(collName, {_id: options.accountId}, {'$pull': {'repos': {'name': options.repoLabel}}}, cb);
    },

    "updateRepoInfo": function (mongo, options, cb) {
        var set = {
            '$set': {}
        };
        set['$set']['repos.$.' + options.property] = options.value;
        var propName = 'repos.$.' + options.property;
        mongo.update(collName, {_id: options.accountId, 'repos.name': options.repoLabel}, set, cb);
    }
};

module.exports = model;
