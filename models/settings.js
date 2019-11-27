"use strict";

const collName = "settings";

let methods = {
	"findEntry": function (soajs, model, opts, cb) {
		opts.collection = collName;
		model.findEntry(soajs, opts, cb);
	},
	"updateEntry": function (soajs, model, opts, cb) {
		opts.collection = collName;
		model.updateEntry(soajs, opts, cb);
	},
};

module.exports = methods;
