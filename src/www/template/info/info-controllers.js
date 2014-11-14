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
                        console.log(data);
                        $scope.success = true;
                        form.name.$pristine = true;
                    }).
                    error(function (data, status, headers, config) {
                        console.log(data);
                        $scope.template.name = oldname;
                        $scope.error = data;
                    });
                } else {
                    form.name.$pristine = false;
                }
            };

        }]);
})(this, this.angular, this.console);