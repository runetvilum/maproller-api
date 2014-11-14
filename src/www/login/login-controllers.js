(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('login', ['$scope', 'auth', '$http', 'md5', '$state', '$rootScope',
        function ($scope, auth, $http, md5, $state, $rootScope) {
            $scope.user = {
                name: "",
                password: "",
            };
            $scope.submit = function () {
                $http.post('/api/signin', $scope.user).
                success(function (data, status, headers, config) {
                    auth.setUser(data.user);
                    $scope.error = false;
                    if ($rootScope.lastState === 'frontpage') {
                        $state.go("organizations.list");
                    } else {
                        $state.go($rootScope.lastState);
                    }
                }).
                error(function (data, status, headers, config) {
                    console.log(data);
                    $scope.data = data;
                    $scope.status = status;
                    $scope.error = true;
                    // called asynchronously if an error occurs
                    // or server returns response with an error status.
                });
            };
        }
    ]);
})(this, this.angular, this.console);