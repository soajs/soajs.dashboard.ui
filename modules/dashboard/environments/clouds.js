"use strict";

var environmentsApp = soajsApp.components;
environmentsApp.controller('cloudsCtrl', ['$scope', '$cookies', '$localStorage', 'ngDataApi', 'secretsService', 'pvcService', 'hacloudSrv', '$modal', 'injectFiles', function ($scope, $cookies, $localStorage, ngDataApi, secretsService, pvcService, hacloudSrv, $modal, injectFiles) {
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
			"routeName": '/infra/kubernetes/resources/Secret',
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
			routeName: '/infra/kubernetes/secret',
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
			"routeName": '/infra/kubernetes/resources/PVC',
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
	$scope.deletePVC = function (secret) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/pvc',
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
			"routeName": '/infra/kubernetes/resources/PV',
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
			routeName: '/infra/kubernetes/pv',
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
			"routeName": '/infra/kubernetes/resources/Service',
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
	$scope.deleteService = function (secret) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/resource/Service',
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
			"routeName": '/infra/kubernetes/resources/Deployment',
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
	$scope.deleteDeployment = function (secret) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/resource/Deployment',
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
			"routeName": '/infra/kubernetes/resources/DaemonSet',
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
	$scope.deleteDaemonSet= function (secret) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/resource/DaemonSet',
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
			"routeName": '/infra/kubernetes/resources/CronJob',
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
	$scope.deleteCronJob = function (secret) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/resource/CronJob',
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
			"routeName": '/infra/kubernetes/resources/HPA',
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
	$scope.deleteHPA = function (secret) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/resource/HPA',
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
			"routeName": '/infra/kubernetes/resources/StorageClass',
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
	$scope.deleteStorageClass= function (secret) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/StorageClass',
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
			"routeName": '/infra/kubernetes/resources/Node',
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
	$scope.deleteNode= function (node) {
		getSendDataFromServer($scope, ngDataApi, {
			method: 'delete',
			routeName: '/infra/kubernetes/Node',
			params: {
				configuration: {
					env: $scope.selectedEnvironment.code,
				},
				name: node.metadata.name
			},
		}, function (error) {
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.displayAlert('success', 'Nodes deleted successfully.');
				$scope.listNodes();
			}
		});
	};
	
	//nodes
	$scope.listNodes = function (fieldSelector) {
		overlayLoading.show();
		let opts = {
			"method": 'get',
			"routeName": '/infra/kubernetes/resources/Node',
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
			"routeName": '/infra/kubernetes/resources/Pod',
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
	
	
	if ($scope.access.kubernetes.secret.list) {
		$scope.listSecrets();
	}
	
	injectFiles.injectCss("modules/dashboard/environments/kubeItems.css");
}]);