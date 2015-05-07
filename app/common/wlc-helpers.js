/**
 * Created by Ting on 2014/7/11.
 * Define helpers for demo console.
 */
var wlcHelpers = angular.module('wlcHelpersMod', []);

wlcHelpers.service('WlcHelpers', ['$http', '$window', 'WLC_CONF', '$log', function ($http, $window, WLC_CONF, $log) {
    return {
        /**
         * Helper of call backend service to deal with RESTful resources..
         * @returns function
         */
        ServiceHelper: function () {
            var ErrorCode = {
                'NO_PRIVILIEGE': {'name': 'NO_PRIVILIEGE', 'msg': '没有权限'},
                'INVALID_DATA': {'name': 'INVALID_DATA', 'msg': '错误数据'},
                'NOT_FOUND': {'name': 'NOT_FOUND', 'msg': '找不到数据'},
                'DUPLICATE_DATA': {'name': 'DUPLICATE_DATA', 'msg': '重复的数据'},
                'SERVICE_ERROR': {'name': 'SERVICE_ERROR', 'msg': '服务错误'},
                'UNKNOWN_ERROR': {'name': 'UNKNOWN_ERROR', 'msg': '未知错误'},
                'INVALID_CRED': {'name': 'INVALID_CRED', 'msg': '登录信息错误，请重新登录。'},
                'CRED_EXPIRED': {'name': 'CRED_EXPIRED', 'msg': '登录信息过期，请重新登录。'},
                'VIP_PHONENUMBER_ALREADY_EXISTED': {'name': 'VIP_PHONENUMBER_ALREADY_EXISTED', 'msg': '电话号码已注册'},
                'VIP_PHONENUMBER_NOT_REGISTERED': {'name': 'VIP_PHONENUMBER_NOT_REGISTERED', 'msg': '电话号码可注册'},
                'VIP_VERIFICATIONCODE_EXPIRED': {'name': 'VIP_VERIFICATIONCODE_EXPIRED', 'msg': '验证码过期'},
                'VIP_VERIFICATIONCODE_INVALID': {'name': 'VIP_VERIFICATIONCODE_INVALID', 'msg': '验证码错误'},
                'ITEM_OUT_OF_STOCK': {'name': 'ITEM_OUT_OF_STOCK', 'msg': '库存不足，请刷新商品明细，调整购买数量。'},
                'ORDER_INVALID_STATUS_DEP': {'name': 'ORDER_INVALID_STATUS_DEP', 'msg': '订单状态过期，请刷新订单。'}
            };
            var serviceUrl = WLC_CONF.v2ContextPath + "/php/ajax.php";
            var httpErrHandler = function (resp, callback) {
                $log.error("ServiceHelper, request error:", resp);
                if (angular.isFunction(callback)) {
                    callback(resp);
                }
            };
            var bcsResponseHandler = function (resp, cbSuccess, cbError) {
                if (!resp) {
                    $log.error("Invalid service response:", resp);
                } else {
                    if (resp.status == "OK") {
                        if (angular.isFunction(cbSuccess)) {
                            cbSuccess(resp);
                        }
                    } else {
                        if (angular.isFunction(cbError)) {
                            cbError(resp);
                        }
                    }
                }
            };
            /**
             * Handle errors of demoService response, before return success result to caller.
             *
             * Convert different error cases to action or user friendly error messages.
             * @param resp
             * @param cbSuccess Back to caller, with the response data.
             * @param cbError
             */
            var httpSuccessHandler = function (resp, cbSuccess, cbError) {
                if (!resp) {
                    $log.error("Invalid service response:", resp);
                    if (angular.isFunction(cbError)) {
                        cbError(resp);
                    }
                } else {
                    if (resp.success == false) {
                        $log.error('ServiceHelper, request success, but response data has error. code: ' + resp.errCode + ", message:" + resp.errMsg);
                        if (resp.errMsg == 'php_session_expired') {
                            $window.location.href = WLC_CONF.v1ContextPath + '/Login.html';
                        } else if (ErrorCode[resp.errCode]) {
                            $.gritter.add({
                                //title: '发生错误',
                                text: ErrorCode[resp.errCode].msg,
                                //image: $path_assets + '/avatars/avatar1.png',
                                sticky: false,
                                time: '5000',
                                class_name: 'gritter-error'
                            });
                        } else {
                            $log.error("Unknown error:", resp);
                        }
                        if (angular.isFunction(cbError)) {
                            cbError(resp);
                        }
                    } else if (resp.success == true) {
                        if (angular.isFunction(cbSuccess)) {
                            cbSuccess(resp);
                        }
                    } else {
                        if (angular.isFunction(cbError)) {
                            cbError(resp);
                        } else {
                            $log.error("resp.success is not boolean value:", resp);
                        }
                    }
                }
            };
            /**
             * The following two are dedicated methods to call ajax.php.
             * @param url The query string which will be append to ajax.php, should include "?" and the parameters "method" and "url".
             * @param cbSuccess
             * @param cbError
             */
            var phpAjaxGet = function (url, cbSuccess, cbError) {
                $http.get(serviceUrl + url)
                    .success(function (resp) {
                        httpSuccessHandler(resp, cbSuccess, cbError);
                    }).error(function (resp) {
                        httpErrHandler(resp, cbError);
                    });
            };
            var phpAjaxPut = function (url, data, cbSuccess, cbError) {
                $http.post(serviceUrl + url, data)
                    .success(function (resp) {
                        httpSuccessHandler(resp, cbSuccess, cbError);
                    }).error(function (resp) {
                        httpErrHandler(resp, cbError);
                    });
            };
            /**
             * The following are service wrapper methods.
             */
            return {
                // user and wxAccount
                getUser: function (cbSuccess, cbError) {
                    var url = "?method=get&url=/user";
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                getWxAccounts: function (cbSuccess, cbError) {
                    var url = "?method=get&url=/user/wxaccounts";
                    phpAjaxGet(url, cbSuccess, cbError);
                },

                // keyword reply
                getKeywordReplyList: function (cbSuccess, cbError) {
                    var url = "?method=get&url=/reply/keyword/list";
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                getKeywordReplyListByModule: function (cbSuccess, cbError) {
                    var url = "?method=get&url=/reply/keyword/module/list";
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                postKeywordReply: function (data, cbSuccess, cbError) {
                    var url = "?method=post&url=/reply/keyword";
                    phpAjaxPut(url, data, cbSuccess, cbError);
                },
                putKeywordReply: function (keywordId, data, cbSuccess, cbError) {
                    var url = "?method=put&url=/reply/keyword/" + keywordId;
                    phpAjaxPut(url, data, cbSuccess, cbError);
                },
                deleteKeywordReply: function (keywordId, cbSuccess, cbError) {
                    var url = "?method=delete&url=/reply/keyword/" + keywordId;
                    phpAjaxGet(url, cbSuccess, cbError);
                },

                // shop entry
                getShopEntry: function (wxAccountId, cbSuccess, cbError) {
                    var url = "?method=get&url=/shop/entry/" + wxAccountId;
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                postShopEntry: function (entry, cbSuccess, cbError) {
                    var url = "?method=post&url=/shop/entry";
                    phpAjaxPut(url, entry, cbSuccess, cbError);
                },
                putShopEntry: function (wxAccountId, entry, cbSuccess, cbError) {
                    var url = "?method=put&url=/shop/entry/" + wxAccountId;
                    phpAjaxPut(url, entry, cbSuccess, cbError);
                },

                // shop settings
                getShopSettings: function (wxAccountId, cbSuccess, cbError) {
                    var url = '?method=get&url=/shop/' + wxAccountId + "/config/list";
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                getShopSetting: function (wxAccountId, propName, cbSuccess, cbError) {
                    var url = "?method=get&url=/shop/" + wxAccountId + "/config/" + propName;
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                getShopSettingsByPrefix: function (wxAccountId, prefix, cbSuccess, cbError) {
                    var url = '?method=get&url=/shop/' + wxAccountId + '/config/prefix/' + prefix;
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                postShopSettings: function (wxAccountId, settings, cbSuccess, cbError) {
                    var url = "?method=post&url=/shop/" + wxAccountId + "/config";
                    phpAjaxPut(url, settings, cbSuccess, cbError);
                },
                deleteShopSetting: function (wxAccountId, propName, cbSuccess, cbError) {
                    var url = "?method=delete&url=/shop/" + wxAccountId + "/config/" + propName;
                    phpAjaxGet(url, cbSuccess, cbError);
                },

                // shop categories and items
                getShopCategories: function (wxAccountId, cbSuccess, cbError) {
                    var url = "?method=get&url=/shop/" + wxAccountId + "/category/list";
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                postShopCategory: function (data, cbSuccess, cbError) {
                    var url = "?method=post&url=/shop/category";
                    phpAjaxPut(url, data, cbSuccess, cbError);
                },
                putShopCategory: function (id, data, cbSuccess, cbError) {
                    var url = "?method=put&url=/shop/category/" + id;
                    phpAjaxPut(url, data, cbSuccess, cbError);
                },
                deleteShopCategory: function (wxAccountId, catId, cbSuccess, cbError) {
                    var url = "?method=delete&url=/shop/" + wxAccountId + "/category/" + catId;
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                getShopItems: function (wxAccountId, cbSuccess, cbError) {
                    var url = "?method=get&url=/shop/" + wxAccountId + "/item/list";
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                getShopCategoryItems: function (wxAccountId, catId, cbSuccess, cbError) {
                    var url = "?method=get&url=/shop/" + wxAccountId + "/category/" + catId + "/item/list";
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                postShopItem: function (data, cbSuccess, cbError) {
                    var url = "?method=post&url=/shop/item";
                    phpAjaxPut(url, data, cbSuccess, cbError);
                },
                putShopItem: function (itemId, data, cbSuccess, cbError) {
                    var url = "?method=put&url=/shop/item/" + itemId;
                    phpAjaxPut(url, data, cbSuccess, cbError);
                },
                deleteShopItem: function (itemId, cbSuccess, cbError) {
                    var url = "?method=delete&url=/shop/item/" + itemId;
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                // Shop promotion items of points
                getShopPromPoints: function (wxAccountId, isFilterEnabled, cbSuccess, cbError) {
                    var type = isFilterEnabled ? "enabled" : "all";
                    var url = "?method=get&url=/shop/" + wxAccountId + "/prom/points/list/" + type;
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                postShopPromPoints: function (data, cbSuccess, cbError) {
                    var url = "?method=post&url=/shop/prom/points";
                    phpAjaxPut(url, data, cbSuccess, cbError);
                },
                putShopPromPoints: function (promPointsId, data, cbSuccess, cbError) {
                    var url = "?method=put&url=/shop/prom/points/" + promPointsId;
                    phpAjaxPut(url, data, cbSuccess, cbError);
                },
                deleteShopPromPoints: function (promPointsId, cbSuccess, cbError) {
                    var url = "?method=delete&url=/shop/prom/points/" + promPointsId;
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                // shop order
                getShopOrder: function (wxAccountId, orderId, cbSuccess, cbError) {
                    var serviceUrl = "/shop/" + wxAccountId + "/order/" + orderId;
                    var url = "?method=get&url=" + serviceUrl;
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                getShopOrderList: function (wxAccountId, before, count, cbSuccess, cbError) {
                    var serviceUrl = encodeURIComponent("/shop/" + wxAccountId + "/order/list?before=" + before + "&count=" + count);
                    var url = "?method=get&url=" + serviceUrl;
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                getShopOrderListByRange: function (wxAccountId, range, cbSuccess, cbError) {
                    var serviceUrl = "/shop/" + wxAccountId + "/order/list/" + range;
                    var url = "?method=get&url=" + serviceUrl;
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                getShopOrderListByCustomRange: function (wxAccountId, start, end, cbSuccess, cbError) {
                    var serviceUrl = encodeURIComponent("/shop/" + wxAccountId + "/order/list?start=" + start + "&end=" + end);
                    var url = "?method=get&url=" + serviceUrl;
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                putOrderStatus: function (orderId, status, cbSuccess, cbError) {
                    var serviceUrl = "/shop/order/" + orderId + "/status/" + status;
                    var url = "?method=put&url=" + serviceUrl;
                    phpAjaxPut(url, {}, cbSuccess, cbError);
                },
                // sms templates
                getSmsTemplate: function (key, cbSuccess, cbError) {
                    var serviceUrl;
                    if (key == "orderStatusCreatedSimple") {
                        serviceUrl = "/sms/template/order/status/created/simple";
                    } else if (key == "orderStatusCreatedDetail") {
                        serviceUrl = "/sms/template/order/status/created/detail";
                    } else if (key == "orderStatusAccepted") {
                        serviceUrl = "/sms/template/order/status/accepted";
                    } else if (key == "orderStatusDenied") {
                        serviceUrl = "/sms/template/order/status/denied";
                    } else if (key == "orderStatusShippedExpress") {
                        serviceUrl = "/sms/template/order/status/shipped/express";
                    } else if (key == "orderStatusShippedShop") {
                        serviceUrl = "/sms/template/order/status/shipped/shop";
                    } else if (key == "regVerificationCode") {
                        serviceUrl = "/sms/template/template/reg/verification/code";
                    }
                    var url = "?method=get&url=" + serviceUrl;
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                /**
                 * Get count of SMS sent in current month. The begin and end date are calculated by backend service automatically.
                 * @param wxAccountId WeiXin account Id, usually it identified a shop.
                 * @param phoneNumber Phone number which sent SMS to.
                 * @param cbSuccess
                 * @param cbError
                 */
                getSmsHistoryCountOfCurrentMonth: function (wxAccountId, phoneNumber, cbSuccess, cbError) {
                    var url = "?method=get&url=/sms/count/account/" + wxAccountId + "/range/month?phone=" + phoneNumber;
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                // album interfaces
                getTopAlbumList: function (wxAccountId, cbSuccess, cbError) {
                    var url = "?method=get&url=/album/" + wxAccountId + "/list";
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                // for public access, needn't cred.
                getPublicTopAlbumList: function (wxAccountId, cbSuccess, cbError) {
                    var url = "?method=get&checkSession=false&url=/album/" + wxAccountId + "/list";
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                getChildAlbumList: function (wxAccountId, albumId, cbSuccess, cbError) {
                    var url = "?method=get&url=/album/" + wxAccountId + "/" + albumId + "/list";
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                createAlbum: function (wxAccountId, data, cbSuccess, cbError) {
                    var url = "?method=post&url=/album/" + wxAccountId;
                    phpAjaxPut(url, data, cbSuccess, cbError);
                },
                updateAlbum: function (wxAccountId, albumId, data, cbSuccess, cbError) {
                    var url = "?method=put&url=/album/" + wxAccountId + "/" + albumId;
                    phpAjaxPut(url, data, cbSuccess, cbError);
                },
                deleteAlbum: function (wxAccountId, albumId, cbSuccess, cbError) {
                    var url = "?method=delete&url=/album/" + wxAccountId + "/" + albumId;
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                getAlbumPhotoList: function (wxAccountId, albumId, cbSuccess, cbError) {
                    var url = "?method=get&url=/album/" + wxAccountId + "/" + albumId + "/photo/list";
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                getPublicAlbumPhotoList: function (wxAccountId, albumId, cbSuccess, cbError) {
                    var url = "?method=get&checkSession=false&url=/album/" + wxAccountId + "/" + albumId + "/photo/list";
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                getNonAlbumPhotoList: function (wxAccountId, cbSuccess, cbError) {
                    var url = "?method=get&url=/album/" + wxAccountId + "/nonalbum/photo/list";
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                createAlbumPhoto: function (wxAccountId, albumId, data, cbSuccess, cbError) {
                    var url = "?method=post&url=/album/" + wxAccountId + "/" + albumId + "/photo";
                    phpAjaxPut(url, data, cbSuccess, cbError);
                },
                updateAlbumPhoto: function (wxAccountId, albumId, photoId, data, cbSuccess, cbError) {
                    var url = "?method=put&url=/album/" + wxAccountId + "/" + albumId + "/photo/" + photoId;
                    phpAjaxPut(url, data, cbSuccess, cbError);
                },
                deleteAlbumPhoto: function (wxAccountId, albumId, photoId, cbSuccess, cbError) {
                    var url = "?method=delete&url=/album/" + wxAccountId + "/" + albumId + "/photo/" + photoId;
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                deleteAlbumPhotoFromBCS: function (url, cbSuccess, cbError) {
                    var url = "php/file-upload.php?action=delete&type=ajax&url=" + url;
                    $http.get(url).success(function (resp) {
                        bcsResponseHandler(resp, cbSuccess, cbError);
                    });
                },
                // Album entry
                getAlbumEntry: function (wxAccountId, cbSuccess, cbError) {
                    var url = "?method=get&url=/album/entry/" + wxAccountId;
                    phpAjaxGet(url, cbSuccess, cbError);
                },
                postAlbumEntry: function (entry, cbSuccess, cbError) {
                    var url = "?method=post&url=/album/entry";
                    phpAjaxPut(url, entry, cbSuccess, cbError);
                },
                putAlbumEntry: function (wxAccountId, entry, cbSuccess, cbError) {
                    var url = "?method=put&url=/album/entry/" + wxAccountId;
                    phpAjaxPut(url, entry, cbSuccess, cbError);
                }
            };
        },
        UIHelper: function () {
            return {
                showGritterSuccess: function (text, time) {
                    $.gritter.add({
                        "text": text,
                        "class_name": "gritter-success", //gritter-center
                        "time": time ? time : 1000
                    });
                },
                showGritterError: function (text) {
                    $.gritter.add({
                        "text": text,
                        "class_name": "gritter-error",
                        "time": 5000
                    });
                },
                showGritterLoading: function () {
                    $.gritter.add({
                        "text": '<i class="icon-spinner icon-spin"></i> 加载数据，请稍后...',
                        "class_name": "gritter-success gritter-light gritter-center",
                        "sticky": true
                    });
                },
                removeGritter: function () {
                    $.gritter.removeAll();
                }
            }
        },
        /**
         * Sorter methods for Array.
         * @returns {{sortEntityByAppCreateTimeDesc: sortEntityByAppCreateTimeDesc}}
         * @constructor
         */
        ArraySorter: {
            sortEntityByAppCreateTimeDesc: function (entity1, entity2) {
                return (entity1.appCreateTime - entity2.appCreateTime) * -1;
            }
        }
    }
}]);
