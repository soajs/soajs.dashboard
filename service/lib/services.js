'use strict';
var colName = 'services';
var fs = require('fs');
var formidable = require('formidable');
var util = require('util');
var unzip = require('unzip');
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

            var srvTmpFolderName = fields.name;
            srvTmpFolderName = srvTmpFolderName.replace(/\s/g, '_').replace(/\W/gi, '-').toLowerCase();
            fs.createReadStream(files[fileName].path)
                .pipe(unzip.Extract({"path": config.uploadDir}))
                .on('close', function () {
                    //move the service to where it should be located eventually
                    shelljs.cp('-Rf', config.uploadDir + files[fileName].name.replace('.zip', '') + '/*', config.workingDir + srvTmpFolderName);
                    shelljs.rm('-rf', config.uploadDir + files[fileName].name.replace('.zip', ''));
                    shelljs.rm('-f', files[fileName].path);

                    return res.jsonp(req.soajs.buildResponse(null, true));
                });
        });
    }
};