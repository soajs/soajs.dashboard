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

    "upload": function (config, mongo, req, res) {

        var form = new formidable.IncomingForm();
        form.encoding = 'utf-8';
        form.uploadDir = config.workDir + "soajs" + config.upload.uploadFolderName;
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
                .pipe(unzip.Extract({"path": config.workDir + "soajs" + config.upload.uploadFolderName}))
                .on('close', function () {
                    var tmpFolder = files[fileName].name.replace('.zip', '');
                    var tmpPath = config.workDir + "soajs" + config.upload.uploadFolderName + tmpFolder;

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
                            validateBuildTenantDir(config.workDir + "soajs" + config.upload.tenantFolderName + req.soajs.tenant.code, loadedConfigFile.serviceName, function (error) {
                                if (error) {
                                    req.soajs.log.error(error);
                                    return res.jsonp(req.soajs.buildResponse({"code": 616, "msg": error.message}));
                                }
                                moveFiles(files, tmpPath, loadedConfigFile.serviceName, fileName, function (serviceFolder) {
                                    var doc = {
                                        '$set': {
                                            'port': loadedConfigFile.servicePort,
                                            'extKeyRequired': loadedConfigFile.extKeyRequired,
                                            "awareness": loadedConfigFile.awareness || false,
                                            "requestTimeout": loadedConfigFile.requestTimeout,
                                            "requestTimeoutRenewal": loadedConfigFile.requestTimeoutRenewal,
                                            "apis": extractAPIsList(loadedConfigFile.schema),
                                            "custom": serviceFolder
                                        }
                                    };
                                    mongo.update("services", {'name': loadedConfigFile.serviceName}, doc, {'upsert': true}, function (error) {
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
        });

        function moveFiles(files, tmpPath, serviceName, fileName, cb) {
            ncp.limit = config.ncpLimit;
            var srvdest = config.workDir + "soajs" + config.upload.tenantFolderName + req.soajs.tenant.code + config.upload.servicesFolderName + serviceName;
            var uiDest = config.workDir + "soajs" + config.upload.tenantFolderName + req.soajs.tenant.code + config.upload.uiFolderName + serviceName;
            req.soajs.log.debug("copying upload module:" + tmpPath);

            ncp(tmpPath, srvdest, function (err) {
                if (err) {
                    shelljs.rm('-rf', tmpPath);
                    shelljs.rm('-f', files[fileName].path);
                    return res.json(req.soajs.buildResponse({code: 619, msg: err.message}));
                }

                if (fs.existsSync(srvdest + "/ui")) {
                    shelljs.mv(srvdest + config.upload.uiFolderName + "*", uiDest);
                    shelljs.rm('-rf', srvdest + "/ui");
                }

                if (fs.existsSync(srvdest + "/ui-dashboard")) {
                    var dashUIDest = config.workDir + "soajs/open_source" + config.upload.dashboardFolderName + "modules/" + serviceName;
                    shelljs.mkdir("-p", dashUIDest);
                    ncp(srvdest + "/ui-dashboard/" + serviceName, dashUIDest, function(err){
                        if(err){
                            req.soajs.log.error(err);
                        }
                        //todo: inject install.js under index.html of dashboard ui
                        shelljs.rm('-rf', srvdest + "/ui-dashboard");
                    });
                }

                req.soajs.log.debug("cleaned up upload and tmp files");
                shelljs.rm('-rf', tmpPath);
                shelljs.rm('-f', files[fileName].path);

                return cb(srvdest);
            });
        }

        function validateBuildTenantDir(path, serviceName, cb) {
            var p1 = path + config.upload.servicesFolderName + serviceName;
            var p2 = path + config.upload.uiFolderName + serviceName;

            checkBuildPath(p1, function (error) {
                if (error) {
                    return cb(error);
                }
                checkBuildPath(p2, cb);
            });

            function checkBuildPath(path, cb) {
                fs.exists(path, function (exists) {
                    if (exists) {
                        fs.stat(path, function (err, stats) {
                            if (err) {
                                return cb(err);
                            }
                            else if (!stats.isDirectory()) {
                                return cb(new Error(path + " is not a directory."));
                            }
                            return cb(null, true);
                        });
                    }
                    else {
                        req.soajs.log.debug("destination: " + path + " not found. Creating Directory...");
                        shelljs.mkdir("-p", path);
                        return cb(null, true);
                    }
                });
            }
        }

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
    }
};