"use strict";
let colName = 'cicd';
const driver = {
	
	"check": function (req, context, lib, async, BL, callback) {
		//validate if ci schema is valid
		let template = context.template;
		let imfv = context.config.schema.post["/ci/recipe"];
		let schema = {
			type: 'object',
			properties: {
				provider: imfv.provider,
				name: imfv.name,
				recipe: imfv.recipe
			}
		};
		
		let myValidator = new req.soajs.validator.Validator();
		
		//check if name exists
		if (template.content && template.content.recipes && template.content.recipes.ci && template.content.recipes.ci.length > 0) {
			let ci = template.content.recipes.ci;
			async.eachSeries(ci, (oneRecipe, cb) => {
				let status = myValidator.validate(oneRecipe, schema);
				if (!status.valid) {
					status.errors.forEach(function (err) {
						context.errors.push({code: 173, msg: err.stack})
					});
					return cb();
				}
				else {
					let opts = {
						conditions: {
							type: oneRecipe.type,
							name: oneRecipe.name
						},
						collection: colName,
					};
					
					BL.model.countEntries(req.soajs, opts, function (error, count) {
						lib.checkReturnError(req, cb, {config: context.config, error: error, code: 600}, () => {
							if (count && count === 1) {
								context.errors.push({
									"code": 967,
									"msg": `Continuous Integration recipe ${oneRecipe.name} already exists for provider ${oneRecipe.provider} => ${oneRecipe.provider}/${oneRecipe.name}`
								})
							}
							return cb();
						});
					});
				}
			}, callback);
		} else {
			return callback();
		}
	},
	
	"merge": function (req, context, lib, async, BL, callback) {
		
		if(req.soajs.inputmaskData.correction && req.soajs.inputmaskData.correction.ci){
			req.soajs.inputmaskData.correction.ci.forEach((oneCiInput) => {
				context.template.content.ci.forEach((oneCiRecipe) =>{
					if(oneCiInput.old === oneCiRecipe.name && oneCiInput.provider === oneCiRecipe.provider) {
						oneCiRecipe.name = oneCiInput.new;
					}
				});
			});
		}
		
		return callback();
	},
	
	"save": function (req, context, lib, async, BL, callback) {
		if (context.template.content && context.template.content.recipes && context.template.content.recipes.ci && context.template.content.recipes.ci.length > 0) {
			lib.initBLModel('ci', (error, ciModel) => {
				lib.checkReturnError(req, callback, {config: context.config, error: error, code: 600}, () => {
					let ci = context.template.content.recipes.ci;
					async.eachSeries(ci, (oneRecipe, cb) => {
						req.soajs.inputmaskData = {};
						req.soajs.inputmaskData.provider = oneRecipe.provider;
						req.soajs.inputmaskData.name = oneRecipe.name;
						req.soajs.inputmaskData.recipe = oneRecipe;
						ciModel.addRecipe(context.config, req, (error) => {
							lib.checkReturnError(req, cb, {config: context.config, error: error, code: 600}, cb);
						});
					}, callback);
				});
			});
		} else {
			return callback();
		}
	}
};

module.exports = driver;