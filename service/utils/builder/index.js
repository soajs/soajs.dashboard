'use strict';
var Docker = require('dockerode');
var fs = require('fs');
var crypto = require('crypto');
var ncp = require('ncp').ncp;
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var archiver = require('archiver');
var unzip = require("unzip");
var formidable = require('formidable');
var util = require('util');

//schema validation
var schemas = require("./schemas");
var core = require("soajs/modules/soajs.core");
var validator = new core.validator.Validator();

var lib = {
    assurePath: function (folder, cb) {
        if (folder[folder.length - 1] === "/")
            folder = folder.substr(0, folder.length - 1);
        fs.stat(folder, function (err, stats) {
            if (err) return cb(err, null);
            return cb(null, folder);
        });
    },
    generateUniqueId: function (len, cb) {
        var id = "";
        try {
            id = crypto.randomBytes(len).toString('hex');
            cb(null, id);
        } catch (err) {
            cb(err);
        }
    },
    getDocker: function (dockerInfo, config) {
        var docker;
        if (dockerInfo.socketPath) {
            docker = new Docker({socketPath: dockerInfo.socketPath});
        }
        else {
            docker = new Docker({
                host: dockerInfo.host,
                port: dockerInfo.port,
                ca: fs.readFileSync(config.builder.certificates + '/ca.pem'),
                cert: fs.readFileSync(config.builder.certificates + '/cert.pem'),
                key: fs.readFileSync(config.builder.certificates + '/key.pem')
            });
        }
        return docker;
    },
    getServiceInfo: function (param, cb) {
        try {
            delete require.cache[require.resolve(param.loc + "config.js")];
            var tmpConfig = require(param.loc + "config.js");

            var check = validator.validate(tmpConfig, schemas.configFile);
            if (!check.valid) {
                return cb(null);
            }

            if (tmpConfig.servicePort && tmpConfig.serviceName) {
                return cb({
                    "name": tmpConfig.serviceName,
                    "ports": tmpConfig.servicePort + " " + (tmpConfig.servicePort + param.maintenanceInc)
                });
            }
            else
                return cb(null);
        }
        catch (e) {
            return cb(null);
        }
    },
    writeProfiles: function (param, cb) {
        ncp.limit = 16;
        ncp(param.config.builder.FILES + "profiles/", param.loc + 'profiles', function (err) {
            if (err) return cb(err.message);
            return cb(null);
        });
    },
    writeScripts: function (param, cb) {
        ncp.limit = 16;
        ncp(param.config.builder.FILES + "scripts/", param.loc, function (err) {
            if (err) return cb(err.message);
            return cb(null);
        });
    },
    writeFiles: function (param, cb) {
        ncp.limit = 16;
        ncp(param.src, param.loc, function (err) {
            if (err) return cb(err.message);
            fs.stat(param.loc + "/.git", function (err, stats) {
                if (err) return cb(null);
                rimraf(param.loc + "/.git/", function (error) {
                    return cb(null);
                });
            });
        });
    },
    writeDockerfile: function (param, cb) {
        var wstream = fs.createWriteStream(param.loc + 'Dockerfile');
        wstream.write(param.tpl.from + "\n");
        wstream.write(param.tpl.maintainer + "\n");
        for (var i = 0; i < param.tpl.body.length; i++) {
            var str = param.tpl.body[i];
            if (param.service.name)
                str = str.replace(/#SERVICEFOLDERNAME#/g, param.service.name);
            if (param.service.ports)
                str = str.replace(/#SERVICEPORT#/g, param.service.ports);
            wstream.write(str + "\n");
        }
        wstream.end();
        return cb(null);
    },
    buildServiceTar: function (param, cb) {
        function tarFolder(rootFolder, serviceInfo) {
            var output = fs.createWriteStream(rootFolder + "service.tar");
            var archive = archiver('tar');
            output.on('close', function () {
                cb(null, {
                    "root": rootFolder,
                    "tar": rootFolder + "service.tar",
                    "serviceInfo": serviceInfo
                });
            });
            archive.on('error', function (err) {
                cb(err.message);
            });
            archive.pipe(output);
            archive.file(rootFolder + 'Dockerfile', {name: 'Dockerfile'});
            archive.directory(rootFolder + 'FILES', 'FILES');
            archive.finalize();
        }

        function handleServiceFiles(path, rootFolder, serviceInfo) {
            lib.writeFiles({
                "src": path + "/",
                "loc": rootFolder + "FILES/" + serviceInfo.name
            }, function (err) {
                if (err) return cb(err.message);
                var packageFile = rootFolder + "FILES/" + serviceInfo.name + "/package.json";

                fs.exists(packageFile, function (exists) {
                    if (!exists) {
                        return cb(packageFile + " not Found!");
                    }

                    fs.stat(packageFile, function (err, stats) {
                        if (err)
                            return tarFolder(rootFolder, serviceInfo);
                        else {
                            if (!stats.isFile()) {
                                return cb(packageFile + " is not a file!");
                            }

                            validatePackageJSON(packageFile, schemas.package, function (err) {
                                if (err) {
                                    return cb(err.message);
                                }

                                return tarFolder(rootFolder, serviceInfo);
                            });
                        }
                    });
                });
            });
        }

        function validatePackageJSON(filePath, schema, cb) {
            var errMsgs = [];
            if (require.resolve(filePath)) {
                delete require.cache[require.resolve(filePath)];
            }
            var packageJSON = require(filePath);

            //validate package.json
            var check = validator.validate(packageJSON, schema);
            if (!check.valid) {
                check.errors.forEach(function (oneError) {
                    errMsgs.push(oneError.stack);
                });
                return cb(new Error(errMsgs));
            }

            delete packageJSON.dependencies.soajs;
            fs.writeFile(filePath, JSON.stringify(packageJSON), "utf8", function (err) {
                if (err) {
                    return cb(err);
                }

                return cb(null, true);
            });
        }

        function afterServiceInfo(serviceInfo, path) {
            if (serviceInfo) {
                lib.generateUniqueId(16, function (err, fName) {
                    if (err) return cb(err.message);
                    var rootFolder = param.config.builder.workingDir + fName + "/";
                    mkdirp(rootFolder + "FILES/", function (err) {
                        if (err) return cb(err.message);
                        fs.stat(rootFolder + "FILES/", function (err, stats) {
                            if (err) return cb("Unable to create working tar folder.");
                            lib.writeDockerfile({
                                "loc": rootFolder,
                                "service": serviceInfo,
                                "tpl": param.dockerTpl
                            }, function (err) {
                                if (err) return cb(err.message);
                                lib.writeScripts({
                                    "loc": rootFolder + "FILES/",
                                    "config": param.config
                                }, function (err) {
                                    if (err) return cb(err.message);
                                    lib.writeProfiles({
                                        "loc": rootFolder + "FILES/",
                                        "config": param.config
                                    }, function (err) {
                                        if (err) return cb(err.message);
                                        handleServiceFiles(path, rootFolder, serviceInfo);
                                    });

                                });
                            });
                        });
                    });
                });
            }
            else
                return cb("You need to have servicePort as well as serviceName in [" + path + "/config.js]");
        }

        var serviceFolder = param.servicePath;
        lib.assurePath(serviceFolder, function (err, path) {
            if (err) return cb(err.message);

            lib.getServiceInfo({
                "loc": path + "/",
                "maintenanceInc": param.maintenanceInc
            }, function (serviceInfo) {
                afterServiceInfo(serviceInfo, path);
            });
        });
    },
    createImage: function (param, cb) {
        var imagePrefix = param.imagePrefix;
        var maintenanceInc = param.maintenanceInc;
        lib.buildServiceTar({
            "type": param.type,
            "servicePath": param.servicePath,
            "nginxPath": param.nginxPath,
            "maintenanceInc": maintenanceInc,
            "dockerTpl": param.dockerTpl,
            "config": param.config
        }, function (err, tarInfo) {
            if (err)
                return cb(err);
            var imageName = imagePrefix + tarInfo.serviceInfo.name;
            var archiveFile = tarInfo.tar;

            var docker = lib.getDocker(param.dockerInfo, param.config);
            docker.buildImage(archiveFile, {t: imageName}, function (error, stream) {
                if (error) {
                    param.log.error('createImage error: ', error);
                    return cb(error.message);
                } else {
                    var data = '';
                    var chunk;
                    stream.setEncoding('utf8');
                    stream.on('readable', function () {
                        while ((chunk = stream.read()) != null) {
                            data += chunk;
                        }
                    });
                    stream.on('end', function () {
                        stream.destroy();
                        if (param.deleteFolder) {
                            rimraf(tarInfo.root, function (err) {
                                return cb(null, data);
                            });
                        }
                        else
                            return cb(null, data);
                    });
                }
            });
        });
    },
    createService: function (params, cb) {
        lib.createImage({
            dockerInfo: params.dockerInfo,
            maintenanceInc: params.maintenanceInc,
            log: params.log,
            deleteFolder: params.deleteFolder || null,
            servicePath: params.servicePath,
            imagePrefix: params.config.builder.imagePrefix,
            dockerTpl: params.config.builder.dockerTmpl,
            config: params.config
        }, cb);
    }
};

module.exports = function (config, req, dockerInfo, maintenanceInc, cb) {
    var form = new formidable.IncomingForm();
    form.encoding = 'utf-8';
    form.uploadDir = config.builder.uploadDir;
    form.keepExtensions = true;

    form.parse(req, function (err, fields, files) {
        if (err) {
            return cb(err);
        }

        var fileName = Object.keys(files)[0];
        if (!files || Object.keys(files).length === 0) {
            rimraf(files[fileName].path, function (err) {
            });
            return cb(402);
        }

        if (files && fileName && files[fileName].type !== 'application/zip' && files[fileName].name.indexOf(".zip") === -1) {
            rimraf(files[fileName].path, function (err) {
            });
            return cb(403);
        }

        //extract zip file & call lib.createService
        var srvTmpFolderName = fields.name;
        srvTmpFolderName = srvTmpFolderName.replace(/\s/g, '_').replace(/\W/gi, '-').toLowerCase();
        fs.createReadStream(files[fileName].path)
            .pipe(unzip.Extract({"path": config.builder.uploadDir + srvTmpFolderName}))
            .on('close', function () {
                createServiceImage(fileName, srvTmpFolderName, files);
            });
    });

    function createServiceImage(fileName, srvTmpFolderName, files) {
        var params = {
            config: config,
            dockerInfo: dockerInfo,
            maintenanceInc: maintenanceInc,
            servicePath: config.builder.uploadDir + srvTmpFolderName + "/" + files[fileName].name.replace(".zip", ""),
            log: req.soajs.log,
            deleteFolder: true
        };

        lib.createService(params, function (err, data) {
            if (err) {
                return cb(err);
            }

            //remove extracted folder, remove zip file
            rimraf(config.builder.uploadDir + srvTmpFolderName, function (err) {
                if (err) {
                    return cb(err);
                }

                rimraf(files[fileName].path, function (err) {
                    return cb(err, data);
                });
            });
        });
    }
};