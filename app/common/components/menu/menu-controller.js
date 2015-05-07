var wlcMenu = angular.module("wlcMenuMod", []);

wlcMenu.controller('wlcMenuCtrl', ['$scope', '$rootScope', 'WLC_CONF', '$log', function ($scope, $rootScope, WLC_CONF, $log) {
    var activeMenuIndex, activeSubMenuIndex;
    var menuItems = [
        {'id': 'M_BASE', 'name': '素材库', 'link': '#', 'iconClass': 'icon-edit', 'linkVersion': '0.1', 'subMenu': [
            {'name': '文本信息', 'link': 'TextList.html'},
            {'name': '单图文信息', 'link': 'SingleImageText.html'},
            {'name': '多图文信息', 'link': 'MultipleImageText.html'},
            {'name': '图片', 'link': 'PictureList.html'}
//            {'name': '音频', 'link': 'AudioList.html'},
//            {'name': '视频', 'link': 'VideoList.html'}
        ]},
        {'id': 'M_BASE', 'name': '基础功能', 'link': '#', 'iconClass': 'icon-inbox', 'linkVersion': '0.1', 'subMenu': [
            {'name': '关注回复', 'link': 'FollowReply.html'},
            {'name': '关键词回复', 'link': 'KeywordReply.html'},
            {'name': '消息自动回复', 'link': 'AutoReply.html'}
        ]},
        {'id': 'M_SITE', 'name': '移动官网', 'link': '#', 'iconClass': 'icon-home', 'linkVersion': '0.1', 'subMenu': [
            {'name': '入口消息设置', 'link': 'MwsEntry.html'},
            {'name': '官网首页设置', 'link': 'MwsIndex.html'},
            {'name': '列表模板设置', 'link': 'MwsCategoryTemplate.html'},
            {'name': '文章模板设置', 'link': 'MwsContentTemplate.html'}
        ]},
        {'id': 'M_SHOP', 'name': '在线商城', 'link': '#', 'iconClass': 'icon-shopping-cart', 'linkVersion': '0.2', 'subMenu': [
            {'name': '入口消息设置', 'link': 'shop/entry'},
            {'name': '商城设置', 'link': 'shop/setting'},
            {'name': '商品管理', 'link': 'shop/category'},
            {'name': '订单管理', 'link': 'shop/order'}
        ]},
        {'id': 'M_ALBUM', 'name': '相册', 'link': '#', 'iconClass': 'icon-picture', 'linkVersion': '0.2', 'subMenu': [
            {'name': '入口消息设置', 'link': 'album/entry'},
            {'name': '相册设置', 'link': 'album'}
        ]}
    ];
//    $scope.menuItems = menuItems;
    $scope.v1ContextPath = WLC_CONF.v1ContextPath;
    $scope.activeMenu = function (index) {
        $log.debug("activeMenu: index=", index);
        if (activeMenuIndex != undefined) {
            menuItems[activeMenuIndex].isActive = false;
        }
        activeMenuIndex = index;
        menuItems[activeMenuIndex].isActive = true;
        activeSubMenuIndex = undefined;
    };
    $scope.activeSubMenu = function (index) {
        $log.debug("activeSubMenu: index=" + index + ", activeSubMenuIndex=" + activeSubMenuIndex);
        if (activeSubMenuIndex != undefined) {
            menuItems[activeMenuIndex].subMenu[activeSubMenuIndex].isActive = false;
        }
        activeSubMenuIndex = index;
        menuItems[activeMenuIndex].subMenu[activeSubMenuIndex].isActive = true;
    };
    /**
     * wlcMenuMod is loaded before demoConsoleMod, which handles $routeParams of wxAccountId changes. So here listen to the event for 'rootWxAccountChangeEvent'.
     */
    $scope.$on('rootWxAccountChangeEvent', function (event, newWxAccountId) {
        $log.debug("wlcMenuCtrl: Received 'rootWxAccountChangeEvent', wxAccountId=", newWxAccountId);
        showMenus($rootScope.userModules);
        $scope.wxAccountId = newWxAccountId;
    });
    $scope.$on('wxAccountChangeEvent', function (event, newWxAccountId) {
        $log.debug("wlcMenuCtrl: Received 'wxAccountChangeEvent', wxAccountId=", newWxAccountId);
        $scope.wxAccountId = newWxAccountId;
    });

    function showMenus(userModules) {
        $scope.menuItems = [];
        for (var j = 0; j < menuItems.length; j++) {
            var moduleDef = menuItems[j];
            for (var i = 0; i < userModules.length; i++) {
                if (userModules[i] == moduleDef.id) {
                    $scope.menuItems.push(moduleDef);
                    break;
                }
            }
        }
    }
}]);

wlcMenu.directive('wlcMenu', function () {
    function link(scope, element, attrs) {
    }

    return {
        link: link,
        restrict: 'E',
        templateUrl: 'common/components/menu/menu-template.html'
    }
});