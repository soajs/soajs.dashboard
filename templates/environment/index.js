module.exports = {
	nginxRecipe : function(){
		return {
			"deployOptions": {
				"image": {
					"prefix": "", // updated in code
					"name": "", // updated in code
					"tag": "", // updated in code
					"pullPolicy": "IfNotPresent"
				},
				"readinessProbe": {
					"httpGet": {
						"path": "/",
						"port": "http"
					},
					"initialDelaySeconds": 5,
					"timeoutSeconds": 2,
					"periodSeconds": 5,
					"successThreshold": 1,
					"failureThreshold": 3
				},
				"restartPolicy": {
					"condition": "any",
					"maxAttempts": 5
				},
				"container": {
					"network": "soajsnet",
					"workingDir": "/opt/soajs/deployer/"
				},
				"voluming": {
					"volumes": []
				},
				"ports": [
					{
						"name": "http",
						"target": 80,
						"isPublished": true,
						"published": "", // updated in code
						"preserveClientIP": true
					}
				]
			},
			"buildOptions": {
				"env": {
					"SOAJS_ENV": {
						"type": "computed",
						"value": "$SOAJS_ENV"
					},
					"SOAJS_NX_DOMAIN": {
						"type": "computed",
						"value": "$SOAJS_NX_DOMAIN"
					},
					"SOAJS_NX_API_DOMAIN": {
						"type": "computed",
						"value": "$SOAJS_NX_API_DOMAIN"
					},
					"SOAJS_NX_SITE_DOMAIN": {
						"type": "computed",
						"value": "$SOAJS_NX_SITE_DOMAIN"
					},
					"SOAJS_NX_CONTROLLER_NB": {
						"type": "computed",
						"value": "$SOAJS_NX_CONTROLLER_NB"
					},
					"SOAJS_NX_CONTROLLER_IP": {
						"type": "computed",
						"value": "$SOAJS_NX_CONTROLLER_IP_N"
					},
					"SOAJS_NX_CONTROLLER_PORT": {
						"type": "computed",
						"value": "$SOAJS_NX_CONTROLLER_PORT"
					},
					"SOAJS_DEPLOY_HA": {
						"type": "computed",
						"value": "$SOAJS_DEPLOY_HA"
					},
					"SOAJS_HA_NAME": {
						"type": "computed",
						"value": "$SOAJS_HA_NAME"
					}
				},
				"cmd": {
					"deploy": {
						"command": [
							"bash"
						],
						"args": [
							"-c",
							"node index.js -T nginx"
						]
					}
				}
			}
		};
	},
	
	mainPackage : function(){
		return {
			'code': "MAIN",
			'name': "Main Package",
			'description': "This is a public package for the portal product that allows users to login to the portal interface.",
			'_TTL': (7 * 24).toString(),
			"acl": {
				"portal": {
					"oauth": {
						"access": false,
						"apisPermission": "restricted",
						"get": {
							"apis": {
								"/authorization": {}
							}
						},
						"post": {
							"apis": {
								"/token": {}
							}
						},
						"delete": {
							"apis": {
								"/accessToken/:token": {
									"access": true
								},
								"/refreshToken/:token": {
									"access": true
								}
							}
						}
					},
					"urac": {
						"access": false,
						"apisPermission": "restricted",
						"get": {
							"apis": {
								"/forgotPassword": {},
								"/changeEmail/validate": {},
								"/checkUsername": {},
								"/account/getUser": {
									"access": true
								},
								"/join/validate": {}
							}
						},
						"post": {
							"apis": {
								"/resetPassword": {},
								"/account/changePassword": {
									"access": true
								},
								"/account/changeEmail": {
									"access": true
								},
								"/account/editProfile": {
									"access": true
								},
								"/join": {}
							}
						}
					}
				}
			}
		};
	},
	userPackage: function (){
		return {
			'code': "USER",
			'name': "User Package",
			'description': "This package offers the minimum ACL needed to execute management operation in the portal interface.",
			'_TTL': (7 * 24).toString(),
			"acl": {
				"portal": {
					"oauth": {
						"access": true
					},
					"urac": {
						"access": true,
						"apisPermission": "restricted",
						"get": {
							"apis": {
								"/account/getUser": {},
								"/changeEmail/validate": {},
								"/checkUsername": {},
								"/forgotPassword": {},
								"/owner/admin/users/count": {},
								"/owner/admin/listUsers": {},
								"/owner/admin/changeUserStatus": {},
								"/owner/admin/getUser": {},
								"/owner/admin/group/list": {},
								"/owner/admin/tokens/list": {},
								"/tenant/getUserAclInfo": {},
								"/tenant/list": {}
							}
						},
						"post": {
							"apis": {
								"/account/changePassword": {},
								"/account/changeEmail": {},
								"/account/editProfile": {},
								"/resetPassword": {},
								"/owner/admin/addUser": {},
								"/owner/admin/editUser": {},
								"/owner/admin/editUserConfig": {},
								"/owner/admin/group/add": {},
								"/owner/admin/group/edit": {},
								"/owner/admin/group/addUsers": {}
							}
						},
						"delete": {
							"apis": {
								"/owner/admin/group/delete": {},
								"/owner/admin/tokens/delete": {}
							}
						}
					}
				}
			}
		}
	},
	tenant: function (){
		return {
			'type': "client",
			'code': "PRTL",
			'name': "Portal Tenant",
			'email': "me@localhost.com",
			'description': "Portal Tenant that uses the portal product and its packages",
			'tag': "portal"
		};
	},
	tenantApplicationKeyConfig : function(){
		return {
			'envCode': 'PORTAL', // updated in code
			'config': {
				"oauth": {
					"loginMode": "urac"
				},
				"commonFields": {
					"mail": {
						"from": "me@localhost.com",
						"transport": {
							"type": "sendmail",
							"options": {}
						}
					}
				},
				"urac": {
					"hashIterations": 1024,
					"seedLength": 32,
					"link": {
						"addUser": "", // updated in code
						"changeEmail": "", // updated in code
						"forgotPassword": "", // updated in code
						"join": "" // updated in code
					},
					"tokenExpiryTTL": 172800000,
					"validateJoin": true,
					"mail": {
						"join": {
							"subject": "Welcome to SOAJS",
							"path": "/opt/soajs/node_modules/soajs.urac/mail/urac/join.tmpl"
						},
						"forgotPassword": {
							"subject": "Reset Your Password at SOAJS",
							"path": "/opt/soajs/node_modules/soajs.urac/mail/urac/forgotPassword.tmpl"
						},
						"addUser": {
							"subject": "Account Created at SOAJS",
							"path": "/opt/soajs/node_modules/soajs.urac/mail/urac/addUser.tmpl"
						},
						"changeUserStatus": {
							"subject": "Account Status changed at SOAJS",
							"path": "/opt/soajs/node_modules/soajs.urac/mail/urac/changeUserStatus.tmpl"
						},
						"changeEmail": {
							"subject": "Change Account Email at SOAJS",
							"path": "/opt/soajs/node_modules/soajs.urac/mail/urac/changeEmail.tmpl"
						}
					}
				}
			}
		};
	}
};