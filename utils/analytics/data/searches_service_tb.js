'use strict';
//done
var searches = [
	{
		"id": "Filesystem-stats-%injector%",
		"_type": "search",
		"_shipper": "topbeat",
		"_service": "service",
		"_injector": "service",
		"_source": {
			"sort": [
				"@timestamp",
				"desc"
			],
			"hits": 0,
			"description": "",
			"title": "Filesystem stats",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"topbeat-%serviceIndex%\",\"query\":{\"query_string\":{\"query\":\"type: filesystem\",\"analyze_wildcard\":true}},\"highlight\":{\"pre_tags\":[\"@kibana-highlighted-field@\"],\"post_tags\":[\"@/kibana-highlighted-field@\"],\"fields\":{\"*\":{}},\"require_field_match\":false,\"fragment_size\":2147483647},\"filter\":[]}"
			},
			"columns": [
				"_source"
			]
		}
	},
	{
		"id": "Proc-stats-%injector%",
		"_type": "search",
		"_shipper": "topbeat",
		"_injector": "service",
		"_service": "service",
		"_source": {
			"sort": [
				"@timestamp",
				"desc"
			],
			"hits": 0,
			"description": "",
			"title": "Proc stats",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"topbeat-%serviceIndex%\",\"query\":{\"query_string\":{\"query\":\"type: process\",\"analyze_wildcard\":true}},\"highlight\":{\"pre_tags\":[\"@kibana-highlighted-field@\"],\"post_tags\":[\"@/kibana-highlighted-field@\"],\"fields\":{\"*\":{}},\"require_field_match\":false,\"fragment_size\":2147483647},\"filter\":[]}"
			},
			"columns": [
				"_source"
			]
		}
	},
	{
		"id": "Processes-%injector%",
		"_type": "search",
		"_shipper": "topbeat",
		"_service": "service",
		"_injector": "service",
		"_source": {
			"sort": [
				"@timestamp",
				"desc"
			],
			"hits": 0,
			"description": "",
			"title": "Processes",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"topbeat-%serviceIndex%\",\"query\":{\"query_string\":{\"query\":\"*\",\"analyze_wildcard\":true}},\"highlight\":{\"pre_tags\":[\"@kibana-highlighted-field@\"],\"post_tags\":[\"@/kibana-highlighted-field@\"],\"fields\":{\"*\":{}},\"fragment_size\":2147483647},\"filter\":[{\"meta\":{\"negate\":false,\"index\":\"topbeat-*\",\"key\":\"type\",\"value\":\"proc\",\"disabled\":false},\"query\":{\"match\":{\"type\":{\"query\":\"proc\",\"type\":\"phrase\"}}}}]}"
			},
			"columns": [
				"proc.name",
				"proc.cpu.user_p",
				"proc.mem.rss_p",
				"proc.mem.rss",
				"proc.state",
				"proc.cpu.start_time"
			]
		}
	},
	{
		"id": "System-stats-%injector%",
		"_type": "search",
		"_shipper": "topbeat",
		"_service": "service",
		"_injector": "service",
		"_source": {
			"sort": [
				"@timestamp",
				"desc"
			],
			"hits": 0,
			"description": "",
			"title": "System stats",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"topbeat-%serviceIndex%\",\"query\":{\"query_string\":{\"query\":\"type: system\",\"analyze_wildcard\":true}},\"highlight\":{\"pre_tags\":[\"@kibana-highlighted-field@\"],\"post_tags\":[\"@/kibana-highlighted-field@\"],\"fields\":{\"*\":{}},\"require_field_match\":false,\"fragment_size\":2147483647},\"filter\":[]}"
			},
			"columns": [
				"_source"
			]
		}
	},
	{
		"id": "System-wide-%injector%",
		"_type": "search",
		"_shipper": "topbeat",
		"_service": "service",
		"_injector": "service",
		"_source": {
			"sort": [
				"@timestamp",
				"desc"
			],
			"hits": 0,
			"description": "",
			"title": "System wide",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"topbeat-%serviceIndex%\",\"query\":{\"query_string\":{\"query\":\"*\",\"analyze_wildcard\":true}},\"highlight\":{\"pre_tags\":[\"@kibana-highlighted-field@\"],\"post_tags\":[\"@/kibana-highlighted-field@\"],\"fields\":{\"*\":{}},\"fragment_size\":2147483647},\"filter\":[{\"meta\":{\"negate\":false,\"index\":\"topbeat-*\",\"key\":\"type\",\"value\":\"system\",\"disabled\":false},\"query\":{\"match\":{\"type\":{\"query\":\"system\",\"type\":\"phrase\"}}}}]}"
			},
			"columns": [
				"beat.name",
				"cpu.user_p",
				"cpu.steal",
				"load.load1",
				"load.load5",
				"mem.used",
				"mem.used_p"
			]
		}
	}
];

module.exports = searches;