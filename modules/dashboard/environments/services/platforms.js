"use strict";
var platformsServices = soajsApp.components;
platformsServices.service('envPlatforms', ['ngDataApi', '$timeout', '$modal', '$cookies', 'Upload', function (ngDataApi, $timeout, $modal, $cookies, Upload) {

	var access_token = $cookies.get('access_token', {'domain': interfaceDomain});
	
	function renderDisplay(currentScope) {
		currentScope.originalEnvironment = angular.copy(currentScope.environment);
		if(currentScope.environment.type !== 'manual'){
			currentScope.platform = currentScope.environment.selected.split(".")[1];
			currentScope.driver = currentScope.environment.selected.split(".")[2];
			currentScope.config = currentScope.environment.container[currentScope.platform][currentScope.driver];
			
			if(currentScope.originalEnvironment.certs){
				let certs = [];
				currentScope.originalEnvironment.certs.forEach((oneCert)=>{
					if(oneCert.metadata.env[currentScope.envCode.toUpperCase()]){
						certs.push({
							_id: oneCert._id,
							filename: oneCert.filename,
							certType: oneCert.metadata.certType
						});
					}
				});
				currentScope.config.certs = certs;
			}
		}
		
		currentScope.availableCerts = {}; //used later to view available certificates and allow user to choose them for other drivers
		currentScope.originalEnvironment.certs.forEach(function (oneCert) {
			if (!currentScope.availableCerts[oneCert.metadata.platform]) {
				currentScope.availableCerts[oneCert.metadata.platform] = [];
			}
			if(!oneCert.metadata.env[currentScope.envCode.toUpperCase()]){
				currentScope.availableCerts[oneCert.metadata.platform].push(oneCert);
			}
		});
	}

	function uploadCerts(currentScope, platform, driverName) {
		var upload = $modal.open({
			templateUrl: "uploadCerts.tmpl",
			backdrop: true,
			keyboard: true,
			controller: function ($scope) {
				fixBackDrop();

				$scope.title = translation.uploadCertificates[LANG];
				$scope.outerScope = currentScope;
				$scope.formData = {
					certificates: {}
				};
				$scope.certs = {
					selected: {},
					types: ['ca', 'cert', 'key']
				};

				$scope.platform = platform;
				$scope.driver = driverName;

				$scope.onSubmit = function () {
					if ($scope.formData && $scope.formData.certificates && Object.keys($scope.formData.certificates).length > 0) {
						upload.close();
						var uploadInfo = $modal.open({
							templateUrl: 'uploadCertsInfo.html',
							backdrop: true,
							keyboard: false,
							controller: function ($scope) {
								fixBackDrop();
								$scope.text = "<h4 style='text-align:center;'>" + translation.uploadingCertificates[LANG] + "</h4><p style='text-align:center;'>" + translation.thisMightTakeFewMinutesPleaseWait[LANG] + "</p>";
							}
						});
						//create array index to go through certificates list
						$scope.index = [];
						for (var i in $scope.formData.certificates) {
							$scope.index.push(i);
						}

						$scope.uploadFiles(platform, driverName, 0, uploadInfo, function () {
							$scope.formData.certificates = {};
							$scope.index = [];
							uploadInfo.close();
							var uploadDone = $modal.open({
								templateUrl: 'uploadCertsInfo.html',
								backdrop: true,
								keyboard: true,
								controller: function ($scope, $modalInstance) {
									fixBackDrop();
									$scope.text = "<h4 style='text-align:center;'>" + translation.certificateAddedSuccessfully[LANG] + "</h4>";
								}
							});
							$timeout(function () {
								uploadDone.dismiss();
							}, 1500);

							currentScope.getEnvPlatform();
						});
					}
				};

				$scope.chooseCerts = function () {
					var certIds = [];
					var certsArr = Object.keys($scope.certs.selected);
					certsArr.forEach(function (oneCertId) {
						if ($scope.certs.selected[oneCertId]) {
							certIds.push(oneCertId);
						}
					});

					var options = {
						method: "put",
						routeName: "/dashboard/environment/platforms/cert/choose",
						params: {
							env: currentScope.envCode,
							platform: platform,
							driverName: driverName
						},
						data: {
							certIds: certIds
						}
					};

					if (platform === 'nginx') {
						options.routeName = '/dashboard/environment/nginx/cert/choose';
						delete options.params.driverName;
					}

					getSendDataFromServer(currentScope, ngDataApi, options, function (error, response) {
						if (error) {
							currentScope.$parent.displayAlert("danger", error.code, true, 'dashboard', error.message);
							upload.close();
						} else {
							currentScope.$parent.displayAlert('success', translation.chosenCertificatesSavedSuccessfully[LANG]);
							upload.close();
							currentScope.getEnvPlatform();
						}
					});
				};

				$scope.getAvailableCerts = function () {
					$scope.certsToDisplay = [];
					$scope.availableCertTypes = [];
					if (currentScope.availableCerts[$scope.platform]) {
						currentScope.availableCerts[$scope.platform].forEach(function (oneCert) {
							if (oneCert.metadata.platform === $scope.platform) {
								$scope.certsToDisplay.push({
									_id: oneCert._id,
									name: oneCert.filename,
									env: Object.keys(oneCert.metadata.env),
									certType: oneCert.metadata.certType
								});
							}
						});
					}
					//check the types of the certicates that are currently available for this driver
					//do not allow user to upload more than one certificate with the same type [ca, cert, key]
					currentScope.config.certs.forEach(function (oneCert) {
						$scope.availableCertTypes.push(oneCert.certType);
					});
				};
				$scope.getAvailableCerts();

				$scope.closeModal = function () {
					upload.close();
				};

				$scope.uploadFiles = function(platform, driverName, counter, modal, cb) {
					if (!currentScope.envCode || !platform || !$scope.formData.certificates[$scope.index[counter]].name) {
						//to avoid incompatibiltiy issues when using safari browsers
						return cb();
					}

					var soajsauthCookie = $cookies.get('soajs_auth', {'domain': interfaceDomain});
					var dashKeyCookie = $cookies.get('soajs_dashboard_key', {'domain': interfaceDomain});
					var progress = {
						value: 0
					};

					var options = {
						url: apiConfiguration.domain + "/dashboard/environment/platforms/cert/upload",
						params: {
							envCode: currentScope.envCode,
							filename: $scope.formData.certificates[$scope.index[counter]].name,
							certType: $scope.index[counter],
							platform: platform,
							driver: driverName,
							access_token: access_token
						},
						file: $scope.formData.certificates[$scope.index[counter]],
						headers: {
							'soajsauth': soajsauthCookie,
							'key': dashKeyCookie
						}
					};

					Upload.upload(options).progress(function (evt) {
						var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
						progress.value = progressPercentage;
					}).success(function (response, status, headers, config) {
						if (!response.result) {
							currentScope.$parent.displayAlert('danger', response.errors.details[0].message);
							currentScope.getEnvPlatform(); //refresh view in case some files were uploaded successfully
							modal.close();
						}
						else {
							counter++;
							if (counter === Object.keys($scope.formData.certificates).length) {
								return cb();
							} else {
								$scope.uploadFiles(platform, driverName, counter, modal, cb);
							}
						}
					}).error(function (data, status, header, config) {
						currentScope.$parent.displayAlert('danger', translation.errorOccurredWhileUploadingFile[LANG] + " " + options.params.filename);
						modal.close();
					});
				}
			}
		});
	}

	function removeCert(currentScope, certId, platform, driverName) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/environment/platforms/cert/delete",
			"params": {
				"id": certId,
				"env": currentScope.envCode,
				"driverName": platform + '.' + driverName
			}
		}, function (error, response) {
			if (error) {
				currentScope.$parent.displayAlert("danger", error.code, true, 'dashboard', error.message);
			} else {
				currentScope.$parent.displayAlert('success', translation.selectedCertificateRemoved[LANG]);
				currentScope.getEnvPlatform();
			}
		});
	}

	function updateNamespaceConfig(currentScope, driver) {
		var currentConfig = currentScope.platforms.kubernetes[driver];
		var modal = $modal.open({
			templateUrl: "updateNamespaceConfig.tmpl",
			backdrop: true,
			keyboard: true,
			controller: function ($scope) {
				fixBackDrop();
				
				$scope.title = 'Update Driver Configuration';
				$scope.driver = {
					token: currentConfig.auth.token,
					nginxDeployType: currentConfig.nginxDeployType
				};
				
				$scope.onSubmit2 = function () {
					var newConfig = angular.copy($scope.driver);
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'put',
						routeName: '/dashboard/environment/platforms/deployer/update',
						params: {
							env: currentScope.envCode.toLowerCase()
						},
						data: {
							driver: driver,
							config: newConfig
						}
					}, function (error) {
						if (error) {
							$scope.message = {
								danger: error.message
							};
							setTimeout(function () {
								$scope.message.danger = '';
							}, 5000);
						}
						else {
							$scope.closeModal();
							currentScope.displayAlert('success', 'Driver configuration updated successfully');
							currentScope.getEnvPlatform();
						}
					});
				};
				
				$scope.namespaces = {
					ui: {
						selection: [
							{ value: 'existing', label: 'Choose Existing Namespace' },
							{ value: 'new', label: 'Create New Namespace' }
						],
						list: [],
						type: [
							{ value: 'global', label: 'Global' },
							{ value: 'perService', label: 'Per Service' }
						]
					},
					data: {
						selection: 'existing',
						default: currentConfig.namespace.default,
						type: (currentConfig.namespace.perService) ? 'perService' : 'global'
					}
				};

				$scope.reset = function () {
					if ($scope.namespaces.data.selection === 'new') {
						$scope.namespaces.data.default = '';
					}
					else {
						$scope.namespaces.data.default = currentConfig.namespace.default;
					}
				};

				$scope.listNamespaces = function () {
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'get',
						routeName: '/dashboard/cloud/namespaces/list',
						params: {
							env : currentScope.envCode.toLowerCase()
						}
					}, function (error, namespaces) {
						if (error) {
							$scope.message = {
								danger: error.message
							};
							setTimeout(function () {
								$scope.message.danger = '';
							}, 5000);
						}
						else {
							namespaces.forEach(function (oneNamespace) {
								$scope.namespaces.ui.list.push({ value: oneNamespace.id, label: oneNamespace.name });
							});
						}
					});
				};

				$scope.onSubmit = function () {
					var newConfig = {
						namespace: {
							default: $scope.namespaces.data.default,
							perService: (($scope.namespaces.data.type === 'perService') ? true : false)
						}
					};
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'put',
						routeName: '/dashboard/environment/platforms/deployer/update',
						params: {
							env: currentScope.envCode.toLowerCase()
						},
						data: {
							driver: driver,
							config: newConfig
						}
					}, function (error, result) {
						if (error) {
							$scope.message = {
								danger: error.message
							};
							setTimeout(function () {
								$scope.message.danger = '';
							}, 5000);
						}
						else {
							$scope.closeModal();
							currentScope.displayAlert('success', 'Namespace configuration updated successfully');
							currentScope.listPlatforms(currentScope.envCode);
						}
					});
				};

				$scope.closeModal = function () {
					$scope.namespaces.data = {};
					$scope.driver = {};
					modal.close();
				};

				$scope.listNamespaces();
			}
		});
	}
	
	function updateDockerConfiguration(currentScope, driver) {
		var currentConfig = {
			apiPort: parseInt(currentScope.platforms.docker[driver].apiPort)
		};
		delete currentConfig.certs;
		var modal = $modal.open({
			templateUrl: "updateDockerConfiguration.tmpl",
			backdrop: true,
			keyboard: true,
			controller: function ($scope) {
				fixBackDrop();
				
				$scope.title = 'Update Docker Configuration';
				$scope.data = angular.copy(currentConfig);
				
				$scope.onSubmit = function () {
					var newConfig = $scope.data;
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'put',
						routeName: '/dashboard/environment/platforms/deployer/update',
						params: {
							env: currentScope.envCode.toLowerCase()
						},
						data: {
							driver: driver,
							config: newConfig
						}
					}, function (error) {
						if (error) {
							$scope.message = {
								danger: error.message
							};
							setTimeout(function () {
								$scope.message.danger = '';
							}, 5000);
						}
						else {
							$scope.data = {};
							modal.close();
							currentScope.displayAlert('success', 'Driver Configuration updated successfully');
							currentScope.getEnvPlatform(currentScope.envCode);
						}
					});
				};
				
				$scope.closeModal = function () {
					$scope.data = {};
					modal.close();
				};
			}
		});
	}

	return {
		'renderDisplay': renderDisplay,
		'uploadCerts': uploadCerts,
		'removeCert': removeCert,
		'updateNamespaceConfig': updateNamespaceConfig,
		'updateDockerConfiguration': updateDockerConfiguration
	}

}]);
