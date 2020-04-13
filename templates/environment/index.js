'use strict';

module.exports = [
	{
		"name": "Blank Environment",
		"type": "_template",
		"description": "This templates will create a blank environment.",
		"link": "https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/400392194/Blank+Environment",
		"logo": "modules/dashboard/templates/images/file-empty.png",
		"content": {},
		"deploy": {}
	},
	{
		"name": "SOAJS Microservices Environment",
		"type": "_template",
		"description": "This template will create an environment with SOAJS API Gateway configured, deployed & ready to use. You can leverage this environment to deploy microservices.",
		"link": "https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/400588803/SOAJS+Microservices+Environment",
		"logo": "modules/dashboard/templates/images/soajs.png",
		"restriction": {
			"deployment": ["container"]
		},
		"content": {
			"deployments": {
				"repo": {
					"controller": {
						"label": "SOAJS API Gateway",
						"name": "controller",
						"type": "service",
						"category": "soajs",
						"gitSource": {
							"provider": "github",
							"owner": "soajs",
							"repo": "soajs.controller"
						},
						"deploy": {
							"recipes": {
								"available": [],
								"default": "SOAJS API Gateway Recipe"
							},
							"memoryLimit": 500,
							"mode": "replicated",
							"replicas": 1
						}
					}
				}
			}
		},
		"deploy": {
			"deployments": {
				"pre": {},
				"steps": {
					"deployments__dot__repo__dot__controller": {}
				},
				"post": {}
			}
		}
	},
	{
		"name": "NGINX & SOAJS Microservices Environment",
		"type": "_template",
		"description": "This template will create an environment with Nginx & SOAJS API Gateway configured, deployed & ready to use. You can leverage this environment to deploy microservices & static content.",
		"link": "https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/400424978/NGINX+SOAJS+Microservices+Environment",
		"logo": "modules/dashboard/templates/images/soajs-nginx.png",
		"restriction": {
			"deployment": ["container"]
		},
		"content": {
			"deployments": {
				"repo": {
					"controller": {
						"label": "SOAJS API Gateway",
						"name": "controller",
						"type": "service",
						"category": "soajs",
						"gitSource": {
							"provider": "github",
							"owner": "soajs",
							"repo": "soajs.controller"
						},
						"deploy": {
							"recipes": {
								"available": [],
								"default": "SOAJS API Gateway Recipe"
							},
							"memoryLimit": 500,
							"mode": "replicated",
							"replicas": 1
						}
					}
				},
				"resources": {
					"nginx": {
						"label": "Nginx",
						"type": "server",
						"category": "nginx",
						"ui": "${REF:resources/drivers/server/nginx}",
						"deploy": {
							"recipes": {
								"available": [],
								"default": "Nginx Recipe"
							},
							"memoryLimit": 300,
							"mode": "global"
						}
					}
				}
			}
		},
		"deploy": {
			"deployments": {
				"pre": {},
				"steps": {
					"deployments__dot__repo__dot__controller": {}
				},
				"post": {
					"deployments__dot__resources__dot__nginx": {}
				}
			}
		}
	},
	{
		"name": "SOAJS Portal Environment",
		"type": "_template",
		"description": "This templates will create an environment with SOAJS PORTAL (SOAJS API Gateway, URAC, oAuth & Nginx) configured, deployed and ready to use.",
		"link": "https://soajsorg.atlassian.net/wiki/spaces/DSBRD/pages/400457732/SOAJS+Portal+Environment",
		"logo": "modules/dashboard/templates/images/soajs-portal.png",
		"reusable": false,
		"restriction": {
			"deployment": ["container"]
		},
		"content": {
			"productization": {
				"data": [
					{
						"code": "PORTAL",
						"name": "Portal Product",
						"description": "This product provides access to the portal interface and microservices.",
						"packages": [
							{
								"code": "MAIN",
								"name": "Main Public Package",
								"description": "Basic Package Description",
								"_TTL": 6 * 36000 * 1000,
								"acl": {
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
							},
							{
								"code": "USER",
								"name": "User Logged in Package",
								"description": "Main Package Description",
								"_TTL": 6 * 3600 * 1000,
								"acl": {
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
						]
					}
				]
			},
			"tenant": {
				"data": [
					{
						"code": "PRTL",
						"name": "Portal Tenant",
						"description": "Portal Main Tenant",
						"oauth": {},
						"applications": [
							{
								"product": "PORTAL",
								"package": "PORTAL_MAIN",
								"description": "Test main application",
								"_TTL": 7 * 24 * 3600 * 1000,
								"keys": [
									{
										"extKeys": [
											{
												"device": {},
												"geo": {},
												"dashboardAccess": false,
												"expDate": null
											}
										],
										"config": {
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
												"hashIterations": 12,
												"link": {
													"addUser": "%domain%/#/setNewPassword",
													"changeEmail": "%domain%/#/changeEmail/validate",
													"forgotPassword": "%domain%/#/resetPassword",
													"join": "%domain%/#/join/validate"
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
									}
								]
							},
							{
								"product": "PORTAL",
								"package": "PORTAL_USER",
								"description": "Test Logged In user Application",
								"_TTL": 7 * 24 * 3600 * 1000,
								"keys": [
									{
										"extKeys": [
											{
												"device": {},
												"geo": {},
												"dashboardAccess": true,
												"expDate": null
											}
										],
										"config": {
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
												"hashIterations": 12,
												"link": {
													"addUser": "%domain%/#/setNewPassword",
													"changeEmail": "%domain%/#/changeEmail/validate",
													"forgotPassword": "%domain%/#/resetPassword",
													"join": "%domain%/#/join/validate"
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
									}
								]
							}
						]
					}
				]
			},
			"deployments": {
				"repo": {
					"controller": {
						"label": "SOAJS API Gateway",
						"name": "controller",
						"type": "service",
						"category": "soajs",
						"gitSource": {
							"provider": "github",
							"owner": "soajs",
							"repo": "soajs.controller"
						},
						"deploy": {
							"recipes": {
								"available": [],
								"default": "SOAJS API Gateway Recipe"
							},
							"memoryLimit": 500,
							"mode": "replicated",
							"replicas": 1
						}
					},
					"urac": {
						"label": "SOAJS URAC",
						"name": "urac",
						"type": "service",
						"category": "soajs",
						"gitSource": {
							"provider": "github",
							"owner": "soajs",
							"repo": "soajs.urac"
						},
						"deploy": {
							"recipes": {
								"available": [],
								"default": "SOAJS Service Recipe"
							},
							"memoryLimit": 500,
							"mode": "replicated",
							"replicas": 1
						}
					},
					"oauth": {
						"label": "SOAJS oAuth",
						"name": "oauth",
						"type": "service",
						"category": "soajs",
						"gitSource": {
							"provider": "github",
							"owner": "soajs",
							"repo": "soajs.oauth"
						},
						"deploy": {
							"recipes": {
								"available": [],
								"default": "SOAJS Service Recipe"
							},
							"memoryLimit": 500,
							"mode": "replicated",
							"replicas": 1
						}
					}
				},
				"resources": {
					"nginx": {
						"label": "Nginx",
						"type": "server",
						"category": "nginx",
						"ui": "${REF:resources/drivers/server/nginx}",
						"deploy": {
							"recipes": {
								"available": ["Portal Nginx Recipe"],
								"default": "Portal Nginx Recipe"
							},
							"memoryLimit": 300,
							"mode": "global"
						}
					},
					"mongo": {
						"label": "Mongo",
						"type": "cluster",
						"category": "mongo",
						"ui": "${REF:resources/drivers/server/mongo}",
						"deploy": {
							"recipes": {
								"available": [],
								"default": "Mongo Recipe"
							},
							"memoryLimit": 500,
							"mode": "replicated",
							"replicas": 1
						}
					}
				}
			}
		},
		"deploy": {
			"database": {
				"pre": {},
				"steps": {
					"productization": {
						"ui": {
							"readOnly": true
						}
					},
					"tenant": {
						"ui": {
							"readOnly": true
						}
					}
				},
				"post": {}
			},
			"deployments": {
				"pre": {
					"deployments__dot__resources__dot__mongo": {}
				},
				"steps": {
					"deployments__dot__repo__dot__controller": {},
					"deployments__dot__repo__dot__urac": {},
					"deployments__dot__repo__dot__oauth": {}
				},
				"post": {
					"deployments__dot__resources__dot__nginx": {}
				}
			}
		}
	}
];