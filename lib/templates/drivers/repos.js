"use strict";

const driver = {
	
	"check": function (req, context, lib, async, BL, callback) {
		//validate if ci schema is valid
		let template = context.template;
		
		let schema = {
			type: 'object',
			properties: {
				"label": {"type": "string", "required": true},
				"name": {"type": "string", "required": true, "format": "lowercase", "pattern": /[a-zA-Z0-9_\-]/},
				"type":  {"type": "string", "required": true, "enum": ["service", "daemon","custom"]},
				"category": {"type": "string", "required": true},
				"gitSource": {
					"type": "object",
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
				let oneRepo = repos[repoName];
				
				async.series({
					"validateSchema": (mCb) => {
						let status = myValidator.validate(oneRepo, schema);
						if (!status.valid) {
							let errors = [];
							status.errors.forEach(function (err) {
								errors.push({code: 173, msg: err.stack})
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
										"msg": `Activate Git Account for ${oneRepo.owner} or activate repo ${oneRepo.repo} in that account to enable importing its repo deployment template => ${oneRepo.owner}/${oneRepo.repo}`
									});
								}
								return mCb(null, true);
							});
						});
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