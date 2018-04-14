"use strict";
let colName = 'daemon_grpconf';
const driver = {

    "check": function (req, context, lib, async, BL, callback) {
        let template = context.template;
        let schema = {
            'type': 'object',
            "properties" : {
                "soajs_project": {
                    "source": ['query.soajs_project'],
                    "required": false,
                    "validation": {
                        "type": "string"
                    }
                },
                'groupName': {
                    'source': ['body.groupName'],
                    'required': true,
                    'validation': {
                        'type': 'string'
                    }
                },
                'daemon': {
                    'source': ['body.daemon'],
                    'required': true,
                    'validation': {
                        'type': 'string'
                    }
                },
                'cronTime': {
                    'source': ['body.cronTime'],
                    'required': false,
                    'validation': {
                        'type': 'text'
                    }
                },
                'timeZone': {
                    'source': ['body.timeZone'],
                    'required': false,
                    'validation': {
                        'type': 'text'
                    }
                },
                'cronTimeDate': {
                    'source': ['body.cronTimeDate'],
                    'required': false,
                    'validation': {
                        'type': 'text'
                    }
                },
                'interval': {
                    'source': ['body.interval'],
                    'required': false,
                    'validation': {
                        'type': 'number'
                    }
                },
                'jobs': {
                    'source': ['body.jobs'],
                    'required': true,
                    'validation': {
                        'type': 'object'
                    }
                },
                'status': {
                    'source': ['body.status'],
                    'required': true,
                    'validation': {
                        'type': 'number',
                        enum: [0, 1]
                    }
                },
                'processing': {
                    'source': ['body.processing'],
                    'required': true,
                    'validation': {
                        'type': 'string',
                        'enum': ['parallel', 'sequential']
                    }
                },
                'order': {
                    'source': ['body.order'],
                    'required': true,
                    'validation': {
                        'type': 'array'
                    }
                },
                'solo': {
                    'source': ['body.solo'],
                    'required': true,
                    'validation': {
                        'type': 'boolean'
                    }
                },
                'type': {
                    "required": true,
                    "source": ["body.type"],
                    "validation": {
                        "type": "string",
                        "enum": ["interval", "cron", "once"]
                    }
                }
            },
        };

        let myValidator = new req.soajs.validator.Validator();

        if (template.content && template.content.daemonGroups && template.content.daemonGroups.data && Array.isArray(template.content.daemonGroups.data) && template.content.daemonGroups.data.length > 0) {
            let daemon = template.content.daemonGroups.data;
            async.eachSeries(daemon, (oneDaemon, cb) => {
                //validate if daemonGroups schema is valid
                let status = myValidator.validate(oneDaemon, schema);
                if (!status.valid) {
                    status.errors.forEach(function (err) {
                        context.errors.push({code: 173, msg: `<b>${oneDaemon.groupName}</b>: ` + err.stack, group: "Daemon Groups"})
                    });
                    return cb();
                }
                else {
                    let opts = {
                        //check what the list of daemon Groups needs
                        conditions: {
                            "daemonConfigGroup": oneDaemon.groupName,
                            "daemon": oneDaemon.daemon
                        },
                        collection: colName,
                    };
                    //  check if name exists
                    BL.model.countEntries(req.soajs, opts, function (error, count) {
                        lib.checkReturnError(req, cb, {config: context.config, error: error, code: 600}, () => {
                            if (count && count === 1) {
                                context.errors.push({
                                    "code": 967,
                                    "msg": `<b>${oneDaemon.groupName}</b> already exists => ${oneDaemon.groupName}`,
                                    'entry': {
                                        'name': oneDaemon.groupName,
                                        'type': 'daemon'
                                    }
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
        if (req.soajs.inputmaskData.correction && req.soajs.inputmaskData.correction.daemon) {
            req.soajs.inputmaskData.correction.daemon.forEach((oneDaemonInput) => {

                if (context.template.content.daemonGroups && context.template.content.daemonGroups.data) {
                    context.template.content.daemonGroups.data.forEach((oneTemplateDaemon) => {
                        if (oneDaemonInput.old === oneTemplateDaemon.groupName) {
                            oneTemplateDaemon.name = oneDaemonInput.new;
                        }
                    });

                    //check the other dependent sections
                    if (context.template.content.deployments) {
                        //check in repos
                        if (context.template.content.deployments.repo) {
                            for (let oneRepo in context.template.content.deployments.repo) {
                                if (context.template.content.deployments.repo[oneRepo].type && context.template.content.deployments.repo[oneRepo].type === 'daemon') {
                                    if (context.template.content.deployments.repo[oneRepo].group === oneDaemonInput.old) {
                                        context.template.content.deployments.repo[oneRepo].group = oneDaemonInput.new;
                                    }
                                }
                            }
                        }
                    }
                }
            });
        }

        return callback();
    },

    "save": function (req, context, lib, async, BL, callback) {

        if (context.template.content && context.template.content.daemonGroups && context.template.content.daemonGroups.data && Array.isArray(context.template.content.daemonGroups.data) && context.template.content.daemonGroups.data.length > 0) {
            lib.initBLModel('daemons', (error, daemonModel) => {
                lib.checkReturnError(req, callback, {config: context.config, error: error, code: 600}, () => {
                    let daemon = context.template.content.daemonGroups.data;
                    async.eachSeries(daemon, (oneDaemon, cb) => {
                        req.soajs.inputmaskData = {};
                        if (oneDaemon.interval) {
                            req.soajs.inputmaskData.interval = oneDaemon.interval;
                        }

                        if (oneDaemon.timeZone) {
                            req.soajs.inputmaskData.timeZone = oneDaemon.timeZone;
                        }

                        if (oneDaemon.cronTime) {
                            req.soajs.inputmaskData.cronTime = oneDaemon.cronTime;
                        }

                        if (oneDaemon.cronTimeDate) {
                            req.soajs.inputmaskData.cronTimeDate = oneDaemon.cronTimeDate;
                        }

                        req.soajs.inputmaskData.groupName = oneDaemon.groupName;
                        req.soajs.inputmaskData.daemon = oneDaemon.daemon;
                        req.soajs.inputmaskData.status = oneDaemon.status;
                        req.soajs.inputmaskData.processing = oneDaemon.processing;
                        req.soajs.inputmaskData.jobs = oneDaemon.jobs;
                        req.soajs.inputmaskData.order = oneDaemon.order;
                        req.soajs.inputmaskData.solo = oneDaemon.solo;

                        daemonModel.addGroupConfig(context.config, req, null, (error) => {
                            lib.checkReturnError(req, cb, {config: context.config, error: error, code: 600}, cb);
                        });
                    }, callback);
                });
            });
        } else {
            return callback();
        }
    },
};

module.exports = driver;