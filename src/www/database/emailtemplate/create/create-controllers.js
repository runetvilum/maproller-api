(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('emailtemplate-create', ['$scope', '$http', '$stateParams', '$state',
        function ($scope, $http, $stateParams, $state) {
            $scope.actions = [{
                name: 'Opret',
                value: 'create'
            }, {
                name: 'Opdater',
                value: 'update'
            }, {
                name: 'Slet',
                value: 'delete'
            }];
            $scope.doc = {
                action: 'create'
            };
            $scope.submit = function (form) {
                $scope.success = null;
                $scope.error = null;
                if (form.$valid) {
                    $http.post('/api/' + $stateParams.database + '/emailtemplate', $scope.doc).
                    success(function (data, status, headers, config) {
                        console.log(data);
                        $scope.success = true;
                        $scope.name = null;
                        form.name.$pristine = true;
                        $state.go('database.emailtemplate.list', {
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