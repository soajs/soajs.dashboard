#!/bin/bash
#Continuous Delivery Script

_CD_GIT_REPO=""
_CD_GIT_BRANCH=""

_CD_AUTH_KEY_LOGIN=${SOAJS_CD_AUTH_KEY_LOGIN}
_CD_AUTH_KEY_API=${SOAJS_CD_AUTH_KEY_API}
_CD_AUTH_USERNAME=${SOAJS_CD_AUTH_USERNAME}
_CD_AUTH_PASSWORD=${SOAJS_CD_AUTH_PASSWORD}

_CD_DASHBOARD_DOMAIN=${SOAJS_CD_DASHBOARD_DOMAIN}
_CD_DASHBOARD_PROTOCOL=${SOAJS_CD_DASHBOARD_PROTOCOL} || 'https'
_CD_DASHBOARD_PORT=${SOAJS_CD_DASHBOARD_PORT} || '443'
_CD_DASHBOARD_API_ROUTE=${SOAJS_CD_API_ROUTE}

_TOKEN=""

_JQ_LINUX_URL="https://github.com/stedolan/jq/releases/download/jq-1.5/jq-linux64"
_JQ_DARWIN_URL="https://github.com/stedolan/jq/releases/download/jq-1.5/jq-osx-amd64"

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

    getDependencies
}

#function that installs dependencies required by the script
function getDependencies() {
    echo 'Downloading dependencies ...'

    local platform=$(uname)
    local jqURL=""
    if [ "$platform" == "Darwin" ]; then
        jqURL=${_JQ_DARWIN_URL}
    elif [ "$platform" == "Linux" ]; then
        jqURL=${_JQ_LINUX_URL}
    fi

    curl -L -o jq $jqURL
    chmod +x ./jq
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
    [[ -z "${_CD_AUTH_KEY_LOGIN}" || -z "${_CD_AUTH_KEY_API}" || -z "${_CD_AUTH_USERNAME}" || -z "${_CD_AUTH_PASSWORD}" ]] && (echo 'Error: Missing AUTH env variables, CD will not be triggered!'; exit 0)
    [[  -z "${_CD_DASHBOARD_DOMAIN}" || -z "${_CD_DASHBOARD_API_ROUTE}" ]] && (echo 'Error: Missing DASHBOARD environment variables!, CD will not be triggered!'; exit 0)
}

#function that hits the CD api endpoint
function trigger() {
    echo 'Triggering CD ...'
    login
    triggerCD
}

#function that logs in to dashboard
function login() {
    _AUTH_RESPONSE=$(curl -s \
            -X GET ${_CD_DASHBOARD_PROTOCOL}://${_CD_DASHBOARD_DOMAIN}:${_CD_DASHBOARD_PORT}/oauth/authorization \
            -H 'key:'${_CD_AUTH_KEY_LOGIN})

    local auth_value=$(echo ${_AUTH_RESPONSE} | ./jq '.data' | sed -e 's/"//g')
    if [ -z "$auth_value" ]; then
        echo 'Error: unable to get authorization, API response: '${_AUTH_RESPONSE}
        exit 0
    fi

    local cred="Authorization:$auth_value"
    local key="key:"${_CD_AUTH_KEY_LOGIN}
    _TOKEN_RESPONSE=$(curl \
            -s -X POST ${_CD_DASHBOARD_PROTOCOL}://${_CD_DASHBOARD_DOMAIN}:${_CD_DASHBOARD_PORT}/oauth/token \
            -H "$key" -H "$cred" -H 'Content-Type: application/json' \
            -d '{"grant_type": "password", "username": "'${_CD_AUTH_USERNAME}'", "password": "'${_CD_AUTH_PASSWORD}'"}')

    local token_value=$(echo ${_TOKEN_RESPONSE} | ./jq '.access_token' | sed -e 's/"//g')
    if [ -z "$token_value" ]; then
        echo 'Error: unable to get access token, API response: '${_TOKEN_RESPONSE}
        exit 0
    fi

    _TOKEN=$token_value
}

#function that calls CD API endpoint
function triggerCD() {
    local key="key:"${_CD_AUTH_KEY_API}
    local _CD=$(curl -s \
            -X POST ${_CD_DASHBOARD_PROTOCOL}://${_CD_DASHBOARD_DOMAIN}:${_CD_DASHBOARD_PORT}${_CD_DASHBOARD_API_ROUTE}?access_token=${_TOKEN} \
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
