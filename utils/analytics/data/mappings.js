'use strict';
//done
var mappings = [
    {
        "_type": 'mapping',
        "_name": 'topbeat',
        "_json": {
	        "mappings": {
		        "_default_": {
			        "_all": {
				        "enabled": true,
				        "norms": {
					        "enabled": false
				        }
			        },
			        "dynamic_templates": [
				        {
					        "template1": {
						        "mapping": {
							        "doc_values": true,
							        "ignore_above": 1024,
							        "index": "not_analyzed",
							        "type": "{dynamic_type}"
						        },
						        "match": "*"
					        }
				        }
			        ],
			        "properties": {
				        "@timestamp": {
					        "type": "date"
				        },
				        "cpu": {
				        	
					        "properties": {
						        "system_p": {
							        "doc_values": "true",
							        "type": "float"
						        },
						        "user_p": {
							        "doc_values": "true",
							        "type": "float"
						        }
					        }
				        },
				        "fs": {
					        "properties": {
						        "used_p": {
							        "doc_values": "true",
							        "type": "float"
						        }
					        }
				        },
				        "load": {
					        "properties": {
						        "load1": {
							        "doc_values": "true",
							        "type": "float"
						        },
						        "load15": {
							        "doc_values": "true",
							        "type": "float"
						        },
						        "load5": {
							        "doc_values": "true",
							        "type": "float"
						        }
					        }
				        },
				        "mem": {
					        "properties": {
						        "actual_used_p": {
							        "doc_values": "true",
							        "type": "float"
						        },
						        "used_p": {
							        "doc_values": "true",
							        "type": "float"
						        }
					        }
				        },
				        "proc": {
					        "properties": {
						        "cpu": {
							        "properties": {
								        "user_p": {
									        "doc_values": "true",
									        "type": "float"
								        }
							        }
						        },
						        "mem": {
							        "properties": {
								        "rss_p": {
									        "doc_values": "true",
									        "type": "float"
								        }
							        }
						        }
					        }
				        },
				        "swap": {
					        "properties": {
						        "used_p": {
							        "doc_values": "true",
							        "type": "float"
						        }
					        }
				        }
			        }
		        }
	        },
	        "settings": {
		        "index": {
		        	"refresh_interval": "5s"
		        }
	        },
	        "template": "topbeat-*"
        }
    },
	{
		"_type": 'mapping',
		"_name": 'filebeat',
		"_json": {
			"mappings": {
				"_default_": {
					"_all": {
						"enabled": true,
						"norms": {
							"enabled": false
						}
					},
					"dynamic_templates": [
						{
							"template1": {
								"mapping": {
									"doc_values": true,
									"ignore_above": 1024,
									"index": "not_analyzed",
									"type": "{dynamic_type}"
								},
								"match": "*"
							}
						}
					],
					"properties": {
						"@timestamp": {
							"type": "date"
						},
						"message": {
							"type": "string",
							"index": "analyzed"
						},
						"offset": {
							"type": "long",
							"doc_values": "true"
						},
						"bytes": {
							"type": "long"
						},
						"geoip"  : {
							"type" : "object",
							"dynamic": true,
							"properties": {
								"ip": {
									"type": "ip"
								},
								"latitude": {
									"type": "float"
								},
								"location": {
									"type": "geo_point"
								},
								"longitude": {
									"type": "float"
								}
							}
						}
					}
				}
			},
			"settings": {
				"index": {
					"refresh_interval": "5s"
				}
			},
			"template": "filebeat-*"
		}
	}
];

module.exports = mappings;