"use strict";
var soajs = require('soajs');
var serviceGenerator = require("./sg");

//the service name and version are provided as Environment Variables
var serviceInfo = {
	"name": process.env.SOAJS_GC_NAME,
	"version": parseInt(process.env.SOAJS_GC_VERSION, 10)
};

soajs.contentBuilder(serviceInfo, function(error, config) {

	//if error occurred while loading the service configuration
	if(error) { throw new Error(error); }

	if(!config) { throw new Error("Requested service is not found, make sure you set the correct name and version in the environment variables."); }

	//generate the service from the configuration
	var gcService = new serviceGenerator(config);

	//Initialize and deploy the service
	gcService.buildService(function() {
		console.log('Service ' + serviceInfo.name + ' Generated and Deployed...');
	});
});