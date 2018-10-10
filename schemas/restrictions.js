"use strict";

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
							"properties:": {}
						},
						"productization": {
							"type": "object",
							"required": false,
							"properties:": {}
						},
						"daemonGroups": {
							"type": "object",
							"required": false,
							"properties:": {}
						},
						"tenant": {
							"type": "object",
							"required": false,
							"properties:": {}
						},
						"custom_registry": {
							"type": "object",
							"required": false,
							"properties:": {}
						},
						"deployments": {
							"type": "object",
							"required": false,
							"properties:": {
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
					"additionalProperties": false,
					"properties": {
						"deployment": {
							"type": "object",
							"required": true,
							"additionalProperties": false,
							"properties": {
								"container": {
									"type": "object",
									"required": true,
									"additionalProperties": true,
									"properties": {}
								}
							}
						},
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
							"properties:": {}
						},
						"productization": {
							"type": "object",
							"required": false,
							"properties:": {}
						},
						"tenant": {
							"type": "object",
							"required": false,
							"properties:": {}
						},
						"custom_registry": {
							"type": "object",
							"required": false,
							"properties:": {}
						},
						"endpoints": {
							"type": "object",
							"required": false,
							"properties:": {}
						},
						"secrets": {
							"type": "object",
							"required": false,
							"properties:": {}
						},
						"daemonGroups": {
							"type": "object",
							"required": false,
							"properties:": {}
						},
						"iac": {
							"type": "object",
							"required": false,
							"properties:": {}
						},
						"deployments": {
							"type": "object",
							"required": false,
							"properties:": {
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
													"properties:": {
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
													"properties:": {
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
								"enum": ["container"]
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

let singleInfra = {
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
							
							}
						},
						"selectedDriver": {
							"type": "string",
							"required": true,
							"enum": ["vm"]
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
							"properties:": {}
						},
						"productization": {
							"type": "object",
							"required": false,
							"properties:": {}
						},
						"tenant": {
							"type": "object",
							"required": false,
							"properties:": {}
						},
						"custom_registry": {
							"type": "object",
							"required": false,
							"properties:": {}
						},
						"endpoints": {
							"type": "object",
							"required": false,
							"properties:": {}
						},
						"secrets": {
							"type": "object",
							"required": false,
							"properties:": {}
						},
						"daemonGroups": {
							"type": "object",
							"required": false,
							"properties:": {}
						},
						"iac": {
							"type": "object",
							"required": false,
							"properties:": {}
						},
						"deployments": {
							"type": "object",
							"required": false,
							"properties:": {
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
													"properties:": {
														"restriction": {
															"type": "object",
															"required": false,
															"properties": {
																"type": {
																	"type": "string",
																	"required": false,
																	"enum": ["vm"]
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
													"properties:": {
														"restriction": {
															"type": "object",
															"required": false,
															"properties": {
																"type": {
																	"type": "string",
																	"required": false,
																	"enum": ["vm"]
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
					"required": false,
					"properties": {
						"deployment": {
							"type": "array",
							"items": {
								"type": "string",
								"enum": ["vm"]
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

module.exports = {
	"manual": manual,
	"container": container,
	"singleInfra": singleInfra
};
