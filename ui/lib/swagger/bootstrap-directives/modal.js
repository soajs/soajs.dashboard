angular.module('bootstrap-modal', [
])

.directive('modal', function($compile, $templateCache) {
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

