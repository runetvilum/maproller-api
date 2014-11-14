(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('templates-create', ['$scope', '$rootScope', '$http', '$upload',
        function ($scope, $rootScope, $http, $upload) {
            $scope.success = null;
            $scope.error = null;
            $scope.fileError = false;
            $scope.fileSuccess = false;
            $scope.database = {
                name: '',
                description: ''
            };
            $scope.submit = function (form) {
                $scope.success = null;
                $scope.error = null;
                $scope.type = 'info';
                if (files.length === 0) {
                    $scope.fileError = true;
                    $scope.fileSuccess = false;
                }
                if (form.$valid && files.length > 0) {
                    $scope.upload = $upload.upload({
                        url: '/api/templates', //upload.php script, node.js route, or servlet url
                        data: {
                            name: $scope.name
                        },
                        file: files[0],
                    }).progress(function (evt) {
                        $scope.dynamic = parseInt(100.0 * evt.loaded / evt.total);
                    }).success(function (data, status, headers, config) {
                        // file is uploaded successfully
                        console.log(data);
                        $scope.name = null;
                        form.name.$pristine = true;
                        $scope.success = true;
                        $scope.type = 'success';
                    }).error(function (data, status, headers, config) {
                        console.log(data);
                        $scope.error = data;
                        $scope.type = 'error';
                    });
                } else {
                    form.name.$pristine = false;
                    form.logo.$pristine = false;
                }

            };
            var files = [];
            $scope.onFileSelect = function ($files) {
                files = $files;
                $scope.fileError = false;
                $scope.fileSuccess = true;
            };
        }
    ]);
})(this, this.angular, this.console);