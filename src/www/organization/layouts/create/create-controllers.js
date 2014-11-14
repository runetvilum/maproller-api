(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('layouts-create', ['$scope', '$http', '$stateParams', '$state',
        function ($scope, $http, $stateParams, $state) {
            $scope.submit = function (form) {
                $scope.success = null;
                $scope.error = null;
                if (form.$valid) {
                    $http.post('/api/layouts', {
                        name: $scope.name,
                        organization: $stateParams.organization
                    }).
                    success(function (data, status, headers, config) {
                        console.log(data);
                        $scope.success = true;
                        $scope.name = null;
                        form.name.$pristine = true;
                        $state.go('organization.layouts.list', {
                            organization: $stateParams.organization
                        });
                    }).
                    error(function (data, status, headers, config) {
                        $scope.error = data;
                        console.log(data);
                    });
                } else {
                    form.name.$pristine = false;
                }
            };
        }]);
})(this, this.angular, this.console);