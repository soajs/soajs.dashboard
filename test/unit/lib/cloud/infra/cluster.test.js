"use strict";
let assert = require("assert");
const nock = require("nock");
const sinon = require('sinon');

let testHelper = require("../../../../helper.js");
let clustersModule = testHelper.requireModule('./lib/cloud/infra/cluster.js');
let helper = testHelper.requireModule('./lib/cloud/infra/helper.js');
let deployIndex = testHelper.requireModule('./lib/cloud/deploy/index.js');
let utils = testHelper.requireModule('./utils/utils.js');
let config = testHelper.requireModule('./config.js');

let mongoStub = {
	getDb: function () {
	},
	checkForMongo: function (soajs) {
		return true;
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	findEntry: function (soajs, opts, cb) {
		cb(null, {});
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	switchConnection: function (soajs) {
	}
};

let deployer = testHelper.deployer;
let soajs = {
	validator: {
		Validator: function () {
			return {
				validate: function (boolean) {
					if (boolean) {
						//valid
						return {
							errors: []
						};
					}
					else {
						//invalid
						return {
							errors: [{error: 'msg'}]
						};
					}
				}
			};
		}
	},
	registry: {
		coreDB: {
			provision: {}
		}
	},
	log: {
		debug: function (data) {
			
		},
		error: function (data) {
			
		},
		info: function (data) {
			
		}
	},
	// uracDriver: {},
	inputmaskData: {},
	tenant: {},
	headers: {}
};
let BL = {
	model: mongoStub
};
let req = {
	soajs: soajs
};

describe("testing cloud/infra/cluster.js", function () {
	describe("deployCluster", function () {
		
		let serviceStub, utilsStub;
		
		let InfraRecord = {
			templates: []
		};
		let info = [];
		before(function (done) {
			
			serviceStub = sinon.stub(helper, 'getCommonData', function (config, soajs, BL, cbMain, cb) {
				let InfraRecord = {
					deployments: {
						x3: {
							environments: []
						}
					}
				};
				let environmentRecord = {};
				let info = [
					'x1', 'x2', 'x3'
				];
				return cb(InfraRecord, environmentRecord, info);
			});
			
			utilsStub = sinon.stub(utils, 'buildDeployerOptions', function (environmentRecord, soajs, BL) {
				let output = {};
				return output;
			});
			
			done();
		});
		
		after(function (done) {
			serviceStub.restore();
			utilsStub.restore();
			done();
		});
		
		it("Success deployCluster", function (done) {
			soajs.inputmaskData.envCode = 'DEV';
			soajs.inputmaskData.previousEnvironment = 'DEV';
			clustersModule.deployCluster(config, req, soajs, BL, deployer, function (error, body) {
				done();
			});
		});
		
		it("Success deployCluster with previousEnvironment", function (done) {
			soajs.inputmaskData.previousEnvironment = 'STG';
			clustersModule.deployCluster(config, req, soajs, BL, deployer, function (error, body) {
				done();
			});
		});
		
		it("Success deployCluster without previousEnvironment & deployments", function (done) {
			delete soajs.inputmaskData.previousEnvironment;
			
			mongoStub.findEntry = function (soajs, opts, cb) {
				let output = {
					deployments: [
						{
							environments: 'DEV'
						}
					]
				};
				
				cb(null, output);
			};
			
			clustersModule.deployCluster(config, req, soajs, BL, deployer, function (error, body) {
				done();
			});
		});
		
		it("Success deployCluster without previousEnvironment & No deployments / doDeploy with local temp", function (done) {
			delete soajs.inputmaskData.previousEnvironment;
			
			serviceStub.restore();
			serviceStub = sinon.stub(helper, 'getCommonData', function (config, soajs, BL, cbMain, cb) {
				let InfraRecord = {
					deployments: [],
					templates: ["local"],
					_id: "abcdefghijklmnopqrstuvwxyz"
				};
				let environmentRecord = {};
				let info = [
					'x1', 'x2', 'x3'
				];
				return cb(InfraRecord, environmentRecord, info);
			});
			
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, null);
			};
			
			clustersModule.deployCluster(config, req, soajs, BL, deployer, function (error, body) {
				done();
			});
		});
		
		it("Success deployCluster without previousEnvironment & No deployments / doDeploy without local template", function (done) {
			delete soajs.inputmaskData.previousEnvironment;
			
			serviceStub.restore();
			serviceStub = sinon.stub(helper, 'getCommonData', function (config, soajs, BL, cbMain, cb) {
				let InfraRecord = {
					deployments: []
				};
				let environmentRecord = {};
				let info = [
					'x1', 'x2', 'x3'
				];
				return cb(InfraRecord, environmentRecord, info);
			});
			
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, null);
			};
			
			clustersModule.deployCluster(config, req, soajs, BL, deployer, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("getDeployClusterStatus", function () {
		
		let serviceStub, utilsStub, deployIndexStub;
		
		before(function (done) {
			process.env.SOAJS_SAAS = true;
			
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, {
					_id: "123"
				});
			};
			
			serviceStub = sinon.stub(helper, 'getCommonData', function (config, soajs, BL, cbMain, cb) {
				let InfraRecord = {
					name: 'google',
					deployments: {
						x3: {
							environments: []
						}
					}
				};
				let environmentRecord = {
					code: 'DEV'
				};
				let info = [
					'x1', 'x2', 'x3'
				];
				return cb(InfraRecord, environmentRecord, info);
			});
			
			utilsStub = sinon.stub(utils, 'buildDeployerOptions', function (environmentRecord, soajs, BL) {
				let output = {
					strategy: 'kubernetes'
				};
				return output;
			});
			
			deployIndexStub = sinon.stub(deployIndex, 'init', function (modelName, cb) {
				let deploymentModule = {
					deployService: function (config, req, deployer, cbMain) {
						return cbMain(null);
					}
				};
				return cb(null, deploymentModule);
			});
			
			done();
		});
		
		after(function (done) {
			serviceStub.restore();
			utilsStub.restore();
			deployIndexStub.restore();
			
			delete process.env.SOAJS_SAAS;
			
			done();
		});
		
		it("Success deployCluster", function (done) {
			clustersModule.getDeployClusterStatus(config, req, soajs, BL, deployer, function (error, body) {
				done();
			});
		});
		
		it("Success deployCluster with previous env", function (done) {
			soajs.inputmaskData.previousEnvironment = 'DEV';
			soajs.inputmaskData.envCode = 'DEV';
			
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, {
					deployer: {
						selected: 'container.docker.local',
						container: {
							docker: {
								local: {}
							}
						}
					}
				});
			};
			
			clustersModule.getDeployClusterStatus(config, req, soajs, BL, deployer, function (error, body) {
				done();
			});
		});
	});
	
	describe("getDNSInfo", function () {
		
		let serviceStub, utilsStub;
		
		before(function (done) {
			serviceStub = sinon.stub(helper, 'getCommonData', function (config, soajs, BL, cbMain, cb) {
				let InfraRecord = {};
				let environmentRecord = {
					code: 'DEV'
				};
				let info = [
					'x1', 'x2', 'x3'
				];
				return cb(InfraRecord, environmentRecord, info);
			});
			
			utilsStub = sinon.stub(utils, 'buildDeployerOptions', function (environmentRecord, soajs, BL) {
				let output = {
					strategy: 'kubernetes'
				};
				return output;
			});
			
			done();
		});
		
		after(function (done) {
			serviceStub.restore();
			utilsStub.restore();
			done();
		});
		
		it("Success getDNSInfo", function (done) {
			clustersModule.getDNSInfo(config, req, soajs, BL, deployer, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("scaleCluster", function () {
		
		let serviceStub, utilsStub;
		
		before(function (done) {
			serviceStub = sinon.stub(helper, 'getCommonData', function (config, soajs, BL, cbMain, cb) {
				let InfraRecord = {};
				let environmentRecord = {
					code: 'DEV'
				};
				let info = [
					'x1', 'x2', 'x3'
				];
				return cb(InfraRecord, environmentRecord, info);
			});
			
			utilsStub = sinon.stub(utils, 'buildDeployerOptions', function (environmentRecord, soajs, BL) {
				let output = {
					strategy: 'kubernetes'
				};
				return output;
			});
			
			done();
		});
		
		after(function (done) {
			serviceStub.restore();
			utilsStub.restore();
			done();
		});
		
		it("Success scaleCluster", function (done) {
			clustersModule.scaleCluster(config, soajs, BL, deployer, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("getCluster", function () {
		
		let serviceStub, utilsStub;
		
		before(function (done) {
			serviceStub = sinon.stub(helper, 'getCommonData', function (config, soajs, BL, cbMain, cb) {
				let InfraRecord = {};
				let environmentRecord = {
					code: 'DEV'
				};
				let info = [
					'x1', 'x2', 'x3'
				];
				return cb(InfraRecord, environmentRecord, info);
			});
			
			utilsStub = sinon.stub(utils, 'buildDeployerOptions', function (environmentRecord, soajs, BL) {
				let output = {
					strategy: 'kubernetes'
				};
				return output;
			});
			
			done();
		});
		
		after(function (done) {
			serviceStub.restore();
			utilsStub.restore();
			done();
		});
		
		it("Success getCluster", function (done) {
			clustersModule.getCluster(config, soajs, BL, deployer, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("updateCluster", function () {
		
		let serviceStub, utilsStub;
		
		before(function (done) {
			serviceStub = sinon.stub(helper, 'getCommonData', function (config, soajs, BL, cbMain, cb) {
				let InfraRecord = {};
				let environmentRecord = {
					code: 'DEV'
				};
				let info = [
					'x1', 'x2', 'x3'
				];
				return cb(InfraRecord, environmentRecord, info);
			});
			
			utilsStub = sinon.stub(utils, 'buildDeployerOptions', function (environmentRecord, soajs, BL) {
				let output = {
					strategy: 'kubernetes'
				};
				return output;
			});
			
			done();
		});
		
		after(function (done) {
			serviceStub.restore();
			utilsStub.restore();
			done();
		});
		
		it("Success updateCluster", function (done) {
			clustersModule.updateCluster(config, soajs, BL, deployer, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("removeEnvFromDeployment", function () {
		
		let serviceStub, utilsStub;
		
		before(function (done) {
			
			mongoStub.findEntry = function (soajs, opts, cb) {
				cb(null, {
					deployments : [
						{
							environments : ['DEV']
						}
					]
				});
			};
			
			serviceStub = sinon.stub(helper, 'getCommonData', function (config, soajs, BL, cbMain, cb) {
				let InfraRecord = {
					
				};
				let environmentRecord = {
					code: 'DEV'
				};
				let info = [
					'x1', 'x2', 'x3'
				];
				return cb(InfraRecord, environmentRecord, info);
			});
			
			utilsStub = sinon.stub(utils, 'buildDeployerOptions', function (environmentRecord, soajs, BL) {
				let output = {
					strategy: 'kubernetes'
				};
				return output;
			});
			
			done();
		});
		
		after(function (done) {
			serviceStub.restore();
			utilsStub.restore();
			done();
		});
		
		it("Success removeEnvFromDeployment", function (done) {
			clustersModule.removeEnvFromDeployment(config, req, soajs, BL, deployer, function (error, body) {
				done();
			});
		});
		
	});
	
});
