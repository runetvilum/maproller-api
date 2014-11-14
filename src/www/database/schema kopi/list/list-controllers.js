(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('schema-list', ['$scope', '$http',
        function ($scope, $http) {
            $scope.clear = function () {
                if (watchfelt) {
                    watchfelt();
                    watchfelt = null;
                }
                if (watchfeltkey) {
                    watchfeltkey();
                    watchfeltkey = null;
                }
                $scope.edititem = {
                    value: {
                        type: "text"
                    }
                };
                $scope.selectedItem = null;
            };
            $scope.clear();

            $scope.inputtypes = ['text', 'textarea', 'checkbox', 'checkbox multiple', 'color', 'datetime', 'email', 'number', 'radio', 'ruler', 'select', 'url'];
            $scope.up = function () {
                if ($scope.selectedItem) {
                    var index = $scope.$parent.felter.indexOf($scope.selectedItem);
                    var item = $scope.$parent.felter.splice(index, 1);
                    $scope.$parent.felter.splice(index - 1, 0, item[0]);
                }
            };
            $scope.down = function () {
                if ($scope.selectedItem) {
                    var index = $scope.$parent.felter.indexOf($scope.selectedItem);
                    var item = $scope.$parent.felter.splice(index, 1);
                    $scope.$parent.felter.splice(index + 1, 0, item[0]);
                }
            };
            $scope.upOption = function () {
                if ($scope.selectedOption) {
                    var index = $scope.edititem.value.options.indexOf($scope.selectedOption);
                    var item = $scope.edititem.value.options.splice(index, 1);
                    $scope.edititem.value.options.splice(index - 1, 0, item[0]);
                }
            };
            $scope.downOption = function () {
                if ($scope.selectedOption) {
                    var index = $scope.edititem.value.options.indexOf($scope.selectedOption);
                    var item = $scope.edititem.value.options.splice(index, 1);
                    $scope.edititem.value.options.splice(index + 1, 0, item[0]);
                }
            };
            $scope.selectedOption = null;
            $scope.selectOption = function (item) {
                $scope.editoption = item;
                $scope.selectedOption = item;
            };
            var watchfelt = null;
            var watchfeltkey = null;
            $scope.edit = function (item) {
                if (watchfelt) {
                    watchfelt();
                }
                if (watchfeltkey) {
                    watchfeltkey();
                }
                $scope.edititem = item;
                $scope.selectedItem = item;
                watchfeltkey = $scope.$watch('edititem.key', function (newFelter, oldFelter) {
                    console.log('felter key');
                    if (!angular.equals(newFelter, oldFelter)) {
                        $scope.$parent.$parent.changed = true;
                    }
                });
                watchfelt = $scope.$watchCollection('edititem.value', function (newFelter, oldFelter) {
                    console.log('felter2');
                    if (!angular.equals(newFelter, oldFelter)) {
                        $scope.$parent.$parent.changed = true;
                    }
                });
            };
            $scope.deleteFelt = function () {
                if ($scope.selectedItem) {
                    var index = $scope.$parent.felter.indexOf($scope.selectedItem);
                    $scope.$parent.felter.splice(index, 1);
                    $scope.clear();
                }
            };
            $scope.deleteOption = function () {
                if ($scope.selectedOption) {
                    var index = $scope.edititem.value.options.indexOf($scope.selectedOption);
                    $scope.edititem.value.options.splice(index, 1);
                    $scope.clearOption();
                }
            };

            $scope.new = function (form) {
                if (form.$valid) {
                    $scope.$parent.felter.push($scope.edititem);
                    form.inputName.$pristine = true;
                    $scope.clear();
                } else {
                    form.inputName.$pristine = false;
                }
            };
            $scope.createOption = function (form) {
                if (form.$valid) {
                    $scope.edititem.value.options = $scope.edititem.value.options ? $scope.edititem.value.options : [];
                    $scope.edititem.value.options.push($scope.editoption);
                    $scope.selectedOption = $scope.editoption;
                    form.inputLabel.$pristine = true;
                    form.inputValue.$pristine = true;
                    $scope.clearOption();
                } else {
                    form.inputLabel.$pristine = false;
                    form.inputValue.$pristine = false;
                }
            };
            $scope.clearOption = function () {
                $scope.editoption = {};
                $scope.selectedOption = null;
            };


        }
    ]);
})(this, this.angular, this.console);