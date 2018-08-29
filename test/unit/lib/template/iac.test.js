"use strict";
var helper = require("../../../helper.js");
var coreModules = require ("soajs.core.modules");
var core = coreModules.core;
var async = require('async');
const sinon = require('sinon');
let soajsUtils = require('soajs.core.libs').utils;
let template = require('./schema/template.js');
const iacIndex = helper.requireModule('./lib/templates/drivers/iac.js');
let templates = helper.requireModule('./lib/cloud/infra/templates');


function stubStatusUtils() {
    sinon
        .stub(templates, 'getRemoteTemplates')
        .yields(null, true);
}

let mongoStub = {
    model :{
        checkForMongo: function (soajs) {
            return true;
        },
        validateId: function (soajs, cb) {
            return cb(null, soajs.inputmaskData.id);
        },
        findEntries: function (soajs, opts, cb) {
         if (opts.conditions && opts.collection === 'infra') {
             return cb(null, [{
                 name : 'test',
                 templates : [{
                     name: 'test'
                 }]
             }])
         } else if (opts.collection === 'infra' && !opts.conditions) {
             return cb(null, [{
                 name : 'test',
                 '_id' : '123'
             }])
         } else if(opts.collection === 'templates') {
             return cb(null, [{
                 infra : '5b85338274589144d1995eff',
                 name : 'test'
             }])
         }
        },
        findEntry: function (soajs, opts, cb) {
            if (opts.collection === 'services') {
                let originalServiceRecord = {
                    name: 'test',
                    src: {
                        repo: 'test',
                        owner: 'test'
                    }
                };
                cb(null, originalServiceRecord);
            } else {
                cb(); // todo if needed
            }

        },
        updateEntry: function (soajs, opts, cb) {
            cb(null, true);
        },
        removeEntry: function (soajs, opts, cb) {
            cb(null, true);
        },
        saveEntry: function (soajs, opts, cb) {
            cb(null, true);
        },
        initConnection: function (soajs) {
            return true;
        },
        closeConnection: function (soajs) {
            return true;
        },
        validateCustomId: function (soajs) {
            return true;
        },
        countEntries: function (soajs, opts, cb) {
            if (opts.collection === 'templates') {
                return cb(null, 1);
            } else if (opts.collection === 'infra') {
                return cb(null, 0)
            } else {
                return cb(null, true)
            }
        },
        find: function (soajs, opts, cb) {
            return cb(null, [{
                "_id": '5aba44f1ad30ac676a02d650',
                "provider": "travis",
                "type": "recipe",
                "name": "My Custom Recipe",
                "recipe": "sudo something",
                "locked" : true,
                "sha": "1234"
            }])
        },
        getDb: function (data) {
            return {
                ObjectId: function () {
                    return ['123qwe'];
                }
            }
        }},

};
let req = {};
let iacTemplate = soajsUtils.cloneObj(template);

let context = {
    config : {
        HA : {
            blacklist : ["dummy data for test"]
        }
    },
    template : iacTemplate,
    errors : [],
    dbData : {},
};

let iactModel = {
    add: function (context,req, opts, cb) {
        return cb(null, {"_id" : 123123123});
    },
    publish : function (context,req, opts, cb) {
        return cb (null, true)
    },
    addTemplate : function (context,req, cb) {
        return cb (null, true)
    },

    uploadTemplateInputsFile : function (context, req, {}, {}, cb) {
        return cb (null, true)
    },


};

const lib = {
    initBLModel: function (module, cb) {
        return cb(null, iactModel);
    },
    checkReturnError: function (req, mainCb, data, cb) {
        if (data.error) {
            if (typeof (data.error) === 'object') {
                req.soajs.log.error(data.error);
            }
            return mainCb({"code": data.code, "msg": data.config.errors[data.code]});
        } else {
            if (cb) {
                return cb();
            }
        }
    }
};

req.soajs = {};
req.soajs.validator = core.validator;


describe("Testing iacIndex", function () {

    it("Fail - check iac -- invalid Shema", function (done) {
        req.soajs.validator = {
            Validator: function () {
                return {
                    validate: function () {
                        return {
                            valid : false,
                            errors: ['error1']
                        }
                    }
                };
            }
        };
        iacIndex.check(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it("Success - check iac -- valid local template -- Same template name", function (done) {
        req.soajs.validator = {
            Validator: function () {
                return {
                    validate: function () {
                        return {
                            valid : true,
                        }
                    }
                };
            }
        };
        iacIndex.check(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it("Fail - check iac -- invalid template", function (done) {
        let iacTemplate2 = soajsUtils.cloneObj(iacTemplate);
        iacTemplate2.content.iac = {};
        let context2 = {
            config : {
                HA : {
                    blacklist : ["dummy data for test"]
                }
            },
            template : iacTemplate2,
            deployer : {
                execute: function(opts, name, functionName, cb) {
                    return cb(null, [{
                        name : 'CharlesTestt'
                    }])
                }
            },
            errors : [],
            dbData : {}};
        iacIndex.check(req, context2, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it("Success - check iac -- valid local template -- Same infra name", function (done) {
        req.soajs.validator = {
            Validator: function () {
                return {
                    validate: function () {
                        return {
                            valid : true,
                        }
                    }
                };
            }
        };
        iacIndex.check(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it("Success - check iac -- valid External template -- Same template name", function (done) {
       let iacTemplate2 = soajsUtils.cloneObj(iacTemplate);
        iacTemplate2.content.iac.data[0].location = 'external';
        let context2 = {
            config : {
                HA : {
                    blacklist : ["dummy data for test"]
                }
            },
            template : iacTemplate2,
            deployer : {
                execute: function(opts, name, functionName, cb) {
                    return cb(null, [{
                        name : 'CharlesTestt'
                    }])
                }
            },
            errors : [],
            dbData : {}};
        req.soajs.validator = {
            Validator: function () {
                return {
                    validate: function () {
                        return {
                            valid : true,
                        }
                    }
                };
            }
        };

        iacIndex.check(req, context2, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it ("Success - merge iac recipe", function (done) {
        req.soajs.inputmaskData = {
            correction : {
                iac : [{"old": "CharlesTestt", "new" : "Test Recipe", "provider" : "test"}]
            }
        };
        iacIndex.merge(req, context, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it("Success - Save iac -- local template", function (done) {
        let iacTemplate2 = soajsUtils.cloneObj(iacTemplate);
        iacTemplate2.content.iac.data[0].location = 'local';
        let context2 = {
            config : {
                HA : {
                    blacklist : ["dummy data for test"]
                }
            },
            template : iacTemplate2,
            deployer : {
                execute: function(opts, name, functionName, cb) {
                    return cb(null, [{
                        name : 'CharlesTestt'
                    }])
                }
            },
            errors : [],
            dbData : {}};
        req.soajs.validator = {
            Validator: function () {
                return {
                    validate: function () {
                        return {
                            valid : true,
                        }
                    }
                };
            }
        };

        iacIndex.save(req, context2, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it("Success - Save iac -- external template", function (done) {
        let iacTemplate2 = soajsUtils.cloneObj(iacTemplate);
        iacTemplate2.content.iac.data[0].location = 'external';
        let context2 = {
            config : {
                HA : {
                    blacklist : ["dummy data for test"]
                }
            },
            template : iacTemplate2,
            deployer : {
                execute: function(opts, name, functionName, cb) {
                    return cb(null, [{
                        name : 'CharlesTestt'
                    }])
                }
            },
            errors : [],
            dbData : {}};
        req.soajs.validator = {
            Validator: function () {
                return {
                    validate: function () {
                        return {
                            valid : true,
                        }
                    }
                };
            }
        };

        iacIndex.save(req, context2, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it("Success - Export iac -- local template", function (done) {
        let iacTemplate2 = soajsUtils.cloneObj(iacTemplate);
        req = {
            soajs : {
                inputmaskData : {
                    iac : ['5b85338274589144d1995eff']
                }
            }
        };

        iacTemplate2.content.iac.data[0].location = 'local';
        let context2 = {
            config : {
                HA : {
                    blacklist : ["dummy data for test"]
                }
            },
            template : iacTemplate2,
            deployer : {
                execute: function(opts, name, functionName, cb) {
                    return cb(null, [{
                        name : 'CharlesTestt'
                    }])
                }
            },
            errors : [],
            dbData : {}};
        req.soajs.validator = {
            Validator: function () {
                return {
                    validate: function () {
                        return {
                            valid : true,
                        }
                    }
                };
            }
        };

        iacIndex.export(req, context2, lib, async, mongoStub, function (result, error) {
            done();
        });
    });

    it("Success - Export iac -- external template", function (done) {
        let iacTemplate2 = soajsUtils.cloneObj(iacTemplate);
        req = {
            soajs : {
                inputmaskData : {
                    external : {
                        iac: ["test__kassouf"]
                    }
                }
            }
        };

        iacTemplate2.content.iac.data[0].location = 'local';
        let context2 = {
            config : {
                HA : {
                    blacklist : ["dummy data for test"]
                }
            },
            template : iacTemplate2,
            deployer : {
                execute: function(opts, name, functionName, cb) {
                    return cb(null, [{
                        name : 'CharlesTestt'
                    }])
                }
            },
            errors : [],
            dbData : {}};
        req.soajs.validator = {
            Validator: function () {
                return {
                    validate: function () {
                        return {
                            valid : true,
                        }
                    }
                };
            }
        };
        stubStatusUtils();
        iacIndex.export(req, context2, lib, async, mongoStub, function (result, error) {
            done();
        });
    });
});
