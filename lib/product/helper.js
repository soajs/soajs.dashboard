/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

"use strict";
const async = require('async');

let helper = {
	buildAclServicePreview: function (services, pack, inputmaskData, cb) {
		let acl = [];
		async.each(services, function (service, callback) {
			if (service.versions && Object.keys(service.versions).length > 0) {
				for (let v in service.versions) {
					if (v && service.versions.hasOwnProperty(v)) {
						let temp = {
							service: service.name,
							version: v,
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
								if (pack.acl[inputmaskData.mainEnv][service.name][v].access) {
									temp.access[inputmaskData.mainEnv] = true
								}
								if (pack.acl[inputmaskData.mainEnv][service.name][v].apisPermission === "restricted") {
									temp.restriction[inputmaskData.mainEnv] = true
								}
							}
							if (inputmaskData.secEnv && pack.acl[inputmaskData.secEnv] &&
								pack.acl[inputmaskData.secEnv][service.name] &&
								pack.acl[inputmaskData.secEnv][service.name][v]) {
								temp.envs[inputmaskData.secEnv] = true;
								if (pack.acl[inputmaskData.secEnv][service.name][v].access) {
									temp.access[inputmaskData.secEnv] = true
								}
								if (pack.acl[inputmaskData.secEnv][service.name][v].apisPermission === "restricted") {
									temp.restriction[inputmaskData.secEnv] = true
								}
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
								version: v,
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
										temp.envs[inputmaskData.mainEnv] = true;
									}
									if (pack.acl[inputmaskData.mainEnv][service.name][v].apisPermission === "restricted") {
										temp.restriction[inputmaskData.mainEnv] = true;
									}
									temp.access[inputmaskData.mainEnv] = !!pack.acl[inputmaskData.mainEnv][service.name][v].access;
									console.log(pack.acl[inputmaskData.mainEnv][service.name][v])
									if (pack.acl[inputmaskData.mainEnv][service.name][v][api.m] && pack.acl[inputmaskData.mainEnv][service.name][v][api.m].apis &&
										pack.acl[inputmaskData.mainEnv][service.name][v][api.m].apis[api.v]) {
										temp.envs[inputmaskData.mainEnv] = true;
										if (pack.acl[inputmaskData.mainEnv][service.name][v][api.m].apis[api.v].hasOwnProperty("access")) {
											temp.access[inputmaskData.mainEnv] = pack.acl[inputmaskData.mainEnv][service.name][v][api.m].apis[api.v].access;
										}
									}
									if (temp.envs[inputmaskData.mainEnv]) {
										if (pack.acl[inputmaskData.secEnv] &&
											pack.acl[inputmaskData.secEnv][service.name] &&
											pack.acl[inputmaskData.secEnv][service.name][v]) {
											if (pack.acl[inputmaskData.secEnv][service.name][v].apisPermission !== "restricted") {
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
													temp.access[inputmaskData.secEnv] = pack.acl[inputmaskData.secEnv][service.name][v][api.m].apis[api.v].access;
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
	}
};

module.exports = helper;