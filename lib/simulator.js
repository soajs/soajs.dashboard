'use strict';
var BL = {
	model : null,
	"test": function (config, req, res) {
            console.log("test");
	}
};
/**
 * no need for a model or db connection for this api to work
 * @type {{init: module.exports.init}}
 */
module.exports = {
	"init": function (cb) {
		return cb(null, BL);
	}
};