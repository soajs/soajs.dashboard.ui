'use strict';
var secretsApp = soajsApp.components;

secretsApp.controller('secretsAppCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};

	constructModulePermissions($scope, $scope.access, secretsAppConfig.permissions);

	$scope.listSecrets = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/secrets/list',
			params: {
				env: "DASHBOARD" //get actual environment code
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.secrets = response;

				//TODO: get deployer -> if docker use docker grid
				// if kubernetes get kubernetes grid

				var options = {
					grid: secretsAppConfig.dockerSecretsGrid,
					data: $scope.secrets,
					left: [],
					top: []
				};

				// if ($scope.access.get) {
				// 	options.left.push({
				// 		'label': 'Inspect Secret', //TODO: translation
				// 		'icon': 'eye',
				// 		'handler': 'getSecret'
				// 	});
				// }

				if ($scope.access.delete) {
					options.left.push({
						'label': 'Delete Secret', //TODO: translation
						'icon': 'bin',
						'handler': 'deleteSecret'
					});
					// options.top.push({
					// 	'label': 'Delete Secrets', //TODO: translation
					// 	'icon': 'bin',
					// 	'handler': 'deleteSecrets'
					// });
				};

				buildGrid($scope,options);
			}
		});
	};

	$scope.addSecret = function () {
		$scope.add = true;
		var formConfig;
		var data;

		var submitAction = {
			method: 'post',
			routeName: '/dashboard/secrets/add',
			params: {}
		};

		$modal.open({
			templateUrl: "newSecret.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				//TODO: get deployer if docker -> use addDockerSecret
				// if kubernetes use addKubernetesSecret

				var formConfig = angular.copy(secretsAppConfig.form.addDockerSecret);

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

	$scope.deleteSecret = function (secretName) {
		//TODO: display delete confirmation
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/dashboard/secrets/delete',
			params: {
				name: secretName
			}
		}, function (error, response) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.displayAlert('success', 'Secret deleted successfully.');
			}
		});
	};

	// Start here
	if ($scope.access.list) {
		// $scope.listSecrets();
		console.log($scope);
		// $scope.secrets = [
		// 	{
		// 		name: 'secret1',
		// 		uid: '1111'
		// 	},
		// 	{
		// 		name: 'secret2',
		// 		uid: '2222'
		// 	},
		// 	{
		// 		name: 'secret3',
		// 		uid: '3333'
		// 	},
		// 	{
		// 		name: 'secret4',
		// 		uid: '4444'
		// 	},
		// 	{
		// 		name: 'secret5',
		// 		uid: '5555'
		// 	},
		// 	{
		// 		name: 'secret6',
		// 		uid: '6666'
		// 	}
		// ]

		// var options = {
		// 	grid: secretsAppConfig.dockerSecretsGrid,
		// 	data: $scope.secrets,
		// 	// defaultSortField: 'name',
		// 	left: [],
		// 	top: []
		// };
		//
		// // if ($scope.access.get) {
		// // 	options.left.push({
		// // 		'label': 'Inspect Secret', //TODO: translation
		// // 		'icon': 'eye',
		// // 		'handler': 'getSecret'
		// // 	});
		// // }
		//
		// if ($scope.access.delete) {
		// 	options.left.push({
		// 		'label': 'Delete Secret', //TODO: translation
		// 		'icon': 'bin',
		// 		'handler': 'deleteSecret'
		// 	});
		// 	// options.top.push({
		// 	// 	'label': 'Delete Secrets', //TODO: translation
		// 	// 	'icon': 'bin',
		// 	// 	'handler': 'deleteSecrets'
		// 	// });
		// };
		//
		// buildGrid($scope,options);
	};

}]);
