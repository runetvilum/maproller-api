(function (window, angular, console, tv4) {
    'use strict';
    angular.module('myApp.controllers').controller('schema-test', ['$scope',
    function ($scope) {
            $scope.test = "{\n}";
            $scope.testChanged = function () {
                $scope.testError = null;
                try {
                    var doc = JSON.parse($scope.test);
                    //var tv4_valid = tv4.validate(doc, $scope.$parent.schema, true, true);
                    var tv4_valid = tv4.validate(doc, $scope.$parent.schema);
                    $scope.$parent.valid = {
                        valid: tv4_valid,
                        errors: tv4.error

                    };
                } catch (ex) {
                    $scope.testError = ex.message;
                    $scope.$parent.valid = null;
                }
            };
            $scope.testChanged();
            $scope.schema = $scope.$parent.schema;
            $scope.form = [
    "*",
                {
                    type: "submit",
                    title: "Save"
    }
  ];

            $scope.model = {};
        }
    ]);
})(this, this.angular, this.console, this.tv4);