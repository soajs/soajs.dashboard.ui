'use strict';
var catalogApp = soajsApp.components;

catalogApp.controller('dashboardAppCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', 'injectFiles', '$cookies', '$location', function ($scope, $timeout, $modal, ngDataApi, injectFiles, $cookies, $location) {
	$scope.$parent.isUserLoggedIn();
	$scope.$parent.hideMainMenu(false);
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, dashboardAppConfig.permissions);
	
	$scope.getAnalytics = function () {
		// let opts = {
		// 	"start": 0,
		// 	"limit": 200
		// };
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'post',
			routeName: '/dashboard/services/dashboard'
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.form = {};
				$scope.tags = [];
				$scope.programs = [];
				$scope.attributes = {};
				if (response.tags && response.tags.length > 0){
					response.tags.forEach((one)=>{
						let temp = {
							l: one,
							v: one
						};
						$scope.tags.push(temp)
					});
				}
				
				if (response.programs && response.programs.length > 0){
					response.programs.forEach((one)=>{
						let temp = {
							l: one,
							v: one
						};
						$scope.programs.push(temp)
					});
				}
				if (response.attributes && Object.keys(response.attributes).length > 0 ){
					for (let att in response.attributes){
						if (response.attributes[att] && response.attributes[att].length > 0){
							$scope.attributes[att] = [];
							response.attributes[att].forEach((one)=>{
								let temp = {
									l: one,
									v: one
								};
								$scope.attributes[att].push(temp)
							});
						}
					}
				}
				let data = {
					bar: {
						//1
						serviceGroups: {
							labels: [],
							data: [],
							options: {
								legend: {display: true},
							}
						}
					},
					pie: {
						//4
						programs: {
							labels: [],
							data: [],
							serviceGroups: [],
							options: {
								legend: {display: true}
							}
						},
						//3
						methods: {
							labels: ["read", "write", "update", "delete"],
							data: [0, 0, 0, 0],
							options: {
								legend: {display: true}
							}
						}
					}
				};
				$scope.services = [];
				let services = [];
				if (response && response.data && response.data.length > 0) {
					response.data.forEach((oneProgram) => {
							data.pie.programs.labels.push(oneProgram.name);
							let noPD = 0;
							let noSGD = 0;
							if (oneProgram.groups.length > 0) {
								noSGD = oneProgram.groups.length;
								oneProgram.groups.forEach((oneGroup) => {
									let noGD = 0;
									
									if (data.bar.serviceGroups.labels.indexOf(oneGroup.name) === -1){
										data.bar.serviceGroups.labels.push(oneGroup.name);
									}
									if (oneGroup.services.length > 0) {
										oneGroup.services.forEach((service) => {
											if (services.indexOf(service.name) === -1){
												services.push(service.name);
												$scope.services.push({
													program : oneProgram.name,
													serviceGroups : oneGroup.name,
													serviceName : service.name,
													APIs: service.APIs,
													versions: service.versions
												});
												noPD = noPD + service.APIs;
												noGD = noGD + service.APIs;
												//["read", "write", "update", "delete"],
												if (service.methods) {
													if (service.methods.get) {
														data.pie.methods.data[0] = data.pie.methods.data[0] + service.methods.get
													}
													if (service.methods.post) {
														data.pie.methods.data[1] = data.pie.methods.data[1] + service.methods.post
													}
													if (service.methods.put) {
														data.pie.methods.data[2] = data.pie.methods.data[2] + service.methods.put
													}
													if (service.methods.delete) {
														data.pie.methods.data[3] = data.pie.methods.data[3] + service.methods.delete
													}
												}
											}
										});
									}
									data.bar.serviceGroups.data.push(noGD)
								});
							}
							data.pie.programs.data.push(noPD);
							data.pie.programs.serviceGroups.push(noSGD);
						}
					);
				}
				services = [];
				$scope.data = data;
			}
		});
	};
	
	$scope.colors = ["rgb(159,204,0)", "rgb(250,109,33)", "rgb(154,154,154)", "rgb(222,251,241)"];
	$scope.form = {};
	$scope.submit = function () {
		
		let opts = {};
		if ($scope.form && Object.keys($scope.form).length > 0){
			for (let key in $scope.form){
				if ($scope.form[key].length > 0) {
					if (key === "tags" || key === "programs") {
						opts[key] = $scope.form[key];
					} else if (key === "serviceGroup" || key === "serviceName") {
						if (!opts.keywords) {
							opts.keywords = {}
						}
						opts.keywords[key] = $scope.form[key];
					} else {
						if (!opts.attributes) {
							opts.attributes = {}
						}
						opts.attributes[key] = $scope.form[key];
					}
				}
			}
		}
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'post',
			routeName: '/dashboard/services/dashboard',
			data: opts
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				let data = {
					bar: {
						//1
						serviceGroups: {
							labels: [],
							data: [],
							options: {
								legend: {display: true},
							}
						}
					},
					pie: {
						//4
						programs: {
							labels: [],
							data: [],
							serviceGroups: [],
							options: {
								legend: {display: true}
							}
						},
						//3
						methods: {
							labels: ["read", "write", "update", "delete"],
							data: [0, 0, 0, 0],
							options: {
								legend: {display: true}
							}
						}
					}
				};
				$scope.services = [];
				let services = [];
				if (response && response.data && response.data.length > 0) {
					response.data.forEach((oneProgram) => {
							data.pie.programs.labels.push(oneProgram.name);
							let noPD = 0;
							let noSGD = 0;
							if (oneProgram.groups.length > 0) {
								noSGD = oneProgram.groups.length;
								oneProgram.groups.forEach((oneGroup) => {
									let noGD = 0;
									
									if (data.bar.serviceGroups.labels.indexOf(oneGroup.name) === -1){
										data.bar.serviceGroups.labels.push(oneGroup.name);
									}
									if (oneGroup.services.length > 0) {
										oneGroup.services.forEach((service) => {
											if (services.indexOf(service.name) === -1){
												services.push(service.name);
												$scope.services.push({
													program : oneProgram.name,
													serviceGroups : oneGroup.name,
													serviceName : service.name,
													APIs: service.APIs,
													versions: service.versions
												});
												noPD = noPD + service.APIs;
												noGD = noGD + service.APIs;
												//["read", "write", "update", "delete"],
												if (service.methods) {
													if (service.methods.get) {
														data.pie.methods.data[0] = data.pie.methods.data[0] + service.methods.get
													}
													if (service.methods.post) {
														data.pie.methods.data[1] = data.pie.methods.data[1] + service.methods.post
													}
													if (service.methods.put) {
														data.pie.methods.data[2] = data.pie.methods.data[2] + service.methods.put
													}
													if (service.methods.delete) {
														data.pie.methods.data[3] = data.pie.methods.data[3] + service.methods.delete
													}
												}
											}
										});
									}
									data.bar.serviceGroups.data.push(noGD)
								});
							}
							data.pie.programs.data.push(noPD);
							data.pie.programs.serviceGroups.push(noSGD);
						}
					);
				}
				$scope.data = data;
			}
		});
	};
	
	$scope.toggleSelection = function (fieldName, value) {
		if (!$scope.form[fieldName]) {
			$scope.form[fieldName] = [];
		}
		
		if ($scope.form[fieldName].indexOf(value) === -1) {
			$scope.form[fieldName].push(value);
		}
		else {
			let idx = $scope.form[fieldName].indexOf(value);
			$scope.form[fieldName].splice(idx, 1);
		}
	};
		// $scope.onClick = function (points, evt) {
	// 	console.log(points, evt);
	// };
	

// Start here
	if ($scope.access.get) {
		$scope.getAnalytics();
	}
	injectFiles.injectCss("modules/dashboard/analyticDashboard/analyticDashboard.css");
}])
;