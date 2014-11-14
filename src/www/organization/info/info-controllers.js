(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('organization-info', ['$scope', '$rootScope', '$http', '$stateParams',
        function ($scope, $rootScope, $http, $stateParams) {
            $scope.$parent.menu = $stateParams.menu;
            $scope.update = function (form) {
                $scope.success = null;
                $scope.error = null;
                if (form.$valid) {
                    var oldname = $rootScope.organization.value.name;
                    $rootScope.organization.value.name = $scope.name;
                    $http.put('/api/organization', $rootScope.organization.value).
                    success(function (data, status, headers, config) {
                        console.log(data);
                        $scope.success = true;
                        form.name.$pristine = true;
                    }).
                    error(function (data, status, headers, config) {
                        console.log(data);
                        $rootScope.organization.value.name = oldname;
                        $scope.error = data;
                    });
                } else {
                    form.name.$pristine = false;
                }
            };
        }]);
})(this, this.angular, this.console);