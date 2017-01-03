'use strict';

// ngModel utility functions for projects with angularjs < 1.3
// Thanks to http://stackoverflow.com/a/11870341/1221279

angular.module('ng-model-options', [])

.directive('ngModelOnBlur', function() {
  return {
    require: 'ngModel',
    link: function(scope, elm, attr, ngModelCtrl) {
      if (attr.type === 'radio' || attr.type === 'checkbox') return;

      elm.off('input keydown change');
      elm.on('blur', function() {
        scope.$apply(function() {
          ngModelCtrl.$setViewValue(elm.val());
          scope.$eval(attr.ngModelOnBlur);
        });
      });
    }
  };
});