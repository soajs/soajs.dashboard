#!/bin/bash
#Continuous Delivery Script

_CD_GIT_REPO=""
_CD_GIT_BRANCH=""

_CD_AUTH_KEY=${SOAJS_CD_AUTH_KEY}
_CD_DEPLOY_TOKEN=${SOAJS_CD_DEPLOY_TOKEN}

_CD_DASHBOARD_DOMAIN=${SOAJS_CD_DASHBOARD_DOMAIN}
_CD_DASHBOARD_PROTOCOL=${SOAJS_CD_DASHBOARD_PROTOCOL} || 'https'
_CD_DASHBOARD_PORT=${SOAJS_CD_DASHBOARD_PORT} || '443'
_CD_DASHBOARD_API_ROUTE=${SOAJS_CD_API_ROUTE}

#function that checks if required tools are found and installs any if not found
function init() {
    echo 'Initializing CD script ...'
    if [ -n "${TRAVIS}" ]; then
        echo 'Travis build environment detected ...'
        initTravis
    elif [ -n "${DRONE}" ]; then
        echo 'Drone build environment detected ...'
        initDrone
    else
        echo 'Error: Current build environment is not supported, CD will not be triggered.'
        exit 0
    fi
}

#function that sets enviornment variables based on Travis syntax
function initTravis() {
    _CD_GIT_REPO=$(echo ${TRAVIS_REPO_SLUG} | cut -d "/" -f 1)
    _CD_GIT_BRANCH=${TRAVIS_BRANCH}
}

#function that sets enviornment variables based on Drone syntax
function initDrone() {
    _CD_GIT_REPO=${DRONE_REPO_NAME}
    _CD_GIT_BRANCH=${DRONE_REPO_BRANCH}
}

#function that checks that the required environment variables are present
function checkEnvs() {
    echo 'Checking if required environment variables are set ...'
    if [ -z "${_CD_AUTH_KEY}" ] || [ -z "${_CD_DEPLOY_TOKEN}" ]; then
        echo 'Error: Missing AUTH env variables, CD will not be triggered!'
        exit 0
    fi

    if [  -z "${_CD_DASHBOARD_DOMAIN}" ] || [ -z "${_CD_DASHBOARD_API_ROUTE}" ]; then
        echo 'Error: Missing DASHBOARD environment variables!, CD will not be triggered!'
        exit 0
    fi
}

#function that hits the CD api endpoint
function trigger() {
    echo 'Triggering CD ...'

    local key="key:"${_CD_AUTH_KEY}
    local _CD=$(curl -s \
            -X POST ${_CD_DASHBOARD_PROTOCOL}://${_CD_DASHBOARD_DOMAIN}:${_CD_DASHBOARD_PORT}${_CD_DASHBOARD_API_ROUTE}?deploy_token=${_CD_DEPLOY_TOKEN} \
            -H "$key" -H 'Content-Type: application/json' \
            -d '{"repo": "'${_CD_GIT_REPO}'", "branch": "'${_CD_GIT_BRANCH}'"}')

    echo ${_CD}
}

#Entrypoint
function run() {
    init
    checkEnvs
    trigger

    echo 'Done.'
}

run
