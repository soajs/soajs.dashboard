'use strict';
var searches = [
	{
		"id": "Metricbeat-Docker",
		"_type": "search",
		"_shipper": "metricbeat",
		"_source": {
			"env": "%env%",
			"columns": [
				"_source"
			],
			"description": "",
			"hits": 0,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"metricbeat-%env%-*\",\"filter\":[],\"highlight\":{\"pre_tags\":[\"@kibana-highlighted-field@\"],\"post_tags\":[\"@/kibana-highlighted-field@\"],\"fields\":{\"*\":{}},\"require_field_match\":false,\"fragment_size\":2147483647},\"query\":{\"query_string\":{\"query\":\"metricset.module:docker\",\"analyze_wildcard\":true}}}"
			},
			"sort": [
				"@timestamp",
				"desc"
			],
			"title": "Metricbeat Docker",
			"version": 1
		}
	},
	{
		"id": "Service-Errors",
		"_type": "search",
		"_shipper": "metricbeat",
		
		"_source": {
			"env": "%env%",
			"title": "Service Errors",
			"description": "",
			"hits": 0,
			"columns": [
				"docker.container.name",
				"err.name",
				"err.code",
				"msg",
				"err.stack"
			],
			"sort": [
				"@timestamp",
				"desc"
			],
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"filebeat-*-%env%-*\",\"highlightAll\":true,\"query\":{\"query_string\":{\"analyze_wildcard\":true,\"query\":\"level:ERROR\"}},\"filter\":[]}"
			}
		}
	}
];

module.exports = searches;