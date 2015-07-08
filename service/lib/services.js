'use strict';
var colName = 'services';
var fs = require('fs');
//var formidable = require('formidable');
var request = require("request");

function extractAPIsList(schema) {
    var excluded = ['commonFields'];
    var apiList = [];
    for (var route in schema) {
        if (schema.hasOwnProperty(route)) {
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
                "apis": req.soajs.inputmaskData.apis
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
                "apis": req.soajs.inputmaskData.apis
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
        //req.soajs.awareness.getHost('controller', function (host) {
        //    var adminUserRequest = {
        //        'uri': 'http://' + host + ':' + req.soajs.registry.services.controller.port + '/buildImages/uploadCustomService',
        //        'headers': req.headers,
        //        'method': 'post',
        //        'timeout': 120000
        //    };
        //    req.pipe(request(adminUserRequest)).pipe(res);
        //});

        mongo.findOne("environment", {"code": "DASHBOARD"}, function (error, envRecord) {
            if (error) {
                return res.jsonp(req.soajs.buildResponse({"code": 600, "msg": config.errors[600]}));
            }

            var builder = require("../utils/builder/index");
            builder(config, req, envRecord.deployer[envRecord.deployer.selected], envRecord.services.config.ports.maintenanceInc, function(error, data){
                if(error){
                    var code = 616;
                    var msg;
                    if(!isNaN(error)){
                        code = error;
                        msg = "Error Creating Image from service file.";
                    }
                    else{
                        msg = error.message;
                    }
                    return res.json(req.soajs.buildResponse({'code': code, 'msg': msg }));
                }
                return res.json(req.soajs.buildResponse(null, data));
            })
        });
    }
};