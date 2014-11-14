(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('organizations-list', ['$scope', '$rootScope', '$http', 
        function ($scope, $rootScope, $http) {
            var getDatabases = function (organization) {
                $http.get('/api/organization/' + organization.id+'/databases').
                success(function (data, status, headers, config) {
                    organization.databases = data.rows.length;
                }).
                error(function (data, status, headers, config) {
                    console.log(data);
                });
            };
            var getUsers = function (organization) {
                $http.get('/api/users/' + organization.id).
                success(function (data, status, headers, config) {
                    console.log(data);
                    organization.users = data.rows.length;
                }).
                error(function (data, status, headers, config) {
                    console.log(data);
                });
            };
            for (var i = 0; i < $rootScope.profile.user.organizations.length; i++) {
                var organization = $rootScope.profile.user.organizations[i];
                getDatabases(organization);
                getUsers(organization);
            }
        }
    ]);
})(this, this.angular, this.console);