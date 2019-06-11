'use strict';
var catalogApp = soajsApp.components;

catalogApp.controller('dashboardAppCtrl', ['$scope', '$timeout', '$modal', 'ngDataApi', 'injectFiles', '$localStorage', function ($scope, $timeout, $modal, ngDataApi, injectFiles, $localStorage) {
	$scope.$parent.isUserLoggedIn();
	$scope.$parent.hideMainMenu(false);
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, dashboardAppConfig.permissions);
	/**
	 * services
	 */
	$scope.services = {};
	$scope.services.includeSOAJS = false;
	$scope.services.form = {};
	$scope.colors = ["rgb(159,204,0)", "rgb(250,109,33)", "rgb(154,154,154)", "rgb(222,251,241)"];
	
	$scope.getAnalyticsForServices = function () {
		// let opts = {
		// 	"start": 0,
		// 	"limit": 200
		// };
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'post',
			routeName: '/dashboard/services/dashboard/services'
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				
				$scope.services.form = {};
				$scope.services.tags = [];
				$scope.services.programs = [];
				$scope.services.attributes = {};
				
				if (response.tags && response.tags.length > 0) {
					response.tags.forEach((one) => {
						let temp = {
							l: one,
							v: one
						};
						$scope.services.tags.push(temp)
					});
				}
				if (response.programs && response.programs.length > 0) {
					response.programs.forEach((one) => {
						let temp = {
							l: one,
							v: one
						};
						$scope.services.programs.push(temp)
					});
				}
				if (response.attributes && Object.keys(response.attributes).length > 0) {
					for (let att in response.attributes) {
						if (response.attributes[att] && response.attributes[att].length > 0) {
							$scope.services.attributes[att] = [];
							response.attributes[att].forEach((one) => {
								let temp = {
									l: one,
									v: one
								};
								$scope.services.attributes[att].push(temp)
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
				$scope.services.services = [];
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
									let index = data.bar.serviceGroups.labels.indexOf(oneGroup.name)
									if (index === -1) {
										data.bar.serviceGroups.labels.push(oneGroup.name);
									}
							
									if (oneGroup.services.length > 0) {
										oneGroup.services.forEach((service) => {
											if (services.indexOf(service.name) === -1) {
												services.push(service.name);
												$scope.services.services.push({
													program: oneProgram.name,
													serviceGroups: oneGroup.name,
													serviceName: service.name,
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
									if (index === -1){
										data.bar.serviceGroups.data.push(noGD)
									}
									else {
										data.bar.serviceGroups.data[index] = data.bar.serviceGroups.data[index] + noGD
									}
								});
							}
							data.pie.programs.data.push(noPD);
							data.pie.programs.serviceGroups.push(noSGD);
						}
					);
				}
				services = [];
				$scope.services.data = data;
			}
		});
	};
	
	$scope.submitServices = function () {
		let opts = {};
		if ($scope.services.form && Object.keys($scope.services.form).length > 0) {
			for (let key in $scope.services.form) {
				if ($scope.services.form[key].length > 0) {
					if (key === "tags" || key === "programs") {
						opts[key] = $scope.services.form[key];
					} else if (key === "serviceGroup" || key === "serviceName") {
						if (!opts.keywords) {
							opts.keywords = {}
						}
						opts.keywords[key] = $scope.services.form[key];
					} else {
						if (!opts.attributes) {
							opts.attributes = {}
						}
						opts.attributes[key] = $scope.services.form[key];
					}
				}
			}
			if ($scope.services.form.includeSOAJS){
				opts.includeSOAJS = true;
			}
		}
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'post',
			routeName: '/dashboard/services/dashboard/services',
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
				$scope.services.services = [];
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
									
									let index = data.bar.serviceGroups.labels.indexOf(oneGroup.name)
									if (index === -1) {
										data.bar.serviceGroups.labels.push(oneGroup.name);
									}
									if (oneGroup.services.length > 0) {
										oneGroup.services.forEach((service) => {
											if (services.indexOf(service.name) === -1) {
												services.push(service.name);
												$scope.services.services.push({
													program: oneProgram.name,
													serviceGroups: oneGroup.name,
													serviceName: service.name,
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
									if (index === -1){
										data.bar.serviceGroups.data.push(noGD)
									}
									else {
										data.bar.serviceGroups.data[index] = data.bar.serviceGroups.data[index] + noGD
									}
								});
							}
							data.pie.programs.data.push(noPD);
							data.pie.programs.serviceGroups.push(noSGD);
						}
					);
				}
				$scope.services.data = data;
			}
		});
	};
	
	$scope.toggleServicesSelection = function (fieldName, value) {
		if (!$scope.services.form[fieldName]) {
			$scope.services.form[fieldName] = [];
		}
		
		if ($scope.services.form[fieldName].indexOf(value) === -1) {
			$scope.services.form[fieldName].push(value);
		} else {
			let idx = $scope.services.form[fieldName].indexOf(value);
			$scope.services.form[fieldName].splice(idx, 1);
		}
	};
	
	$scope.toggleSOAJS = function () {
		$scope.services.form.includeSOAJS = !$scope.services.form.includeSOAJS;
	};
	
	/**
	 * api routes
	 */
	
	$scope.apiRoutes = {};
	$scope.apiRoutes.form = {};
	function chunk(arr, size) {
		let newArr = [];
		for (let i=0; i<arr.length; i+=size) {
			newArr.push(arr.slice(i, i+size));
		}
		return newArr;
	}
	if ($localStorage.ApiCatalog && $localStorage.ApiCatalog.query){
		$scope.activateApiCatalogTab = true;
	}
	$scope.getAnalyticsForApiRoutes = function () {
		// let opts = {
		// 	"start": 0,
		// 	"limit": 200
		// };
		overlayLoading.show();
		let options  = {
			method: 'post',
			routeName: '/dashboard/services/dashboard/apiRoutes'
		};
		if ($localStorage.ApiCatalog && $localStorage.ApiCatalog.query){
			options.data = $localStorage.ApiCatalog.query;
		}
		getSendDataFromServer($scope, ngDataApi, options, function (error, response) {
			overlayLoading.hide();
			
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.apiRoutes.form = {};
				if ($localStorage.ApiCatalog && $localStorage.ApiCatalog.query && Object.keys($localStorage.ApiCatalog.query).length > 0){
					Object.keys($localStorage.ApiCatalog.query).forEach((one)=>{
						if (one === "programs" || one === "tags" ){
							$scope.apiRoutes.form[one] = $localStorage.ApiCatalog.query[one];
						}
						else if (one === "attributes" && $localStorage.ApiCatalog.query["attributes"] && Object.keys($localStorage.ApiCatalog.query["attributes"]).length > 0){
							Object.keys($localStorage.ApiCatalog.query["attributes"]).forEach((att)=>{
								$scope.apiRoutes.form[att] = $localStorage.ApiCatalog.query[one][att];
							});
						}
					});
				}
				$scope.apiRoutes.tags = [];
				$scope.apiRoutes.programs = [];
				$scope.apiRoutes.attributes = {};
				
				if (response.tags && response.tags.length > 0) {
					response.tags.forEach((one) => {
						let temp = {
							l: one,
							v: one
						};
						if (options.data && options.data.tags && options.data.tags.indexOf(one) !== -1){
							temp.selected = true;
						}
						$scope.apiRoutes.tags.push(temp)
					});
				}
				if (response.programs && response.programs.length > 0) {
					response.programs.forEach((one) => {
						let temp = {
							l: one,
							v: one
						};
						if (options.data && options.data.programs && options.data.programs.indexOf(one) !== -1){
							temp.selected = true;
						}
						$scope.apiRoutes.programs.push(temp)
					});
				}
				let attributes = [];
				if (response.attributes && Object.keys(response.attributes).length > 0) {
					for (let att in response.attributes) {
						if (response.attributes[att] && response.attributes[att].length > 0) {
							let temp = {
								[att]: []
							};
							let temp2;
							if (options.data && options.data.attributes && options.data.attributes[att] ){
								temp2 = options.data.attributes[att];
							}
							response.attributes[att].forEach((one) => {
								let temp3 = {
									l: one,
									v: one
								};
								if (temp2 && temp2.indexOf(one) !== -1){
									temp3.selected = true;
								}
								temp[att].push(temp3);
							});
							attributes.push(temp);
						}
					}
				}
				$scope.apiRoutes.attributes = chunk(attributes, 3);
				$scope.apiRoutes.routes = response.data;
				$scope.itemsPerPage = 20;
				$scope.maxSize = 5;
				$scope.apiRoutes.paginations = {
					currentPage: 1,
					totalItems: $scope.apiRoutes.routes.length
				};
				delete $localStorage.ApiCatalog;
			}
		});
	};
	
	$scope.submitApiRoutes = function () {
		let opts = {};
		if ($scope.apiRoutes.form && Object.keys($scope.apiRoutes.form).length > 0) {
			for (let key in $scope.apiRoutes.form) {
				if ($scope.apiRoutes.form[key].length > 0) {
					if (key === "tags" || key === "programs") {
						opts[key] = $scope.apiRoutes.form[key];
					} else {
						if (!opts.attributes) {
							opts.attributes = {}
						}
						opts.attributes[key] = $scope.apiRoutes.form[key];
					}
				}
			}
		}
		$scope.query = opts;
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'post',
			routeName: '/dashboard/services/dashboard/apiRoutes',
			data: opts
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			} else {
				$scope.apiRoutes.routes = response.data;
				$scope.itemsPerPage = 20;
				$scope.maxSize = 5;
				$scope.apiRoutes.paginations = {
					currentPage: 1,
					totalItems: $scope.apiRoutes.routes.length
				};
			}
		});
	};
	
	$scope.toggleApiRoutesSelection = function (fieldName, value) {
		
		if (!$scope.apiRoutes.form[fieldName]) {
			$scope.apiRoutes.form[fieldName] = [];
		}
		
		if ($scope.apiRoutes.form[fieldName].indexOf(value) === -1) {
			$scope.apiRoutes.form[fieldName].push(value);
		} else {
			let idx = $scope.apiRoutes.form[fieldName].indexOf(value);
			$scope.apiRoutes.form[fieldName].splice(idx, 1);
		}
	};
	
	$scope.redirectToService = function (serviceName) {
		$scope.$parent.go("#/services/swaggerui/" + serviceName, "_blank");
		$localStorage.ApiCatalog = {
			query: $scope.query ? $scope.query : {}
		}
	};

// Start here
	if ($scope.access.getAnalyticsForServices && $scope.access.getAnalyticsForApiRoutes) {
		$scope.getAnalyticsForServices();
		$scope.getAnalyticsForApiRoutes();
	}
	injectFiles.injectCss("modules/dashboard/analyticDashboard/analyticDashboard.css");
}]);

catalogApp.filter('searchFilter', function() {
	return function(input, searchKeyword) {
		if(!searchKeyword) return input;
		if(!input || !Array.isArray(input) || input.length === 0) return input;
		
		var output = [];
		input.forEach(function(oneInput) {
			if(oneInput) {
				//using full_name since it's composed of owner + name
				if(oneInput.l && oneInput.l.toLowerCase().indexOf(searchKeyword.toLowerCase()) !== -1) {
					output.push(oneInput);
				}
			}
		});
		
		return output;
	}
});

catalogApp.filter('routeSearchFilter', function() {
	return function(input, searchKeyword) {
		if(!searchKeyword) return input;
		if(!input || !Array.isArray(input) || input.length === 0) return input;
		
		var output = [];
		input.forEach(function(oneInput) {
			if(oneInput) {
				//using full_name since it's composed of owner + name
				if(oneInput.route && oneInput.route.toLowerCase().indexOf(searchKeyword.toLowerCase()) !== -1) {
					output.push(oneInput);
				}
			}
		});
		
		return output;
	}
});