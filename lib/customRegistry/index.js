'use strict';

var fs = require('fs');
var async = require('async');

var utils = require("../../utils/utils.js");

var customRegColName = 'custom_registry';
var tenantsColName = 'tenants';

//TODO: move to utils
function checkIfOwner(soajs, cb) {
	var uracRecord = soajs.urac;
	var opts = {
		collection: tenantsColName,
		conditions: {
			code: uracRecord.tenant.code.toUpperCase()
		}
	};

	BL.model.findEntry(soajs, opts, function (error, tenantRecord) {
		if(error) return cb(error);

		if(tenantRecord && tenantRecord.locked && uracRecord.groups.indexOf('owner') !== -1) {
			return cb(null, true);
		}

		return cb(null, false);
	});
}

var BL = {

  model: null,

  /**
	 * List all available custom registry entries that belong to or shared with an environment
	 * @param  {Object}   config
	 * @param  {Object}   req
	 * @param  {Object}   res
	 * @param  {Function} cb
	 *
	 */
  list: function(config, req, res, cb) {
      var opts = {
          collection: customRegColName,
          conditions: {
              $or: [
                  {
                      created: req.soajs.inputmaskData.env.toUpperCase()
                  },
                  {
                      created: { $ne: req.soajs.inputmaskData.env.toUpperCase() },
                      shared: { $eq: true },
                      sharedEnv: { $exists: false }
                  },
                  {
                      created: { $ne: req.soajs.inputmaskData.env.toUpperCase() },
                      shared: { $eq: true },
                      sharedEnv: { $exists: true },
                      ['sharedEnv.' + req.soajs.inputmaskData.env.toUpperCase()]: { $exists: true, $eq: true }
                  }
              ]
          }
      };

      BL.model.findEntries(req.soajs, opts, function(error, customRegEntries) {
         utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
             checkIfOwner(req.soajs, function(error, isOwner) {
                utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
                    async.map(customRegEntries, function(oneCustomRegEntry, callback) {
                        oneCustomRegEntry.permission = false;

                        if(isOwner || (oneCustomRegEntry.author === req.soajs.urac.username) || (!oneCustomRegEntry.locked)) {
                            oneCustomRegEntry.permission = true;
                        }

                        return callback(null, oneCustomRegEntry);
                    }, cb);
                });
             });
         });
      });
  },

  /**
	 * Get a specific custom registry entry by name or id
	 * @param  {Object}   config
	 * @param  {Object}   req
	 * @param  {Object}   res
	 * @param  {Function} cb
	 *
	 */
  get: function(config, req, res, cb) {
      if(req.soajs.inputmaskData.id) {
          BL.model.validateId(req.soajs, function(error) {
             utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 701 }, function() {
                return findEntry({ _id: req.soajs.inputmaskData.id });
             });
          });
      }
      else if(req.soajs.inputmaskData.name) {
          return findEntry({ name: req.soajs.inputmaskData.name });
      }
      else {
          return cb({ code: 990, msg: config.errors[990] });
      }

      function findEntry(query) {
          var opts = {
              collection: customRegColName,
              conditions: query
          };

          BL.model.findEntry(req.soajs, opts, function(error, customRegEntry) {
             utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
                utils.checkErrorReturn(req.soajs, cb, { config: config, error: !customRegEntry, code: 991 }, function() {
                    return cb(null, customRegEntry);
                });
             });
          });
      }
  },

  /**
	 * Add a new custom registry entry
	 * @param  {Object}   config
	 * @param  {Object}   req
	 * @param  {Object}   res
	 * @param  {Function} cb
	 *
	 */
  add: function(config, req, res, cb) {
      //TODO: implement
  },

  /**
	 * Update an existing custom registry entry
	 * @param  {Object}   config
	 * @param  {Object}   req
	 * @param  {Object}   res
	 * @param  {Function} cb
	 *
	 */
  update: function(config, req, res, cb) {
      //TODO: implement
  },

  /**
	 * Upgrade custom registry from old schema to new one
	 * @param  {Object}   config
	 * @param  {Object}   req
	 * @param  {Object}   res
	 * @param  {Function} cb
	 *
	 */
  upgrade: function(config, req, res, cb) {
      //TODO: implement
  },

  /**
	 * Delete a custom registry entry
	 * @param  {Object}   config
	 * @param  {Object}   req
	 * @param  {Object}   res
	 * @param  {Function} cb
	 *
	 */
  delete: function(config, req, res, cb) {
      //TODO: implement
  }

};

module.exports = {
	"init": function (modelName, cb) {
		var modelPath;

		if (!modelName) {
			return cb(new Error("No Model Requested!"));
		}
		modelPath = __dirname + "/../../models/" + modelName + ".js";
		return requireModel(modelPath, cb);
		/**
		 * checks if model file exists, requires it and returns it.
		 * @param filePath
		 * @param cb
		 */
		function requireModel(filePath, cb) {
			//check if file exist. if not return error
			fs.exists(filePath, function (exists) {
				if (!exists) {
					return cb(new Error("Requested Model Not Found!"));
				}

				BL.model = require(filePath);
				return cb(null, BL);
			});
		}
	}
};
