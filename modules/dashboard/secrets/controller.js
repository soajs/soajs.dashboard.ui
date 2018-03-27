'use strict';
var secretsApp = soajsApp.components;

secretsApp.controller('secretsAppCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', 'injectFiles', '$localStorage', '$cookies', function ($scope, $timeout, $modal, ngDataApi, injectFiles, $localStorage, $cookies) {
	$scope.$parent.isUserLoggedIn();

	$scope.access = {};

	//get selected environment record
	$scope.selectedEnvironment = $cookies.getObject('myEnv', { 'domain': interfaceDomain });

	//set selected deployer
	$scope.envDeployer = $scope.selectedEnvironment.deployer.selected.split('.')[1];

	constructModulePermissions($scope, $scope.access, secretsAppConfig.permissions);

	$scope.listSecrets = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/secrets/list',
			params: {
				env: $scope.selectedEnvironment.code
				// namespace: $scope.selectedNamespace
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.secrets = response;

				var options = {
					grid: secretsAppConfig.secretsGrid,
					data: $scope.secrets,
					left: [],
					top: []
				};

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

				var formConfig = angular.copy(secretsAppConfig.form.addSecret);

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
								var input = {
									name: formData.name,
									env: $scope.selectedEnvironment,
									type: 'Opaque',
									namespace: $scope.selectedNamespace
								}

								if(formData.content) {
									input.data = formData.content
								}
								else {
									input.data = formData.file
								}

								getSendDataFromServer($scope, ngDataApi, {
									method: 'post',
									routeName: '/dashboard/secrets/add',
									params: input
								}, function (error, response) {
									if (error) {
										$scope.displayAlert('danger', error.message);
									}
									else {
										$scope.displayAlert('success', 'Secret created successfully.')
									}
								});
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
		$scope.listSecrets();
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

		/
	};

}]);
