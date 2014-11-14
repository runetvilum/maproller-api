(function (window, angular, console) {
    'use strict';
    /* Directives */
    angular.module('myApp.directives').directive('unique', function () {
            return {
                require: 'ngModel',
                link: function (scope, elm, attrs, ctrl) {
                    var isUnique = function (name) {
                        for (var i = 0; i < scope.$parent.$parent.felter.length; i++) {
                            var felt = scope.$parent.$parent.felter[i];
                            if (felt.key === name) {
                                return false;
                            }
                        }
                        return true;
                    };
                    ctrl.$parsers.unshift(function (viewValue) {
                        if (ctrl.$modelValue === viewValue ||isUnique(viewValue)) {
                            // it is valid
                            ctrl.$setValidity('unique', true);
                            return viewValue;
                        } else {
                            // it is invalid, return undefined (no model update)
                            ctrl.$setValidity('unique', false);
                            return ctrl.$modelValue;
                        }
                    });
                }
            };
        }).directive('match', function () {
            return {
                require: 'ngModel',
                restrict: 'A',
                scope: {
                    match: '='
                },
                link: function (scope, elem, attrs, ctrl) {
                    scope.$watch(function () {
                        return (ctrl.$pristine && angular.isUndefined(ctrl.$modelValue)) || scope.match === ctrl.$modelValue;
                    }, function (currentValue) {
                        ctrl.$setValidity('match', currentValue);
                    });
                }
            };
        });
})(this, this.angular, this.console);