'use strict';
var settingApp = soajsApp.components;

settingApp.controller('soajsDeployAuthTokenCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', 'injectFiles', '$cookies', '$location', function ($scope, $timeout, $modal, ngDataApi, injectFiles, $cookies, $location) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, settingAppConfig.permissions);
	
	$scope.listTokens = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/infra/cd/tokens'
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.tokens = response
			}
		});
	};
	
	$scope.changeTokenStatus = function (token, type) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'put',
			routeName: '/infra/cd/token/status',
			data: {
				token: token.token,
				status: type ? "active" : "inactive"
			}
		}, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.listTokens();
				$scope.displayAlert('success', 'Deployment Auth Token status changed successfully.');
			}
		});
	};
	
	$scope.deleteToken = function (token) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/cd/token',
			data: {
				token: token.token,
			}
		}, function (error) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.listTokens();
				$scope.displayAlert('success', 'Deployment Auth Token status removed successfully.');
			}
		});
	};
	
	$scope.addToken = function () {
		
		let formConfig = angular.copy(settingAppConfig.form.token.add);
		let currentScope = $scope;
		var options = {
			timeout: $timeout,
			form: formConfig,
			'name': 'add-deploy-Token',
			'label': 'Add Deploy Token',
			'actions': [
				{
					'type': 'submit',
					'label': 'Add',
					'btn': 'primary',
					'action': function (formData) {
						overlayLoading.show();
						getSendDataFromServer($scope, ngDataApi, {
							method: 'post',
							routeName: '/infra/cd/token',
							data: {
								label: formData.label
							}
						}, function (error, response) {
							overlayLoading.hide();
							if (error) {
								$scope.displayAlert('danger', error.message);
							} else {
								$scope.displayAlert('success', 'Deployment Auth Token created successfully.');
								$scope.modalInstance.dismiss('cancel');
								$scope.listTokens();
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						$scope.modalInstance.dismiss('cancel');
					}
				}
			]
		};
		buildFormWithModal(currentScope, $modal, options);
	};
	
	injectFiles.injectCss("modules/dashboard/settings/settings.css");
	
	// Start here
	if ($scope.access.listTokens) {
		$scope.listTokens();
	}
	
}]);

settingApp.filter('capitalizeFirst', function () {
	return function (input) {
		if (input && typeof input === 'string' && input.length > 0) {
			return input.charAt(0).toUpperCase() + input.substring(1).toLowerCase();
		}
	}
});
