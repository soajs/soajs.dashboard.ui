"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('cloudsCtrl', ['$scope', '$cookies', '$localStorage', 'ngDataApi', 'secretsService', 'pvcService', 'podService', 'hacloudSrv', '$modal', 'injectFiles', '$timeout', function ($scope, $cookies, $localStorage, ngDataApi, secretsService, pvcService, podService, hacloudSrv, $modal, injectFiles, $timeout) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
	
	//global
	$scope.directiveToLoad = '';
	$scope.envDeployer = $cookies.getObject('myEnv', {'domain': interfaceDomain}).deployer;
	if ($scope.envDeployer.type === 'container') {
		$scope.directiveToLoad = "list-cloud-kube.tmpl";
		//$scope.directiveToLoad = "list-cloud.tmpl";
	}
	$scope.selectedEnvironment = $cookies.getObject('myEnv', {'domain': interfaceDomain});
	$scope.inspectItem = function (service) {
		hacloudSrv.inspectItem($scope, service);
	};
	$scope.createItem = function (type) {
		hacloudSrv.createItem($scope, type);
	};
	
	$scope.editItem = function (item, type) {
		hacloudSrv.editItem($scope, item, type);
	};
	
	//secret
	$scope.listSecrets = function (fieldSelector) {
		overlayLoading.show();
		let opts = {
			"method": 'get',
			"routeName": '/infra/kubernetes/configurations/Secret',
			"params": {
				"configuration": {
					"env": $scope.selectedEnvironment.code,
				},
				"limit": 100
			}
		};
		if ($scope.secrets && $scope.secrets.metadata && $scope.secrets.metadata.continue) {
			opts.params.continue = $scope.secrets.metadata.continue;
		}
		if (fieldSelector) {
			opts.params.filter = {
				fieldSelector: 'metadata.name=' + fieldSelector
			}
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				if (fieldSelector !== $scope.secretFieldSelector || !$scope.secretFieldSelector) {
					$scope.secrets = response;
				} else {
					if ($scope.secrets && $scope.secrets.items) {
						response.items = response.items.concat($scope.secrets.items);
						$scope.secrets = response;
					} else {
						$scope.secrets = response;
					}
				}
				$scope.secretFieldSelector = fieldSelector;
				
			}
		});
	};
	$scope.addSecret = function () {
		let currentScope = $scope;
		$modal.open({
			templateUrl: "newSecret.tmpl",
			size: 'lg',
			backdrop: false,
			keyboard: false,
			controller: function ($scope, $modalInstance) {
				secretsService.addSecret($scope, $modalInstance, currentScope);
			}
		});
	};
	$scope.deleteSecret = function (secret) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/configurations/secret',
			params: {
				configuration: {
					env: $scope.selectedEnvironment.code,
				},
				name: secret.metadata.name
			},
		}, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', 'Secret deleted successfully.');
				$scope.listSecrets();
			}
		});
	};
	$scope.openSecret = function (secret) {
		secret.showInfo = !secret.showInfo;
	};
	
	//PVC
	$scope.listPVC = function (fieldSelector) {
		overlayLoading.show();
		let opts = {
			"method": 'get',
			"routeName": '/infra/kubernetes/storages/PVC',
			"params": {
				"configuration": {
					"env": $scope.selectedEnvironment.code,
				},
				"limit": 100
			}
		};
		if ($scope.pvc && $scope.pvc.metadata && $scope.pvc.metadata.continue) {
			opts.params.continue = $scope.pvc.metadata.continue;
		}
		if (fieldSelector) {
			opts.params.filter = {
				fieldSelector: 'metadata.name=' + fieldSelector
			}
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				if (fieldSelector !== $scope.pvcFieldSelector || !$scope.pvcFieldSelector) {
					$scope.pvc = response;
				} else {
					if ($scope.pvc && $scope.pvc.items) {
						response.items = response.items.concat($scope.pvc.items);
						$scope.pvc = response;
					} else {
						$scope.pvc = response;
					}
				}
				$scope.pvcFieldSelector = fieldSelector;
				
			}
		});
	};
	$scope.addPVC = function () {
		let currentScope = $scope;
		$modal.open({
			templateUrl: "newPvc.tmpl",
			size: 'lg',
			backdrop: false,
			keyboard: false,
			controller: function ($scope, $modalInstance) {
				pvcService.addVolume($scope, $modalInstance, currentScope);
			}
		});
	};
	$scope.deletePVC = function (pvc) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/storage/pvc',
			params: {
				configuration: {
					env: $scope.selectedEnvironment.code,
				},
				name: pvc.metadata.name
			},
		}, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', 'PVC deleted successfully.');
				$scope.listPVC();
			}
		});
	};
	
	//PV
	$scope.listPV = function (fieldSelector) {
		overlayLoading.show();
		let opts = {
			"method": 'get',
			"routeName": '/infra/kubernetes/storages/PV',
			"params": {
				"configuration": {
					"env": $scope.selectedEnvironment.code,
				},
				"limit": 100
			}
		};
		if ($scope.pv && $scope.pv.metadata && $scope.pv.metadata.continue) {
			opts.params.continue = $scope.pv.metadata.continue;
		}
		if (fieldSelector) {
			opts.params.filter = {
				fieldSelector: 'metadata.name=' + fieldSelector
			}
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				if (fieldSelector !== $scope.pvFieldSelector || !$scope.pvFieldSelector) {
					$scope.pv = response;
				} else {
					if ($scope.pv && $scope.pv.items) {
						response.items = response.items.concat($scope.pv.items);
						$scope.pv = response;
					} else {
						$scope.pv = response;
					}
				}
				$scope.pvFieldSelector = fieldSelector;
				
			}
		});
	};
	$scope.deletePV = function (pv) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/storage/pv',
			params: {
				configuration: {
					env: $scope.selectedEnvironment.code,
				},
				name: pv.metadata.name
			},
		}, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', 'PV deleted successfully.');
				$scope.listPV();
			}
		});
	};
	
	//service
	$scope.listServices = function (fieldSelector) {
		overlayLoading.show();
		let opts = {
			"method": 'get',
			"routeName": '/infra/kubernetes/services/Service',
			"params": {
				"configuration": {
					"env": $scope.selectedEnvironment.code,
				},
				"limit": 100
			}
		};
		if ($scope.services && $scope.services.metadata && $scope.services.metadata.continue) {
			opts.params.continue = $scope.pvc.metadata.continue;
		}
		if (fieldSelector) {
			opts.params.filter = {
				fieldSelector: 'metadata.name=' + fieldSelector
			}
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				if (fieldSelector !== $scope.serviceFieldSelector || !$scope.serviceFieldSelector) {
					$scope.services = response;
				} else {
					if ($scope.services && $scope.services.items) {
						response.items = response.items.concat($scope.services.items);
						$scope.services = response;
					} else {
						$scope.services = response;
					}
				}
				$scope.serviceFieldSelector = fieldSelector;
				
			}
		});
	};
	$scope.deleteService = function (service) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/service/Service',
			params: {
				configuration: {
					env: $scope.selectedEnvironment.code,
				},
				name: service.metadata.name
			},
		}, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', 'Service deleted successfully.');
				$scope.listServices();
			}
		});
	};
	
	//deployment
	$scope.listDeployments = function (fieldSelector) {
		overlayLoading.show();
		let opts = {
			"method": 'get',
			"routeName": '/infra/kubernetes/workloads/Deployment',
			"params": {
				"configuration": {
					"env": $scope.selectedEnvironment.code,
				},
				"limit": 100
			}
		};
		if ($scope.deployments && $scope.deployments.metadata && $scope.deployments.metadata.continue) {
			opts.params.continue = $scope.deployments.metadata.continue;
		}
		if (fieldSelector) {
			opts.params.filter = {
				fieldSelector: 'metadata.name=' + fieldSelector
			}
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				if (fieldSelector !== $scope.deploymentFieldSelector || !$scope.deploymentFieldSelector) {
					$scope.deployments = response;
				} else {
					if ($scope.deployments && $scope.deployments.items) {
						response.items = response.items.concat($scope.deployments.items);
						$scope.deployments = response;
					} else {
						$scope.deployments = response;
					}
				}
				$scope.deploymentFieldSelector = fieldSelector;
				
			}
		});
	};
	$scope.deleteDeployment = function (deployment) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/workload/Deployment',
			params: {
				configuration: {
					env: $scope.selectedEnvironment.code,
				},
				name: deployment.metadata.name
			},
		}, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', 'Deployment deleted successfully.');
				$scope.listDeployments();
			}
		});
	};
	
	//daemonSet
	$scope.listDaemonSets = function (fieldSelector) {
		overlayLoading.show();
		let opts = {
			"method": 'get',
			"routeName": '/infra/kubernetes/workloads/DaemonSet',
			"params": {
				"configuration": {
					"env": $scope.selectedEnvironment.code,
				},
				"limit": 100
			}
		};
		if ($scope.daemonSets && $scope.daemonSets.metadata && $scope.daemonSets.metadata.continue) {
			opts.params.continue = $scope.daemonSets.metadata.continue;
		}
		if (fieldSelector) {
			opts.params.filter = {
				fieldSelector: 'metadata.name=' + fieldSelector
			}
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				if (fieldSelector !== $scope.daemonSetFieldSelector || !$scope.daemonSetFieldSelector) {
					$scope.daemonSets = response;
				} else {
					if ($scope.daemonSets && $scope.daemonSets.items) {
						response.items = response.items.concat($scope.daemonSets.items);
						$scope.daemonSets = response;
					} else {
						$scope.daemonSets = response;
					}
				}
				$scope.daemonSetFieldSelector = fieldSelector;
				
			}
		});
	};
	$scope.deleteDaemonSet = function (daemonset) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/workload/DaemonSet',
			params: {
				configuration: {
					env: $scope.selectedEnvironment.code,
				},
				name: daemonset.metadata.name
			},
		}, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', 'DaemonSet deleted successfully.');
				$scope.listDaemonSets();
			}
		});
	};
	
	//cronJob
	$scope.listCronJobs = function (fieldSelector) {
		overlayLoading.show();
		let opts = {
			"method": 'get',
			"routeName": '/infra/kubernetes/workloads/CronJob',
			"params": {
				"configuration": {
					"env": $scope.selectedEnvironment.code,
				},
				"limit": 100
			}
		};
		if ($scope.cronJobs && $scope.cronJobs.metadata && $scope.cronJobs.metadata.continue) {
			opts.params.continue = $scope.cronJobs.metadata.continue;
		}
		if (fieldSelector) {
			opts.params.filter = {
				fieldSelector: 'metadata.name=' + fieldSelector
			}
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				if (fieldSelector !== $scope.cronJobFieldSelector || !$scope.cronJobFieldSelector) {
					$scope.cronJobs = response;
				} else {
					if ($scope.cronJobs && $scope.cronJobs.items) {
						response.items = response.items.concat($scope.cronJobs.items);
						$scope.cronJobs = response;
					} else {
						$scope.cronJobs = response;
					}
				}
				$scope.cronJobFieldSelector = fieldSelector;
				
			}
		});
	};
	$scope.deleteCronJob = function (cron) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/workload/CronJob',
			params: {
				configuration: {
					env: $scope.selectedEnvironment.code,
				},
				name: cron.metadata.name
			},
		}, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', 'CronJob deleted successfully.');
				$scope.listCronJobs();
			}
		});
	};
	
	//hpa
	$scope.listHPA = function (fieldSelector) {
		overlayLoading.show();
		let opts = {
			"method": 'get',
			"routeName": '/infra/kubernetes/workloads/HPA',
			"params": {
				"configuration": {
					"env": $scope.selectedEnvironment.code,
				},
				"limit": 100
			}
		};
		if ($scope.hpa && $scope.hpa.metadata && $scope.hpa.metadata.continue) {
			opts.params.continue = $scope.hpa.metadata.continue;
		}
		if (fieldSelector) {
			opts.params.filter = {
				fieldSelector: 'metadata.name=' + fieldSelector
			}
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				if (fieldSelector !== $scope.hpaFieldSelector || !$scope.hpaFieldSelector) {
					$scope.hpa = response;
				} else {
					if ($scope.hpa && $scope.hpa.items) {
						response.items = response.items.concat($scope.hpa.items);
						$scope.hpa = response;
					} else {
						$scope.hpa = response;
					}
				}
				$scope.hpaFieldSelector = fieldSelector;
				
			}
		});
	};
	$scope.deleteHPA = function (hpa) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/workload/HPA',
			params: {
				configuration: {
					env: $scope.selectedEnvironment.code,
				},
				name: hpa.metadata.name
			},
		}, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', 'HPA deleted successfully.');
				$scope.listHPA();
			}
		});
	};
	
	//storageClass
	$scope.listStorageClass = function (fieldSelector) {
		overlayLoading.show();
		let opts = {
			"method": 'get',
			"routeName": '/infra/kubernetes/storages/StorageClass',
			"params": {
				"configuration": {
					"env": $scope.selectedEnvironment.code,
				},
				"limit": 100
			}
		};
		if ($scope.storageClass && $scope.storageClass.metadata && $scope.storageClass.metadata.continue) {
			opts.params.continue = $scope.storageClass.metadata.continue;
		}
		if (fieldSelector) {
			opts.params.filter = {
				fieldSelector: 'metadata.name=' + fieldSelector
			}
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				if (fieldSelector !== $scope.storageClassFieldSelector || !$scope.storageClassFieldSelector) {
					$scope.storageClass = response;
				} else {
					if ($scope.storageClass && $scope.storageClass.items) {
						response.items = response.items.concat($scope.storageClass.items);
						$scope.storageClass = response;
					} else {
						$scope.storageClass = response;
					}
				}
				$scope.storageClassFieldSelector = fieldSelector;
				
			}
		});
	};
	$scope.deleteStorageClass = function (storage) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/storage/StorageClass',
			params: {
				configuration: {
					env: $scope.selectedEnvironment.code,
				},
				name: storage.metadata.name
			},
		}, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', 'StorageClass deleted successfully.');
				$scope.listStorageClass();
			}
		});
	};
	
	//nodes
	$scope.listNodes = function (fieldSelector) {
		overlayLoading.show();
		let opts = {
			"method": 'get',
			"routeName": '/infra/kubernetes/clusters/Node',
			"params": {
				"configuration": {
					"env": $scope.selectedEnvironment.code,
				},
				"limit": 100
			}
		};
		if ($scope.nodes && $scope.nodes.metadata && $scope.nodes.metadata.continue) {
			opts.params.continue = $scope.nodes.metadata.continue;
		}
		if (fieldSelector) {
			opts.params.filter = {
				fieldSelector: 'metadata.name=' + fieldSelector
			}
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				if (fieldSelector !== $scope.nodeFieldSelector || !$scope.nodeFieldSelector) {
					$scope.nodes = response;
				} else {
					if ($scope.nodes && $scope.nodes.items) {
						response.items = response.items.concat($scope.nodes.items);
						$scope.nodes = response;
					} else {
						$scope.nodes = response;
					}
				}
				$scope.nodeFieldSelector = fieldSelector;
				
			}
		});
	};
	
	//nodes
	$scope.listPods = function (fieldSelector) {
		overlayLoading.show();
		let opts = {
			"method": 'get',
			"routeName": '/infra/kubernetes/workloads/Pod',
			"params": {
				"configuration": {
					"env": $scope.selectedEnvironment.code,
				},
				"limit": 100
			}
		};
		if ($scope.pods && $scope.pods.metadata && $scope.pods.metadata.continue) {
			opts.params.continue = $scope.pods.metadata.continue;
		}
		if (fieldSelector) {
			opts.params.filter = {
				fieldSelector: 'metadata.name=' + fieldSelector
			}
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				if (fieldSelector !== $scope.podFieldSelector || !$scope.podFieldSelector) {
					$scope.pods = response;
				} else {
					if ($scope.pods && $scope.pods.items) {
						response.items = response.items.concat($scope.pods.items);
						$scope.pods = response;
					} else {
						$scope.pods = response;
					}
				}
				$scope.podFieldSelector = fieldSelector;
				
			}
		});
	};
	$scope.deletePod = function (pod) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/pods',
			params: {
				configuration: {
					env: $scope.selectedEnvironment.code,
				},
			},
			data: {
				filter: {
					fieldSelector: 'metadata.name=' + pod.metadata.name
				}
			},
		}, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', 'Pod deleted successfully.');
				$scope.listPods();
			}
		});
	};
	$scope.getLogs = function (pod) {
		overlayLoading.show();
		$scope.pauseRefresh = true;
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/infra/kubernetes/pod/log',
			params: {
				configuration: {
					env: $scope.selectedEnvironment.code,
				},
				name: pod.metadata.name
			},
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				//var autoRefreshPromise;
				
				var evtSource = null;
				
				function terminateTailing() {
					if (evtSource) {
						evtSource.close();
						evtSource = null;
					}
				}
				
				let currentScope = $scope;
				var mInstance = $modal.open({
					templateUrl: "logBox.html",
					size: 'lg',
					backdrop: true,
					keyboard: false,
					windowClass: 'large-Modal',
					controller: function ($scope, $modalInstance) {
						$scope.title = "Host Logs of " + pod.metadata.name;
						fixBackDrop();
						terminateTailing();
						
						$scope.ok = function () {
							$modalInstance.dismiss('ok');
						};
						
						$scope.tailLogs = function () {
							terminateTailing();
							// handles the callback from the received event
							var handleOpenCallback = function (response) {
								$scope.isTailing = true;
								$scope.data = remove_special(response.data).replace("undefined", "").toString();
								$scope.data += "\n";
								if (!$scope.$$phase) {
									$scope.$apply();
								}
							};
							var handleKeepaliveCallback = function (response) {
								$scope.isTailing = true;
							};
							var handleCallback = function (response) {
								$scope.data += remove_special(response.data).replace("undefined", "").toString();
								$scope.data += "\n";
								if (!$scope.$$phase) {
									$scope.$apply();
								}
								highlightMyCode();
							};
							var handleEndCallback = function (response) {
								$scope.isTailing = false;
								$scope.data += "\n";
								$scope.data += "Error tailing log, please click refresh or tail again!";
								$scope.data += "\n";
								terminateTailing();
							};
							
							var uri = apiConfiguration.domain + '/infra/kubernetes/pod/log?';
							uri += "configuration=%7B%22env%22:%22" + currentScope.selectedEnvironment.code + "%22%7D";
							uri += "&follow=true";
							uri += "&access_token=" + $cookies.get('access_token', {'domain': interfaceDomain});
							uri += "&name=" + pod.metadata.name;
							uri += "&key=" + apiConfiguration.key;
							
							evtSource = new EventSource(uri);
							evtSource.addEventListener('open', handleOpenCallback, false);
							evtSource.addEventListener('keepalive', handleKeepaliveCallback, false);
							evtSource.addEventListener('message', handleCallback, false);
							evtSource.addEventListener('error', handleEndCallback, false);
							evtSource.addEventListener('end', handleEndCallback, false);
						};
						
						$scope.refreshLogs = function () {
							$scope.isTailing = false;
							terminateTailing();
							getSendDataFromServer(currentScope, ngDataApi, {
								method: "get",
								routeName: '/infra/kubernetes/pod/log',
								params: {
									configuration: {
										env: $scope.selectedEnvironment.code,
									},
									name: pod.metadata.name
								}
							}, function (error, response) {
								if (error) {
									currentScope.displayAlert('danger', error.message);
								} else {
									$scope.data = remove_special(response.data).replace("undefined", "").toString();
									if (!$scope.$$phase) {
										$scope.$apply();
									}
									
									fixBackDrop();
									$timeout(function () {
										highlightMyCode()
									}, 500);
								}
							});
						};
						
						if (error) {
							$scope.message = {
								warning: 'Instance logs are not available at the moment. Make sure that the instance is <strong style="color:green;">running</strong> and healthy.<br> If this is a newly deployed instance, please try again in a few moments.'
							};
						} else {
							$scope.data = remove_special(response.data);
							$timeout(function () {
								highlightMyCode()
							}, 500);
						}
					}
				});
				
				mInstance.result.then(function () {
					//Get triggers when modal is closed
					terminateTailing();
				}, function () {
					//gets triggers when modal is dismissed.
					terminateTailing();
				});
			}
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
		}
	};
	$scope.execCommand = function (pod) {
		let currentScope = $scope;
		$modal.open({
			templateUrl: "execCommandPod.tmpl",
			size: 'lg',
			backdrop: false,
			keyboard: false,
			controller: function ($scope, $modalInstance) {
				podService.execCommand($scope, $modalInstance, currentScope, pod);
			}
		});
	};
	$scope.getMetrics = function (pod) {
		let currentScope = $scope;
		$modal.open({
			templateUrl: "showMetrics.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: false,
			controller: function ($scope, $modalInstance) {
				overlayLoading.show();
				$scope.selectedInterval = {
					v: 5,
					l: '5 Seconds',
					selected: true
				};
				podService.autoRefreshMetrics($scope, $modalInstance, currentScope, pod);
			}
		});
	};
	
	//clusterRole
	$scope.listClusterRoles = function (fieldSelector) {
		overlayLoading.show();
		let opts = {
			"method": 'get',
			"routeName": '/infra/kubernetes/rbacs/ClusterRole',
			"params": {
				"configuration": {
					"env": $scope.selectedEnvironment.code,
				},
				"limit": 100
			}
		};
		if ($scope.clusterRoles && $scope.clusterRoles.metadata && $scope.clusterRoles.metadata.continue) {
			opts.params.continue = $scope.clusterRoles.metadata.continue;
		}
		if (fieldSelector) {
			opts.params.filter = {
				fieldSelector: 'metadata.name=' + fieldSelector
			}
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				if (fieldSelector !== $scope.clusterRolesFieldSelector || !$scope.clusterRolesFieldSelector) {
					$scope.clusterRoles = response;
				} else {
					if ($scope.clusterRoles && $scope.clusterRoles.items) {
						response.items = response.items.concat($scope.clusterRoles.items);
						$scope.clusterRoles = response;
					} else {
						$scope.clusterRoles = response;
					}
				}
				$scope.clusterRolesFieldSelector = fieldSelector;
				
			}
		});
	};
	$scope.deleteClusterRole = function (clusterRole) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/rbac/ClusterRole',
			params: {
				configuration: {
					env: $scope.selectedEnvironment.code,
				},
				name: clusterRole.metadata.name
			},
		}, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', 'ClusterRole deleted successfully.');
				$scope.listClusterRoles();
			}
		});
	};
	
	//clusterRoleBinding
	$scope.listClusterRoleBindings = function (fieldSelector) {
		overlayLoading.show();
		let opts = {
			"method": 'get',
			"routeName": '/infra/kubernetes/rbacs/ClusterRoleBinding',
			"params": {
				"configuration": {
					"env": $scope.selectedEnvironment.code,
				},
				"limit": 100
			}
		};
		if ($scope.clusterRoleBindings && $scope.clusterRoleBindings.metadata && $scope.clusterRoleBindings.metadata.continue) {
			opts.params.continue = $scope.clusterRoleBindings.metadata.continue;
		}
		if (fieldSelector) {
			opts.params.filter = {
				fieldSelector: 'metadata.name=' + fieldSelector
			}
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				if (fieldSelector !== $scope.clusterRoleBindingsFieldSelector || !$scope.clusterRoleBindingsFieldSelector) {
					$scope.clusterRoleBindings = response;
				} else {
					if ($scope.clusterRoleBindings && $scope.clusterRoleBindings.items) {
						response.items = response.items.concat($scope.clusterRoleBindings.items);
						$scope.clusterRoleBindings = response;
					} else {
						$scope.clusterRoleBindings = response;
					}
				}
				$scope.clusterRoleBindingsFieldSelector = fieldSelector;
				
			}
		});
	};
	$scope.deleteClusterRoleBinding = function (clusterRoleBinding) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/rbac/ClusterRoleBinding',
			params: {
				configuration: {
					env: $scope.selectedEnvironment.code,
				},
				name: clusterRoleBinding.metadata.name
			},
		}, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', 'ClusterRoleBinding deleted successfully.');
				$scope.listClusterRoleBindings();
			}
		});
	};
	
	//roleBinding
	$scope.listRoleBindings = function (fieldSelector) {
		overlayLoading.show();
		let opts = {
			"method": 'get',
			"routeName": '/infra/kubernetes/rbacs/RoleBinding',
			"params": {
				"configuration": {
					"env": $scope.selectedEnvironment.code,
				},
				"limit": 100
			}
		};
		if ($scope.roleBindings && $scope.roleBindings.metadata && $scope.roleBindings.metadata.continue) {
			opts.params.continue = $scope.roleBindings.metadata.continue;
		}
		if (fieldSelector) {
			opts.params.filter = {
				fieldSelector: 'metadata.name=' + fieldSelector
			}
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				if (fieldSelector !== $scope.roleBindingsFieldSelector || !$scope.roleBindingsFieldSelector) {
					$scope.roleBindings = response;
				} else {
					if ($scope.roleBindings && $scope.roleBindings.items) {
						response.items = response.items.concat($scope.roleBindings.items);
						$scope.roleBindings = response;
					} else {
						$scope.roleBindings = response;
					}
				}
				$scope.roleBindingsFieldSelector = fieldSelector;
				
			}
		});
	};
	$scope.deleteRoleBinding = function (roleBinding) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/rbac/RoleBinding',
			params: {
				configuration: {
					env: $scope.selectedEnvironment.code,
				},
				name: roleBinding.metadata.name
			},
		}, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', 'ClusterRoleBinding deleted successfully.');
				$scope.listRoleBindings();
			}
		});
	};
	
	//apiService
	$scope.listApiServices = function (fieldSelector) {
		overlayLoading.show();
		let opts = {
			"method": 'get',
			"routeName": '/infra/kubernetes/rbacs/APIService',
			"params": {
				"configuration": {
					"env": $scope.selectedEnvironment.code,
				},
				"limit": 100
			}
		};
		if ($scope.apiServices && $scope.apiServices.metadata && $scope.apiServices.metadata.continue) {
			opts.params.continue = $scope.apiServices.metadata.continue;
		}
		if (fieldSelector) {
			opts.params.filter = {
				fieldSelector: 'metadata.name=' + fieldSelector
			}
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				if (fieldSelector !== $scope.apiServicesFieldSelector || !$scope.apiServicesFieldSelector) {
					$scope.apiServices = response;
				} else {
					if ($scope.apiServices && $scope.apiServices.items) {
						response.items = response.items.concat($scope.apiServices.items);
						$scope.apiServices = response;
					} else {
						$scope.apiServices = response;
					}
				}
				$scope.apiServicesFieldSelector = fieldSelector;
				
			}
		});
	};
	$scope.deleteApiService = function (apiService) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/rbac/APIService',
			params: {
				configuration: {
					env: $scope.selectedEnvironment.code,
				},
				name: apiService.metadata.name
			},
		}, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', 'APIService deleted successfully.');
				$scope.listApiServices();
			}
		});
	};
	
	//serviceAccount
	$scope.listServiceAccounts = function (fieldSelector) {
		overlayLoading.show();
		let opts = {
			"method": 'get',
			"routeName": '/infra/kubernetes/rbacs/ServiceAccount',
			"params": {
				"configuration": {
					"env": $scope.selectedEnvironment.code,
				},
				"limit": 100
			}
		};
		if ($scope.serviceAccounts && $scope.serviceAccounts.metadata && $scope.serviceAccounts.metadata.continue) {
			opts.params.continue = $scope.serviceAccounts.metadata.continue;
		}
		if (fieldSelector) {
			opts.params.filter = {
				fieldSelector: 'metadata.name=' + fieldSelector
			}
		}
		getSendDataFromServer($scope, ngDataApi, opts, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				if (fieldSelector !== $scope.serviceAccountsFieldSelector || !$scope.serviceAccountsFieldSelector) {
					$scope.serviceAccounts = response;
				} else {
					if ($scope.serviceAccounts && $scope.serviceAccounts.items) {
						response.items = response.items.concat($scope.serviceAccounts.items);
						$scope.serviceAccounts = response;
					} else {
						$scope.serviceAccounts = response;
					}
				}
				$scope.serviceAccountsFieldSelector = fieldSelector;
				
			}
		});
	};
	$scope.deleteServiceAccounts = function (serviceAccount) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/rbac/ServiceAccount',
			params: {
				configuration: {
					env: $scope.selectedEnvironment.code,
				},
				name: serviceAccount.metadata.name
			},
		}, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', 'ServiceAccount deleted successfully.');
				$scope.listServiceAccounts();
			}
		});
	};
	if ($scope.access.kubernetes.deployment) {
		$scope.listDeployments();
	}
	
	injectFiles.injectCss("modules/dashboard/environments/kubeItems.css");
}]);