"use strict";
var soajs = require('soajs');

//the service name and version are provided as Environment Variables
var serviceInfo = {
	"name": process.env.SOAJS_GC_NAME,
	"version": parseInt(process.env.SOAJS_GC_VERSION, 10)
};

soajs.contentBuilder(serviceInfo, function(error, config) {

	//if error occurred while loading the service configuration
	if(error) { throw new Error(error); }

	if(!config) {
		var str = "Service not found!\n";
		str += "make sure you set the correct name and version in the environment variables.\n";
		str += "SOAJS_GC_NAME=myService\n";
		str += "SOAJS_GC_VERSION=1\n";
		throw new Error(str);
	}

	//generate the service from the configuration
	var serviceGenerator = require("./lib/sg");
	var gcService = new serviceGenerator(config);

	//Initialize and deploy the service
	gcService.buildService(function() {
		console.log('Service ' + serviceInfo.name + ' Generated and Deployed...');
	});
});