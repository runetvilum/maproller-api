(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('emailtemplate', ['$scope', '$rootScope', '$http', '$stateParams', '$state', 'emailtemplate', '$sce',

        function ($scope, $rootScope, $http, $stateParams, $state, emailtemplate, $sce) {
            $scope.emailtemplate = emailtemplate.data.doc;
            $scope.error = emailtemplate.data.error;
            $scope.html = emailtemplate.data.html;
            $scope.text = emailtemplate.data.text;
            $http.get('/api/database/' + emailtemplate.data.doc.database).
            success(function (data, status, headers, config) {
                $scope.data = data;
                $http.get('/api/organization/' + data.database.organization).
                success(function (data, status, headers, config) {
                    $rootScope.organization = data;
                }).
                error(function (data, status, headers, config) {});
            }).
            error(function (data, status, headers, config) {});

            $scope.trustHTML = function () {
                return $sce.trustAsHtml($scope.html);
            };

        }
    ]);
})(this, this.angular, this.console);