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
      contentTypes: [ 'application/xml', 'application/json' ],
      verbs: [ 'GET', 'POST', 'PUT', 'DELETE' ],
      types: [ 'string', 'number' ],
      paramTypes: [ 'path','query', 'body', 'header', 'form' ]

    };

    $scope.typeConstants = SwaggerDatatypes;

    $scope.collectionFormats = SwaggerCollectionFormats;

    $scope.propertyConstants = PropertyConstants;

    $scope.toggleCheck = function(property, type) {
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

    $scope.deleteOp = function(api, index) {
        api.operations.splice(index, 1);
    };

    $scope.addResponse = function (operation) {
      operation.responseMessages = operation.responseMessages || [];
      operation.responseMessages.unshift({
        code: '',
        message: 'New response'
      });
    };

    $scope.deleteResponse = function(operation, index) {
        operation.responseMessages.splice(index, 1);
    };

    $scope.addParameter = function (operation) {
      operation.parameters = operation.parameters || [];      
      operation.parameters.unshift({
        name: 'NewParameter',
      });
    };

    $scope.deleteParameter = function(operation, index) {
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

    $scope.datatypeChange = function(property) {
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

