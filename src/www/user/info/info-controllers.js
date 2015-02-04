(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('user-info', ['$scope', 'md5', '$http', '$stateParams',
        function ($scope, md5, $http, $stateParams) {
            $scope.options = [{
                value: 'user_' + $stateParams.organization,
                name: 'Bruger'
                    }, {
                value: 'admin_' + $stateParams.organization,
                name: 'Administrator'
                    }];
            $scope.changeSys = function () {
                $http.put('/api/sysuser', $scope.user).
                success(function (data, status, headers, config) {
                    console.log(data);
                    $scope.success = true;
                }).
                error(function (data, status, headers, config) {
                    $scope.error = data;
                });
            }

        }
    ]);
})(this, this.angular, this.console);