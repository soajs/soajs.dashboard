"use strict";

const helpers = {

    ci: function (cmd, req, context, BL, lib, callback) {
        const ci = require("./drivers/ci");
        ci[cmd](req, context, lib, async, BL, callback);
    },

    cd: function (cmd, req, context, BL, lib, callback) {
        const cd = require("./drivers/cd");
        cd[cmd](req, context, lib, async, BL, callback);
    },

    endpoint: function (cmd, req, context, BL, lib, callback) {
        const endpoint = require("./drivers/endpoint");
        endpoint[cmd](req, context, lib, async, BL, callback);
    },

    productization: function (cmd, req, context, BL, lib, callback) {
        const productization = require("./drivers/productization");
        productization[cmd](req, context, lib, async, BL, callback);
    },

    tenant: function (cmd, req, context, BL, lib, callback) {
        const tenant = require("./drivers/tenant");
        tenant[cmd](req, context, lib, async, BL, callback);
    },

    repos: function(cmd, req, context, BL, lib, callback){
        const repos = require("./drivers/repos");
         repos[cmd](req, context, lib, async, BL, callback);
    },

    template: function(cmd, req, context, BL, lib, callback){
        const template = require("./drivers/template");
         template[cmd](req, context, lib, async, BL, callback);
    },

	"parse": function (){

	},
	
};

module.exports = helpers;