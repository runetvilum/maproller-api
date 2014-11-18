(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('organization-info', ['$scope', '$rootScope', '$http', '$stateParams', '$upload',
        function ($scope, $rootScope, $http, $stateParams, $upload) {
            var files = [];
            $scope.onFileSelect = function ($files) {
                files = $files;
                $scope.fileError = false;
                $scope.fileSuccess = true;
            };
            $scope.update = function (form) {
                $scope.success = null;
                $scope.error = null;
                $scope.type = 'info';
                if (form.$valid) {
                    if (files.length === 0) {
                        $http.put('/api/organization/' + $stateParams.organization, {
                            name: $scope.organization.name
                        }).
                        success(function (data, status, headers, config) {
                            $scope.success = data;
                        }).
                        error(function (data, status, headers, config) {
                            $scope.error = data;
                        });
                    } else {
                        $scope.upload = $upload.upload({
                            method: 'PUT',
                            url: '/api/organization/' + $stateParams.organization,
                            data: {
                                name: $scope.organization.name,
                            },
                            file: files[0],
                        }).progress(function (evt) {
                            $scope.dynamic = parseInt(100.0 * evt.loaded / evt.total);
                        }).success(function (data, status, headers, config) {
                            $scope.success = data;
                            $scope.type = 'success';
                        }).error(function (data, status, headers, config) {
                            $scope.error = data;
                            $scope.type = 'error';
                        });
                    }
                }
            };
        }]);
})(this, this.angular, this.console);