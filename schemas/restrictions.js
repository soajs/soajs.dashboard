"use strict";
const soajsUtils = require("soajs.core.libs").utils;
let manual = {
	"type": "object",
	"required": true,
	"properties": {
		"data": {
			"type": "object",
			"required": false,
			"additionalProperties": true,
			"properties": {
				"deploy": {
					"type": "object",
					"required": true,
					"additionalProperties": false,
					"properties": {
						"deployment": {
							"type": "object",
							"required": true,
							"additionalProperties": false,
							"properties": {
								"manual": {
									"type": "object",
									"required": true,
									"additionalProperties": false,
									"properties": {
										"nodes": {
											"type": "string",
											"required": true,
											"enum": ["127.0.0.1"]
										}
									}
								}
							}
						},
						"selectedDriver": {
							"type": "string",
							"required": true,
							"enum": ["manual"]
						}
					}
				},
			}
		},
		"template": {
			"type": "object",
			"required": true,
			"additionalProperties": false,
			"properties": {
				"content": {
					"type": "object",
					"required": false,
					"additionalProperties": false,
					"properties": {
						"recipes": {
							"type": "object",
							"required": false,
							"properties": {}
						},
						"productization": {
							"type": "object",
							"required": false,
							"properties": {}
						},
						"daemonGroups": {
							"type": "object",
							"required": false,
							"properties": {}
						},
						"tenant": {
							"type": "object",
							"required": false,
							"properties": {}
						},
						"custom_registry": {
							"type": "object",
							"required": false,
							"properties": {}
						},
						"deployments": {
							"type": "object",
							"required": false,
							"properties": {
								"resources": {
									"type": "object",
									"patternProperties": {
										"\w+": {
											"type": "object",
											"required": false,
											"properties": {
												"label": {"type": "string", "required": true},
												"type": {"type": "string", "required": true},
												"category": {"type": "string", "required": true},
												"ui": {"type": "string", "required": true},
												"locked": {"type": "string", "required": false},
												"plugged": {"type": "string", "required": false},
												"shared": {"type": "string", "required": false},
												"config": {"type": "object", "required": false},
												"limit": {"type": "number", "min": 0, "required": false},
												"deploy": {"type": "null", "required": false}
											},
											"additionalProperties": false
										}
									}
								}
							}
						}
					}
				},
				"deploy": {
					"type": "object",
					"required": false,
					"additionalProperties": false,
					"properties": {}
				},
				"restrictions": {
					"type": "object",
					"required": false,
					"properties": {
						"deployment": {
							"type": "array",
							"items": {
								"type": "string",
								"enum": ["manual"]
							},
							"required": false,
							"uniqueItems": true
						}
					},
					"additionalProperties": true
				}
			}
		}
	},
	"additionalProperties": false
};

let container = {
	"type": "object",
	"required": true,
	"properties": {
		"data": {
			"type": "object",
			"required": false,
			"additionalProperties": true,
			"properties": {
				"deploy": {
					"type": "object",
					"required": true,
					"additionalProperties": true,
					"properties": {
						"selectedDriver": {
							"type": "string",
							"required": true,
							"enum": ["container"]
						}
					}
				},
			}
		},
		"template": {
			"type": "object",
			"required": true,
			"additionalProperties": false,
			"properties": {
				"content": {
					"type": "object",
					"required": false,
					"additionalProperties": false,
					"properties": {
						"recipes": {
							"type": "object",
							"required": false,
							"properties": {}
						},
						"productization": {
							"type": "object",
							"required": false,
							"properties": {}
						},
						"tenant": {
							"type": "object",
							"required": false,
							"properties": {}
						},
						"custom_registry": {
							"type": "object",
							"required": false,
							"properties": {}
						},
						"endpoints": {
							"type": "object",
							"required": false,
							"properties": {}
						},
						"secrets": {
							"type": "object",
							"required": false,
							"properties": {}
						},
						"daemonGroups": {
							"type": "object",
							"required": false,
							"properties": {}
						},
						"iac": {
							"type": "object",
							"required": false,
							"properties": {}
						},
						"deployments": {
							"type": "object",
							"required": false,
							"properties": {
								"resources": {
									"type": "object",
									"patternProperties": {
										"\w+": {
											"type": "object",
											"required": false,
											"properties": {
												"label": {"type": "string", "required": true},
												"type": {"type": "string", "required": true},
												"category": {"type": "string", "required": true},
												"ui": {"type": "string", "required": true},
												"locked": {"type": "string", "required": false},
												"plugged": {"type": "string", "required": false},
												"shared": {"type": "string", "required": false},
												"config": {"type": "object", "required": false},
												"limit": {"type": "number", "min": 0, "required": false},
												"deploy": {
													"type": "object",
													"required": false,
													"properties": {
														"restriction": {
															"type": "object",
															"required": false,
															"properties": {
																"type": {
																	"type": "string",
																	"required": false,
																	"enum": ["container"]
																},
																"technology": {
																	"type": "string",
																	"required": false,
																	"enum": ["docker", "kubernetes"]
																}
															}
														}
													}
												}
											},
											"additionalProperties": false
										}
									}
								},
								"repo": {
									"type": "object",
									"patternProperties": {
										"\w+": {
											"type": "object",
											"required": false,
											"properties": {
												"label": {"type": "string", "required": true},
												"type": {"type": "string", "required": true},
												"category": {"type": "string", "required": true},
												"gitSource": {"type": "object", "required": true},
												"limit": {"type": "number", "min": 0, "required": false},
												"deploy": {
													"type": "object",
													"required": false,
													"properties": {
														"restriction": {
															"type": "object",
															"required": false,
															"properties": {
																"type": {
																	"type": "string",
																	"required": false,
																	"enum": ["container"]
																},
																"technology": {
																	"type": "string",
																	"required": false,
																	"enum": ["docker", "kubernetes"]
																}
															}
														}
													}
												}
											},
											"additionalProperties": false
										}
									}
								}
							}
						}
					}
				},
				"deploy": {
					"type": "object",
					"required": false,
					"additionalProperties": true,
					"properties": {}
				},
				"restrictions": {
					"type": "object",
					"required": true,
					"properties": {
						"deployment": {
							"type": "array",
							"items": {
								"type": "string",
								"enum": ["container"]
							},
							"required": false,
							"uniqueItems": true
						}
					},
					"driver": {
						"type": "array",
						"items": {
							"type": "string" //container.docker | container.kubernetes ....
						},
						"required": false,
						"uniqueItems": true
					},
					"allowInfraReuse": {
						"type": "boolean"
					},
					"additionalProperties": false
				}
			}
		}
	},
	"additionalProperties": false
};

let imfv =  {
	"data": {
		"type": "object",
		"required": false,
		"additionalProperties": true,
		"properties": {
			"deploy": {
				"type": "object",
				"required": true,
				"additionalProperties": true,
				"properties": {
					"selectedDriver": {
						"type": "string",
						"required": true,
						"enum": ["vm", "container"]
					}
				}
			},
		}
	},
	"template": {
		"type": "object",
		"required": true,
		"additionalProperties": true,
		"properties": {
			"restrictions": {
				"type": "object",
				"required": true,
				"properties": {
					"deployment": {
						"type": "array",
						"items": {
							"type": "string",
							"enum": []
						},
						"required": false,
						"uniqueItems": true
					}
				},
				"driver": {
					"type": "array",
					"items": {
						"type": "string"
					},
					"required": false,
					"uniqueItems": true
				},
				"allowInfraReuse": {
					"type": "boolean"
				},
				"infra": {
					"type": "array",
					"items": {
						"type": "string"
					},
					"required": true,
					"uniqueItems": true
				},
				"additionalProperties": false
			},
			"content": {
				"type": "object",
				"required": false,
				"additionalProperties": false,
				"properties": {
					"recipes": {
						"type": "object",
						"required": false,
						"properties": {}
					},
					"productization": {
						"type": "object",
						"required": false,
						"properties": {}
					},
					"tenant": {
						"type": "object",
						"required": false,
						"properties": {}
					},
					"custom_registry": {
						"type": "object",
						"required": false,
						"properties": {}
					},
					"endpoints": {
						"type": "object",
						"required": false,
						"properties": {}
					},
					"secrets": {
						"type": "object",
						"required": false,
						"properties": {}
					},
					"daemonGroups": {
						"type": "object",
						"required": false,
						"properties": {}
					},
					"iac": {
						"type": "object",
						"required": false,
						"properties": {}
					},
					"deployments": {
						"type": "object",
						"required": false,
						"properties": {
							"resources": {
								"type": "object",
								"patternProperties": {
									"\w+": {
										"type": "object",
										"required": false,
										"properties": {
											"label": {"type": "string", "required": true},
											"type": {"type": "string", "required": true},
											"category": {"type": "string", "required": true},
											"ui": {"type": "string", "required": true},
											"locked": {"type": "string", "required": false},
											"plugged": {"type": "string", "required": false},
											"shared": {"type": "string", "required": false},
											"config": {"type": "object", "required": false},
											"limit": {"type": "number", "min": 0, "required": false},
											"deploy": {
												"type": "object",
												"required": false,
												"properties": {
													"restriction": {
														"type": "object",
														"required": false,
														"properties": {
															"type": {
																"type": "string",
																"required": false,
																"enum": []
															}
														}
													}
												}
											}
										},
										"additionalProperties": false
									}
								}
							},
							"repo": {
								"type": "object",
								"patternProperties": {
									"\w+": {
										"type": "object",
										"required": false,
										"properties": {
											"label": {"type": "string", "required": true},
											"type": {"type": "string", "required": true},
											"category": {"type": "string", "required": true},
											"gitSource": {"type": "object", "required": true},
											"limit": {"type": "number", "min": 0, "required": false},
											"deploy": {
												"type": "object",
												"required": false,
												"properties": {
													"restriction": {
														"type": "object",
														"required": false,
														"properties": {
															"type": {
																"type": "string",
																"required": false,
																"enum": []
															}
														}
													}
												}
											}
										},
										"additionalProperties": false
									}
								}
							}
						}
					}
				}
			},
			"deploy": {
				"type": "object",
				"required": false,
				"additionalProperties": true,
				"properties": {}
			}
		}
	}
};
let options = ["vm", "container", "composite", null, "array"];
let singleInfra = {
	"type": "object",
	"required": true,
	"oneOf": []
};
options.forEach((opt)=>{
	switch (opt) {
		case "vm":
			imfv.template.properties.restrictions.properties.deployment.items.enum = ["vm"];
			imfv.template.properties.content.properties.deployments.properties.resources.patternProperties["\w+"].properties.deploy.properties.restriction.properties.type.enum = ["vm"];
			imfv.template.properties.content.properties.deployments.properties.repo.patternProperties["\w+"].properties.deploy.properties.restriction.properties.type.enum = ["vm"];
			singleInfra.oneOf.push({
				"properties": soajsUtils.cloneObj(imfv),
				"additionalProperties": false
			});
			break;
		case "container":
			imfv.template.properties.restrictions.properties.deployment.items.enum = ["container"];
			imfv.template.properties.content.properties.deployments.properties.resources.patternProperties["\w+"].properties.deploy.properties.restriction.properties.type.enum = ["container"];
			imfv.template.properties.content.properties.deployments.properties.repo.patternProperties["\w+"].properties.deploy.properties.restriction.properties.type.enum = ["container"];
			singleInfra.oneOf.push({
				"properties": soajsUtils.cloneObj(imfv),
				"additionalProperties": false
			});
			break;
		case "composite":
			imfv.template.properties.restrictions.properties.deployment.items.enum = ["container", "vm"];
			imfv.template.properties.content.properties.deployments.properties.resources.patternProperties["\w+"].properties.deploy.properties.restriction.properties.type.enum = ["container", "vm"];
			imfv.template.properties.content.properties.deployments.properties.repo.patternProperties["\w+"].properties.deploy.properties.restriction.properties.type.enum = ["container", "vm"];
			singleInfra.oneOf.push({
				"properties": soajsUtils.cloneObj(imfv),
				"additionalProperties": false
			});
			break;
		case "array":
			imfv.template.properties.restrictions.properties.deployment.items.enum = ["container", "vm"];
			imfv.template.properties.content.properties.deployments.properties.resources.patternProperties["\w+"].properties.deploy.properties.restriction.properties.type.enum = ["container", "vm"];
			imfv.template.properties.content.properties.deployments.properties.repo.patternProperties["\w+"].properties.deploy.properties.restriction.properties.type.enum = ["container", "vm"];
			singleInfra.oneOf.push({
				"properties": soajsUtils.cloneObj(imfv),
				"additionalProperties": false
			});
			break;
		case null:
			imfv.template.properties.restrictions.properties.deployment.items.enum = ["container", "vm"];
			imfv.template.properties.content.properties.deployments.properties.resources.patternProperties["\w+"].properties.deploy.properties.restriction.properties.type.enum = ["container", "vm"];
			imfv.template.properties.content.properties.deployments.properties.repo.patternProperties["\w+"].properties.deploy.properties.restriction.properties.type.enum = ["container", "vm"];
			singleInfra.oneOf.push({
				"properties": soajsUtils.cloneObj(imfv),
				"additionalProperties": false
			});
			break;
	}
});

module.exports = {
	"manual": manual,
	"container": container,
	"singleInfra": singleInfra
};
