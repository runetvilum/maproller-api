(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('database-security', ['$scope', '$rootScope', '$http', '$stateParams',
        function ($scope, $rootScope, $http, $stateParams) {
            $scope.changed = false;
            
            $scope.security = $scope.data.security;
            $scope.$watchCollection('security', function (newValue, oldValue) {
                if (newValue.c !== oldValue.c || newValue.r !== oldValue.r || newValue.u !== oldValue.u || newValue.d !== oldValue.d) {
                    $scope.changed = true;
                }
            });
            $scope.update = function () {
                $scope.showSecuritySuccess = false;
                $scope.showSecurityError = false;
                $http.put('/api/security', {
                    database: $stateParams.database,
                    security: $scope.security
                }).
                success(function (data, status, headers, config) {
                    console.log(data);
                    $scope.success = true;
                    $scope.changed = false;
                }).
                error(function (data, status, headers, config) {
                    console.log(data);
                    $scope.error = data;
                });
            };
        }
    ]);
})(this, this.angular, this.console);