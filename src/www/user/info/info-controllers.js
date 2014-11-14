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


        }
    ]);
})(this, this.angular, this.console);