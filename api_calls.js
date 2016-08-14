angular
.module("ApiClient", [])
.factory("apiClient", function($q, $http, $timeout) {

	var BASE_URL = "https://5ef909db.ngrok.io";
	var apiClient = {};

	apiClient.getAppointments = function() {
		var deferred = $q.defer();

		api_url = BASE_URL + "/appointments";
		$http({
			method : "GET",
			url : api_url,
			headers : {	"Content-Type": "application/json" } 
			})
		.then(function(res){
			if(res.data.Error){
				deferred.reject(res.data.Error);
			}
			else {
				deferred.resolve(angular.toJson(res));
			}	
		}, function(err) {deferred.reject(err)});
		return deferred.promise;
	};

	apiClient.confirmAppointment = function(appointment) {
		appointment["status"] = "CONFIRMED"
		var deferred = $q.defer();
		api_url = BASE_URL + "/appointments/" + appointment["_id"];
		$http({
			method: "PUT",
			url : api_url,
			data : appointment,
			headers : { "Content-Type" : "application/json"}
		})
		.then(function(res) {
			if(res.data.Error) {
				deferred.reject(res.data.Error);
			} else { deferred.resolve(angular.toJson(res));}
		}, function(err) {deferred.reject(err)});
		return deferred.promise;
	}

	apiClient.cancelAppointment = function(appointment) {
		appointment["status"] = "DENIED"
		var deferred = $q.defer();
		api_url = BASE_URL + "/appointments/" + appointment["_id"];
		$http({
			method: "PUT",
			url : api_url,
			data : appointment,
			headers : { "Content-Type" : "application/json"}
		})
		.then(function(res) {
			if(res.data.Error) {
				deferred.reject(res.data.Error);
			} else { deferred.resolve(angular.toJson(res));}
		}, function(err) {deferred.reject(err)});
		return deferred.promise;
	}

	apiClient.deleteAppointment = function(appointment) {
		var deferred = $q.defer();
		api_url = BASE_URL + "/appointments/" + appointment["_id"];
		$http({
			method: "DELETE",
			url : api_url,
			headers : {"Content-Type" : "application/json"}
		})
		.then(function(res) {
			if (res.data.Error) {
				deferred.reject(res.data.Error);
			} else { deferred.resolve(res)}
		}, function(err) {deferred.reject(err)});
		return deferred.promise;
	}

	return apiClient;
});