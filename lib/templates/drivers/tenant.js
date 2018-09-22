"use strict";

const driver = {

    "check": function (req, context, lib, async, BL, callback) {
        //validate if ci schema is valid
        let template = context.template;
        let schema = require("../../../schemas/fulltenant");
        let myValidator = new req.soajs.validator.Validator();

        //check if name exists
        if (template.content && template.content.tenant && template.content.tenant.data && Array.isArray(template.content.tenant.data) && template.content.tenant.data.length > 0) {
            let tenants = template.content.tenant.data;
            async.eachSeries(tenants, (oneTenant, cb) => {
                let status = myValidator.validate(oneTenant, schema);
                if (!status.valid) {
                    status.errors.forEach(function (err) {
                        context.errors.push({
                            code: 173,
                            msg: `<b>${oneTenant.code}</b>: ` + err.stack,
                            group: "Tenants"
                        })
                    });
                }
                return cb();
            }, () => {
                let opts = {
                    collection: 'products'
                };

                let productization = [];
                let product = [];
                let resKey = -1;
                let key = -1;
                let resProd = [];
                let resPack = [];
                let finalResult = [];

                async.series({
                    'mergeFromDb': (cb) => {
                        BL.model.findEntries(req.soajs, opts, function (error, result) {
                            lib.checkReturnError(req, callback, {
                                config: context.config,
                                error: error,
                                code: 600
                            }, () => {
                                finalResult = result;
                                if (finalResult && finalResult.length > 0) {
                                    async.forEach(finalResult, (oneResult, prodCb) => {
                                        resProd.push(oneResult.code);
                                        let application = [];
                                        resKey++;
                                        async.forEach(oneResult.packages, (oneApplication, packCb) => {
                                            application.push(oneApplication.code);
                                            //pushing product and array of packages
                                            resPack[resKey] = {product: oneResult.code, package: application};
                                            return packCb();
                                        },prodCb);
                                    },cb);
                                } else {
                                    return cb();
                                }
                            });
                        });
                    },
                    'mergeFromTemplate': (cb) => {
                        if (template.content.productization && template.content.productization.data && Array.isArray(template.content.productization.data) && template.content.productization.data.length > 0) {
                            async.forEach(template.content.productization.data, (oneProd, mainCb) => {
                                if (resProd.indexOf(oneProd.code) === -1) {
                                    finalResult.push(oneProd);
                                    mainCb();
                                } else {
                                    // check for packages if not avaible add to it
                                    async.forEach(oneProd.packages, (onePackage, packCb) => {
                                        async.forEach(resPack, (onePack, lastCb) => {
                                            // if product exist
                                            if (oneProd.code === onePack.product) {
                                            	let oneInputPackage = oneProd.code + "_" + onePackage.code;
                                            	let myPackage = JSON.parse(JSON.stringify(onePackage));
                                            	myPackage.code = oneInputPackage;
	                                            onePackage.code = oneInputPackage;
                                                //if package don't exists
                                                if (onePack.package.indexOf(oneInputPackage) === -1) {
                                                    // adding the package
                                                    finalResult.forEach((oneResult) => {
                                                        if (oneResult.code === oneProd.code) {
                                                            oneResult.packages.push(myPackage);
                                                        }
                                                    });
                                                }
                                            }
                                            return lastCb();
                                        }, packCb);
                                    }, mainCb);
                                }
                            }, cb);
                        } else {
                            return cb();
                        }
                    },
                    'checkProdAndPackage': (cb) => {
                        async.forEach(finalResult, (oneProduct, mainCb) => {
                            product.push(oneProduct.code);
                            let application = [];
                            key++;
                            async.forEach(oneProduct.packages, (oneApplication, lastCb) => {
                                application.push(oneApplication.code);
                                productization[key] = {product: oneProduct.code, package: application};
                                return lastCb();
                            }, () => {
                                return mainCb()
                            });
                        }, () => {
                            if (template.content.tenant && (template.content.tenant.data && Array.isArray(template.content.tenant.data) && template.content.tenant.data.length > 0 )) {
                                async.forEach(template.content.tenant.data, (oneTenant, mainCb) => {
                                    async.forEach(oneTenant.applications, (oneApplication, appCb) => {
                                        // check if product exists
                                        if (product.indexOf(oneApplication.product) !== -1) {
                                            async.forEach(productization, (oneProduct, prodCb) => {
                                                if (oneProduct.product === oneApplication.product) {
                                                    // check if package exists
                                                    if (oneProduct.package.indexOf(oneApplication.package) !== -1) {
                                                        return prodCb();
                                                    } else {
	                                                    oneApplication.package =  oneApplication.package.split(oneApplication.product + '_')[1];
	                                                    if (oneProduct.package.indexOf(oneApplication.package) !== -1) {
		                                                    return prodCb();
	                                                    } else {
		                                                    context.errors.push({
			                                                    code: 173,
			                                                    msg: `Tenant <b>${oneTenant.code}</b> has an application that uses package <b>${oneApplication.package}</b> but no product has this package!.`,
			                                                    group: "Tenants"
		                                                    });
		                                                    return prodCb();
	                                                    }
                                                    }
                                                } else {
                                                    return prodCb();
                                                }
                                            },appCb);
                                        } else {
                                            context.errors.push({
                                                code: 173,
                                                msg: `Tenant <b>${oneTenant.code}</b> has an application that uses package <b>${oneApplication.package}</b> but the product of this package does not exist!`,
                                                group: "Tenants"
                                            });
                                            return appCb();
                                        }
                                    },mainCb);
                                }, () => {
                                    return callback();
                                });
                            } else {
                                return cb();
                            }
                        });
                    },
	                "cleanUp": (cb) => {
		                if (template.content.productization && template.content.productization.data && Array.isArray(template.content.productization.data) && template.content.productization.data.length > 0) {
			                async.forEach(template.content.productization.data, (oneProduct, mainCb) => {
				                oneProduct.packages.forEach((onePackage) => {
					                if (onePackage.code.indexOf("_") !== -1) {
						                onePackage.code = onePackage.code.split("_")[1];
					                }
				                });
				                return mainCb();
			                }, cb);
		                }
		                else {
			                return cb();
		                }
	                }
                });
            });
        }
        else {
            return callback();
        }
    },

};

module.exports = driver;