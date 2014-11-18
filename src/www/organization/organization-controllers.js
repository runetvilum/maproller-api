(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('organization', ['$scope', '$rootScope', '$http', '$stateParams', '$state',
        function ($scope, $rootScope, $http, $stateParams, $state) {
            $http.get('/api/organization/' + $stateParams.organization).
            success(function (data, status, headers, config) {
                console.log(data);
                $scope.organization = data;
                if (data._attachments && data._attachments.logo) {
                    $scope.logo = true;
                } else {
                    $scope.logo = false;
                }
            }).
            error(function (data, status, headers, config) {
                console.log(data);
            });
        }
    ]);
})(this, this.angular, this.console);