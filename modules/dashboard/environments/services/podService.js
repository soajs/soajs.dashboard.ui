"use strict";
var secretsApp = soajsApp.components;
secretsApp.service('podService', ['ngDataApi', '$timeout', '$window', function (ngDataApi, $timeout, $window) {
	
	// function getMetrics($scope, $modalInstance, currentScope, pod, cb) {
	// 	var maxData = 900000 / currentScope.metricsRefreshInterval;
	//
	// 	getSendDataFromServer(currentScope, ngDataApi, {
	// 		"method": "get",
	// 		"routeName": "/infra/kubernetes/pods/metrics",
	// 		"params": {
	// 			configuration: {
	// 				env: currentScope.selectedEnvironment.code,
	// 			},
	// 			name: pod.metadata.name,
	// 		}
	// 	}, function (error, metrics) {
	// 		if (error || !metrics) {
	// 			console.log(translation.unableRetrieveServicesMetrics[LANG]);
	// 		} else {
	// 			// var containers = Object.keys(metrics);
	// 			// containers.forEach(function (oneContainer) {
	// 			// 	if (!currentScope.servicesMetrics) {
	// 			// 		currentScope.servicesMetrics = {};
	// 			// 	}
	// 			//
	// 			// 	if (!currentScope.servicesMetrics[oneContainer]) {
	// 			// 		currentScope.servicesMetrics[oneContainer] = {};
	// 			// 	}
	// 			//
	// 			// 	if (!currentScope.chartOptions) {
	// 			// 		currentScope.chartOptions = {};
	// 			// 	}
	// 			//
	// 			// 	if (!currentScope.chartOptions[oneContainer]) {
	// 			// 		currentScope.chartOptions[oneContainer] = {};
	// 			// 	}
	// 			//
	// 			// 	currentScope.servicesMetrics[oneContainer].online_cpus = 1;
	// 			// 	if (metrics[oneContainer]) {
	// 			// 		if (metrics[oneContainer].hasOwnProperty('online_cpus')) {
	// 			// 			currentScope.servicesMetrics[oneContainer].online_cpus = metrics[oneContainer].online_cpus;
	// 			// 		}
	// 			//
	// 			// 		if (metrics[oneContainer].hasOwnProperty('timestamp')) {
	// 			// 			var ts = new Date(metrics[oneContainer].timestamp).toLocaleString('en-US', {
	// 			// 				hour: 'numeric',
	// 			// 				minute: 'numeric',
	// 			// 				second: 'numeric',
	// 			// 				hour12: false
	// 			// 			});
	// 			// 			if (!currentScope.servicesMetrics[oneContainer].timestamp) {
	// 			// 				currentScope.servicesMetrics[oneContainer].timestamp = []
	// 			// 			}
	// 			// 			currentScope.servicesMetrics[oneContainer].timestamp.push(ts);
	// 			// 			if (currentScope.servicesMetrics[oneContainer].timestamp.length > maxData) {
	// 			// 				currentScope.servicesMetrics[oneContainer].timestamp.shift();
	// 			// 			}
	// 			// 		}
	// 			//
	// 			// 		if (metrics[oneContainer].hasOwnProperty('memory')) {
	// 			// 			if (!currentScope.servicesMetrics[oneContainer].memory) {
	// 			// 				currentScope.servicesMetrics[oneContainer].memory = [];
	// 			// 				currentScope.chartOptions[oneContainer].memory = {
	// 			// 					override: {
	// 			// 						borderColor: "rgba(51, 110, 230, 1)",
	// 			// 						backgroundColor: "rgba(51, 110, 230, 0.3)",
	// 			// 						borderWidth: 3,
	// 			// 						pointRadius: 0,
	// 			// 						pointHitRadius: 5
	// 			// 					},
	// 			// 					options: {
	// 			// 						title: {
	// 			// 							display: true,
	// 			// 							text: (metrics[oneContainer].memoryLimit) ? "Memory usage out of " + convertBytes(metrics[oneContainer].memoryLimit) : 'Memory usage'
	// 			// 						},
	// 			// 						animation: {
	// 			// 							duration: 0,
	// 			// 						},
	// 			// 						tooltips: {
	// 			// 							callbacks: {
	// 			// 								label: function (tooltipItem) {
	// 			// 									return convertBytes(tooltipItem.yLabel);
	// 			// 								}
	// 			// 							}
	// 			// 						},
	// 			// 						scales: {
	// 			// 							yAxes: [
	// 			// 								{
	// 			// 									id: 'memory',
	// 			// 									type: 'linear',
	// 			// 									display: true,
	// 			// 									position: 'left',
	// 			// 									scaleLabel: {
	// 			// 										labelString: 'Memory (Bytes)',
	// 			// 										display: true,
	// 			//
	// 			// 									},
	// 			// 									ticks: {
	// 			// 										callback: function (bytes) {
	// 			// 											return convertBytes(bytes);
	// 			// 										},
	// 			// 										beginAtZero: true
	// 			// 									}
	// 			// 								}
	// 			// 							],
	// 			// 							xAxes: [
	// 			// 								{
	// 			// 									scaleLabel: {
	// 			// 										labelString: 'Time',
	// 			// 										display: true,
	// 			//
	// 			// 									}
	// 			// 								}
	// 			// 							]
	// 			// 						}
	// 			// 					}
	// 			// 				}
	// 			// 			}
	// 			// 			currentScope.servicesMetrics[oneContainer].memory.push(metrics[oneContainer].memory);
	// 			// 			currentScope.servicesMetrics[oneContainer].currentMemory = convertBytes(metrics[oneContainer].memory);
	// 			// 			if (currentScope.servicesMetrics[oneContainer].memory.length > maxData) {
	// 			// 				currentScope.servicesMetrics[oneContainer].memory.shift();
	// 			// 			}
	// 			// 		}
	// 			//
	// 			// 		if (metrics[oneContainer].hasOwnProperty('cpu')) {
	// 			// 			if (!currentScope.servicesMetrics[oneContainer].cpu) {
	// 			// 				currentScope.servicesMetrics[oneContainer].cpu = [];
	// 			// 				currentScope.chartOptions[oneContainer].cpu = {
	// 			// 					override: {
	// 			// 						borderColor: "rgba(0, 199, 82, 1)",
	// 			// 						backgroundColor: "rgba(0, 199, 82, 0.3)",
	// 			// 						borderWidth: 3,
	// 			// 						pointRadius: 0,
	// 			// 						pointHitRadius: 5
	// 			// 					},
	// 			// 					options: {
	// 			// 						title: {
	// 			// 							display: true,
	// 			// 							text: "CPU usage"
	// 			// 						},
	// 			// 						animation: {
	// 			// 							duration: 0,
	// 			// 						},
	// 			// 						scales: {
	// 			// 							yAxes: [
	// 			// 								{
	// 			// 									id: 'cpu',
	// 			// 									type: 'linear',
	// 			// 									display: true,
	// 			// 									position: 'left',
	// 			// 									scaleLabel: {
	// 			// 										labelString: 'CPU (milliCores)',
	// 			// 										display: true,
	// 			//
	// 			// 									},
	// 			// 									ticks: {
	// 			// 										beginAtZero: true
	// 			// 									}
	// 			// 								}
	// 			// 							],
	// 			// 							xAxes: [
	// 			// 								{
	// 			// 									scaleLabel: {
	// 			// 										labelString: 'Time',
	// 			// 										display: true,
	// 			//
	// 			// 									}
	// 			// 								}
	// 			// 							]
	// 			// 						}
	// 			// 					}
	// 			// 				}
	// 			// 			}
	// 			// 			currentScope.servicesMetrics[oneContainer].cpu.push(metrics[oneContainer].cpu);
	// 			// 			currentScope.servicesMetrics[oneContainer].currentCpu = metrics[oneContainer].cpu;
	// 			// 			if (currentScope.servicesMetrics[oneContainer].cpu.length > maxData) {
	// 			// 				currentScope.servicesMetrics[oneContainer].cpu.shift();
	// 			// 			}
	// 			// 		}
	// 			//
	// 			// 		if (metrics[oneContainer].hasOwnProperty('cpuPercent')) {
	// 			// 			if (!currentScope.servicesMetrics[oneContainer].cpuPercent) {
	// 			// 				currentScope.servicesMetrics[oneContainer].cpuPercent = [];
	// 			// 				currentScope.chartOptions[oneContainer].cpuPercent = {
	// 			// 					override: {
	// 			// 						borderColor: "rgba(0, 199, 82, 1)",
	// 			// 						backgroundColor: "rgba(0, 199, 82, 0.3)",
	// 			// 						borderWidth: 3,
	// 			// 						pointRadius: 0,
	// 			// 						pointHitRadius: 5
	// 			// 					},
	// 			// 					options: {
	// 			// 						title: {
	// 			// 							display: true,
	// 			// 							text: "CPU usage (" + currentScope.servicesMetrics[oneContainer].online_cpus + " Cores)"
	// 			// 						},
	// 			// 						animation: {
	// 			// 							duration: 0,
	// 			// 						},
	// 			// 						tooltips: {
	// 			// 							callbacks: {
	// 			// 								label: function (tooltipItem) {
	// 			// 									return tooltipItem.yLabel + '%';
	// 			// 								}
	// 			// 							}
	// 			// 						},
	// 			// 						scales: {
	// 			// 							yAxes: [
	// 			// 								{
	// 			// 									id: 'cpuPercent',
	// 			// 									type: 'linear',
	// 			// 									display: true,
	// 			// 									position: 'left',
	// 			// 									scaleLabel: {
	// 			// 										labelString: 'CPU (%)',
	// 			// 										display: true,
	// 			//
	// 			// 									},
	// 			// 									ticks: {
	// 			// 										callback: function (percent) {
	// 			// 											return percent.toFixed(2);
	// 			// 										},
	// 			// 										beginAtZero: true,
	// 			// 									}
	// 			// 								}
	// 			// 							],
	// 			// 							xAxes: [
	// 			// 								{
	// 			// 									scaleLabel: {
	// 			// 										labelString: 'Time',
	// 			// 										display: true,
	// 			//
	// 			// 									}
	// 			// 								}
	// 			// 							]
	// 			// 						}
	// 			// 					}
	// 			// 				}
	// 			// 			}
	// 			// 			currentScope.servicesMetrics[oneContainer].cpuPercent.push(metrics[oneContainer].cpuPercent);
	// 			// 			currentScope.servicesMetrics[oneContainer].currentCpuPercent = metrics[oneContainer].cpuPercent;
	// 			// 			if (currentScope.servicesMetrics[oneContainer].cpuPercent.length > maxData) {
	// 			// 				currentScope.servicesMetrics[oneContainer].cpuPercent.shift();
	// 			// 			}
	// 			// 		}
	// 			//
	// 			// 		if (metrics[oneContainer].hasOwnProperty('memPercent')) {
	// 			// 			if (!currentScope.servicesMetrics[oneContainer].memPercent) {
	// 			// 				currentScope.servicesMetrics[oneContainer].memPercent = [];
	// 			// 				currentScope.chartOptions[oneContainer].memPercent = {
	// 			// 					override: {
	// 			// 						borderColor: "rgba(51, 110, 230, 1)",
	// 			// 						backgroundColor: "rgba(51, 110, 230, 0.3)",
	// 			// 						borderWidth: 3,
	// 			// 						pointRadius: 0,
	// 			// 						pointHitRadius: 5
	// 			// 					},
	// 			// 					options: {
	// 			// 						title: {
	// 			// 							display: true,
	// 			// 							text: "Memory usage"
	// 			// 						},
	// 			// 						animation: {
	// 			// 							duration: 0,
	// 			// 						},
	// 			// 						tooltips: {
	// 			// 							callbacks: {
	// 			// 								label: function (tooltipItem) {
	// 			// 									return tooltipItem.yLabel + '%';
	// 			// 								}
	// 			// 							}
	// 			// 						},
	// 			// 						scales: {
	// 			// 							yAxes: [
	// 			// 								{
	// 			// 									id: 'memPercent',
	// 			// 									type: 'linear',
	// 			// 									display: true,
	// 			// 									position: 'left',
	// 			// 									scaleLabel: {
	// 			// 										labelString: 'Memory (%)',
	// 			// 										display: true,
	// 			//
	// 			// 									},
	// 			// 									ticks: {
	// 			// 										callback: function (percent) {
	// 			// 											return percent.toFixed(2);
	// 			// 										},
	// 			// 										beginAtZero: true,
	// 			// 										min: 0,
	// 			// 										max: 100,
	// 			// 										stepSize: 10
	// 			// 									}
	// 			// 								}
	// 			// 							],
	// 			// 							xAxes: [
	// 			// 								{
	// 			// 									scaleLabel: {
	// 			// 										labelString: 'Time',
	// 			// 										display: true,
	// 			//
	// 			// 									}
	// 			// 								}
	// 			// 							]
	// 			// 						}
	// 			// 					}
	// 			// 				}
	// 			// 			}
	// 			// 			currentScope.servicesMetrics[oneContainer].memPercent.push(metrics[oneContainer].memPercent);
	// 			// 			currentScope.servicesMetrics[oneContainer].currentMemPercent = metrics[oneContainer].memPercent;
	// 			// 			if (currentScope.servicesMetrics[oneContainer].memPercent.length > maxData) {
	// 			// 				currentScope.servicesMetrics[oneContainer].memPercent.shift();
	// 			// 			}
	// 			// 		}
	// 			//
	// 			// 		if (metrics[oneContainer].hasOwnProperty('memoryLimit')) {
	// 			// 			currentScope.servicesMetrics[oneContainer].memoryLimit = convertBytes(metrics[oneContainer].memoryLimit);
	// 			// 		}
	// 			// 	}
	// 			// });
	// 		}
	// 	});
	//
	// }
	//
	// function convertBytes(bytes) {
	// 	if (bytes < 1024) {
	// 		return (bytes) + ' B';
	// 	} else if (bytes < 1024 * 1024) {
	// 		return (bytes / 1024).toFixed(2) + ' ki';
	// 	} else if (bytes < 1024 * 1024 * 1024) {
	// 		return (bytes / 1024 / 1024).toFixed(2) + ' Mi';
	// 	} else {
	// 		return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' Gi';
	// 	}
	// }
	//
	// function convertToMetric(bytes) {
	// 	if (bytes < 1000) {
	// 		return (bytes) + ' B';
	// 	} else if (bytes < 1000000) {
	// 		return (bytes / 1000).toFixed(2) + ' kB';
	// 	} else if (bytes < 1000000000) {
	// 		return (bytes / 1000000).toFixed(2) + ' MB';
	// 	} else {
	// 		return (bytes / 1000000000).toFixed(2) + ' GB';
	// 	}
	// }
	
	function execCommand($scope, $modalInstance, currentScope, pod, cb) {
		
		$scope.textMode = false;
		
		let formConfig = angular.copy(environmentsConfig.form.addExecCommand);
		
		let actions = [
			{
				'type': 'submit',
				'label': "Exec Command",
				'btn': 'primary',
				action: function (formData) {
					$scope.save(formData);
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
		];
		
		
		$scope.save = function (formData) {
			$scope.$valid = true;
			let input = {
				configuration: {
					env: currentScope.selectedEnvironment.code,
				},
				name: pod.metadata.name,
				commands: [formData.execCommands]
			};
			let routeName = '/infra/kubernetes/pod/exec';
			if ($scope.$valid && $modalInstance) {
				
				getSendDataFromServer(currentScope, ngDataApi, {
					method: 'put',
					routeName: routeName,
					data: input
				}, function (error, res) {
					if (error) {
						currentScope.displayAlert('danger', error.message);
					} else {
						$scope.form.formData['response'] = res.response;
					}
				});
			}
		};
		
		let options = {
			timeout: $timeout,
			entries: formConfig,
			name: 'newCommand',
			actions: actions
		};
		buildForm($scope, $modalInstance, options, function () {
			
			if (cb && typeof cb === 'function') {
				return cb();
			}
		});
	}
	
	return {
		'execCommand': execCommand,
		// 'getMetrics': getMetrics
	}
}]);
