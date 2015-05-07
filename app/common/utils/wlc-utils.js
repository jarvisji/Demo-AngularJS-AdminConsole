var wlcUtils = angular.module('WlcUtilsMod', []);

wlcUtils.service('WlcUtils', ['$window', 'WLC_CONF', '$log', function ($window, WLC_CONF, $log) {
    return {
        HttpUtils: function () {
            return {
            }
        }
    }
}]);