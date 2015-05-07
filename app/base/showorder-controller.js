/**
 * Controller for show order details page.
 * Created by Ting on 2014/8/12.
 */

var wlcOrder = angular.module('wlcOrderDetailMod', ['ngRoute', "wlcHelpersMod"]);

wlcOrder.constant('WLC_CONF', {
    ORDER_STATUS: {
        WAITING_PAYMENT: '等待付款',
        WAITING_SHIPMENT: '等待发货',
        SHIPPED: '已发货',
        RECEIVED: '已收货',
        COMPLETED_NORMAL: '已完成',
        COMPLETED_ABNORMAL: '已取消',
        COMPLETED_ABNORMAL_SHOP: '商家取消',
        COMPLETED_ABNORMAL_CUSTOMER: '用户取消'
    },
    PAYMENTS: {
        'cod': '货到付款',
        'alipay': '支付宝',
        'weixin': '微信支付'
    }
});

wlcOrder.controller('wlcRootCtrl', ['$scope', '$http', '$location', 'WLC_CONF', '$log', 'WlcHelpers', function ($scope, $http, $location, WLC_CONF, $log, WlcHelpers) {
    var wxAccountId, orderId;
    parsePath();
    loadOrder();
    loadShopInfo();

    $scope.print = function () {
        $("#order").printArea();
    };

    function parsePath() {
        var path = $location.path();
        var arrPathSegment = path.split("/");
        if (arrPathSegment.length != 3) {
            $log.error("Invalid location path:", path);
        } else {
            wxAccountId = arrPathSegment[1];
            orderId = arrPathSegment[2];
        }
    }

    function loadOrder() {
        if (wxAccountId != undefined && orderId != undefined) {
            WlcHelpers.ServiceHelper().getShopOrder(wxAccountId, orderId, function (resp) {
                $log.debug("Get order:", resp);
                $scope.order = resp.data.entity;
                $scope.order.displayStatus = WLC_CONF.ORDER_STATUS[$scope.order.status];
                $scope.order.displayPayment = WLC_CONF.PAYMENTS[$scope.order.payment];
            })
        }
    }

    /**
     * Get shop name.
     */
    function loadShopInfo() {
        WlcHelpers.ServiceHelper().getShopSetting(wxAccountId, "base_name", function (resp) {
            $scope.shopName = resp.data.entity.propValue;
        })
    }
}]);
