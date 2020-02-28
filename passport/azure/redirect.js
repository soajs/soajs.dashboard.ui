let API_URL = apiConfiguration.domain + "/oauth/passport/validate/azure" + window.location.search + "&key=" + apiConfiguration.key;
let soajsAzureApp = angular.module('soajsAzureApp', ['ngCookies', 'ngStorage', 'textAngular', 'ui.bootstrap']);
var interfaceDomain = location.host;
interfaceDomain = mydomain.split(":")[0];
soajsAzureApp.controller('soajsAzureController', ['$scope', '$cookies', '$localStorage', '$timeout', '$modal', function ($scope, $cookies, $localStorage, $timeout, $modal) {
	$scope.go = function (route) {
		window.location.href = window.location.origin + "/#" + route;
	};
	$scope.themeToUse = themeToUse;
	var overlayLoading = {
		show: function (cb) {
			
			var overlayHeight = jQuery(document).height();
			jQuery("#overlayLoading").css('height', overlayHeight + 'px').show();
			jQuery("#overlayLoading .bg").css('height', overlayHeight + 'px').show(100);
			jQuery("#overlayLoading .content").show();
			if (cb && typeof (cb) === 'function') {
				cb();
			}
		},
		hide: function (t, cb) {
			var fT = 200;
			if (t && typeof (t) === 'number') {
				fT = t;
			}
			jQuery("#overlayLoading .content").hide();
			jQuery("#overlayLoading").fadeOut(fT);
			if (cb && typeof (cb) === 'function') {
				cb();
			}
		}
	};
	overlayLoading.show();
	fetch(API_URL, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
		}
	})
		.then((response) => {
			if (response.ok) {
				return response.json();
			} else {
				overlayLoading.hide();
				let modal = $modal.open({
					templateUrl: "overlay.tmpl",
					size: 'lg',
					backdrop: true,
					keyboard: true,
					controller: function ($scope) {
						$scope.cancel = function () {
							modal.close();
							overlayLoading.show();
							window.location.href = window.location.origin + "/#/dashboard";
						};
					}
				});
				modal.result.then(function () {
				}, function () {
					overlayLoading.show();
					window.location.href = window.location.origin + "/#/dashboard";
				});
			}
		})
		.then((response) => {
			if (response && response.data && response.data.access) {
				$cookies.put('access_token', response.data.access.access_token, {
					'domain': interfaceDomain,
					'path': "/"
				});
				$cookies.put('refresh_token', response.data.access.refresh_token, {
					'domain': interfaceDomain,
					'path': "/"
				});
				$cookies.put("soajs_dashboard_login", true, {'domain': interfaceDomain,
					'path': "/"});
				$cookies.put("soajs_passport_login", true, {'domain': interfaceDomain,
					'path': "/"});
				$cookies.put("soajs_username", response.data.email ? response.data.email : response.data.username, {
					'domain': interfaceDomain,
					'path': "/"
				});
				$timeout(function () {
					window.location.href = window.location.origin + "/#/login";
				}, 200);
			}
		});
}]);