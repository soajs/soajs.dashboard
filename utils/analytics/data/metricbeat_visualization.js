'use strict';
var visuals = [
	{
		"id": "Time-Picker",
		"_type": "visualization",
		"_shipper": "metricbeat",
		"_source": {
			"title": "Date/Time Picker",
			"visState": "{\"title\":\"time picker\",\"type\":\"time\",\"params\":{\"enable_quick\":true,\"enable_relative\":true,\"enable_absolut\":true,\"enable_animation\":true},\"aggs\":[],\"listeners\":{}}",
			"uiStateJSON": "{}",
			"description": "",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"query\":{\"query_string\":{\"query\":\"*\",\"analyze_wildcard\":true}},\"filter\":[]}"
			}
		}
	},
	{
		"id": "Docker-Container",
		"_type": "visualization",
		"_shipper": "metricbeat",
		"_source": {
			"title": "Container Stats",
			"visState": "{\"title\":\"Container Stats\",\"type\":\"table\",\"params\":{\"perPage\":1,\"showMeticsAtAllLevels\":false,\"showPartialRows\":false,\"showTotal\":false,\"sort\":{\"columnIndex\":null,\"direction\":null},\"totalFunc\":\"sum\"},\"aggs\":[{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"bucket\",\"params\":{\"field\":\"docker.container.name\",\"size\":1,\"order\":\"desc\",\"orderBy\":\"_term\",\"customLabel\":\"Name\"}},{\"id\":\"3\",\"enabled\":true,\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"docker.cpu.total.pct\",\"customLabel\":\"CPU usage (%)\"}},{\"id\":\"4\",\"enabled\":true,\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"docker.diskio.total\",\"customLabel\":\"DiskIO\"}},{\"id\":\"11\",\"enabled\":true,\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"docker.memory.usage.total\",\"customLabel\":\"Mem used\"}},{\"id\":\"10\",\"enabled\":true,\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"docker.memory.limit\",\"customLabel\":\"Mem Limit\"}},{\"id\":\"6\",\"enabled\":true,\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"docker.memory.rss.total\",\"customLabel\":\"Mem RSS\"}},{\"id\":\"8\",\"enabled\":true,\"type\":\"sum\",\"schema\":\"metric\",\"params\":{\"field\":\"docker.network.in.bytes\",\"customLabel\":\"Net In\"}},{\"id\":\"7\",\"enabled\":true,\"type\":\"sum\",\"schema\":\"metric\",\"params\":{\"field\":\"docker.network.out.bytes\",\"customLabel\":\"Net Out\"}}],\"listeners\":{}}",
			"uiStateJSON": "{\"vis\":{\"params\":{\"sort\":{\"columnIndex\":1,\"direction\":\"asc\"}}}}",
			"description": "",
			"savedSearchId": "Metricbeat-Docker",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[]}"
			}
		}
	},
	{
		"id": "Docker-Containers",
		"_type": "visualization",
		"_shipper": "metricbeat",
		"_source": {
			"title": "Containers Stats",
			"visState": "{\"title\":\"Containers Stats\",\"type\":\"table\",\"params\":{\"perPage\":5,\"showMeticsAtAllLevels\":false,\"showPartialRows\":false,\"showTotal\":false,\"sort\":{\"columnIndex\":null,\"direction\":null},\"totalFunc\":\"sum\"},\"aggs\":[{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"bucket\",\"params\":{\"field\":\"docker.container.name\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"_term\",\"customLabel\":\"Name\"}},{\"id\":\"3\",\"enabled\":true,\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"docker.cpu.total.pct\",\"customLabel\":\"CPU usage (%)\"}},{\"id\":\"4\",\"enabled\":true,\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"docker.diskio.total\",\"customLabel\":\"DiskIO\"}},{\"id\":\"11\",\"enabled\":true,\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"docker.memory.usage.total\",\"customLabel\":\"Mem Used\"}},{\"id\":\"10\",\"enabled\":true,\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"docker.memory.limit\",\"customLabel\":\"Mem Limit\"}},{\"id\":\"6\",\"enabled\":true,\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"docker.memory.rss.total\",\"customLabel\":\"Mem RSS\"}},{\"id\":\"8\",\"enabled\":true,\"type\":\"sum\",\"schema\":\"metric\",\"params\":{\"field\":\"docker.network.in.bytes\",\"customLabel\":\"Net In\"}},{\"id\":\"7\",\"enabled\":true,\"type\":\"sum\",\"schema\":\"metric\",\"params\":{\"field\":\"docker.network.out.bytes\",\"customLabel\":\"Net Out\"}}],\"listeners\":{}}",
			"uiStateJSON": "{\"vis\":{\"params\":{\"sort\":{\"columnIndex\":1,\"direction\":\"asc\"}}}}",
			"description": "",
			"savedSearchId": "Metricbeat-Docker",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[]}"
			}
		}
	},
	{
		"id": "Docker-CPU-usage",
		"_type": "visualization",
		"_shipper": "metricbeat",
		"_source": {
			"description": "",
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\n  \"filter\": [],\n  \"index\": \"metricbeat-*\",\n  \"highlight\": {\n    \"pre_tags\": [\n      \"@kibana-highlighted-field@\"\n    ],\n    \"post_tags\": [\n      \"@/kibana-highlighted-field@\"\n    ],\n    \"fields\": {\n      \"*\": {}\n    },\n    \"require_field_match\": false,\n    \"fragment_size\": 2147483647\n  },\n  \"query\": {\n    \"query_string\": {\n      \"query\": \"metricset.module:docker AND metricset.name:cpu\",\n      \"analyze_wildcard\": true\n    }\n  }\n}"
			},
			"title": "CPU usage",
			"uiStateJSON": "{}",
			"version": 1,
			"visState": "{\n  \"title\": \"Docker CPU usage\",\n  \"type\": \"area\",\n  \"params\": {\n    \"addLegend\": true,\n    \"addTimeMarker\": false,\n    \"addTooltip\": true,\n    \"defaultYExtents\": false,\n    \"interpolate\": \"linear\",\n    \"legendPosition\": \"top\",\n    \"mode\": \"stacked\",\n    \"scale\": \"linear\",\n    \"setYExtents\": false,\n    \"shareYAxis\": true,\n    \"smoothLines\": true,\n    \"times\": [],\n    \"yAxis\": {}\n  },\n  \"aggs\": [\n    {\n      \"id\": \"1\",\n      \"enabled\": true,\n      \"type\": \"percentiles\",\n      \"schema\": \"metric\",\n      \"params\": {\n        \"field\": \"docker.cpu.total.pct\",\n        \"percents\": [\n          75\n        ],\n        \"customLabel\": \"Total CPU time\"\n      }\n    },\n    {\n      \"id\": \"2\",\n      \"enabled\": true,\n      \"type\": \"date_histogram\",\n      \"schema\": \"segment\",\n      \"params\": {\n        \"field\": \"@timestamp\",\n        \"interval\": \"auto\",\n        \"customInterval\": \"2h\",\n        \"min_doc_count\": 1,\n        \"extended_bounds\": {}\n      }\n    },\n    {\n      \"id\": \"3\",\n      \"enabled\": true,\n      \"type\": \"terms\",\n      \"schema\": \"group\",\n      \"params\": {\n        \"field\": \"docker.container.name\",\n        \"size\": 5,\n        \"order\": \"desc\",\n        \"orderBy\": \"1.75\",\n        \"customLabel\": \"Container name\"\n      }\n    }\n  ],\n  \"listeners\": {}\n}"
		}
	},
	{
		"id": "Docker-memory-usage",
		"_type": "visualization",
		"_shipper": "metricbeat",
		"_source": {
			"description": "",
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[],\"index\":\"metricbeat-*\",\"highlight\":{\"pre_tags\":[\"@kibana-highlighted-field@\"],\"post_tags\":[\"@/kibana-highlighted-field@\"],\"fields\":{\"*\":{}},\"require_field_match\":false,\"fragment_size\":2147483647},\"query\":{\"query_string\":{\"query\":\"metricset.module:docker AND metricset.name:memory\",\"analyze_wildcard\":true}}}"
			},
			"title": "Memory usage",
			"uiStateJSON": "{}",
			"version": 1,
			"visState": "{\"title\":\"Docker memory usage\",\"type\":\"area\",\"params\":{\"shareYAxis\":true,\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"top\",\"smoothLines\":false,\"scale\":\"linear\",\"interpolate\":\"linear\",\"mode\":\"stacked\",\"times\":[],\"addTimeMarker\":false,\"defaultYExtents\":false,\"setYExtents\":false,\"yAxis\":{}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"docker.memory.usage.total\",\"customLabel\":\"Memory\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"interval\":\"auto\",\"customInterval\":\"2h\",\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"docker.container.name\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\",\"customLabel\":\"Container name\"}}],\"listeners\":{}}"
		}
	},
	{
		"id": "Docker-Network-IO",
		"_type": "visualization",
		"_shipper": "metricbeat",
		"_source": {
			"description": "",
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"filter\":[],\"index\":\"metricbeat-*\",\"highlight\":{\"pre_tags\":[\"@kibana-highlighted-field@\"],\"post_tags\":[\"@/kibana-highlighted-field@\"],\"fields\":{\"*\":{}},\"require_field_match\":false,\"fragment_size\":2147483647},\"query\":{\"query_string\":{\"query\":\"metricset.module:docker AND metricset.name:network\",\"analyze_wildcard\":true}}}"
			},
			"title": "Network IO",
			"uiStateJSON": "{}",
			"version": 1,
			"visState": "{\"title\":\"Docker Network IO\",\"type\":\"area\",\"params\":{\"addLegend\":true,\"addTimeMarker\":false,\"addTooltip\":true,\"defaultYExtents\":false,\"interpolate\":\"linear\",\"legendPosition\":\"top\",\"mode\":\"stacked\",\"scale\":\"linear\",\"setYExtents\":false,\"shareYAxis\":true,\"smoothLines\":true,\"times\":[],\"yAxis\":{}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"docker.network.in.bytes\",\"customLabel\":\"IN bytes\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"interval\":\"auto\",\"customInterval\":\"2h\",\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"docker.container.name\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\",\"customLabel\":\"Container name\"}},{\"id\":\"4\",\"enabled\":true,\"type\":\"max\",\"schema\":\"metric\",\"params\":{\"field\":\"docker.network.out.bytes\",\"customLabel\":\"OUT bytes\"}}],\"listeners\":{}}"
		}
	}
];

module.exports = visuals;