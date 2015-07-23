"use strict";
var cmService = soajsApp.components;
cmService.service('cmService', ['ngDataApi', function(ngDataApi) {

    function loadServices(currentScope){
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/environment/list"
        }, function(error, envRecords) {
            if(error) {
                currentScope.$parent.displayAlert("danger", error.message);
            }
            else {
                var hosts = [];
                var count = 0;
                envRecords.forEach(function(oneEnv) {
                    getHosts(currentScope, oneEnv.code, function(envHosts){
                        hosts = hosts.concat(envHosts);
                        count++;
                        if(count === envRecords.length){
                            checkCBandHosts(currentScope, hosts);
                        }
                    });
                });
            }
        });
    }

    function getHosts(currentScope, envCode, cb){
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/hosts/list",
            "params" : {"env": envCode}
        }, function(error, hostsRecords) {
            if(error) {
                currentScope.$parent.displayAlert("danger", error.message);
            }
            else {
                return cb(hostsRecords);
            }
        });
    }

    function checkCBandHosts(currentScope, hosts){
        var services = [];
        getSendDataFromServer(currentScope, ngDataApi, {
            "method": "get",
            "routeName": "/dashboard/cb/list",
            "params": {'port': true}
        }, function(error, cbRecords) {
            if(error) {
                currentScope.$parent.displayAlert("danger", error.message);
            }
            else {
                currentScope.noCB = (cbRecords > 0);
                cbRecords.forEach(function(oneService) {
                    var found = false;
                    for(var i =0; i < hosts.length; i++){
                        if(hosts[i].name === oneService.name){
                            found = true;
                            break;
                        }
                    }
                    if(found){
                        oneService.port = oneService.genericService.config.servicePort;
                        delete oneService.genericService;
                        services.push(oneService);
                    }
                });
                currentScope.hp = true;
                currentScope.services = services;
            }
        });
    }

    return {
        'loadServices': loadServices
    }
}]);