/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

"use strict";
const async = require('async');
const soajsLib = require("soajs.core.libs");

let helper = {
	buildAclServicePreviewScope: function (services, scope, inputmaskData, cb) {
		let acl = [];
		async.each(services, function (service, callback) {
			if (service.versions && Object.keys(service.versions).length > 0) {
				for (let v in service.versions) {
					if (v && service.versions.hasOwnProperty(v)) {
						let temp = {
							service: service.name,
							version: soajsLib.version.unsanitize(v),
							envs: {
								[inputmaskData.mainEnv]: false
							},
							restriction: {
								[inputmaskData.mainEnv]: true,
							},
							access: {
								[inputmaskData.mainEnv]: true,
							},
						};
						if (inputmaskData.secEnv) {
							temp.envs[inputmaskData.secEnv] = false;
							temp.restriction[inputmaskData.secEnv] = true;
							temp.access[inputmaskData.secEnv] = true;
						}
						if (scope.acl) {
							if (scope.acl[inputmaskData.mainEnv] &&
								scope.acl[inputmaskData.mainEnv][service.name] &&
								scope.acl[inputmaskData.mainEnv][service.name][v]) {
								temp.envs[inputmaskData.mainEnv] = true;
								temp.access[inputmaskData.mainEnv] = !!scope.acl[inputmaskData.mainEnv][service.name][v].access;
								temp.restriction[inputmaskData.mainEnv] = scope.acl[inputmaskData.mainEnv][service.name][v].apisPermission === "restricted";
							}
							if (inputmaskData.secEnv && scope.acl[inputmaskData.secEnv] &&
								scope.acl[inputmaskData.secEnv][service.name] &&
								scope.acl[inputmaskData.secEnv][service.name][v]) {
								temp.envs[inputmaskData.secEnv] = true;
								temp.access[inputmaskData.secEnv] = !!scope.acl[inputmaskData.secEnv][service.name][v].access;
								temp.restriction[inputmaskData.secEnv] = scope.acl[inputmaskData.secEnv][service.name][v].apisPermission === "restricted";
							}
						}
						acl.push(temp)
					}
				}
			}
			callback();
		}, function () {
			return cb(acl)
		});
	},
	
	buildAclApiPreviewScope: function (services, scope, inputmaskData, cb) {
		let acl = [];
		async.each(services, function (service, serviceCall) {
			if (service.versions && Object.keys(service.versions).length > 0) {
				async.forEachOf(service.versions, function (version, v, versionCall) {
					async.each(version.apis, function (api, call) {
							let temp = {
								service: service.name,
								version: soajsLib.version.unsanitize(v),
								group: api.group,
								method: api.m,
								api: api.v,
								envs: {
									[inputmaskData.mainEnv]: false
								},
								access: {
									[inputmaskData.mainEnv]: false,
								},
								restriction: {
									[inputmaskData.mainEnv]: false,
								},
							};
							if (inputmaskData.secEnv) {
								temp.envs[inputmaskData.secEnv] = false;
								temp.access[inputmaskData.secEnv] = false;
								temp.restriction[inputmaskData.secEnv] = false;
							}
							
							if (scope.acl) {
								if (scope.acl[inputmaskData.mainEnv] &&
									scope.acl[inputmaskData.mainEnv][service.name] &&
									scope.acl[inputmaskData.mainEnv][service.name][v]) {
									if (scope.acl[inputmaskData.mainEnv][service.name][v].apisPermission !== "restricted") {
										temp.restriction[inputmaskData.mainEnv] = false;
									}
									if (scope.acl[inputmaskData.mainEnv][service.name][v].apisPermission === "restricted") {
										temp.restriction[inputmaskData.mainEnv] = true;
									}
									temp.access[inputmaskData.mainEnv] = !!scope.acl[inputmaskData.mainEnv][service.name][v].access;
									if (scope.acl[inputmaskData.mainEnv][service.name][v][api.m]) {
										async.each(scope.acl[inputmaskData.mainEnv][service.name][v][api.m], function (method, methodMainCall) {
											if (method.group === api.group) {
												if (method.apis && method.apis[api.v]) {
													temp.envs[inputmaskData.mainEnv] = true;
													if (method.apis[api.v].hasOwnProperty("access")) {
														temp.access[inputmaskData.mainEnv] = method.apis[api.v].access;
													}
												}
											}
											if (temp.envs[inputmaskData.mainEnv]) {
												if (scope.acl[inputmaskData.secEnv] &&
													scope.acl[inputmaskData.secEnv][service.name] &&
													scope.acl[inputmaskData.secEnv][service.name][v]) {
													if (scope.acl[inputmaskData.secEnv][service.name][v].apisPermission !== "restricted") {
														temp.restriction[inputmaskData.secEnv] = false;
														temp.envs[inputmaskData.secEnv] = true;
													}
													if (scope.acl[inputmaskData.secEnv][service.name][v].apisPermission === "restricted") {
														temp.restriction[inputmaskData.secEnv] = true;
													}
													
													temp.access[inputmaskData.secEnv] = !!scope.acl[inputmaskData.secEnv][service.name][v].access;
													async.each(scope.acl[inputmaskData.secEnv] &&
														scope.acl[inputmaskData.secEnv][service.name][v][api.m], function (method, methodSecCall) {
														if (method.group === api.group) {
															if (method.apis && method.apis[api.v]) {
																temp.envs[inputmaskData.secEnv] = true;
																if (method.apis[api.v].hasOwnProperty("access")) {
																	temp.access[inputmaskData.secEnv] = method.apis[api.v].access;
																}
															}
														}
														methodSecCall();
													}, () => {
														methodMainCall();
													});
												} else {
													methodMainCall();
												}
											} else {
												methodMainCall();
											}
										}, () => {
											if (temp.envs[inputmaskData.mainEnv]) {
												acl.push(temp);
											}
											call();
										});
									} else {
										call();
									}
								} else {
									call();
								}
							} else {
								call();
							}
						},
						function () {
							versionCall();
						});
				}, function () {
					serviceCall();
				});
			} else {
				serviceCall();
			}
		}, function () {
			return cb(acl);
		});
	},
	
	updateApiAclScope: function (scope, acl, env, cb) {
		async.each(acl, function (oneService, callback) {
			oneService.version = soajsLib.version.sanitize(oneService.version);
			
			if (scope.acl && scope.acl[env] && scope.acl[env][oneService.service] &&
				scope.acl[env][oneService.service][oneService.version]) {
				if (oneService.envs[env]) {
					if (!scope.acl[env][oneService.service][oneService.version][oneService.method]) {
						scope.acl[env][oneService.service][oneService.version][oneService.method] = [];
						scope.acl[env][oneService.service][oneService.version][oneService.method].push({
							group: oneService.group,
							apis: {
								[oneService.api]: {
									access: oneService.access[env]
								}
							}
						});
					} else {
						let found = false;
						scope.acl[env][oneService.service][oneService.version][oneService.method].forEach((oneGroup) => {
							if (oneGroup.group === oneService.group && oneGroup.apis && oneGroup.apis[oneService.api]) {
								oneGroup.apis[oneService.api].access = oneService.access[env];
								found = true;
							}
						});
						if (!found) {
							scope.acl[env][oneService.service][oneService.version][oneService.method].push({
								group: oneService.group,
								apis: {
									[oneService.api]: {
										access: oneService.access[env]
									}
								}
							});
						}
					}
				} else {
					for (let i = scope.acl[env][oneService.service][oneService.version][oneService.method].length - 1; i >= 0; i--) {
						if (scope.acl[env][oneService.service][oneService.version][oneService.method][i].group === oneService.group &&
							scope.acl[env][oneService.service][oneService.version][oneService.method][i].apis &&
							scope.acl[env][oneService.service][oneService.version][oneService.method][i].apis[oneService.api]) {
							delete 	scope.acl[env][oneService.service][oneService.version][oneService.method][i].apis[oneService.api];
							if (Object.keys(scope.acl[env][oneService.service][oneService.version][oneService.method][i].apis).length === 0){
								scope.acl[env][oneService.service][oneService.version][oneService.method].splice(i, 1);
							}
						}
					}
					if (scope.acl[env][oneService.service][oneService.version][oneService.method].length === 0){
						delete scope.acl[env][oneService.service][oneService.version][oneService.method];
					}
				}
				
			}
			callback();
		}, function () {
			return cb(scope.acl);
		});
	},
	
	updateServiceAclScope: function (scope, acl, env, cb) {
		
		async.each(acl, function (oneService, callback) {
			oneService.version = soajsLib.version.sanitize(oneService.version);
			if (!scope.acl[env]) {
				scope.acl[env] = {};
			}
			if (oneService.envs[env]) {
				if (!scope.acl[env][oneService.service]) {
					scope.acl[env][oneService.service] = {};
				}
				if (!scope.acl[env][oneService.service][oneService.version]) {
					scope.acl[env][oneService.service][oneService.version] = {};
				}
				scope.acl[env][oneService.service][oneService.version].access = oneService.access[env];
				if (oneService.restriction[env]) {
					scope.acl[env][oneService.service][oneService.version].apisPermission = "restricted";
				} else {
					delete scope.acl[env][oneService.service][oneService.version].apisPermission;
				}
				
			} else if (oneService.hasOwnProperty("envs")) {
				delete scope.acl[env][oneService.service];
			}
			callback();
		}, function () {
			return cb(scope.acl);
		});
	},
	
	buildAclServicePreview: function (services, pack, inputmaskData, cb) {
		let acl = [];
		async.each(services, function (service, callback) {
			if (service.versions && Object.keys(service.versions).length > 0) {
				for (let v in service.versions) {
					if (v && service.versions.hasOwnProperty(v)) {
						let temp = {
							service: service.name,
							version: soajsLib.version.unsanitize(v),
							envs: {
								[inputmaskData.mainEnv]: false
							},
							restriction: {
								[inputmaskData.mainEnv]: true,
							},
							access: {
								[inputmaskData.mainEnv]: true,
							},
						};
						if (inputmaskData.secEnv) {
							temp.envs[inputmaskData.secEnv] = false;
							temp.restriction[inputmaskData.secEnv] = true;
							temp.access[inputmaskData.secEnv] = true;
						}
						if (pack.acl) {
							if (pack.acl[inputmaskData.mainEnv] &&
								pack.acl[inputmaskData.mainEnv][service.name] &&
								pack.acl[inputmaskData.mainEnv][service.name][v]) {
								temp.envs[inputmaskData.mainEnv] = true;
								temp.access[inputmaskData.mainEnv] = !!pack.acl[inputmaskData.mainEnv][service.name][v].access;
								temp.restriction[inputmaskData.mainEnv] = pack.acl[inputmaskData.mainEnv][service.name][v].apisPermission === "restricted";
							}
							if (inputmaskData.secEnv && pack.acl[inputmaskData.secEnv] &&
								pack.acl[inputmaskData.secEnv][service.name] &&
								pack.acl[inputmaskData.secEnv][service.name][v]) {
								temp.envs[inputmaskData.secEnv] = true;
								temp.access[inputmaskData.secEnv] = !!pack.acl[inputmaskData.secEnv][service.name][v].access;
								temp.restriction[inputmaskData.secEnv] = pack.acl[inputmaskData.secEnv][service.name][v].apisPermission === "restricted";
							}
						}
						acl.push(temp)
					}
				}
			}
			callback();
		}, function () {
			return cb(acl)
		});
	},
	
	buildAclApiPreview: function (services, pack, inputmaskData, cb) {
		let acl = [];
		async.each(services, function (service, serviceCall) {
			if (service.versions && Object.keys(service.versions).length > 0) {
				async.forEachOf(service.versions, function (version, v, versionCall) {
					async.each(version.apis, function (api, call) {
							let temp = {
								service: service.name,
								version: soajsLib.version.unsanitize(v),
								group: api.group,
								method: api.m,
								api: api.v,
								envs: {
									[inputmaskData.mainEnv]: false
								},
								access: {
									[inputmaskData.mainEnv]: false,
								},
								restriction: {
									[inputmaskData.mainEnv]: false,
								},
							};
							if (inputmaskData.secEnv) {
								temp.envs[inputmaskData.secEnv] = false;
								temp.access[inputmaskData.secEnv] = false;
								temp.restriction[inputmaskData.secEnv] = false;
							}
							if (pack.acl) {
								if (pack.acl[inputmaskData.mainEnv] &&
									pack.acl[inputmaskData.mainEnv][service.name] &&
									pack.acl[inputmaskData.mainEnv][service.name][v]) {
									if (pack.acl[inputmaskData.mainEnv][service.name][v].apisPermission !== "restricted") {
										temp.restriction[inputmaskData.mainEnv] = false;
									}
									if (pack.acl[inputmaskData.mainEnv][service.name][v].apisPermission === "restricted") {
										temp.restriction[inputmaskData.mainEnv] = true;
									}
									temp.access[inputmaskData.mainEnv] = !!pack.acl[inputmaskData.mainEnv][service.name][v].access;
									if (pack.acl[inputmaskData.mainEnv][service.name][v][api.m] && pack.acl[inputmaskData.mainEnv][service.name][v][api.m].apis &&
										pack.acl[inputmaskData.mainEnv][service.name][v][api.m].apis[api.v]) {
										temp.envs[inputmaskData.mainEnv] = true;
										if (pack.acl[inputmaskData.mainEnv][service.name][v][api.m].apis[api.v].hasOwnProperty("access")) {
											temp.access[inputmaskData.mainEnv] = !!pack.acl[inputmaskData.mainEnv][service.name][v][api.m].apis[api.v].access;
										}
										
									}
									if (temp.envs[inputmaskData.mainEnv]) {
										if (pack.acl[inputmaskData.secEnv] &&
											pack.acl[inputmaskData.secEnv][service.name] &&
											pack.acl[inputmaskData.secEnv][service.name][v]) {
											if (pack.acl[inputmaskData.secEnv][service.name][v].apisPermission !== "restricted") {
												temp.restriction[inputmaskData.secEnv] = false;
												temp.envs[inputmaskData.secEnv] = true;
											}
											if (pack.acl[inputmaskData.secEnv][service.name][v].apisPermission === "restricted") {
												temp.restriction[inputmaskData.secEnv] = true;
											}
											temp.access[inputmaskData.secEnv] = !!pack.acl[inputmaskData.secEnv][service.name][v].access;
											if (pack.acl[inputmaskData.secEnv][service.name][v][api.m] && pack.acl[inputmaskData.secEnv][service.name][v][api.m].apis &&
												pack.acl[inputmaskData.secEnv][service.name][v][api.m].apis[api.v]) {
												temp.envs[inputmaskData.secEnv] = true;
												if (pack.acl[inputmaskData.secEnv][service.name][v][api.m].apis[api.v].hasOwnProperty("access")) {
													temp.access[inputmaskData.secEnv] = !!pack.acl[inputmaskData.secEnv][service.name][v][api.m].apis[api.v].access;
												}
											}
										}
										acl.push(temp);
									}
								}
							}
							call();
						},
						function () {
							versionCall();
						});
				}, function () {
					serviceCall();
				});
			} else {
				serviceCall();
			}
		}, function () {
			return cb(acl);
		});
	},
	
	updateServiceAcl: function (pack, acl, env, cb) {
		
		async.each(acl, function (oneService, callback) {
			oneService.version = soajsLib.version.sanitize(oneService.version);
			if (!pack.acl[env]) {
				pack.acl[env] = {};
			}
			if (oneService.envs[env]) {
				if (!pack.acl[env][oneService.service]) {
					pack.acl[env][oneService.service] = {};
				}
				if (!pack.acl[env][oneService.service][oneService.version]) {
					pack.acl[env][oneService.service][oneService.version] = {};
				}
				pack.acl[env][oneService.service][oneService.version].access = oneService.access[env];
				if (oneService.restriction[env]) {
					pack.acl[env][oneService.service][oneService.version].apisPermission = "restricted";
				} else {
					delete pack.acl[env][oneService.service][oneService.version].apisPermission;
				}
				
			} else if (oneService.hasOwnProperty("envs")) {
				delete pack.acl[env][oneService.service];
			}
			callback();
		}, function () {
			return cb(pack.acl);
		});
	},
	
	updateApiAcl: function (pack, acl, env, cb) {
		
		async.each(acl, function (oneService, callback) {
			oneService.version = soajsLib.version.sanitize(oneService.version);
			if (pack.acl && pack.acl[env] && pack.acl[env][oneService.service] &&
				pack.acl[env][oneService.service][oneService.version]) {
				if (!pack.acl[env][oneService.service][oneService.version][oneService.method]) {
					pack.acl[env][oneService.service][oneService.version][oneService.method] = {};
				}
				if (!pack.acl[env][oneService.service][oneService.version][oneService.method].apis) {
					pack.acl[env][oneService.service][oneService.version][oneService.method].apis = {};
				}
				if (!pack.acl[env][oneService.service][oneService.version][oneService.method].apis[oneService.api]) {
					pack.acl[env][oneService.service][oneService.version][oneService.method].apis[oneService.api] = {};
				}
				pack.acl[env][oneService.service][oneService.version][oneService.method].apis[oneService.api].group = oneService.group;
				if (pack.acl[env][oneService.service][oneService.version].access !== oneService.access[env]) {
					pack.acl[env][oneService.service][oneService.version][oneService.method].apis[oneService.api].access = oneService.access[env];
				}
				
			}
			callback();
		}, function () {
			return cb(pack.acl);
		});
	},
	
};

module.exports = helper;