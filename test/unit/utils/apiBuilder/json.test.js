"use strict";
const assert = require("assert");
const helper = require("../../../helper.js");
const json = helper.requireModule('./utils/apiBuilder/json.js');

let schemaMultipleSource = {
	get: {
		"/example1": {
			_apiInfo: {},
			imfv: {
				custom: {
					input1: {
						source: ['query.input1', 'body.input1']
					}
				},
				commonFields: []
			}
		}
	}
};


let schemaMultipleSourceInCommonFields = {
	commonFields: {
		input1: {
			source: ['query.input1', 'body.input1']
		}
	},
	get: {
		"/example1": {
			_apiInfo: {},
			imfv: {
				custom: {},
				commonFields: []
			}
		}
	}
};

let schemaMultipleBodies = {
	get: {
		"/example1": {
			_apiInfo: {},
			imfv: {
				custom: {
					input1: {
						source: ['body.input1']
					},
					input2: {
						source: ['body.input2']
					}
				},
				commonFields: []
			}
		}
	}
};

let schemaMultipleBodiesInCommon = {
	commonFields: {
		input2: {
			source: ['body.input2']
		}
	},
	get: {
		"/example1": {
			_apiInfo: {},
			imfv: {
				custom: {
					input1: {
						source: ['body.input1']
					}
				},
				commonFields: ['input2']
			}
		}
	}
};

let schemaComplex = {
	"commonFields": {
		"id": {
			"required": true,
			"source": [
				"params.id"
			],
			"description": "Pet mongo id",
			"validation": {
				"type": "string"
			}
		},
		"testInParams": {
			"required": true,
			"source": [
				"body.test"
			],
			"description": "Pet object that needs to be added to the store",
			"validation": {
				"type": "object",
				"properties": {
					"breed": {
						"required": false,
						"type": "string"
					},
					"name": {
						"required": false,
						"type": "string"
					},
					"subObjExample": {
						"required": false,
						"type": "object",
						"properties": {
							"sub2": {
								"required": false,
								"type": "object",
								"properties": {
									"sub3": {
										"required": false,
										"type": "string"
									}
								}
							},
							"level2int": {
								"required": false,
								"type": "integer"
							},
							"level2arraystring": {
								"required": false,
								"type": "array",
								"items": {
									"type": "string"
								}
							},
							"level2arrayobj": {
								"required": false,
								"type": "array",
								"items": {
									"type": "object",
									"properties": {
										"arraySubInt": {
											"required": false,
											"type": "integer"
										},
										"arraySubObj": {
											"required": false,
											"type": "object",
											"properties": {
												"levelN": {
													"required": false,
													"type": "string"
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
	"post": {
		"/pet": {
			"_apiInfo": {
				"group": "pet",
				"l": "Add a new pet to the store"
			},
			"imfv": {
				"custom": {},
				"commonFields": [
					"testInParams"
				]
			}
		},
		"/testArrayRoot": {
			"_apiInfo": {
				"group": "pets",
				"l": "get all pets"
			},
			"imfv": {
				"custom": {
					"input": {
						"required": true,
						"source": [
							"body.input"
						],
						"description": "Pet object that needs to be added to the store",
						"validation": {
							"type": "array",
							"items": {
								"type": "object",
								"properties": {
									"sss": {
										"required": false,
										"type": "string"
									}
								}
							}
						}
					}
				}
			}
		}
	},
	"delete": {
		"/pet/:id": {
			"_apiInfo": {
				"group": "pet",
				"l": "delete a pet by id"
			},
			"imfv": {
				"custom": {
					"testInDef": {
						"required": [
							"breed",
							"name"
						],
						"description": "Pet object that needs to be added to the store",
						"validation": {
							"type": "object",
							"properties": {
								"breed": {
									"required": true,
									"type": "string"
								},
								"name": {
									"required": true,
									"type": "boolean"
								},
								"subObjExample": {
									"required": false,
									"type": "object",
									"properties": {
										"sub2": {
											"required": false,
											"type": "object",
											"properties": {
												"sub3": {
													"required": false,
													"type": "string"
												}
											}
										},
										"level2int": {
											"required": false,
											"type": "integer"
										},
										"level2arraystring": {
											"required": false,
											"type": "array",
											"items": {
												"type": "string"
											}
										},
										"level2arrayobj": {
											"required": false,
											"type": "array",
											"items": {
												"type": "object",
												"properties": {
													"arraySubInt": {
														"required": false,
														"type": "integer"
													},
													"arraySubObj": {
														"required": false,
														"type": "object",
														"properties": {
															"levelN": {
																"required": false,
																"type": "string"
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
				}
			}
		}
	},
	"put": {
		"/pet/:id": {
			"_apiInfo": {
				"group": "pet",
				"l": "Update an existing pet"
			},
			"imfv": {
				"custom": {
					"inputString": {
						"required": true,
						"source": [
							"params.inputString"
						],
						"description": "Pet object that needs to be added to the store",
						"validation": {
							"type": "string"
						}
					},
					"inputString2": {
						"required": true,
						"source": [
							"headers.inputString2"
						],
						"description": "Pet object that needs to be added to the store",
						"validation": {
							"type": "string"
						}
					},
					"testDirect": {
						"required": true,
						"source": [
							"body.testDirect"
						],
						"description": "Pet object that needs to be added to the store",
						"validation": {
							"type": "object",
							"properties": {
								"breed": {
									"required": false,
									"type": "string"
								},
								"name": {
									"required": false,
									"type": "string"
								},
								"subObjExample": {
									"required": false,
									"type": "object",
									"properties": {
										"sub2": {
											"required": false,
											"type": "object",
											"properties": {
												"sub3": {
													"required": false,
													"type": "string"
												}
											}
										},
										"level2int": {
											"required": false,
											"type": "integer"
										},
										"level2arraystring": {
											"required": false,
											"type": "array",
											"items": {
												"type": "string"
											}
										},
										"level2arrayobj": {
											"required": false,
											"type": "array",
											"items": {
												"type": "object",
												"properties": {
													"arraySubInt": {
														"required": false,
														"type": "integer"
													},
													"arraySubObj": {
														"required": false,
														"type": "object",
														"properties": {
															"levelN": {
																"required": false,
																"type": "string"
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
				"commonFields": [
					"id"
				]
			}
		}
	},
	"get": {
		"/pets": {
			"_apiInfo": {
				"group": "pets",
				"l": "get all pets"
			},
			"imfv": {
				"custom": {}
			}
		}
	}
};

describe("JSON to Swagger Utilities", function () {
	
	describe("Parse Json", function () {
		
		it("Fail - Error parsing yaml", function (done) {
			let serviceRecord = {};
			json.parseJson('services', {}, serviceRecord, function (error, yamlString) {
				assert.equal(851, error.code);
				done();
			});
		});
		
		it("Success - targeting different types of inputs", function (done) {
			let serviceRecord = {};
			json.parseJson('endpoints', schemaComplex, serviceRecord, function (error, yamlString) {
				assert.ok(yamlString);
				done();
			});
		});
	});
	
	describe("Pre Parse Validation", function () {
		
		it("Fail - Schema with multiple source", function (done) {
			json.preParseValidation(schemaMultipleSource, function (error) {
				let expectedMessage = "Swagger doesn't support multiple sources for inputs; detected in API [get /example1] inputs [input1] with multiple sources. Please reduce sources to one for these inputs to sync with swagger";
				assert.equal(error, expectedMessage);
				done();
			});
		});
		
		it("Fail - Schema with multiple source in common fields", function (done) {
			json.preParseValidation(schemaMultipleSourceInCommonFields, function (error) {
				let expectedMessage = "Swagger doesn't support multiple sources for inputs; detected inputs in common fields [input1] with multiple sources. Please reduce sources to one for these inputs to sync with swagger";
				assert.equal(error, expectedMessage);
				done();
			});
		});
		
		it("Fail - multiple inputs from body", function (done) {
			json.preParseValidation(schemaMultipleBodies, function (error) {
				let expectedMessage = "Swagger doesn't support multiple inputs from body, detected in API [get /example1] multiple inputs in bodies. Please consolidate these inputs under one input (type object) to sync with swagger.";
				assert.equal(error, expectedMessage);
				done();
			});
		});
		
		
		it("Fail - multiple inputs from body in custom and in common field", function (done) {
			json.preParseValidation(schemaMultipleBodiesInCommon, function (error) {
				let expectedMessage = "Swagger doesn't support multiple inputs from body, detected in API [get /example1] multiple inputs in bodies. Please consolidate these inputs under one input (type object) to sync with swagger.";
				assert.equal(error, expectedMessage);
				done();
			});
		});
		
		it("Success", function (done) {
			json.preParseValidation({}, function (error) {
				assert.ok(!error);
				done();
			});
		});
		
		it("Success", function (done) {
			json.preParseValidation(null, function (error) {
				assert.ok(!error);
				done();
			});
		});
	});
});