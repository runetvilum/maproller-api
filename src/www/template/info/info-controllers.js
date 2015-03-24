(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('template-info', ['$scope', '$http', '$stateParams',
        function ($scope, $http, $stateParams) {
            $scope.update = function (form) {
                $scope.success = null;
                $scope.error = null;
                if (form.$valid) {
                    var oldname = $scope.template.name;
                    $scope.template.name = $scope.name;
                    $http.put('/api/template', $scope.template).
                    success(function (data, status, headers, config) {
                        $scope.template._rev = data.rev;
                        $scope.success = data;
                    }).
                    error(function (data, status, headers, config) {
                        $scope.template.name = oldname;
                        $scope.error = data;
                    });
                } 
            };

        }]);
})(this, this.angular, this.console);