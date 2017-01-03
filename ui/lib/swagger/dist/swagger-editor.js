'use strict';


angular.module('swagger-editor', [
	'ng-model-options',
	'swagger-api-constants',
	'bootstrap-modal'
])
	
	.controller('EditorCtrl', [
		'$scope', 'SwaggerDatatypes', 'SwaggerCollectionFormats', 'PropertyConstants',
		
		function ($scope, SwaggerDatatypes, SwaggerCollectionFormats, PropertyConstants) {
			$scope.enums = {
				contentTypes: ['application/xml', 'application/json'],
				verbs: ['GET', 'POST', 'PUT', 'DELETE'],
				types: ['string', 'number'],
				paramTypes: ['path', 'query', 'body', 'header', 'form']
				
			};
			
			$scope.typeConstants = SwaggerDatatypes;
			
			$scope.collectionFormats = SwaggerCollectionFormats;
			
			$scope.propertyConstants = PropertyConstants;
			
			$scope.toggleCheck = function (property, type) {
				if (!$scope.doc[property]) {
					$scope.doc[property] = [];
				}
				
				if (property.indexOf(type) === -1) {
					$scope.doc[property].push(type);
				}
				else {
					$scope.doc[property].splice($scope.doc[property].indexOf(type), 1);
				}
			};
			
			$scope.addOperation = function (api) {
				api.operations = api.operations || [];
				api.operations.unshift({
					nickname: 'newOperation'
				});
			};
			
			$scope.editOperation = function (operation) {
				$scope.operationEdit = operation;
			};
			
			$scope.cancelEditOperation = function () {
				$scope.operationEdit = null;
			};
			
			$scope.deleteOp = function (api, index) {
				api.operations.splice(index, 1);
			};
			
			$scope.addResponse = function (operation) {
				operation.responseMessages = operation.responseMessages || [];
				operation.responseMessages.unshift({
					code: '',
					message: 'New response'
				});
			};
			
			$scope.deleteResponse = function (operation, index) {
				operation.responseMessages.splice(index, 1);
			};
			
			$scope.addParameter = function (operation) {
				operation.parameters = operation.parameters || [];
				operation.parameters.unshift({
					name: 'NewParameter',
				});
			};
			
			$scope.deleteParameter = function (operation, index) {
				operation.parameters.splice(index, 1);
			};
			
			$scope.changeObjectName = function (newName, oldName, parent) {
				if (newName === oldName) return;
				
				parent[newName] = parent[oldName];
				delete parent[oldName];
			};
			
			$scope.addApi = function (doc) {
				doc.apis = doc.apis || [];
				doc.apis.unshift({
					path: '/{new_api_name}'
				});
			};
			
			$scope.deleteApi = function (doc, index) {
				doc.apis.splice(index, 1);
			};
			
			$scope.addModel = function (doc) {
				doc.models = doc.models || {};
				doc.models['AddNew'] = {
					id: 'AddNew'
				};
			};
			
			$scope.deleteModel = function (doc, model) {
				delete doc.models[model.id];
			};
			
			$scope.addModelProp = function (model) {
				model.properties = model.properties || {};
				model.properties['add_new'] = {
					type: 'string',
					description: 'New Property'
				};
			};
			
			$scope.deleteModelProp = function (property, model) {
				delete model.properties[property.$$id];
			};
			
			$scope.getSubTypeChoices = function (doc, model) {
				model.subTypes = model.subTypes || [];
				var modelNames = [];
				var subTypes = [];
				for (var modelName in doc.models) {
					if (modelName !== model.id)
						if (doc.models[modelName].subTypes && doc.models[modelName].subTypes.length > 0)
							subTypes = subTypes.concat(doc.models[modelName].subTypes);
				}
				
				for (var modelName in doc.models) {
					if (modelName !== model.id) {
						if (doc.models[modelName].subTypes && doc.models[modelName].subTypes.length > 0) {
							if (doc.models[modelName].subTypes.indexOf(model.id) === -1 &&
								subTypes.indexOf(modelName) === -1)
								modelNames.push(modelName);
						}
						else {
							if (subTypes.indexOf(modelName) === -1)
								modelNames.push(modelName);
						}
					}
				}
				return modelNames;
			};
			
			$scope.showDiscriminator = function (doc, model) {
				var subTypes = [];
				for (var modelName in doc.models) {
					if (modelName !== model.id)
						if (doc.models[modelName].subTypes && doc.models[modelName].subTypes.length > 0)
							subTypes = subTypes.concat(doc.models[modelName].subTypes);
				}
				if (doc.models[model.id].subTypes && doc.models[model.id].subTypes.length > 0 &&
					subTypes.indexOf(model.id) === -1) {
					return true;
				}
				else {
					return false;
				}
			};
			
			$scope.addAuthorization = function (doc) {
				doc.authorizations = doc.authorizations || {};
				doc.authorizations['AddNew'] = [];
			};
			
			$scope.deleteAuthorization = function (doc, authorizationName) {
				delete doc.authorizations[authorizationName];
			};
			
			$scope.addAuthorizationProp = function (doc, authorizationName) {
				doc.authorizations[authorizationName] = doc.authorizations[authorizationName] || [];
				doc.authorizations[authorizationName].unshift({
					scope: 'add_new',
					description: 'New scope'
				});
			};
			
			$scope.deleteAuthorizationProp = function (doc, authorizationName, index) {
				doc.authorizations[authorizationName].splice(index, 1);
			};
			
			$scope.datatypeChange = function (property) {
				property.type = $scope.typeConstants[property.$$datatype].type;
				property.format = $scope.typeConstants[property.$$datatype].format;
			};
			
			$scope.setDatatype = function (property) {
				for (var key in $scope.typeConstants) {
					if ($scope.typeConstants[key].type === property.type && $scope.typeConstants[key].format === property.format) {
						property.$$datatype = key;
						break;
					}
				}
			};
		}
	])
	
	.directive('swaggerEditor', function () {
		return {
			restrict: 'E',
			templateUrl: 'editor/editor.html',
			scope: {
				doc: '='
			},
			controller: 'EditorCtrl'
		};
	});


'use strict';


angular.module('swagger-api-constants', [])
	
	
	.constant('SwaggerDatatypes', {
		"integer": {
			type: "integer",
			format: "int32"
		},
		
		"long": {
			type: "integer",
			format: "int64"
		},
		
		"float": {
			type: "number",
			formate: "float"
		},
		
		"double": {
			type: "number",
			format: "double"
		},
		
		"string": {
			type: "string"
		},
		
		"byte": {
			type: "string",
			format: "byte"
		},
		
		"boolean": {
			type: "boolean"
		},
		
		"date": {
			type: "string",
			format: "date"
		},
		
		"dateTime": {
			type: "string",
			format: "date-time"
		},
		
		"password": {
			type: "string",
			format: "password"
		},
		
		"array": {
			type: "array"
		}
		
	})
	.constant('SwaggerCollectionFormats', [
		"csv",
		"ssv",
		"tsv",
		"pipes"
	])
	.constant('PropertyConstants', [
		"name",
		"type",
		"format",
		"description"
	]);

'use strict';

// ngModel utility functions for projects with angularjs < 1.3
// Thanks to http://stackoverflow.com/a/11870341/1221279

angular.module('ng-model-options', [])
	
	.directive('ngModelOnBlur', function () {
		return {
			require: 'ngModel',
			link: function (scope, elm, attr, ngModelCtrl) {
				if (attr.type === 'radio' || attr.type === 'checkbox') return;
				
				elm.off('input keydown change');
				elm.on('blur', function () {
					scope.$apply(function () {
						ngModelCtrl.$setViewValue(elm.val());
						scope.$eval(attr.ngModelOnBlur);
					});
				});
			}
		};
	});
angular.module('bootstrap-modal', [])
	
	.directive('modal', function ($compile, $templateCache) {
		return {
			restrict: 'A',
			
			link: function (scope, element, attrs) {
				var modalEl = $compile($templateCache.get(attrs.modal))(scope);
				
				$(element).after(modalEl);
				
				element.bind('click', function (argument) {
					modalEl.modal('show');
				});
				
				scope.$close = function () {
					modalEl.modal('hide');
				}
			}
		};
	});


angular.module('swagger-editor').run(['$templateCache', function ($templateCache) {
	'use strict';
	
	$templateCache.put('editor/editor.html',
		"<form class=\"swagger-editor\">\n" +
		"\n" +
		"  <!-- Resource basic information -->\n" +
		"\n" +
		"  <div class=\"form-group\">\n" +
		"    <label>Resource path</label>\n" +
		"    <input type=\"text\" class=\"form-control\" ng-model=\"doc.resourcePath\">\n" +
		"  </div>\n" +
		"\n" +
		"  <div class=\"form-group\">\n" +
		"    <label>Produces</label>\n" +
		"    <label class=\"form-control\" ng-repeat=\"type in enums.contentTypes\">\n" +
		"      <input type=\"checkbox\" ng-checked=\"doc.produces && doc.produces.indexOf(type) != -1\" ng-click=\"toggleCheck('produces', type)\">\n" +
		"      {{type}}\n" +
		"    </label>\n" +
		"  </div>\n" +
		"\n" +
		"\n" +
		"  <div class=\"form-group\">\n" +
		"    <label>Consumes</label>\n" +
		"    <label class=\"form-control\" ng-repeat=\"type in enums.contentTypes\">\n" +
		"      <input type=\"checkbox\" ng-checked=\"doc.consumes && doc.consumes.indexOf(type) != -1\" ng-click=\"toggleCheck('consumes', type)\">\n" +
		"      {{type}}\n" +
		"    </label>\n" +
		"  </div>\n" +
		"\n" +
		"  <!-- Resource api list -->\n" +
		"\n" +
		"  <div class=\"form-group\">\n" +
		"    <label>APIs</label>\n" +
		"    <button type=\"button\" class=\"btn btn-default pull-right\" ng-click=\"addApi(doc)\"> Add </button>\n" +
		"    <div class=\"panel panel-default\" ng-repeat=\"api in doc.apis\">\n" +
		"      \n" +
		"      <div class=\"panel-heading\" ng-click=\"api.$$viewShow = !api.$$viewShow\">\n" +
		"        <span class=\"fa fa-chevron-{{ api.$$viewShow ? 'up' : 'down' }}\"> </span>\n" +
		"        <a href=\"\">{{ api.path }}</a>\n" +
		"        <button type=\"button\" class=\"pull-right\" ng-click=\"deleteApi(doc, $index)\">Delete</button>\n" +
		"      </div>\n" +
		"\n" +
		"      <div class=\"panel-body\" ng-show=\"api.$$viewShow\">\n" +
		"        \n" +
		"        <div class=\"form-group\">\n" +
		"          <label>Path</label>\n" +
		"          <input type=\"text\" class=\"form-control\" ng-model=\"api.path\">\n" +
		"        </div>\n" +
		"\n" +
		"        <div class=\"form-group\">\n" +
		"          <label> Description </label>\n" +
		"          <input type=\"text\" class=\"form-control\" ng-model=\"api.description\">\n" +
		"        </div>\n" +
		"\n" +
		"        <div class=\"form-group\">\n" +
		"          <div ng-show=\"!operationEdit\">\n" +
		"            <label>Operations</label>\n" +
		"            <button type=\"button\" class=\"btn btn-default pull-right\" ng-click=\"addOperation(api)\"> Add </button>\n" +
		"          </div>\n" +
		"\n" +
		"          <div ng-show=\"operationEdit\">\n" +
		"            <label>Edit Operation - {{ operationEdit.nickname }} </label>\n" +
		"            <button type=\"button\" class=\"btn btn-default pull-right\" ng-click=\"cancelEditOperation()\">Back to list</button>\n" +
		"          </div>\n" +
		"\n" +
		"          <div class=\"panel-body\" \n" +
		"            ng-show=\"!operationEdit\"\n" +
		"            ng-include=\"'editor/operations-list.html'\">\n" +
		"          </div>\n" +
		"\n" +
		"          <div class=\"panel-body\" \n" +
		"            ng-show=\"operationEdit\"\n" +
		"            ng-include=\"'editor/operation-editor.html'\">\n" +
		"          </div>\n" +
		"\n" +
		"        </div>\n" +
		"      </div>\n" +
		"    </div>\n" +
		"  </div>  \n" +
		"\n" +
		"  <!-- Resource model list -->\n" +
		"  <div class=\"form-group\">\n" +
		"    <label>Models</label>\n" +
		"    <button type=\"button\" class=\"btn btn-default pull-right\" ng-click=\"addModel(doc)\"> Add </button>\n" +
		"    <div class=\"panel panel-default\" ng-repeat=\"(modelName, model) in doc.models\">\n" +
		"      \n" +
		"      <div class=\"panel-heading\" ng-click=\"model.$$viewShow = !model.$$viewShow\">\n" +
		"        <span class=\"fa fa-chevron-{{ model.$$viewShow ? 'up' : 'down' }}\"> </span>\n" +
		"        <a href=\"\">{{ modelName }}</a>\n" +
		"        <button type=\"button\" class=\"pull-right\" ng-click=\"deleteModel(doc, model)\">Delete</button>\n" +
		"      </div>\n" +
		"\n" +
		"      <div class=\"panel-body\" ng-show=\"model.$$viewShow\">\n" +
		"        \n" +
		"        <div class=\"form-group\">\n" +
		"          <label>id</label>\n" +
		"          <input type=\"text\" \n" +
		"            class=\"form-control\" \n" +
		"            ng-model=\"model.id\"\n" +
		"            ng-model-on-blur=\"changeObjectName(model.id, modelName, doc.models)\">\n" +
		"        </div>\n" +
		"\n" +
		"        <div class=\"form-group\">\n" +
		"          <div>\n" +
		"            <label>Properties</label>\n" +
		"            <button type=\"button\" class=\"btn btn-default pull-right\" ng-click=\"addModelProp(model)\"> Add </button>\n" +
		"          </div>\n" +
		"\n" +
		"          <table class=\"table table-hover\">\n" +
		"            <tr>\n" +
		"              <th></th>\n" +
		"              <th>Name</th>\n" +
		"              <th>Datatype</th>\n" +
		"              <th>Description</th>\n" +
		"              <th>Items Object</th>\n" +
		"            </tr>\n" +
		"\n" +
		"            <!-- Since property doesn't have id property we will create one which will help us to change property name -->\n" +
		"            <tr ng-repeat=\"(propertyName, property) in model.properties\" ng-init=\"property.$$id = propertyName\">\n" +
		"              <td><button type=\"button\" ng-click=\"deleteModelProp(property, model)\"> Delete </button></td>\n" +
		"              <td> \n" +
		"                <input type=\"text\" \n" +
		"                  class=\"form-control\" \n" +
		"                  ng-model=\"property.$$id\"\n" +
		"                  ng-model-on-blur=\"changeObjectName(property.$$id, propertyName, model.properties)\"> \n" +
		"              </td>\n" +
		"              <td ng-init=\"setDatatype(property)\">\n" +
		"                <select ng-model=\"property.$$datatype\" class=\"form-control\" ng-options=\"key as key for (key, value) in typeConstants\" ng-change=\"datatypeChange(property)\"></select> \n" +
		"              </td>\n" +
		"              <td> \n" +
		"                <input type=\"text\" class=\"form-control\" ng-model=\"property.description\"> \n" +
		"              </td>\n" +
		"              <td> \n" +
		"                <button type=\"button\" class=\"btn btn-default\" ng-show=\"property.type === 'Array'\" modal=\"editor/items-object.html\"> \n" +
		"                  edit \n" +
		"                </button>\n" +
		"              </td>\n" +
		"            </tr>\n" +
		"\n" +
		"          </table>\n" +
		"\n" +
		"        </div>\n" +
		"\n" +
		"        <div class=\"form-group\">\n" +
		"          <label> SubTypes </label>\n" +
		"          <select class=\"form-control\" ng-model=\"model.subTypes\" multiple ng-options=\"id for id in getSubTypeChoices(doc, model)\"></select>\n" +
		"        </div>\n" +
		"\n" +
		"        <div class=\"form-group\" ng-show=\"showDiscriminator(doc, model)\">\n" +
		"          <label> Discriminator </label>\n" +
		"          <select class=\"form-control\" ng-model=\"model.discriminator\" ng-options=\"value for value in propertyConstants\"></select>\n" +
		"        </div> \n" +
		"      </div>\n" +
		" \n" +
		"    </div>\n" +
		"  </div>\n" +
		"\n" +
		"  <!-- Authorization list -->\n" +
		"  <div class=\"form-group\">\n" +
		"    <label>Authorizations</label>\n" +
		"    <button type=\"button\" class=\"btn btn-default pull-right\" ng-click=\"addAuthorization(doc)\"> Add </button>\n" +
		"    <div class=\"panel panel-default\" ng-repeat=\"(authorizationName, authorization) in doc.authorizations\">\n" +
		"      \n" +
		"      <div class=\"panel-heading\" ng-click=\"authorization.$$viewShow = !authorization.$$viewShow\">\n" +
		"        <span class=\"fa fa-chevron-{{ authorization.$$viewShow ? 'up' : 'down' }}\"> </span>\n" +
		"        <a href=\"\">{{ authorizationName }}</a>\n" +
		"        <button type=\"button\" class=\"pull-right\" ng-click=\"deleteAuthorization(doc, authorizationName)\">Delete</button>\n" +
		"      </div>\n" +
		"\n" +
		"      <div class=\"panel-body\" ng-show=\"authorization.$$viewShow\">\n" +
		"        \n" +
		"        <div class=\"form-group\">\n" +
		"          <label>id</label>\n" +
		"          <input type=\"text\" class=\"form-control\" ng-model=\"authorizationName\">\n" +
		"        </div>\n" +
		"\n" +
		"        <div class=\"form-group\">\n" +
		"          <div>\n" +
		"            <label>Properties</label>\n" +
		"            <button type=\"button\" class=\"btn btn-default pull-right\" ng-click=\"addAuthorizationProp(doc, authorizationName)\"> Add </button>\n" +
		"          </div>\n" +
		"          \n" +
		"          <table class=\"table table-hover\">\n" +
		"            <tr>\n" +
		"              <th></th>\n" +
		"              <th>Scope</th>\n" +
		"              <th>Description</th>\n" +
		"            </tr>\n" +
		"            <tr ng-repeat=\"authorizationValue in authorization\">\n" +
		"              <td><button type=\"button\" ng-click=\"deleteAuthorizationProp(doc, authorizationName, $index)\"> Delete </button></td>\n" +
		"              <td> \n" +
		"                <input type=\"text\" class=\"form-control\" ng-model=\"authorizationValue.scope\">\n" +
		"              </td>\n" +
		"              <td>\n" +
		"                <input type=\"text\" class=\"form-control\" ng-model=\"authorizationValue.description\">\n" +
		"              </td>\n" +
		"            </tr>\n" +
		"          </table>\n" +
		"        </div>\n" +
		"      </div>\n" +
		"    </div>\n" +
		"  </div>\n" +
		"\n" +
		"</form>\n"
	);
	
	
	$templateCache.put('editor/items-object.html',
		"<div class=\"modal fade\">\n" +
		"    <div class=\"modal-dialog\">\n" +
		"        <div class=\"modal-content\">\n" +
		"            <div class=\"modal-header\">\n" +
		"                <button type=\"button\" class=\"close\" data-dismiss=\"modal\" aria-hidden=\"true\">&times;</button>\n" +
		"                <h4 class=\"modal-title\">Item Object</h4>\n" +
		"            </div>\n" +
		"            <div class=\"modal-body\">\n" +
		"                <div class=\"form-group\">\n" +
		"                    <label for=\"modal-type\"> Type </label>\n" +
		"                    <select id=\"modal-type\" ng-model=\"property.items.type\" class=\"form-control\" ng-options=\"key as key for (key, value) in typeConstants\"> </select>\n" +
		"                    <span ng-show=\"property.items.type == 'Array'\">\n" +
		"                        <label for=\"collection-format\"> Collection Format </label>\n" +
		"                        <select id=\"collection-format\" ng-model=\"property.items.collectionFormat\" class=\"form-control\" ng-options=\"format for format in collectionFormats\"> </select>\n" +
		"                    </span>\n" +
		"                    <label for=\"minimum\"> Minimum </label>\n" +
		"                    <input id=\"minimum\" type=\"number\" ng-model=\"property.items.minimum\" class=\"form-control\">\n" +
		"                    <label for=\"maximum\"> Maximum </label>\n" +
		"                    <input id=\"maximum\" type=\"number\" ng-model=\"property.items.maximum\" class=\"form-control\">\n" +
		"                    <label for=\"min-length\"> Minimum Length </label>\n" +
		"                    <input id=\"min-length\" type=\"number\" min=\"0\" ng-model=\"property.items.minLength\" class=\"form-control\">\n" +
		"                    <label for=\"max-length\"> Maximum Length </label>\n" +
		"                    <input id=\"max-length\" type=\"number\" min=\"0\" ng-model=\"property.items.maxLength\" class=\"form-control\">\n" +
		"                    <label for=\"exclusive-minimum\"> Exclusive Minimum </label>\n" +
		"                    <div class=\"form-control\" id=\"exclusive-minimum\">\n" +
		"                        <label class=\"radio-inline\"><input type=\"radio\" ng-model=\"property.items.exclusiveMinimum\" ng-value=\"true\"> Yes </label>\n" +
		"                        <label class=\"radio-inline\"><input type=\"radio\" ng-model=\"property.items.exclusiveMinimum\" ng-value=\"false\"> No </label>\n" +
		"                    </div>\n" +
		"                    <label for=\"exclusive-maximum\"> Exclusive Maximum </label>\n" +
		"                    <div class=\"form-control\" id=\"exclusive-maximum\">\n" +
		"                        <label class=\"radio-inline\"><input type=\"radio\" ng-model=\"property.items.exclusiveMaximum\" ng-value=\"true\"> Yes </label>\n" +
		"                        <label class=\"radio-inline\"><input type=\"radio\" ng-model=\"property.items.exclusiveMaximum\" ng-value=\"false\"> No </label>\n" +
		"                    </div>\n" +
		"                    <label for=\"unique-items\"> Unique Items </label>\n" +
		"                    <div class=\"form-control\" id=\"unique-items\">\n" +
		"                        <label class=\"radio-inline\"><input type=\"radio\" ng-model=\"property.items.uniqueItems\" ng-value=\"true\"> Yes </label>\n" +
		"                        <label class=\"radio-inline\"><input type=\"radio\" ng-model=\"property.items.uniqueItems\" ng-value=\"false\"> No </label>\n" +
		"                    </div>\n" +
		"                    <label for=\"patterns\"> Pattern </label>\n" +
		"                    <input id=\"patterns\" ng-model=\"property.items.pattern\" class=\"form-control\">\n" +
		"                </div>\n" +
		"            </div>\n" +
		"            <div class=\"modal-footer\">\n" +
		"                <button type=\"button\" class=\"btn btn-default\" ng-click=\"$close()\">Done</button>\n" +
		"            </div>\n" +
		"        </div>\n" +
		"    </div>\n" +
		"</div>\n"
	);
	
	
	$templateCache.put('editor/operation-editor.html',
		"<!-- Operations basic information -->\n" +
		"\n" +
		"<div class=\"form-group\">\n" +
		"  <label>Method</label>\n" +
		"  <select class=\"form-control\" ng-model=\"operationEdit.method\" ng-options=\"verb for verb in enums.verbs\"></select>\n" +
		"</div>\n" +
		"\n" +
		"<div class=\"form-group\">\n" +
		"  <label>Name</label>\n" +
		"  <input type=\"text\" class=\"form-control\" ng-model=\"operationEdit.nickname\">\n" +
		"</div>\n" +
		"\n" +
		"<div class=\"form-group\">\n" +
		"  <label>Summary</label>\n" +
		"  <input type=\"text\" class=\"form-control\" ng-model=\"operationEdit.summary\">\n" +
		"</div>\n" +
		"\n" +
		"<div class=\"form-group\">\n" +
		"  <label> Notes </label>\n" +
		"  <input type=\"text\" class=\"form-control\" ng-model=\"operationEdit.notes\">\n" +
		"</div>\n" +
		"\n" +
		"<div class=\"form-group\">\n" +
		"  <label>Event name</label>\n" +
		"  <input type=\"text\" class=\"form-control\" ng-model=\"operationEdit.event_name\">\n" +
		"</div>\n" +
		"\n" +
		"<!-- Operations parameters list -->\n" +
		"\n" +
		"<div class=\"form-group\">\n" +
		"  <div>\n" +
		"    <label>Parameters</label>\n" +
		"    <a href=\"\" class=\"btn btn-default pull-right\" ng-click=\"addParameter(operationEdit)\"> Add </a> \n" +
		"  </div>\n" +
		"\n" +
		"  <table class=\"table table-bordered\">\n" +
		"    <tr>\n" +
		"      <th></th>\n" +
		"      <th>Name</th>\n" +
		"      <th>Description</th>\n" +
		"      <th>Multiple</th>\n" +
		"      <th>Type</th>\n" +
		"      <th>Param type</th>\n" +
		"      <th>Required</th>\n" +
		"      <th>Default</th>\n" +
		"    </tr>\n" +
		"\n" +
		"    <tr ng-repeat=\"parameter in operationEdit.parameters\">\n" +
		"      <td>\n" +
		"        <button type=\"button\" class=\"btn\" ng-click=\"deleteParameter(operationEdit, $index)\">Delete</button>\n" +
		"      </td>\n" +
		"      <td>\n" +
		"        <input type=\"text\" class=\"form-control\" ng-model=\"parameter.name\">\n" +
		"      </td>\n" +
		"      <td>\n" +
		"        <input type=\"text\" class=\"form-control\" ng-model=\"parameter.description\">\n" +
		"      </td>\n" +
		"      <td class=\"text-center\">\n" +
		"        <input type=\"checkbox\" ng-model=\"parameter.allowMultiple\">\n" +
		"      </td>\n" +
		"      <td ng-init=\"setDatatype(parameter)\">\n" +
		"        <select ng-model=\"parameter.$$datatype\" ng-options=\"key as key for (key, value) in typeConstants\" ng-change=\"datatypeChange(parameter)\"></select>\n" +
		"      </td>\n" +
		"      <td>\n" +
		"        <select ng-model=\"parameter.paramType\" ng-options=\"type for type in enums.paramTypes\"></select>\n" +
		"      </td>\n" +
		"      <td>\n" +
		"        <input type=\"checkbox\" ng-model=\"parameter.required\">\n" +
		"      </td>\n" +
		"      <td>\n" +
		"        <input type=\"checkbox\" ng-model=\"parameter.default\">\n" +
		"      </td>\n" +
		"    </tr>\n" +
		"  </table>\n" +
		"</div>\n" +
		"\n" +
		"<!-- Operations response messages list -->\n" +
		"\n" +
		"<div class=\"form-group\">\n" +
		"  <div>\n" +
		"    <label>Response messages</label>\n" +
		"    <a href=\"\" class=\"btn btn-default pull-right\" ng-click=\"addResponse(operationEdit)\"> Add </a> \n" +
		"  </div>\n" +
		"  <table class=\"table table-bordered\">\n" +
		"    <col width=\"15%\"></col>\n" +
		"    <col width=\"15%\"></col>\n" +
		"    <col width=\"70%\"></col>\n" +
		"    <tr>\n" +
		"      <th></th>\n" +
		"       <th>Code</th>\n" +
		"       <th>Message</th>\n" +
		"    </tr>\n" +
		"\n" +
		"    <tr ng-repeat=\"response in operationEdit.responseMessages\">\n" +
		"      <td>\n" +
		"        <button type=\"button\" class=\"btn\" ng-click=\"deleteResponse(operationEdit, $index)\">Delete</button>\n" +
		"      </td>\n" +
		"      <td>\n" +
		"        <input type=\"text\" class=\"form-control\" ng-model=\"response.code\">\n" +
		"      </td>\n" +
		"      <td>\n" +
		"        <input type=\"text\" class=\"form-control\" ng-model=\"response.message\">\n" +
		"      </td>\n" +
		"    </tr>\n" +
		"  </table>\n" +
		"</div>\n"
	);
	
	
	$templateCache.put('editor/operations-list.html',
		"<table class=\"table table-hover\">\n" +
		"  <tr>\n" +
		"    <th></th>\n" +
		"    <th>Method</th>\n" +
		"    <th>Name</th>\n" +
		"    <th>Summary</th>\n" +
		"  </tr>\n" +
		"\n" +
		"  <tr ng-repeat=\"operation in api.operations\" ng-click=\"editOperation(operation)\">\n" +
		"    <td><button type=\"button\" ng-click=\"deleteOp(api, $index)\"> Delete </button></td>\n" +
		"    <td> {{ operation.method }} </td>\n" +
		"    <td> {{ operation.nickname }} </td>\n" +
		"    <td> {{ operation.summary }} </td>\n" +
		"  </tr>\n" +
		"\n" +
		"</table>\n"
	);
	
}]);
