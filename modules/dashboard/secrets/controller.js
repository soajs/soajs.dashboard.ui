'use strict';
var secretsApp = soajsApp.components;

secretsApp.controller('secretsAppCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};
	$scope.catalogImage = './themes/' + themeToUse + '/img/catalog.png';

	constructModulePermissions($scope, $scope.access, secretsAppConfig.permissions);

	$scope.listSecrets = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/secrets/'
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.secrets = response;
				//TODO: reconstruct response for list

			}
		});
	};

	$scope.addSecret = function () {
		$scope.add = true;
		var formConfig;
		var data;

		var submitAction = {
			method: 'post',
			routeName: '/dashboard/secrets/secret',
			params: {}
		};
		var currentScope = $scope;

		$modal.open({
			templateUrl: "newSecret.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				var formConfig = angular.copy(secretsAppConfig.form.add);

				var options = {
					timeout: $timeout,
					entries: formConfig,
					name: 'newSecret',
					actions: [
						{
							'type': 'submit',
							'label': "Create Secret",
							'btn': 'primary',
							action: function (formData) {
								//TODO: create secret
							}
						},
						{
							type: 'reset',
							label: 'Cancel',
							btn: 'danger',
							action: function () {
								$modalInstance.dismiss('cancel');
								$scope.form.formData = {};
							}
						}
					]
				};

				buildForm($scope, $modalInstance, options, function () {

				});
			}
		});

	};

	$scope.deleteSecret = function (secret) {

	}

	$scope.getSecret = function (secretName) {

	}


	// Start here
	if ($scope.access.list) {
		$scope.listSecrets();
	}

}]);
