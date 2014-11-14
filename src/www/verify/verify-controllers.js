(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('verify', ['$scope', '$rootScope', '$http', '$stateParams', 'md5', 'auth', '$state',
            function ($scope, $rootScope, $http, $stateParams, md5, auth, $state) {
            $http.get("/api/verify/" + $stateParams.code).
            success(function (data, status, headers, config) {
                $scope.name = data.user;
            }).
            error(function (data, status, headers, config) {
                
                if (data.user) {
                    $scope.verified = true;
                    $scope.name = data.user;
                }
                $scope.error = true;
            });
            $scope.submit = function (form) {
                if (!$scope.passwordConfirm) {
                    form.confirmPassword.$pristine = false;
                }
                if (!$scope.password) {
                    form.password.$pristine = false;
                }
                if (form.$valid) {
                    $http.post("/api/verify/" + $stateParams.code, {
                        password: $scope.password
                    }).
                    success(function (data, status, headers, config) {
                        console.log(data);
                        auth.setUser(data.user);
                        $scope.error = false;
                        $state.go("organizations.list");
                    }).
                    error(function (data, status, headers, config) {
                        console.log(data);
                        $scope.data = data;
                        $scope.status = status;
                        $scope.error = true;
                        // called asynchronously if an error occurs
                        // or server returns response with an error status.
                    });
                }
            };
        }
    ]);
})(this, this.angular, this.console);