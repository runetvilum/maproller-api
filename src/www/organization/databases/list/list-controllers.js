(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('databases-list', ['$scope', '$http', '$stateParams',
        function ($scope, $http, $stateParams) {

            var getDbInfo = function (db) {
                $http.get('/couchdb/db-' + db.id).
                success(function (data, status, headers, config) {
                    console.log(data);
                    db.info = data;
                }).
                error(function (data, status, headers, config) {
                    console.log(data);
                });
            };

            $http.get('/api/organization/' + $stateParams.organization + '/databases').
            success(function (data, status, headers, config) {
                console.log(data);
                $scope.databases = data.rows;
                for (var i = 0; i < data.rows.length; i++) {
                    var db = data.rows[i];
                    getDbInfo(db);
                }
            }).
            error(function (data, status, headers, config) {
                console.log(data);
            });
        }]);
})(this, this.angular, this.console);