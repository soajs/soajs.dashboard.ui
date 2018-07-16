"use strict";
var infraIPApp = soajsApp.components;
infraIPApp.controller('infraIPCtrl', ['$scope', '$localStorage', '$window', '$modal', '$timeout', '$cookies', 'injectFiles', 'ngDataApi', 'infraCommonSrv', 'infraIPSrv', function ($scope, $localStorage, $window, $modal, $timeout, $cookies, injectFiles, ngDataApi, infraCommonSrv, infraIPSrv) {
	$scope.$parent.isUserNameLoggedIn();
	$scope.showTemplateForm = false;

	$scope.access = {};
	constructModulePermissions($scope, $scope.access, infraIPConfig.permissions);

	infraCommonSrv.getInfraFromCookie($scope);

	$scope.$parent.$parent.switchInfra = function (oneInfra) {
		infraCommonSrv.switchInfra($scope, oneInfra, ["regions", "templates"], () => {
			if ($scope.$parent.$parent.currentSelectedInfra.groups && $scope.$parent.$parent.currentSelectedInfra.groups.length > 0) {
				//flag that infra doesn't have any resource groups
				$scope.noResourceGroups = false;
				$scope.infraGroups = $scope.$parent.$parent.currentSelectedInfra.groups;
				$scope.selectedGroup = $scope.infraGroups[0];
				$timeout(() => {
					infraIPSrv.listIPs($scope, $scope.selectedGroup);
				}, 500);
			}
			else if ($scope.$parent.$parent.currentSelectedInfra.groups && $scope.$parent.$parent.currentSelectedInfra.groups.length === 0) {
				$scope.noResourceGroups = true;
			}
		});
	};

	$scope.$parent.$parent.activateProvider = function () {
		infraCommonSrv.activateProvider($scope);
	};

	$scope.getProviders = function () {
		if($localStorage.infraProviders){
			$scope.$parent.$parent.infraProviders = angular.copy($localStorage.infraProviders);
			if(!$scope.$parent.$parent.currentSelectedInfra){
				$scope.go("/infra");
			}
			else{
				delete $scope.$parent.$parent.currentSelectedInfra.templates;
				$scope.$parent.$parent.switchInfra($scope.$parent.$parent.currentSelectedInfra);
			}
		}
		else{
			//list infras to build sidebar
			infraCommonSrv.getInfra($scope, {
				id: null,
				exclude: ["groups", "regions", "templates"]
			}, (error, infras) => {
				if (error) {
					$scope.displayAlert("danger", error);
				}
				else {
					$scope.infraProviders = infras;
					$localStorage.infraProviders = angular.copy($scope.infraProviders);
					$scope.$parent.$parent.infraProviders = angular.copy($scope.infraProviders);
					if(!$scope.$parent.$parent.currentSelectedInfra){
						$scope.go("/infra");
					}
					else{
						delete $scope.$parent.$parent.currentSelectedInfra.templates;
						$scope.$parent.$parent.switchInfra($scope.$parent.$parent.currentSelectedInfra);
					}
				}
			});
		}
	};

	$scope.deleteIP = function (oneIP) {
		infraIPSrv.deleteIP($scope, oneIP);
	};

	$scope.addIP = function () {
		infraIPSrv.addIP($scope);
	};

	$scope.editIP = function (oneIP) {
		infraIPSrv.editIP($scope, oneIP);
	};

	$scope.listIPs = function (oneGroup) {
		infraIPSrv.listIPs($scope, oneGroup);
	};

	if ($scope.access.list) {
		$scope.getProviders();
	}
	injectFiles.injectCss("modules/dashboard/infra/infra.css");
}]);
