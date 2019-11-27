"use strict";
const sinon = require('sinon');

const assert = require("assert");
const testHelper = require("../../../../helper.js");
const config = testHelper.requireModule('./config.js');

const infraTemplates = testHelper.requireModule('./lib/cloud/infra/templates.js');
const deployer = testHelper.deployer;

let mongoStub = {
	getDb: function (soajs) {
		return {
			ObjectId: function (id) {
				return {message: "Argument passed in must be a single String of 12 bytes or a string of 24 hex characters"};
			}
		};
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
	findEntries: function (soajs, opts, cb) {
		let data = [];
		if (opts.collection && opts.collection === 'templates') {
			data = [{
				inputs: '[{}]',
				display: '[{}]',
				imfv: '[{}]',
			}];
		}
		cb(null, data);
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	countEntries: function (soajs, opts, cb) {
		if (opts.collection === 'templates') {
			cb(null, 0);
		} else {
			cb(null, true);
		}
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	switchConnection: function (soajs) {
	},
	insertEntry: function (soajs, {}, cb) {
		return cb(null, true);
	},
};
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
					} else {
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
	inputmaskData: {
		templateId: 'test'
	},
	tenant: {}
};
let BL = {
	model: mongoStub
};
let req = {
	soajs: soajs,
	query: {}
};

describe("testing lib/cloud/infra/templates.js", function () {
	let envRecord = {
		code: 'DEV',
		deployer: {
			"type": "container",
			"selected": "container.kubernetes.local",
			"container": {
				"docker": {
					"local": {
						"socketPath": "/var/run/docker.sock"
					},
					"remote": {
						"nodes": ""
					}
				},
				"kubernetes": {
					"local": {
						"nginxDeployType": "",
						"namespace": {},
						"auth": {
							"token": ""
						}
					},
					"remote": {
						"nginxDeployType": "",
						"namespace": {},
						"auth": {
							"token": ""
						}
					}
				}
			}
		},
		dbs: {
			clusters: {
				analy: {
					credentials: {
						username: 'username',
						password: 'password'
					},
					servers: [{port: 123, host: 'host'}]
				},
				oneCluster: {
					servers: []
				}
			},
			config: {
				session: {
					cluster: 'oneCluster'
				}
			}
		},
		services: {},
		profile: ''
	};
	
	before(function (done) {
		sinon.restore();
		done();
	});
	
	describe("getLocalTemplates", function () {
		let oneInfra = {};
		it("Success getLocalTemplates", function (done) {
			infraTemplates.getLocalTemplates(soajs, config, BL, oneInfra, function (error, body) {
				done();
			});
		});
		
		it("Success getLocalTemplates - 2", function (done) {
			oneInfra._id = '123';
			oneInfra.templatesTypes = ['local'];
			infraTemplates.getLocalTemplates(soajs, config, BL, oneInfra, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("getRemoteTemplates", function () {
		let oneInfra = {};
		let options = {};
		it("Error getRemoteTemplates", function (done) {
			infraTemplates.getRemoteTemplates(soajs, config, BL, oneInfra, deployer, options, function (error, body) {
				done();
			});
		});
		
		it("Success getRemoteTemplates", function (done) {
			oneInfra.templatesTypes = ['external'];
			infraTemplates.getRemoteTemplates(soajs, config, BL, oneInfra, deployer, options, function (error, body) {
				done();
			});
		});
		
		it("Success getRemoteTemplates - 2", function (done) {
			oneInfra.templatesTypes = ['external'];
			deployer.execute = function (driverOptions, method, methodOptions, cb) {
				let templates = [{
					type: 'inputsAndDisplay'
				}];
				return cb(null, templates);
			};
			infraTemplates.getRemoteTemplates(soajs, config, BL, oneInfra, deployer, options, function (error, body) {
				deployer.execute = function (driverOptions, method, methodOptions, cb) {
					if (method === 'listKubeServices') {
						return cb(null, [{
							metadata: {
								name: 'heapster',
								namespace: 'kube-system'
							}
						}]);
					} else {
						return cb(null, []);
					}
				};
				done();
			});
		});
		
		it("Success getRemoteTemplates - 3", function (done) {
			oneInfra.templatesTypes = ['external'];
			deployer.execute = function (driverOptions, method, methodOptions, cb) {
				let templates = [];
				if (method === 'getFiles') {
					templates = [{
						id: '1234',
						type: 'template',
						name: 'test',
						tags: {
							template: '1234',
						}
					}];
				} else if (method === 'downloadFile') {
					templates = {
						content: {
							"test": 'test'
						}
					};
				}
				return cb(null, templates);
			};
			soajs.inputmaskData.fullTemplate = 'test';
			
			infraTemplates.getRemoteTemplates(soajs, config, BL, oneInfra, deployer, options, function (error, body) {
				deployer.execute = function (driverOptions, method, methodOptions, cb) {
					if (method === 'listKubeServices') {
						return cb(null, [{
							metadata: {
								name: 'heapster',
								namespace: 'kube-system'
							}
						}]);
					} else {
						return cb(null, []);
					}
				};
				done();
			});
		});
		
	});
	
	describe("removeTemplate", function () {
		it("Success removeTemplate", function (done) {
			infraTemplates.removeTemplate(config, soajs, BL, deployer, function (error, body) {
				done();
			});
		});
		
		it("Success removeTemplate -2", function (done) {
			infraTemplates.removeTemplate(config, soajs, BL, deployer, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("addTemplate", function () {
		it("Success addTemplate", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				let InfraRecord = {
					'_id': 1234,
					templates: 'local'
				};
				cb(null, InfraRecord);
			};
			soajs.inputmaskData = {
				template: {
					textMode: true,
					driver: {},
					technology: 'vm',
					name: 'test',
					description: 'test',
					display: {},
					imfv: {},
					inputs: {},
					tags: {},
				}
			};
			infraTemplates.addTemplate(config, soajs, BL, function (error, body) {
				done();
			});
		});
		
		it("Success addTemplate - 2", function (done) {
			mongoStub.count = function (soajs, opts, cb) {
				let InfraRecord = {
					templates: [],
					'_id': 1234,
				};
				cb(null, InfraRecord);
			};
			infraTemplates.addTemplate(config, soajs, BL, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("updateTemplate", function () {
		it("Success updateTemplate", function (done) {
			infraTemplates.updateTemplate(config, soajs, BL, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("uploadTemplate", function () {
		it("Success uploadTemplate", function (done) {
			mongoStub.findEntry = function (soajs, opts, cb) {
				let InfraRecord = {
					templates: []
				};
				cb(null, InfraRecord);
			};
			infraTemplates.uploadTemplate(config, req, soajs, BL, deployer, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("uploadTemplateInputsFile", function () {
		it("Success uploadTemplateInputsFile", function (done) {
			soajs.inputmaskData.inputs = [
				{
					name: '1'
				}
			];
			soajs.inputmaskData.display = [
				{
					name: '1'
				}
			];
			mongoStub.findEntry = function (soajs, opts, cb) {
				let InfraRecord = {
					_id: '123',
					templates: ['external']
				};
				cb(null, InfraRecord);
			};
			
			infraTemplates.uploadTemplateInputsFile(config, req, soajs, BL, deployer, function (error, body) {
				done();
			});
		});
		
	});
	
	describe("downloadTemplate", function () {
		let res = {};
		it("Success downloadTemplate", function (done) {
			soajs.inputmaskData.templateId = '123';
			soajs.inputmaskData.returnRawData = true;
			deployer.execute = function (opts, method, {}, cb) {
				if (method === 'getFiles') {
					return cb(null, [{
						type: 'template',
						id: '123'
					}]);
				} else {
					return cb(null, {
						content: {}
					});
				}
			};
			infraTemplates.downloadTemplate(config, soajs, BL, deployer, res, function (error, body) {
				done();
			});
		});
	});
	
	describe("buildTemplateRawRecord", function () {
		let res = {};
		it("Success buildTemplateRawRecord", function (done) {
			soajs.inputmaskData.templateId = 'test';
			
			let downloadedFiles = [{
				fileName: 'test',
				data: {
					inputs: [],
					display: [],
					imfv: [],
				},
				record: {
					id: '',
					name: '',
					description: '',
					driver: '',
					technology: '',
					tags: '',
				},
			}];
			infraTemplates.buildTemplateRawRecord(soajs, downloadedFiles);
			done();
		});
		
		it("Success buildTemplateRawRecord", function (done) {
			soajs.inputmaskData.templateId = 'test';
			let downloadedFiles = [{
				fileName: 'comp__test',
				data: {
					inputs: [],
					display: [],
					imfv: [],
				},
				record: {
					id: '',
					name: '',
					description: '',
					driver: '',
					technology: '',
					tags: '',
				},
			}];
			infraTemplates.buildTemplateRawRecord(soajs, downloadedFiles);
			done();
		});
		
	});
	
});
