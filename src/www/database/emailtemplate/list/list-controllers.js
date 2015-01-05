(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('emailtemplate-list', ['$scope', '$http', '$stateParams',
        function ($scope, $http, $stateParams) {
            $http.get('/api/' + $stateParams.database+'/emailtemplate').
            success(function (data, status, headers, config) {
                console.log(data);
                $scope.emailtemplates = data.rows;
            }).
            error(function (data, status, headers, config) {
                console.log(data);
            });
        }]);
})(this, this.angular, this.console);