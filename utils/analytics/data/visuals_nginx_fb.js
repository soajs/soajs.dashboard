'use strict';
//done
var visuals = [
	{
		"id": "Agents-%injector%",
		"_type": "visualization",
		"_service": "nginx",
		"_shipper": "filebeat",
		"_injector": "env",
		"_source": {
			"title": "Agents",
			"visState": "{\"title\":\"Agents\",\"type\":\"pie\",\"params\":{\"addLegend\":true,\"addTooltip\":true,\"isDonut\":false,\"shareYAxis\":true},\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"user_agent.name\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\"}},{\"id\":\"3\",\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"user_agent.os_name\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\"}}],\"listeners\":{}}",
			"uiStateJSON": "{}",
			"description": "",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"filebeat-%serviceIndex%\",\"query\":{\"query_string\":{\"analyze_wildcard\":true,\"query\":\"*\"}},\"filter\":[]}"
			}
		}
	},
	{
		"id": "Bytes-%injector%",
		"_type": "visualization",
		"_service": "nginx",
		"_injector": "env",
		"_shipper": "filebeat",
		"_source": {
			"title": "Bytes",
			"visState": "{\"title\":\"Bytes\",\"type\":\"histogram\",\"params\":{\"shareYAxis\":true,\"addTooltip\":true,\"addLegend\":true,\"scale\":\"linear\",\"mode\":\"stacked\",\"times\":[],\"addTimeMarker\":false,\"defaultYExtents\":false,\"setYExtents\":false,\"yAxis\":{}},\"aggs\":[{\"id\":\"1\",\"type\":\"sum\",\"schema\":\"metric\",\"params\":{\"field\":\"bytes\"}},{\"id\":\"2\",\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"interval\":\"auto\",\"customInterval\":\"2h\",\"min_doc_count\":1,\"extended_bounds\":{}}}],\"listeners\":{}}",
			"uiStateJSON": "{}",
			"description": "",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"filebeat-%serviceIndex%\",\"query\":{\"query_string\":{\"query\":\"*\",\"analyze_wildcard\":true}},\"filter\":[]}"
			}
		}
	},
	{
		"id": "Top-10-Nginx-Errors-%injector%",
		"_type": "visualization",
		"_service": "nginx",
		"_shipper": "filebeat",
		"_injector": "env",
		"_source": {
			"title": "Top 10 Nginx Errors",
			"visState": "{\"title\":\"New Visualization\",\"type\":\"table\",\"params\":{\"perPage\":10,\"showPartialRows\":false,\"showMeticsAtAllLevels\":false},\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"terms\",\"schema\":\"bucket\",\"params\":{\"field\":\"errormessage\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\",\"customLabel\":\"Error Message\"}}],\"listeners\":{}}",
			"uiStateJSON": "{}",
			"description": "",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"filebeat-%serviceIndex%\",\"query\":{\"query_string\":{\"query\":\"*\",\"analyze_wildcard\":true}},\"filter\":[]}"
			}
		}
	},
	{
		"id": "Top-5-Methods-%injector%",
		"_type": "visualization",
		"_service": "nginx",
		"_shipper": "filebeat",
		"_injector": "env",
		"_source": {
			"title": "Top 5 Methods",
			"visState": "{\"title\":\"To 5 Methods\",\"type\":\"pie\",\"params\":{\"shareYAxis\":true,\"addTooltip\":true,\"addLegend\":true,\"isDonut\":false},\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"verb\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\",\"customLabel\":\"Top 5 Methods\"}}],\"listeners\":{}}",
			"uiStateJSON": "{}",
			"description": "",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"filebeat-%serviceIndex%\",\"query\":{\"query_string\":{\"query\":\"*\",\"analyze_wildcard\":true}},\"filter\":[]}"
			}
		}
	},
	{
		"id": "Top-10-Requests-%injector%",
		"_type": "visualization",
		"_service": "nginx",
		"_shipper": "filebeat",
		"_injector": "env",
		"_source": {
			"title": "Top 10 Requests",
			"visState": "{\"title\":\"Top 10 Requests\",\"type\":\"table\",\"params\":{\"perPage\":10,\"showPartialRows\":false,\"showMeticsAtAllLevels\":false},\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"terms\",\"schema\":\"bucket\",\"params\":{\"field\":\"request\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\"}}],\"listeners\":{}}",
			"uiStateJSON": "{}",
			"description": "",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"filebeat-%serviceIndex%\",\"query\":{\"query_string\":{\"query\":\"*\",\"analyze_wildcard\":true}},\"filter\":[]}"
			}
		}
	},
	{
		"id": "Top-10-IP's-%injector%",
		"_type": "visualization",
		"_service": "nginx",
		"_shipper": "filebeat",
		"_injector": "env",
		"_source": {
			"title": "Top 10 IP's",
			"visState": "{\"title\":\"Top 10 IP's\",\"type\":\"table\",\"params\":{\"perPage\":10,\"showPartialRows\":false,\"showMeticsAtAllLevels\":false},\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"terms\",\"schema\":\"bucket\",\"params\":{\"field\":\"geoip.ip\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\",\"customLabel\":\"IP\"}},{\"id\":\"3\",\"type\":\"terms\",\"schema\":\"bucket\",\"params\":{\"field\":\"geoip.country_name\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\",\"customLabel\":\"Country\"}}],\"listeners\":{}}",
			"uiStateJSON": "{}",
			"description": "",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"filebeat-%serviceIndex%\",\"query\":{\"query_string\":{\"query\":\"*\",\"analyze_wildcard\":true}},\"filter\":[]}"
			}
		}
	},
	{
		"id": "Top-10-Countries-%injector%",
		"_type": "visualization",
		"_service": "nginx",
		"_shipper": "filebeat",
		"_injector": "env",
		"_source": {
			"title": "Top 10 Countries",
			"visState": "{\"title\":\"Top 20 Countries\",\"type\":\"pie\",\"params\":{\"shareYAxis\":true,\"addTooltip\":true,\"addLegend\":true,\"isDonut\":true},\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"geoip.country_name\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\",\"customLabel\":\"\"}}],\"listeners\":{}}",
			"uiStateJSON": "{}",
			"description": "",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"filebeat-%serviceIndex%\",\"query\":{\"query_string\":{\"query\":\"*\",\"analyze_wildcard\":true}},\"filter\":[]}"
			}
		}
	},
	{
		"id": "To-5-Methods-%injector%",
		"_type": "visualization",
		"_service": "nginx",
		"_shipper": "filebeat",
		"_injector": "env",
		"_source": {
			"title": "To 5 Methods",
			"visState": "{\"title\":\"New Visualization\",\"type\":\"pie\",\"params\":{\"shareYAxis\":true,\"addTooltip\":true,\"addLegend\":true,\"isDonut\":false},\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"verb\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\",\"customLabel\":\"Top 5 Methods\"}}],\"listeners\":{}}",
			"uiStateJSON": "{}",
			"description": "",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"filebeat-%serviceIndex%\",\"query\":{\"query_string\":{\"query\":\"*\",\"analyze_wildcard\":true}},\"filter\":[]}"
			}
		}
	},
	{
		"id": "TimeStamp-%injector%",
		"_type": "visualization",
		"_service": "nginx",
		"_shipper": "filebeat",
		"_injector": "env",
		"_source": {
			"title": "TimeStamp",
			"visState": "{\"title\":\"TimeStamp\",\"type\":\"histogram\",\"params\":{\"addLegend\":true,\"addTimeMarker\":false,\"addTooltip\":true,\"defaultYExtents\":false,\"mode\":\"stacked\",\"scale\":\"linear\",\"setYExtents\":false,\"shareYAxis\":true,\"times\":[],\"yAxis\":{}},\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"@timestamp\",\"interval\":\"auto\",\"customInterval\":\"2h\",\"min_doc_count\":1,\"extended_bounds\":{}}}],\"listeners\":{}}",
			"uiStateJSON": "{}",
			"description": "",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"filebeat-%serviceIndex%\",\"query\":{\"query_string\":{\"analyze_wildcard\":true,\"query\":\"*\"}},\"filter\":[]}"
			}
		}
	},
	{
		"id": "request-count-%injector%",
		"_type": "visualization",
		"_service": "nginx",
		"_injector": "env",
		"_shipper": "filebeat",
		"_source": {
			"title": "request count",
			"visState": "{\"title\":\"request count\",\"type\":\"metric\",\"params\":{\"handleNoResults\":true,\"fontSize\":\"33\"},\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Total Request Count\"}}],\"listeners\":{}}",
			"uiStateJSON": "{}",
			"description": "",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"filebeat-%serviceIndex%\",\"query\":{\"query_string\":{\"query\":\"*\",\"analyze_wildcard\":true}},\"filter\":[]}"
			}
		}
	},
	{
		"id": "Map-%injector%",
		"_type": "visualization",
		"_service": "nginx",
		"_shipper": "filebeat",
		"_injector": "env",
		"_source": {
			"title": "Map",
			"visState": "{\"title\":\"Map\",\"type\":\"tile_map\",\"params\":{\"mapType\":\"Scaled Circle Markers\",\"isDesaturated\":true,\"addTooltip\":true,\"heatMaxZoom\":16,\"heatMinOpacity\":0.1,\"heatRadius\":25,\"heatBlur\":15,\"heatNormalizeData\":true,\"wms\":{\"enabled\":false,\"url\":\"https://basemap.nationalmap.gov/arcgis/services/USGSTopo/MapServer/WMSServer\",\"options\":{\"version\":\"1.3.0\",\"layers\":\"0\",\"format\":\"image/png\",\"transparent\":true,\"attribution\":\"Maps provided by USGS\",\"styles\":\"\"}}},\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"geohash_grid\",\"schema\":\"segment\",\"params\":{\"field\":\"geoip.location\",\"autoPrecision\":true,\"precision\":2}}],\"listeners\":{}}",
			"uiStateJSON": "{}",
			"description": "",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"filebeat-%serviceIndex%\",\"query\":{\"query_string\":{\"query\":\"*\",\"analyze_wildcard\":true}},\"filter\":[]}"
			}
		}
	},
	{
		"id": "Sum-of-bytes-%injector%",
		"_type": "visualization",
		"_service": "nginx",
		"_shipper": "filebeat",
		"_injector": "env",
		"_source": {
			"title": "Sum of bytes",
			"visState": "{\"title\":\"Sum of bytes\",\"type\":\"metric\",\"params\":{\"handleNoResults\":true,\"fontSize\":\"33\"},\"aggs\":[{\"id\":\"1\",\"type\":\"sum\",\"schema\":\"metric\",\"params\":{\"field\":\"bytes\"}}],\"listeners\":{}}",
			"uiStateJSON": "{}",
			"description": "",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"filebeat-%serviceIndex%\",\"query\":{\"query_string\":{\"query\":\"*\",\"analyze_wildcard\":true}},\"filter\":[]}"
			}
		}
	},
	{
		"id": "nginx-access-count-%injector%",
		"_type": "visualization",
		"_service": "nginx",
		"_shipper": "filebeat",
		"_injector": "env",
		"_source": {
			"title": "nginx access count",
			"visState": "{\"title\":\"nginx access count\",\"type\":\"metric\",\"params\":{\"handleNoResults\":true,\"fontSize\":\"33\"},\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Access Count\"}}],\"listeners\":{}}",
			"uiStateJSON": "{}",
			"description": "",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"filebeat-%serviceIndex%\",\"query\":{\"query_string\":{\"query\":\"log_type:access\",\"analyze_wildcard\":true}},\"filter\":[]}"
			}
		}
	},
	{
		"id": "error-count-%injector%",
		"_type": "visualization",
		"_service": "nginx",
		"_shipper": "filebeat",
		"_injector": "env",
		"_source": {
			"title": "error count",
			"visState": "{\"title\":\"error count\",\"type\":\"metric\",\"params\":{\"fontSize\":\"33\",\"handleNoResults\":true},\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Error Count\"}}],\"listeners\":{}}",
			"uiStateJSON": "{}",
			"description": "",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"filebeat-%serviceIndex%\",\"query\":{\"query_string\":{\"query\":\"log_type:error\",\"analyze_wildcard\":true}},\"filter\":[]}"
			}
		}
	},
	{
		"id": "Response-Codes-%injector%",
		"_type": "visualization",
		"_service": "nginx",
		"_shipper": "filebeat",
		"_injector": "env",
		"_source": {
			"title": "Response Codes",
			"visState": "{\"title\":\"Response Codes\",\"type\":\"table\",\"params\":{\"perPage\":10,\"showPartialRows\":false,\"showMeticsAtAllLevels\":false},\"aggs\":[{\"id\":\"1\",\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"type\":\"terms\",\"schema\":\"bucket\",\"params\":{\"field\":\"response\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\",\"customLabel\":\"Response Code\"}}],\"listeners\":{}}",
			"uiStateJSON": "{}",
			"description": "",
			"version": 1,
			"kibanaSavedObjectMeta": {
				"searchSourceJSON": "{\"index\":\"filebeat-%serviceIndex%\",\"query\":{\"query_string\":{\"query\":\"*\",\"analyze_wildcard\":true}},\"filter\":[]}"
			}
		}
	}
];

module.exports = visuals;