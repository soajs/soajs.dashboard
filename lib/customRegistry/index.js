'use strict';

var fs = require('fs');
var async = require('async');

var utils = require("../../utils/utils.js");
var cloneObj = require('soajs').utils.cloneObj;

var customRegColName = 'custom_registry';
var environmentColName = 'environment';

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

      //enable pagination
      if(req.soajs.inputmaskData.hasOwnProperty('start')) {
          if(!req.soajs.inputmaskData.hasOwnProperty('end')) {
              req.soajs.inputmaskData.end = 100;
          }

          opts.options = {
            skip: req.soajs.inputmaskData.start,
            limit: req.soajs.inputmaskData.end
          };
      }

      BL.model.findEntries(req.soajs, opts, function(error, customRegEntries) {
         utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
             utils.checkIfOwner(req.soajs, BL.model, function(error, isOwner) {
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
      var opts = {
          collection: customRegColName,
          conditions: {
              name: req.soajs.inputmaskData.customRegEntry.name,
              created: req.soajs.inputmaskData.env.toUpperCase()
          }
      };

      BL.model.countEntries(req.soajs, opts, function(error, count) {
         utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
             utils.checkErrorReturn(req.soajs, cb, { config: config, error: count > 0, code: 992 }, function() {
                opts.conditions = {};
                opts.record = req.soajs.inputmaskData.customRegEntry;

                opts.record.created = req.soajs.inputmaskData.env.toUpperCase();
                opts.record.author = req.soajs.urac.username;
                BL.model.insertEntry(req.soajs, opts, function(error, result) {
                    utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
                        return cb(null, result[0]);
                    });
                });
             });
         });
      });
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
      BL.model.validateId(req.soajs, function(error) {
         utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 701 }, function() {
            var opts = {
                collection: customRegColName,
                conditions: { _id: req.soajs.inputmaskData.id }
            };

            BL.model.findEntry(req.soajs, opts, function(error, customRegEntry) {
                utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
                    utils.checkErrorReturn(req.soajs, cb, { config: config, error: !customRegEntry, code: 993 }, function() {
                        utils.checkIfOwner(req.soajs, BL.model, function(error, isOwner) {
                            utils.checkErrorReturn(req.soajs, cb, {
                                config: config,
                                error: (!isOwner && (customRegEntry.author !== req.soajs.urac.username)),
                                code: 994
                            }, function() {
                                utils.checkErrorReturn(req.soajs, cb, {
                                    config: config,
                                    error: (req.soajs.inputmaskData.env.toUpperCase() !== customRegEntry.created),
                                    code: 995
                                }, function() {
                                    //force original author and environment
                                    req.soajs.inputmaskData.customRegEntry.created = customRegEntry.created;
                                    req.soajs.inputmaskData.customRegEntry.author = customRegEntry.author;
                                    if(req.soajs.inputmaskData.customRegEntry.sharedEnv && Object.keys(req.soajs.inputmaskData.customRegEntry.sharedEnv).length === 0) {
                                        delete req.soajs.inputmaskData.customRegEntry.sharedEnv;
                                    }

                                    opts = {
                                        collection: customRegColName,
                                        conditions: { _id: req.soajs.inputmaskData.id },
                                        fields: req.soajs.inputmaskData.customRegEntry,
                                        options: { upsert: true, safe: true }
                                    };

                                    BL.model.updateEntry(req.soajs, opts, function(error) {
                                        utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
                                            return cb(null, true);
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
         });
      });
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
      var opts = {
          collection: environmentColName,
          conditions: {
              code: req.soajs.inputmaskData.env.toUpperCase()
          }
      };

      BL.model.findEntry(req.soajs, opts, function(error, envRecord) {
         utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
             utils.checkErrorReturn(req.soajs, cb, { config: config, error: !envRecord, code: 446 }, function() {
                 if(!envRecord.custom || Object.keys(envRecord.custom).length === 0) {
                     return cb(null, true);
                 }

                 convertCustomReg(envRecord.code, envRecord.custom, function(error, customRegEntries) {
                    //no error to be handled
                    delete opts.conditions;
                    opts.collection = customRegColName;
                    opts.record = customRegEntries;
                    BL.model.insertEntry(req.soajs, opts, function(error) {
                        utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {

                            opts.collection = environmentColName;
                            opts.conditions = { code: envRecord.code };
                            opts.fields = { $unset: { custom: '' } };
                            BL.model.updateEntry(req.soajs, opts, function(error) {
                                utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
                                    return cb(null, true);
                                });
                            });
                        });
                    });
                 });
             });
         });
      });

      function convertCustomReg(envCode, oldSchema, cb) {
          async.map(Object.keys(oldSchema), function(oneEntry, callback) {
              var newRecord = {
                name: oneEntry,
                created: envCode.toUpperCase(),
                author: req.soajs.urac.username,
                locked: false,
                plugged: true,
                shared: false,
                value: oldSchema[oneEntry]
              };

              return callback(null, newRecord);
          }, cb);
      }
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
      BL.model.validateId(req.soajs, function(error) {
          utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 701 }, function() {
              var opts = {
                  collection: customRegColName,
                  conditions: { _id: req.soajs.inputmaskData.id }
              };

              BL.model.findEntry(req.soajs, opts, function(error, customRegEntry) {
                 utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
                    utils.checkErrorReturn(req.soajs, cb, { config: config, error: !customRegEntry, code: 993 }, function() {
                        utils.checkIfOwner(req.soajs, BL.model, function(error, isOwner) {
                            utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
                                utils.checkErrorReturn(req.soajs, cb, {
                                    config: config,
                                    error: (!isOwner && (customRegEntry.author !== req.soajs.urac.username)),
                                    code: 994
                                }, function() {
                                    utils.checkErrorReturn(req.soajs, cb, {
                                        config: config,
                                        error: (req.soajs.inputmaskData.env.toUpperCase() !== customRegEntry.created.toUpperCase()),
                                        code: 995
                                    }, function() {
                                        BL.model.removeEntry(req.soajs, opts, function(error) {
                                            utils.checkErrorReturn(req.soajs, cb, { config: config, error: error, code: 600 }, function() {
                                                return cb(null, true);
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                 });
              });
          });
      });
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
