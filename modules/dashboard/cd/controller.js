'use strict';

var cdApp = soajsApp.components;
cdApp.controller('cdAppCtrl', ['$scope', '$timeout', '$modal', '$cookies', 'ngDataApi', 'injectFiles', function ($scope, $timeout, $modal, $cookies, ngDataApi, injectFiles) {
	$scope.$parent.isUserLoggedIn();
	$scope.configuration = {};
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, cdAppConfig.permissions);

	$scope.cdData = {};
	if ($cookies.getObject('myEnv', { 'domain': interfaceDomain })) {
		$scope.myEnv = $cookies.getObject('myEnv', { 'domain': interfaceDomain }).code;
	}
	$scope.upgradeSpaceLink = cdAppConfig.upgradeSpaceLink;
	$scope.updateCount;
	$scope.upgradeCount;

	$scope.cdShowHide = function (oneSrv) {
		if ($scope.configuration[oneSrv].icon === 'minus') {
			$scope.configuration[oneSrv].icon = 'plus';
			jQuery('#cdc_' + oneSrv).slideUp();
		}
		else {
			$scope.configuration[oneSrv].icon = 'minus';
			jQuery('#cdc_' + oneSrv).slideDown()
		}
	};

	$scope.getRecipe = function () {

		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/cd'
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}

			if (!response) {
				response = {};
			}

			$scope.cdData = response;
			$scope.maxEntries = 0;
			if ($scope.myEnv && response[$scope.myEnv.toUpperCase()]) {
				$scope.configuration = angular.copy(response[$scope.myEnv.toUpperCase()]);
				if (Object.hasOwnProperty.call($scope.configuration, 'pause')) {
					$scope.paused = $scope.configuration.pause;
				}
				delete $scope.configuration.pause;
				for (var service in $scope.configuration) {
					if (SOAJSRMS.indexOf("soajs." + service) !== -1) {
						delete $scope.configuration[service];
					}
					else {
						if (['pause', 'deploy', 'options'].indexOf(service) === -1) {
							$scope.maxEntries++;
							$scope.configuration[service].icon = 'minus';
							$scope.configuration[service].versions = {};

							if ($scope.configuration[service].type === 'daemon') {
								for (var i in $scope.configuration[service]) {
									if (['type', 'branch', 'strategy', 'versions', 'icon', 'deploy', 'options'].indexOf(i) === -1) {

										$scope.configuration[service].versions[i] = {};
										for (var groupName in $scope.configuration[service][i]) {
											$scope.configuration[service].versions[i][groupName] = angular.copy($scope.configuration[service][i][groupName]);
										}
										delete $scope.configuration[service][i];
									}
								}

							}
							else {
								for (var i in $scope.configuration[service]) {

									if (['type', 'branch', 'strategy', 'versions', 'icon', 'deploy', 'options'].indexOf(i) === -1) {
										$scope.configuration[service].versions[i] = angular.copy($scope.configuration[service][i]);
										delete $scope.configuration[service][i];
									}
								}
							}
							if (Object.keys($scope.configuration[service].versions).length === 0) {
								delete $scope.configuration[service].versions;
							}
						}
					}
				}
			}
		});
	};

	$scope.pauseRecipe = function (pause) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'post',
			routeName: '/dashboard/cd/pause',
			data: {
				"config": {
					"env": $scope.myEnv,
					"pause": pause
				}
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.displayAlert('success', 'Recipe Saved successfully');
				$timeout(function () {
					$scope.getRecipe();
				}, 200)
			}
		});
	};

	$scope.saveRecipe = function (service, version) {
		var data = {
			env: $scope.myEnv,
			serviceName: service
		};

		if (SOAJSRMS.indexOf("soajs." + service) !== -1) {
			$scope.displayAlert('danger', "You cannot Apply Continuous Delivery on a SOAJS Ready Made Service.");
		}

		if ($scope.configuration[service].versions && Object.keys($scope.configuration[service].versions).length > 0) {
			data.version = {
				v: version
			};

			for (var i in $scope.configuration[service].versions[version]) {
				data.version[i] = $scope.configuration[service].versions[version][i];
			}
		}
		else {
			data.default = {
				branch: $scope.configuration[service].branch,
				strategy: $scope.configuration[service].strategy
			};
			if ($scope.configuration[service].deploy) {
				data.default.deploy = $scope.configuration[service].deploy;
				data.default.options = $scope.configuration[service].options;
			}
		}

		overlayLoading.show();
		if ($scope.configuration[service].type === 'daemon') {
			var newData = {
				env: data.env,
				serviceName: data.serviceName,
				version: {}
			};

			var max = Object.keys(data.version).length;
			updateDaemonsGroupCD(data.version, 0, function () {
				overlayLoading.hide();
				$scope.displayAlert('success', 'Recipe Saved successfully');
				$scope.getRecipe();
			});
		}
		else {
			getSendDataFromServer($scope, ngDataApi, {
				method: 'post',
				routeName: '/dashboard/cd',
				data: {
					"config": data
				}
			}, function (error, response) {
				overlayLoading.hide();
				if (error) {
					$scope.displayAlert('danger', error.message);
				}
				else {
					$scope.displayAlert('success', 'Recipe Saved successfully');
					$scope.getRecipe();
				}
			});
		}

		function updateDaemonsGroupCD(version, counter, cb) {
			var groupName = Object.keys(version)[counter];
			if (groupName === 'v') {
				counter++;
				updateDaemonsGroupCD(version, counter, cb);
			}
			else {
				var daemonGroupData = angular.copy(newData);
				daemonGroupData.version = data.version[groupName];
				daemonGroupData.version.v = data.version.v;

				getSendDataFromServer($scope, ngDataApi, {
					method: 'post',
					routeName: '/dashboard/cd',
					data: {
						"config": daemonGroupData
					}
				}, function (error, response) {
					if (error) {
						overlayLoading.hide();
						$scope.displayAlert('danger', error.message);
					}
					else {
						counter++;
						if (counter === max) {
							return cb();
						}
						else {
							updateDaemonsGroupCD(version, counter, cb);
						}
					}
				});
			}
		}
	};
	
	/**
	 * Updates & Upgrades
	 */
	
	$scope.getUpdates = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/cd/updates',
			params: {
				"env": $scope.myEnv
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				parseMyResponse(response);
			}
		});


		function parseMyResponse(list) {
			$scope.imageLedger = [];
			$scope.catalogLedger = [];

			$scope.upgradeCount = 0;

			list.forEach(function (oneEntry) {
				$scope.upgradeCount++;
				if ($scope.myEnv.toLowerCase() === 'dashboard') {
					oneEntry.rms = true;
				}
				else if (oneEntry.labels && oneEntry.labels['soajs.content'] === 'true' && oneEntry.labels['soajs.service.name']) {
					oneEntry.rms = true;
				}
				switch (oneEntry.mode) {
					case 'image':
						$scope.imageLedger.push(oneEntry);
						break;
					case 'rebuild':
						$scope.catalogLedger.push(oneEntry);
						break;
				}
			});
			if ($scope.upgradeCount > 0) {
				$scope.upgradeCount = "(" + $scope.upgradeCount + ")";
			}
			else {
				$scope.upgradeCount = null;
			}
		}
	};
	
	$scope.getLedger = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/cd/ledger',
			params: {
				"env": $scope.myEnv
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.ledger = response;
				$scope.updateCount = 0;
				$scope.ledger.forEach(function (oneLedgerEntry) {
					if (oneLedgerEntry.notify && !oneLedgerEntry.manual && !oneLedgerEntry.read) {
						$scope.updateCount++;
					}
				});
				if ($scope.updateCount > 0) {
					$scope.updateCount = "(" + $scope.updateCount + ")";
				}
				else {
					$scope.updateCount = null;
				}
			}
		});
	};

	$scope.updateEntry = function (oneEntry, operation) {
		if (operation === 'redeploy') {
			doRebuild();
		}
		else {
			$scope.$parent.go('#/deploy-repositories');
		}

		function doRebuild() {
			let params = {
				data: {
					id: oneEntry._id.toString(),
					action: operation
				},
				env: $scope.myEnv.toLowerCase()
			};
			
			overlayLoading.show();
			getSendDataFromServer($scope, ngDataApi, {
				method: 'put',
				routeName: '/dashboard/cd/action',
				data: params
			}, function (error) {
				overlayLoading.hide();
				if (error) {
					$scope.displayAlert('danger', error.message);
				}
				else {
					$scope.displayAlert('success', 'Service operation [' + operation + '] was successful');
					$scope.getLedger();
					overlayLoading.hide();
					if ($scope.modalInstance) {
						$scope.modalInstance.dismiss();
					}
				}
			});
		}
	};

	$scope.deployEntry = function (oneEntry) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'post',
			routeName: '/dashboard/cd/action',
			data: oneEntry.deployOptions || {}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.displayAlert('success', 'Service deployed successfully');

				if (operation === 'redeploy') {
					$scope.getLedger();
				}
				else {
					$scope.getUpdates();
				}
			}
		});
	};

	$scope.readAll = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'put',
			routeName: '/dashboard/cd/ledger/read',
			data: {
				"data": { "all": true }
			}

		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.displayAlert('success', 'All entries updated');
				$scope.getLedger();
			}
		});
	};

	$scope.readOne = function (oneEntry) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'put',
			routeName: '/dashboard/cd/ledger/read',
			data: {
				"data": { "id": oneEntry._id }
			}

		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.displayAlert('success', 'Entry updated');
				$scope.getLedger();
			}
		});
	};
	
	/**
	 * Other Log Messages
	 */
	$scope.getOtherLogs = function () {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/cd/ledger',
			params: {
				"env": $scope.myEnv,
				"logs": true
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.logs = response;
				$scope.logsCount = response.length;
				if ($scope.logsCount > 0) {
					$scope.logsCount = "(" + $scope.logsCount + ")";
				}
				else {
					$scope.logsCount = null;
				}
			}
		});
	};
	
	$scope.readOneLog = function(oneEntry) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'put',
			routeName: '/dashboard/cd/ledger/read',
			data: {
				"data": { "id": oneEntry._id, "logs": true }
			}
			
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.displayAlert('success', 'Entry updated');
				$scope.getOtherLogs();
			}
		});
	};
	
	$scope.readAllLogs = function(oneEntry) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'put',
			routeName: '/dashboard/cd/ledger/read',
			data: {
				"data": { "all": true, "logs": true }
			}
			
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
				$scope.displayAlert('success', 'All entries updated');
				$scope.getOtherLogs();
			}
		});
	};
	
	injectFiles.injectCss("modules/dashboard/cd/cd.css");

	// Start here
	if ($scope.access.get && $scope.myEnv && $scope.$parent.currentDeployer.type !== 'manual') {
		$scope.getLedger();
		$scope.getUpdates();
		$scope.getOtherLogs();
	}
}]);
