"use strict";
var vmsServices = soajsApp.components;
vmsServices.service('deploymentVMs', ['ngDataApi', '$timeout', '$modal', '$cookies', function (ngDataApi, $timeout, $modal, $cookies) {

	function listVMLayers(currentScope) {
		//create variable to indicate that we listing VMLayers in Clouds & Deployments
		currentScope.listingClouds = true;
		
		//call common function
		getInfraProvidersAndVMLayers(currentScope, ngDataApi, currentScope.envCode, currentScope.infraProviders, (vmLayers) => {
			currentScope.vmLayers = vmLayers;

			if (Object.keys(currentScope.vmLayers).length > 0) {
				//create a variable to indicate that there are VMs
				currentScope.vmsAvailable = true;
				console.log(currentScope);
			}
		});
	}

	function deleteVMLayer (currentScope, oneVMLayer) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/cloud/vm",
			"params": {
				"env": currentScope.envCode,
				"serviceId": oneVMLayer.name,
				"infraId": oneVMLayer.infraProvider._id,
				'technology': 'vm'
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				listVMLayers(currentScope);
			}
		});
	}

	//TODO: finalize maintenance operation parameters
	function maintenanceOp (currentScope, oneVMInstance, action) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "post",
			"routeName": "/dashboard/cloud/vm/maintenance",
			"params": {
				"infraId": "",
				// "env": "",
				"technology": "",
				"vmName": oneVMInstance.name,
				"operation": action
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				listVMLayers(currentScope);
			}
		});
	}

	//TODO: finalize delete parameters
	function deleteVM (currentScope, oneVMInstance) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/cloud/vm",
			"params": {
				"infraId": "",
				// "env": "",
				"serviceId": "",
				"technology": ""
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				listVMLayers(currentScope);
			}
		});
	}

	//TODO: Make sure params are filled.
	function getVMLogs (currentScope, oneVMInstance) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/cloud/vm/logs",
			"params": {
				"infraId": "",
				// "env": "",
				"technology": "",
				"vmName": oneVMInstance.name,
				// "numberOfLines": , //optional
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				//TODO: open modal to show logs
			}
		});

		//get logs function from dashboard
		/* overlayLoading.show();
		currentScope.pauseRefresh = true;
		getSendDataFromServer(currentScope, ngDataApi, {
			method: "get",
			routeName: "/dashboard/cloud/services/instances/logs",
			params: {
				env: currentScope.envCode,
				namespace: service.namespace || '', //pass namespace in case of kubernetes deployment
				serviceId: task.ref.service.id,
				taskId: task.id
			}
		}, function (error, response) {
			overlayLoading.hide();
			var autoRefreshPromise;

			var mInstance = $modal.open({
				templateUrl: "logBox.html",
				size: 'lg',
				backdrop: true,
				keyboard: false,
				windowClass: 'large-Modal',
				controller: function ($scope, $modalInstance) {
					$scope.title = "Host Logs of " + task.name;
					fixBackDrop();

					$scope.ok = function () {
						$modalInstance.dismiss('ok');
					};

					if(error) {
						$scope.message = {
							warning: 'Instance logs are not available at the moment. Make sure that the instance is <strong style="color:green;">running</strong> and healthy.<br> If this is a newly deployed instance, please try again in a few moments.'
						};
					}
					else {
						$scope.data = remove_special(response.data);
						$timeout(function () {
							highlightMyCode()
						}, 500);

						$scope.refreshLogs = function () {
							getSendDataFromServer(currentScope, ngDataApi, {
								method: "get",
								routeName: "/dashboard/cloud/services/instances/logs",
								params: {
									env: currentScope.envCode,
									namespace: service.namespace || '', //pass namespace in case of kubernetes deployment
									serviceId: task.ref.service.id,
									taskId: task.id
								}
							}, function (error, response) {
								if (error) {
									currentScope.displayAlert('danger', error.message);
								}
								else {
									$scope.data = remove_special(response.data).replace("undefined", "").toString();
									if (!$scope.$$phase) {
										$scope.$apply();
									}

									fixBackDrop();
									$timeout(function () {
										highlightMyCode()
									}, 500);

									autoRefreshPromise = $timeout(function () {
										$scope.refreshLogs();
									}, 5000);
								}
							});
						};

						$scope.refreshLogs();
					}
				}
			});

			mInstance.result.then(function () {
				//Get triggers when modal is closed
				currentScope.pauseRefresh = false;
				$timeout.cancel(autoRefreshPromise);
			}, function () {
				//gets triggers when modal is dismissed.
				currentScope.pauseRefresh = false;
				$timeout.cancel(autoRefreshPromise);
			});
		});

		function remove_special(str) {
			if (!str) {
				return 'No logs found for this instance'; //in case container has no logs, return message to display
			}
			var rExps = [/[\xC0-\xC2]/g, /[\xE0-\xE2]/g,
				/[\xC8-\xCA]/g, /[\xE8-\xEB]/g,
				/[\xCC-\xCE]/g, /[\xEC-\xEE]/g,
				/[\xD2-\xD4]/g, /[\xF2-\xF4]/g,
				/[\xD9-\xDB]/g, /[\xF9-\xFB]/g,
				/\xD1/, /\xF1/g,
				"/[\u00a0|\u1680|[\u2000-\u2009]|u200a|\u200b|\u2028|\u2029|\u202f|\u205f|\u3000|\xa0]/g",
				/\uFFFD/g,
				/\u000b/g, '/[\u180e|\u000c]/g',
				/\u2013/g, /\u2014/g,
				/\xa9/g, /\xae/g, /\xb7/g, /\u2018/g, /\u2019/g, /\u201c/g, /\u201d/g, /\u2026/g,
				/</g, />/g
			];
			var repChar = ['A', 'a', 'E', 'e', 'I', 'i', 'O', 'o', 'U', 'u', 'N', 'n', ' ', '', '\t', '', '-', '--', '(c)', '(r)', '*', "'", "'", '"', '"', '...', '&lt;', '&gt;'];
			for (var i = 0; i < rExps.length; i++) {
				str = str.replace(rExps[i], repChar[i]);
			}
			for (var x = 0; x < str.length; x++) {
				var charcode = str.charCodeAt(x);
				if ((charcode < 32 || charcode > 126) && charcode != 10 && charcode != 13) {
					str = str.replace(str.charAt(x), "");
				}
			}
			return str;
		} */
	}

	return {
		'listVMLayers': listVMLayers,
		'deleteVM': deleteVM,
		'deleteVMLayer': deleteVMLayer,
		'maintenanceOp': maintenanceOp,
		'getVMLogs': getVMLogs
	}
}]);
