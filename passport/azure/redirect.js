
let API_URL = apiConfiguration.domain + "/oauth/passport/validate/azure" + window.location.search + "&key=" + apiConfiguration.key;

angular.module('soajsAzureApp', ['ngCookies', 'ngStorage'])
	.controller('soajsAzureController', ['$scope', '$cookies', '$localStorage', '$timeout', function($scope, $cookies, $localStorage, $timeout) {
		fetch(API_URL, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			}
		})
			.then((response) => {
				return response.json();
			})
			.then((response) => {
				if (response && response.data && response.data.access){
					$cookies.put('access_token', response.data.access.access_token, {'domain':  window.location.hostname, 'path': "/"});
					$cookies.put('refresh_token', response.data.access.refresh_token, {'domain':  window.location.hostname, 'path': "/"});
					$cookies.put("soajs_dashboard_login", true, { 'domain': window.location.hostname, 'path': "/"});
					$cookies.put("soajs_passport_login", true, { 'domain': window.location.hostname, 'path': "/"});
					$cookies.put("soajs_username", response.data.email ? response.data.email : response.data.username, { 'domain': window.location.hostname, 'path': "/"});
					$timeout(function () {
						window.location.href =  window.location.origin + "/#/dashboard";
					}, 200);
				}
			});
	}]);