/**
 * Created by Ting on 2014/7/7.
 */
var wlcHeader = angular.module('wlcHeaderMod', []);

wlcHeader.controller('wlcHeaderCtrl', ['$scope', '$http', 'WlcHelpers', 'WLC_CONF', '$log', function ($scope, $http, WlcHelpers, WLC_CONF, $log) {
    // init scope variables.
    $scope.wxAccounts = [];
    $scope.v1ContextPath = WLC_CONF.v1ContextPath;
    $scope.curUser = {'avatar': 'common/static/images/avatar-default.jpg'};

    $scope.isMenuOpen = false;
    $scope.toggleMenu = function () {
        $scope.isMenuOpen = !$scope.isMenuOpen;
    };

    // When user click account tabs on header, should change the selection style, and set event to wlcRootCtrl in case other controllers may know it.
    $scope.setSelectedAccountId = function (wxAccountId) {
        $scope.wxAccountId = wxAccountId;
        $log.debug("wlcHeaderCtrl: Emit 'wxAccountChangeEvent', wxAccountId=", wxAccountId);
        $scope.$emit('wxAccountChangeEvent', wxAccountId);
    };

    // get base information of current login user.
    WlcHelpers.ServiceHelper().getUser(function (resp) {
        $scope.curUser = resp.data.WlsUser;
    });

    // get wxAccounts of current login user.
    WlcHelpers.ServiceHelper().getWxAccounts(function (resp) {
        $scope.wxAccounts = resp.data.ArrayList;
        setSelectFlagForCurrentAccount()
    });

    // Subscribe "rootWxAccountChangeEvent" and update selection style of header tabs.
    // There are 2 cases:
    // 1. User select account on header tabs, this controller emit event to root controller, and root controller will broadcast the change.
    // 2. User refresh page, root controller get account from session, and broadcast it.
    $scope.$on('rootWxAccountChangeEvent', function (event, newWxAccountId) {
        $log.debug("wlcHeaderCtrl: Received 'rootWxAccountChangeEvent', wxAccountId=", newWxAccountId);
        $scope.wxAccountId = newWxAccountId;
        setSelectFlagForCurrentAccount();
    });

    /**
     * Current wxAccountId is coming from $routeParams by subscribe event.
     * The bind wxAccounts of current user is retrieved from service by ajax call.
     *
     * We are not sure which will be done first, so we save the data in $scope, compare when any of them comes.
     */
    function setSelectFlagForCurrentAccount() {
        angular.forEach($scope.wxAccounts, function (account) {
            account.isSelected = account.id == $scope.wxAccountId;
        });
    }

}]);

wlcHeader.directive('wlcHeader', function () {
    function link(scope, element, attrs) {
    }

    return {
        link: link,
        restrict: 'E',
        templateUrl: 'common/components/header/header-template.html'
    };
});