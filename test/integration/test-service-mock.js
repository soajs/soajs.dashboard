'use strict';
const express = require('express');

const sApp = express();
const mApp = express();

function startServer(serverConfig, callback) {
    let mReply = {
        'result': true,
        'ts': Date.now(),
        'service': {
            'service': serverConfig.name,
            'type': 'rest',
            'route': "/heartbeat"
        }
    };
    let sReply = {
        'result': true,
        'data': {
            'firstname': "test",
            'lastname': "service",
            'type': "endpoint"
        }
    };

    mApp.get('/heartbeat', (req, res) => res.json(mReply));

    sApp.get("/testGet", (req, res) => res.json(sReply));

    sApp.post("/testPost", (req, res) => {
        let response = {
          "added": true
        };
        return res.json(response);
    });

    sApp.put("/testPut", (req, res) => {
        let response = {
            "updated": true
        };
        return res.json(response);
    });

    sApp.delete("/testDelete", (req, res) => {
        let response = {
            "deleted": true
        };
        return res.json(response);
    });

    sApp.patch("/testPatch", (req, res) => {
        let response = {
            "patched": true
        };
        return res.json(response);
    });

    sApp.head("/testHead", (req, res) => {
        let response = {
            "head": true
        };
        return res.json(response);
    });

    sApp.options("/testOther", (req, res) => {
        let response = {
            "other": true
        };
        return res.json(response);
    });

    let sAppServer = sApp.listen(serverConfig.s.port, () => console.log(`${serverConfig.name} service listening on port ${serverConfig.s.port}!`));
    let mAppServer = mApp.listen(serverConfig.m.port, () => console.log(`${serverConfig.name} service listening on port ${serverConfig.m.port}!`));

    return callback(
        {
            "sAppServer": sAppServer,
            "mAppServer": mAppServer,
            "name": serverConfig.name
        }
    )
}

function stopServer(config) {
    console.log("Stopping server");

    config.mAppServer.close((err) => {
        console.log("...sAppServer: " + config.name);
    });

    config.sAppServer.close((err) => {
        console.log("...mAppServer: " + config.name);
    });
}

module.exports = {
    startServer: startServer,
    stopServer: stopServer
};