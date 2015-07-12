'use strict';
var colName = 'services';
var fs = require('fs');
var formidable = require('formidable');
var util = require('util');
var unzip = require('unzip');
var ncp = require('ncp').ncp;
var shelljs = require('shelljs');

function extractAPIsList(schema) {
    var excluded = ['commonFields'];
    var apiList = [];
    for (var route in schema) {
        if (Object.hasOwnProperty.call(schema, route)) {
            if (excluded.indexOf(route) !== -1) {
                continue;
            }

            var oneApi = {
                'l': schema[route]._apiInfo.l,
                'v': route
            };

            if (schema[route]._apiInfo.group) {
                oneApi.group = schema[route]._apiInfo.group;
            }

            if (schema[route]._apiInfo.groupMain) {
                oneApi.groupMain = schema[route]._apiInfo.groupMain;
            }

            apiList.push(oneApi);
        }
    }
    return apiList;
}

module.exports = {

    "list": function (config, mongo, req, res) {
        var criteria = ((req.soajs.inputmaskData.serviceNames) && (req.soajs.inputmaskData.serviceNames.length > 0)) ? {'name': {$in: req.soajs.inputmaskData.serviceNames}} : {};
        mongo.find(colName, criteria, function (err, records) {
            if (err) {
                return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]}));
            }
            return res.jsonp(req.soajs.buildResponse(null, records));
        });
    },

    "update": function (config, mongo, req, res) {
        var set = {
            '$set': {
                "extKeyRequired": req.soajs.inputmaskData.extKeyRequired || false,
                "requestTimeout": req.soajs.inputmaskData.requestTimeout || null,
                "requestTimeoutRenewal": req.soajs.inputmaskData.requestTimeoutRenewal || null,
                "image": req.soajs.inputmaskData.image,
                "apis": req.soajs.inputmaskData.apis,
                "awareness": req.soajs.inputmaskData.awareness
            }
        };
        mongo.update(colName, {'name': req.soajs.inputmaskData.name}, set, {
            'upsert': false,
            'safe': true
        }, function (err, data) {
            if (err) {
                return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]}));
            }
            if (data === 0) {
                return res.jsonp(req.soajs.buildResponse({"code": 604, "msg": config.errors[604]}));
            }
            return res.jsonp(req.soajs.buildResponse(null, "service updated successfully."));
        });
    },

    "create": function (config, mongo, req, res) {
        mongo.findOne(colName, {"name": req.soajs.inputmaskData.name}, function (error, record) {
            if (error) {
                return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]}));
            }

            if (record) {
                return res.jsonp(req.soajs.buildResponse({"code": 614, "msg": config.errors[614]}));
            }

            var doc = {
                'name': req.soajs.inputmaskData.name,
                'extKeyRequired': req.soajs.inputmaskData.extKeyRequired || false,
                'port': req.soajs.inputmaskData.port,
                'requestTimeout': req.soajs.inputmaskData.requestTimeout || 30,
                'requestTimeoutRenewal': req.soajs.inputmaskData.requestTimeoutRenewal || 5,
                'image': req.soajs.inputmaskData.image,
                "apis": req.soajs.inputmaskData.apis,
                "awareness": req.soajs.inputmaskData.awareness
            };

            mongo.insert(colName, doc, function (error) {
                if (error) {
                    return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]}));
                }
                return res.jsonp(req.soajs.buildResponse(null, "service created successfully"));
            });
        });
    },

    "upload": function (config, mongo, req, res) {

        var form = new formidable.IncomingForm();
        form.encoding = 'utf-8';
        form.uploadDir = config.uploadDir;
        form.keepExtensions = true;

        form.parse(req, function (err, fields, files) {
            if (err) {
                return res.jsonp(req.soajs.buildResponse({code: 616, msg: config.errors[616]}));
            }

            var fileName = Object.keys(files)[0];
            if (!files || Object.keys(files).length === 0) {
                fs.unlinkSync(files[fileName].path);
                return res.jsonp(req.soajs.buildResponse({code: 616, msg: config.errors[616]}));
            }

            if (files && fileName && files[fileName].type !== 'application/zip' && files[fileName].name.indexOf(".zip") === -1) {
                fs.unlinkSync(files[fileName].path);
                return res.jsonp(req.soajs.buildResponse({code: 616, msg: config.errors[616]}));
            }

            fs.createReadStream(files[fileName].path)
                .pipe(unzip.Extract({"path": config.uploadDir}))
                .on('close', function () {
                    var tmpFolder = files[fileName].name.replace('.zip', '');
                    var tmpPath = config.uploadDir + tmpFolder;

                    var validatorSchemas = require("../schemas/upload.js");
                    var configFile = tmpPath + "/config.js";
                    var packageFile = tmpPath + "/package.json";

                    checkIFFile(configFile, validatorSchemas.config, function (error, loadedConfigFile) {
                        if (error) {
                            shelljs.rm('-rf', tmpPath);
                            shelljs.rm('-f', files[fileName].path);
                            return res.json(req.soajs.buildResponse({code: 617, msg: error.message}));
                        }
                        req.soajs.log.debug(configFile + "is valid");
                        checkIFFile(packageFile, validatorSchemas.package, function (error) {
                            if (error) {
                                shelljs.rm('-rf', tmpPath);
                                shelljs.rm('-f', files[fileName].path);
                                return res.json(req.soajs.buildResponse({code: 618, msg: error.message}));
                            }
                            req.soajs.log.debug(packageFile + "is valid");

                            //move the service to where it should be located eventually
                            req.soajs.log.debug("copying upload module:" + tmpPath + " to " + config.serviceDir + loadedConfigFile.serviceName);
                            ncp.limit = 16;
                            ncp(tmpPath, config.serviceDir + loadedConfigFile.serviceName, function (err) {
                                if (err) {
                                    shelljs.rm('-rf', tmpPath);
                                    shelljs.rm('-f', files[fileName].path);
                                    return res.json(req.soajs.buildResponse({code: 619, msg: err.message}));
                                }

                                req.soajs.log.debug("cleaned up upload and tmp files");
                                shelljs.rm('-rf', tmpPath);
                                shelljs.rm('-f', files[fileName].path);

                                var prefix = config.images.services.split("/")[0];
                                var doc = {
                                    '$set': {
                                        'port': loadedConfigFile.servicePort,
                                        'extKeyRequired': loadedConfigFile.extKeyRequired,
                                        "awareness": loadedConfigFile.awareness || false,
                                        "requestTimeout": loadedConfigFile.requestTimeout,
                                        "requestTimeoutRenewal": loadedConfigFile.requestTimeoutRenewal,
                                        "image": prefix + "/" + loadedConfigFile.serviceName,
                                        "apis": extractAPIsList(loadedConfigFile.schema)
                                    }
                                };
                                mongo.update("services", {'name' : loadedConfigFile.serviceName}, doc, {'upsert': true }, function (error) {
                                    if (error) {
                                        return res.jsonp(req.soajs.buildResponse({
                                            'code': 617,
                                            'msg': config.errors[617]
                                        }));
                                    }

                                    return res.jsonp(req.soajs.buildResponse(null, true));
                                });
                            });
                        });
                    });
                });
        });

        function checkIFFile(moduleFile, schema, cb) {

            fs.exists(moduleFile, function (exists) {
                if (!exists) {
                    return cb(new Error(moduleFile + " not Found!"));
                }

                fs.stat(moduleFile, function (err, stats) {
                    if (err)
                        return cb(new Error("Error reading" + moduleFile));
                    else {
                        if (!stats.isFile()) {
                            return cb(new Error(moduleFile + " is not a file!"));
                        }

                        validateFile(moduleFile, schema, cb);
                    }
                });
            });
        }

        function validateFile(filePath, schema, cb) {
            var core = require("soajs/modules/soajs.core");
            var validator = new core.validator.Validator();

            var errMsgs = [];
            if (require.resolve(filePath)) {
                delete require.cache[require.resolve(filePath)];
            }
            var loadedFile = require(filePath);

            //validate package.json
            var check = validator.validate(loadedFile, schema);
            if (!check.valid) {
                check.errors.forEach(function (oneError) {
                    errMsgs.push(oneError.stack);
                });
                return cb(new Error(errMsgs.join(" - ")));
            }

            if (filePath.indexOf("package.json") === -1) {
                mongo.findOne('services', {
                    'port': loadedFile.servicePort,
                    'name': {$ne: loadedFile.serviceName}
                }, function (error, oneRecord) {
                    if (error) {
                        return cb(error);
                    }

                    if (oneRecord) {
                        return cb(new Error("Another service with the same port exists"));
                    }

                    return cb(null, loadedFile);
                });
            }
            else {
                loadedFile.peerDependencies = {
                    "soajs": loadedFile.dependencies.soajs
                };
                delete loadedFile.dependencies.soajs;
                fs.writeFile(filePath, JSON.stringify(loadedFile), "utf8", cb);
            }
        }

        function extractAPIsList(schema) {
            var excluded = ['commonFields'];
            var apiList = [];
            for(var route in schema) {
                if(Object.hasOwnProperty.call(schema, route)) {
                    if(excluded.indexOf(route) !== -1) {
                        continue;
                    }

                    var oneApi = {
                        'l': schema[route]._apiInfo.l,
                        'v': route
                    };

                    if(schema[route]._apiInfo.group) {
                        oneApi.group = schema[route]._apiInfo.group;
                    }

                    if(schema[route]._apiInfo.groupMain) {
                        oneApi.groupMain = schema[route]._apiInfo.groupMain;
                    }

                    apiList.push(oneApi);
                }
            }
            return apiList;
        }
    }
};