"use strict";

var collName = "settings";

var methods = {
	"findEntry": function (soajs, model, opts, cb) {
		opts.collection = collName;
		model.findEntry(soajs, opts, cb);
	},
	"insertEntry": function (soajs, model, opts, cb) {
		opts.collection = collName;
		model.insertEntry(soajs, opts, cb);
	},
};

module.exports = methods;
