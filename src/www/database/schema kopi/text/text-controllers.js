(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('schema-text', ['$scope','$http',
        function ($scope, $http) {
            var properties = {};
            for (var i = 0; i < $scope.$parent.felter.length; i++) {
                var felt = $scope.felter[i];
                properties[felt.key] = felt.value;
            }
            $scope.tekst = angular.toJson(properties, true);
            $scope.$watch("tekst", function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    $scope.textError = null;
                    try {
                        properties = JSON.parse(newValue);
                        //$scope.$parent.$parent.changed = true;
                        $scope.$parent.felter = [];
                        angular.forEach(properties, function (value, key) {
                            $scope.$parent.felter.push({
                                key: key,
                                value: value
                            });
                        });
                    } catch (ex) {
                        $scope.textError = ex.message;
                    }
                }
            });
        }
    ]);
})(this, this.angular, this.console);