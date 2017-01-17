"use strict";
var assert = require('assert');
var request = require("request");
var extKey = 'aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac';

function executeMyRequest(params, apiPath, method, cb) {
	requester(apiPath, method, params, function (error, body) {
		assert.ifError(error);
		assert.ok(body);
		return cb(body);
	});
	
	function requester(apiName, method, params, cb) {
		var options = {
			uri: 'http://localhost:4000/dashboard/' + apiName,
			headers: {
				'Content-Type': 'application/json',
				key: extKey
			},
			json: true
		};
		
		if (params.headers) {
			for (var h in params.headers) {
				if (params.headers.hasOwnProperty(h)) {
					options.headers[h] = params.headers[h];
				}
			}
		}
		
		if (params.form) {
			options.body = params.form;
		}
		
		if (params.qs) {
			options.qs = params.qs;
		}
		
		request[method](options, function (error, response, body) {
			assert.ifError(error);
			assert.ok(body);
			return cb(null, body);
		});
	}
}

describe("DASHBOARD UNIT Tests:", function () {
	describe("Testing source", function () {
		it("fail - will check input no source", function (done) {
			var params = {
				"form": {
					"data": {
						"input": {"number": 10},
						"imfv": {
							"type": "number"
						}
					}
				}
			};
			executeMyRequest(params, "swagger/simulate", 'post', function (result) {
				assert.ok(result.errors);
				done();
			});
		});
		
		it("fail - will check input invalid source", function (done) {
			var params = {
				"form": {
					"data": {
						"input": {"number": 10},
						"imfv": {
							"number": {
								"source": "body"
							}
						}
					}
				}
			};
			executeMyRequest(params, "swagger/simulate", 'post', function (result) {
				assert.ok(result.errors);
				done();
			});
		});
		
		it("fail - will check input empty source", function (done) {
			var params = {
				"form": {
					"data": {
						"input": {"number": 10},
						"imfv": {
							"number": {
								"source": []
							}
						}
					}
				}
			};
			executeMyRequest(params, "swagger/simulate", 'post', function (result) {
				assert.ok(result.errors);
				done();
			});
		});
	});
	
	describe("Testing simulation api", function () {
		it("success - will check input", function (done) {
			var params = {
				"form": {
					"data": {
						"input": {
							"number": 10
						},
						"imfv": {
							"number": {
								"source": ["body.number"],
								"required": true,
								"validation": {
									"type": "number"
								}
							}
						}
					}
				}
			};
			executeMyRequest(params, "swagger/simulate", 'post', function (result) {
				assert.ok(result.data);
				done();
			});
		});
	});
	
	describe("Testing complex simulation api", function () {
		it("success - will check input", function (done) {
			var params = {
				"form": {
					"data": {
						"input": {
							"number": "xx",
							"flag": "invalid"
						},
						"imfv": {
							"flag": {
								"source": ["body.flag"],
								"required": true,
								"validation": {
									"type": "bool"
								}
							},
							"number": {
								"source": ["body.number"],
								"required": true,
								"validation": {
									"type": "number"
								}
							}
						}
					}
				}
			};
			executeMyRequest(params, "swagger/simulate", 'post', function (result) {
				assert.ok(result.errors);
				done()
			});
		});
	});
	
	describe("Testing missing item simulation api", function () {
		it("success - will check input", function (done) {
			var params = {
				"form": {
					"data": {
						"input": {
							"number": "xx"
						},
						"imfv": {
							"flag": {
								"source": ["body.flag"],
								"required": true,
								"validation": {
									"type": "bool"
								}
							},
							"number": {
								"source": ["body.number"],
								"required": true,
								"validation": {
									"type": "number"
								}
							}
						}
					}
				}
			};
			executeMyRequest(params, "swagger/simulate", 'post', function (result) {
				assert.ok(result.errors);
				done();
				
			});
		});
	});
	
	describe("Testing item with multiple errors", function () {
		it("success - will check input", function (done) {
			var params = {
				"form": {
					"data": {
						"input": {
							"number1": "xx",
							"number2": "xx"
						},
						"imfv": {
							"number1": {
								"source": ["body.number"],
								"required": false,
								"default": 0,
								"validation": {
									"type": "number"
								}
							},
							"number2": {
								"required": true,
								"default": "x",
								"validation": {
									"type": "number"
								}
							},
							"number3": {
								"source": [],
								"required": false,
								"default": "x",
								"validation": {
									"type": "number"
								}
							},
							"number4": {
								"source": "invalid",
								"required": false,
								"default": "1",
								"validation": {
									"type": "number"
								}
							}
						}
					}
				}
			};
			executeMyRequest(params, "swagger/simulate", 'post', function (result) {
				assert.ok(result.errors);
				done();
			});
		});
	});
});
