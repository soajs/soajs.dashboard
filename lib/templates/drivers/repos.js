"use strict";

let soajsUtils = require("soajs").utils;

const driver = {
	
	"check": function (req, context, lib, async, BL, callback) {
		//validate if ci schema is valid
		let template = context.template;
		
		let schema = {
			type: 'object',
			properties: {
				"label": {"type": "string", "required": true},
				"name": {"type": "string", "required": true, "format": "lowercase", "pattern": /[a-zA-Z0-9_\-]/},
				"type": {"type": "string", "required": true, "enum": ["service", "daemon", "custom"]},
				"category": {"type": "string", "required": true},
				"gitSource": {
					"type": "object",
					"required": true,
					"properties": {
						"provider": {"type": "string", "required": true},
						"owner": {"type": "string", "required": true},
						"repo": {"type": "string", "required": true}
					}
				},
				"deploy": {
					"type": "object"
				}
			}
		};
		
		let myValidator = new req.soajs.validator.Validator();
		
		//check if name exists
		if (template.content && template.content.deployments && template.content.deployments.repo && Object.keys(template.content.deployments.repo).length > 0) {
			let repos = Object.keys(template.content.deployments.repo);
			async.eachSeries(repos, (repoName, cb) => {
				let oneRepo = template.content.deployments.repo[repoName];
				
				async.series({
					"validateSchema": (mCb) => {
					if (oneRepo.type === 'daemon') {
						schema = soajsUtils.cloneObj(schema);
						schema['group'] = {"type" : "string", "required" : true}
					}
						let status = myValidator.validate(oneRepo, schema);
						if (!status.valid) {
							let errors = [];
							status.errors.forEach(function (err) {
								errors.push({code: 173, msg: `<b>${repoName}</b>: ` + err.stack, group: "Repositories"})
							});
							return mCb(errors);
						}
						return mCb(null, true);
					},
					"checkGitRepos": (mCb) => {
						let opts = {
							conditions: {
								provider: oneRepo.gitSource.provider,
								owner: oneRepo.gitSource.owner,
								"repos.name": oneRepo.gitSource.owner + "/" + oneRepo.gitSource.repo
							},
							collection: "git_accounts",
						};
						
						BL.model.countEntries(req.soajs, opts, function (error, count) {
							lib.checkReturnError(req, cb, {config: context.config, error: error, code: 600}, () => {
								if (!count || count === 0) {
									return mCb({
										"code": 173,
										"msg": `Activate Git Account for <b>${oneRepo.owner}</b> or activate repo <b>${oneRepo.repo}</b> in that account to enable importing its repo deployment template`, group: "Repositories"
									});
								}
								return mCb(null, true);
							});
						});
					},
                    'checkDeamonGroups': (mCb) => {
                        if (oneRepo.type === 'daemon') {
                            let opts = {
                                collection: "daemon_grpconf",
                            };
                            let daemonName = [];
                            async.series({
                                'mergeFromDb': (cb) => {
                                    BL.model.findEntries(req.soajs, opts, function (error, deamonGroups) {
                                        lib.checkReturnError(req, cb, {
                                            config: context.config,
                                            error: error,
                                            code: 600
                                        }, () => {
                                            if (deamonGroups && deamonGroups.length > 0) {
                                                async.forEach(deamonGroups, (oneGroup, mainCb) => {
                                                    daemonName.push(oneGroup.daemonConfigGroup);
                                                    return mainCb();
                                                }, () => {
                                                    return cb();
                                                })
                                            } else {
                                                return cb();
                                            }
                                        });
                                    });
                                },
                                'mergeFromTemplate': (cb) => {
                                    if (template.content.daemonGroups && template.content.daemonGroups.data && Array.isArray(template.content.daemonGroups.data) && template.content.daemonGroups.data.length > 0) {
                                        async.forEach(template.content.daemonGroups.data, (oneDaemonGroup, mainCb) => {
                                            if (daemonName.indexOf(oneDaemonGroup.groupName) === -1) {
                                                daemonName.push(oneDaemonGroup.groupName);
                                            }
                                            return mainCb();
                                        }, cb);
                                    } else {
                                        return cb();
                                    }
                                },
                                'checkGroups': (cb) => {
                                    if (daemonName.indexOf(oneRepo.group) === -1) {
                                        return mCb({
                                            "code": 173,
                                            "msg": `Repo <b>${oneRepo.name}</b> of type daemon has a Daemon Group <b>${oneRepo.group}</b> that does not exists`,
                                            "group": "Repositories"
                                        });
                                    }
									return mCb(null, true);
                                }
                            });
                        } else {
                            return mCb(null, true);
                        }
                    }
				}, (error) => {
					if (error) {
						context.errors.push(error);
					}

					return cb(null, true);
				});
				
			}, callback);
		} else {
			return callback();
		}
	}
};

module.exports = driver;