"use strict";

//todo: check unused
const assert = require("assert");
const fs = require("fs");
const request = require("request");

const helper = require("../../../helper.js");
const coreModules = require("soajs.core.modules");
const core = coreModules.core;
const async = require('async');
let template = require('./schema/template.js');
const cdIndex = helper.requireModule('./lib/templates/drivers/cd.js');

let mongoStub = {
	model: {
		checkForMongo: function (soajs) {
			return true;
		},
		validateId: function (soajs, cb) {
			return cb(null, soajs.inputmaskData.id);
		},
		findEntries: function (soajs, opts, cb) {
			let cdRecord = [{
				"_id": '5aba44f1ad30ac676a02d650',
				"provider": "travis",
				"type": "recipe",
				"name": "My Custom Recipe",
				"recipe": {
					"buildOptions": {
						"env": {
							"env1": {
								"type": "static",
								"value": "production"
							},
							"env2": {
								"type": "userInput",
								"default": "production"
							},
						}
					}
				},
				"sha": "1234"
			}];
			return cb(null, cdRecord);
		},
		findEntry: function (soajs, opts, cb) {
			if (opts.collection === 'services') {
				let originalServiceRecord = {
					name: 'test',
					src: {
						repo: 'test',
						owner: 'test'
					}
				};
				cb(null, originalServiceRecord);
			} else {
				cb(); // todo if needed
			}
			
		},
		updateEntry: function (soajs, opts, cb) {
			cb(null, true);
		},
		removeEntry: function (soajs, opts, cb) {
			cb(null, true);
		},
		saveEntry: function (soajs, opts, cb) {
			cb(null, true);
		},
		initConnection: function (soajs) {
			return true;
		},
		closeConnection: function (soajs) {
			return true;
		},
		validateCustomId: function (soajs) {
			return true;
		},
		countEntries: function (soajs, opts, cb) {
			return cb(null, true);
		},
		find: function (soajs, opts, cb) {
			return cb(null, [{
				"_id": '5aba44f1ad30ac676a02d650',
				"provider": "travis",
				"type": "recipe",
				"name": "My Custom Recipe",
				"recipe": "sudo something",
				"locked": true,
				"sha": "1234"
			}]);
		},
		getDb: function (data) {
			return {
				ObjectId: function () {
					return ['123qwe'];
				}
			};
		}
	},
	
};
let req = {};
let context = {
	config: {
		schema: {
			post: {
				"/catalog/recipes/add": {
					"catalog": {
						"validation": {
							"type": "object",
							"required": true,
							"additionalProperties": false,
							"properties": {
								"name": {"type": "string", "required": true},
								"locked": {"type": "boolean", "required": false},
								"active": {"type": "boolean", "required": false},
								"type": {"type": "string", "required": true},
								"subtype": {"type": "string", "required": false},
								"description": {"type": "string", "required": true},
								"recipe": {
									"type": "object",
									"required": true,
									"additionalProperties": false,
									"properties": {
										"deployOptions": {
											"type": "object",
											"required": true,
											"properties": {
												"namespace": {
													"type": "string",
													"required": false
												},
												"image": {
													"type": "object",
													"required": false,
													"properties": {
														"prefix": {"type": "string", "required": false},
														"name": {"type": "string", "required": true},
														"tag": {"type": "string", "required": true},
														"pullPolicy": {"type": "string", "required": false}
													}
												},
												
												"readinessProbe": {
													"type": "object",
													"required": false
													//NOTE: removed validation for readinessProbe to allow free schema
												},
												"ports": {
													"type": "array",
													"required": false,
													"items": {
														"type": "object",
														"additionalProperties": false,
														"properties": {
															"name": {"type": "string", "required": true},
															"isPublished": {"type": "boolean", "required": false},
															"port": {"type": "number", "required": false},
															"target": {"type": "number", "required": true},
															"published": {"type": "number", "required": false},
															"preserveClientIP": {"type": "boolean", "required": false}
														}
													}
												},
												"voluming": {
													"type": "array",
													"required": false,
													"items": {
														"docker": {
															"type": "object",
															"required": true,
															"properties": {
																"volume": {
																	"type": "object",
																	"required": true,
																	"validation": {
																		"type": "object"
																	}
																}
															}
														},
														"kubernetes": {
															"type": "object",
															"required": true,
															"properties": {
																"volume": {
																	"type": "object",
																	"required": true,
																	"validation": {
																		"type": "object"
																	}
																},
																"volumeMount": {
																	"type": "object",
																	"required": true,
																	"validation": {
																		"type": "object"
																	}
																}
															}
														}
													}
												},
												"labels": {
													"type": "object",
													"required": false
												},
												"serviceAccount": {
													"type": "object",
													"required": false
												},
												"certificates": {
													"type": "string",
													"required": true,
													"enum": ["none", "optional", "required"]
												}
											}
										},
										"buildOptions": {
											"type": "object",
											"required": false,
											"additionalProperties": false,
											"properties": {
												"settings": {
													"type": "object",
													"required": false,
													"properties": {
														"accelerateDeployment": {"type": "boolean", "required": false}
													}
												},
												"env": {
													"type": "object",
													"required": false,
													"additionalProperties": {
														"type": "object",
														"properties": {
															"type": {
																"type": "string",
																"required": true,
																"enum": ["static", "userInput", "computed"]
															},
															"label": {"type": "string", "required": false},
															"fieldMsg": {"type": "string", "required": false},
															"default": {"type": "string", "required": false}
														}
													}
												},
												"cmd": {
													"type": "object",
													"required": false,
													"additionalProperties": false,
													"properties": {
														"deploy": {
															"type": "object",
															"required": true,
															"additionalProperties": false,
															"properties": {
																"command": {"type": "array", "required": true},
																"args": {"type": "array", "required": true}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				},
			}
		},
		HA: {
			blacklist: ["dummy data for test"]
		}
	},
	template: template,
	errors: [],
	dbData: {},
};

let cdModel = {
	add: function (context, opts, cb) {
		return cb(null, true);
	}
};

const lib = {
	initBLModel: function (module, cb) {
		return cb(null, cdModel);
	},
	checkReturnError: function (req, mainCb, data, cb) {
		if (data.error) {
			if (typeof (data.error) === 'object') {
				req.soajs.log.error(data.error);
			}
			return mainCb({"code": data.code, "msg": data.config.errors[data.code]});
		} else {
			if (cb) {
				return cb();
			}
		}
	}
};

req.soajs = {};
req.soajs.validator = core.validator;


describe("Testing cd", function () {
	
	it("Success - check cd recipe -- valid template", function (done) {
		req.soajs.validator = {
			Validator: function () {
				return {
					validate: function () {
						return {
							valid: true,
						};
					}
				};
			}
		};
		cdIndex.check(req, context, lib, async, mongoStub, function (result, error) {
			done();
		});
	});
	
	it("Fail - check cd recipe -- Same name", function (done) {
		mongoStub.model.countEntries = function (soajs, opts, cb) {
			return cb(null, 1);
		};
		cdIndex.check(req, context, lib, async, mongoStub, function (result, error) {
			done();
		});
	});
	
	it("Success - save cd recipe", function (done) {
		cdIndex.save(req, context, lib, async, mongoStub, function (result, error) {
			done();
		});
	});
	
	it("Success - merge cd recipe", function (done) {
		req.soajs.inputmaskData = {
			correction: {
				catalogs: [{"old": "DAAS Service Recipe1", "new": "Test Recipe", "provider": "travis"}]
			}
		};
		cdIndex.merge(req, context, lib, async, mongoStub, function (result, error) {
			done();
		});
	});
	
	it("Success - export cd recipe", function (done) {
		req.soajs.inputmaskData = {
			deployment: ["123qwe"]
		};
		req.soajs.servicesConfig = {
			dashboard: {
				HA: {
					blacklist: ["env1", "env2"]
				}
			}
		};
		cdIndex.export(req, context, lib, async, mongoStub, function (result, error) {
			done();
		});
	});
	
	it("Fail - check cd recipe -- invalid template", function (done) {
		req.soajs.validator = {
			Validator: function () {
				return {
					validate: function () {
						return {
							errors: ["this is an error for test"]
						};
					}
				};
			}
		};
		
		cdIndex.check(req, context, lib, async, mongoStub, function (result, error) {
			done();
		});
	});
	
	it("Success - Check - no cd recipe", function (done) {
		let newContext = JSON.parse(JSON.stringify(context));
		newContext.template.content.recipes = {};
		cdIndex.check(req, newContext, lib, async, mongoStub, function (result, error) {
			done();
		});
	});
	
	it("Success -  Save - no cd recipe", function (done) {
		let newContext = JSON.parse(JSON.stringify(context));
		newContext.template.content.recipes = {};
		cdIndex.save(req, newContext, lib, async, mongoStub, function (result, error) {
			done();
		});
	});
	
	it("Success - Export -  no cd recipe", function (done) {
		req.soajs.inputmaskData = {};
		cdIndex.export(req, context, lib, async, mongoStub, function (result, error) {
			done();
		});
	});
});
