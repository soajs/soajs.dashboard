"use strict";
const assert = require("assert");
const helper = require("../../../helper.js");
const helpers = helper.requireModule('./lib/hosts/helper.js');

let mongoStub = {
	checkForMongo: function (soajs) {
		return true;
	},
	validateId: function (soajs, cb) {
		return cb(null, soajs.inputmaskData.id);
	},
	findEntry: function (soajs, opts, cb) {
		cb(null, {metadata: {}});
	},
	removeEntry: function (soajs, opts, cb) {
		cb(null, true);
	},
	saveEntry: function (soajs, opts, cb) {
		cb(null, true);
	}
};

describe("testing helper host.js", function () {
	let soajs = {
		// uracDriver: {},
		inputmaskData: {},
		tenant: {
			application: {
				acl_all_env: {
					dashboard: {
						dashboard: {
							access: false
						},
						proxy: {}
					}
				},
				acl: {
					urac: {
						access: false
					}
				},
				package_acl_all_env: {}
			}
		}
	};
	
	describe("getTenants", function () {
		let output;
		beforeEach(() => {
			output = {
				dashboard: {},
				dev: {
					domain: 'api.api.myDomain.com'
				}
			};
			mongoStub.findEntries = function (soajs, opts, cb) {
				let tenants = [
					{
						_id: '',
						code: '',
						applications: [
							{
								keys: [
									{
										extKeys: []
									}
								]
							}
						]
					}
				];
				cb(null, tenants);
			};
		});
		
		it("Success getTenants with acl_all_env", function (done) {
			helpers.getTenants(soajs, output, mongoStub, function (error, body) {
				done();
			});
		});
		
		it("Success getTenants with acl 1", function (done) {
			soajs.tenant.application = {
				acl: {
					dashboard: {
						access: false,
						apisPermission: 'restricted',
						get: {
							apis: {
								"/tenant/list": {}
							}
						}
					},
					urac: {
						access: false
					}
				},
				package_acl_all_env: {}
			};
			
			helpers.getTenants(soajs, output, mongoStub, function (error, body) {
				done();
			});
		});
		
		it("Success getTenants with acl 2", function (done) {
			soajs.tenant.application = {
				acl: {
					dashboard: {
						access: false,
						apisPermission: 'restricted',
						get: {}
					},
					urac: {
						access: false
					}
				},
				package_acl_all_env: {}
			};
			
			helpers.getTenants(soajs, output, mongoStub, function (error, body) {
				done();
			});
		});
		
		it("Success getTenants with acl 3", function (done) {
			soajs.tenant.application = {
				acl: {
					dashboard: {
						access: true,
						apisPermission: 'restricted',
						get: {
							apis: {
								"/tenant/list": {
									access: []
								}
							}
						}
					},
					urac: {
						access: false
					}
				},
				package_acl_all_env: {}
			};
			
			helpers.getTenants(soajs, output, mongoStub, function (error, body) {
				done();
			});
		});
		
		it("Success getTenants with package_acl_all_env", function (done) {
			soajs.tenant.application = {
				package_acl_all_env: {
					dashboard: {
						access: false,
						apis: {}
					},
					dev: {
						urac: {
							access: false
						}
					}
				}
			};
			let output = {
				dashboard: {},
				dev: {
					domain: 'api.api.myDomain.com'
				}
			};
			
			helpers.getTenants(soajs, output, mongoStub, function (error, body) {
				done();
			});
		});
		
		it("Success getTenants with package_acl", function (done) {
			soajs.tenant.application = {
				package_acl: {
					dashboard: {
						access: false,
						apisRegExp: [
							{
								"regExp": /^\/admin\/.+$/,
								"access": true
							}
						]
					},
					urac: {
						access: false
					}
				}
			};
			
			helpers.getTenants(soajs, output, mongoStub, function (error, body) {
				done();
			});
		});
		
		it("Success getTenants with user acl", function (done) {
			soajs.uracDriver = {
				getAcl: function () {
					return {
						dashboard: {
							access: true,
							apisPermission: 'restricted',
							get: {
								apis: {
									"/tenant/list": {
										access: ['gold']
									}
								}
							}
						},
						urac: {
							access: false
						}
					};
				},
				getProfile: function () {
					return {
						groups: ['gold']
					};
				}
			};
			soajs.tenant.application = {
				acl: {},
				package_acl_all_env: {}
			};
			
			helpers.getTenants(soajs, output, mongoStub, function (error, body) {
				done();
			});
		});
		
	});
	
});