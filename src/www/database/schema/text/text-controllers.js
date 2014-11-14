(function (window, angular, console, tv4) {
    'use strict';
    angular.module('myApp.controllers').controller('schema-text', ['$scope', '$http',
        function ($scope, $http) {

            $scope.tekst = angular.toJson($scope.$parent.schema, true);
            $scope.$watch("tekst", function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    $scope.textError = null;
                    try {
                        $scope.$parent.schema = JSON.parse(newValue);
                        $scope.$emit('validate');
                    } catch (ex) {
                        $scope.textError = ex.message;
                        $scope.$parent.valid = null;
                    }
                }
            });
        }
    ]);
})(this, this.angular, this.console, this.tv4);