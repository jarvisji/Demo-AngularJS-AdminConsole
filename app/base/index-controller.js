/**
 * Created by Ting on 2014/7/7.
 */
var wlc = angular.module('demoConsoleMod', ['ngRoute', 'ui.bootstrap', 'wlcMenuMod', 'wlcHeaderMod', 'wlcFileUploader', "wlcHelpersMod"]);

wlc.constant('WLC_CONF', {
    'v1ContextPath': '/console',
    'v2ContextPath' : '/console2',
    'shopContextPath': '/shop'
});
wlc.constant('WLC_CONST', {
    'INVENTORY_INF': 999999 // Do not change, must same to demo service.
});
/**
 * Define a service to share data between controllers.
 * Memo: if the controllers are in same page, $rootScope is easier to use.
 */
wlc.service('sharedData', function () {
    var objectValue = {};

    return {
        getObject: function () {
            return objectValue;
        }
    }
});

wlc.controller('wlcRootCtrl', ['$scope', '$rootScope', '$http', '$location', '$log', 'WlcHelpers', function ($scope, $rootScope, $http, $location, $log, WlcHelpers) {
    // Every time page was loaded, try to get current wxAccountId from session, because data in $scope will lost when reload page.
    $http.get("php/ajax.php?method=get&url=sessioninfo").success(function (data) {
        if (angular.isObject(data) && data.success == true) {
            $log.debug("wlcRootCtrl: Current session account:", data.wxAccountId);
            $scope.wxAccountId = data.wxAccountId;
            $rootScope.userModules = data.modules;
            $rootScope.sessionInfo = data;
            broadcastTootWxAccountChangeEvent(data.wxAccountId);

            if (data.wxAccountId == 'undefined' || data.wxAccountId == undefined) {
                $location.path('/home');
            }
        } else {
            // redirect to user home page, to let user select account.
            $location.path('/home');
        }
    });

    // When user click account tab on page header, wlcAccountController will emit wxAccountChangeEvent.
    $scope.$on('wxAccountChangeEvent', function (event, newWxAccountId) {
        $log.debug("wlcRootCtrl: Received 'wxAccountChangeEvent', wxAccountId=", newWxAccountId);
        $scope.wxAccountId = newWxAccountId;
        broadcastTootWxAccountChangeEvent(newWxAccountId);

        // update session value.
        $http.get("php/ajax.php?method=set&url=sessioninfo&key=wxAccountId&value=" + newWxAccountId).success(function (data) {
            if (!angular.isObject(data) || data.success == false)
                $log.error("wlcRootCtrl: Update session for wxAccountId failed: ", data);
        });
    });

    // Broadcast to other controllers.
    function broadcastTootWxAccountChangeEvent(newWxAccountId) {
        $log.debug("wlcRootCtrl: Broadcast 'rootWxAccountChangeEvent' to children scopes, wxAccountId=", newWxAccountId);
        $scope.$broadcast('rootWxAccountChangeEvent', newWxAccountId);
    }

    $rootScope.showSaveSuccess = function () {
        WlcHelpers.UIHelper().showGritterSuccess("保存成功");
    };

    $rootScope.validateForm = function (form) {
        var formValid = form.$valid;
        angular.forEach(form, function (ele) {
            if (ele.$invalid) {
                ele.$dirty = true;
                formValid = false;
                $log.debug("invalid element:", ele);
            }
        });
//        $log.debug("validated form:", formValid, form);
        return formValid;
    };
}]);

/**
 * Controller for home page of user login.
 */
wlc.controller('wlcUserController', ['$scope', '$log', function wlcUserController($scope, $log) {

}]);

/**
 * Controller for special WeiXin account home page.
 */
wlc.controller('wlcAccountController', ['$scope', '$routeParams', '$log', function ($scope, $routeParams, $log) {

}]);

wlc.controller('wlcShopEntryCtrl', ['$scope', '$rootScope', '$routeParams', '$http', '$location', '$log', 'WLC_CONF', 'WlcHelpers', function ($scope, $rootScope, $routeParams, $http, $location, $log, WLC_CONF, WlcHelpers) {
    var wxAccountId = $routeParams.uuid;
    var gAllExistKeywords = []; // cache all keywords, include set up in keyword reply page, use to check reduplication.
    init();

    function init() {
        WlcHelpers.UIHelper().showGritterLoading();
        generateShopEntryUrl();
        $scope.entrySnapshot = {};
        WlcHelpers.ServiceHelper().getShopEntry(wxAccountId, function (resp) {
            if (resp.data.count > 0) {
                $scope.entry = resp.data.entity;
            } else {
                $scope.entry = {'enable': false, 'keyword': 'shop', 'wlsWxAccountId': wxAccountId};
            }
            $scope.entrySnapshot = angular.copy($scope.entry);
            WlcHelpers.UIHelper().removeGritter();
        }, function (resp) {
            WlcHelpers.UIHelper().removeGritter();
        });

        WlcHelpers.ServiceHelper().getKeywordReplyList(function (resp) {
            for (var i = 0; i < resp.data.count; i++) {
                var kwEntity = resp.data.entity[i];
                if (kwEntity.keywordGroup == "module_shop") {
                    $scope.keywordId = kwEntity.id;
                } else {
                    gAllExistKeywords.push(kwEntity.keyword);
                }
            }
            $log.debug("All exist keywords:", gAllExistKeywords);
        });
        refreshTargetFileName();
    }

    $scope.saveEntry = function (form) {
        if (!$rootScope.validateForm(form))
            return;
        // update keyword
        var keyword = {
            "keyword": $scope.entry.keyword,
            "keywordGroup": "module_shop",
            "refId": $scope.wxAccountId,
            "refType": "module_shop",
            "wlsWxAccountId": $scope.wxAccountId
        };

        // check keyword existence
        for (var i = 0; i < gAllExistKeywords.length; i++) {
            if (gAllExistKeywords[i] == keyword.keyword) {
                WlcHelpers.UIHelper().showGritterError('关键词重复，请使用其它关键词。（请打开“关键词回复”页面查看所有已使用的关键词）');
                return;
            }
        }

        if ($scope.entry.enable) {
            if ($scope.keywordId) {
                WlcHelpers.ServiceHelper().putKeywordReply($scope.keywordId, keyword, function (resp) {
                });
            } else {
                WlcHelpers.ServiceHelper().postKeywordReply(keyword, function (resp) {
                    $scope.keywordId = resp.data.entity.id;
                });
            }
        } else {
            if ($scope.keywordId) {
                WlcHelpers.ServiceHelper().deleteKeywordReply($scope.keywordId, function (resp) {
                    $scope.keywordId = undefined;
                });
            }
        }
        // save entry
        if ($scope.entry.appCreateTime) {
            WlcHelpers.ServiceHelper().putShopEntry(wxAccountId, $scope.entry, copySnapshot);
        } else {
            WlcHelpers.ServiceHelper().postShopEntry($scope.entry, function (resp) {
                $scope.entry = resp.data.entity;
                copySnapshot();
                refreshTargetFileName();
            });
        }
    };

    // Add timestamp to file name, to avoid cache issue.
    function refreshTargetFileName() {
        $scope.targetFileName = "wxmsg-shop." + new Date().getTime();
    }

    function copySnapshot() {
        $scope.entrySnapshot = angular.copy($scope.entry);
        $rootScope.showSaveSuccess();
    }

    $scope.isUnchanged = function () {
        return $scope.form.$pristine || angular.equals($scope.entry, $scope.entrySnapshot);
    };

    function generateShopEntryUrl() {
        var entryUrl = $location.protocol() + "://" + $location.host();
        if ($location.port() != '80') {
            entryUrl += ":" + $location.port();
        }
        entryUrl += WLC_CONF.shopContextPath + "/index.html#/" + wxAccountId + "/home";
        $scope.entryUrl = entryUrl;
    }
}]);

wlc.controller('wlcShopSettingCtrl', ['$scope', '$rootScope', '$routeParams', '$log', "WlcHelpers", function ($scope, $rootScope, $routeParams, $log, WlcHelpers) {
    // init scope objects and load data from service.
    $scope.base = {};
    $scope.wxpub = {};
    $scope.payment = {};
    $scope.shipping = {fixFee: 0, conditionFee: 0, conditionOrder: 0};
    $scope.points = {};
    $scope.reminder = {};
    $scope.temp = {}; // data in this object will not be persistent.
    $scope.tabName = 'base';
    // Use for points exchange tab.
    $scope.pointsItems = [];

    var wxAccountId = $routeParams.uuid;
    var PREFIXES = ['base', 'wxpub', 'payment', 'shipping', 'points', 'reminder'];
    var tabDataSnapshot;

    WlcHelpers.UIHelper().showGritterLoading();

    WlcHelpers.ServiceHelper().getShopSettings(wxAccountId, function (resp) {
        var settings = resp.data;
        for (var propName in settings) {
            for (var idx in PREFIXES) {
                var prefix = PREFIXES[idx];
                if (propName.indexOf(prefix + "_") == 0) {
                    var propNameWithoutPrefix = propName.substr(prefix.length + 1);
                    var propValue = settings[propName];
                    if (!isNaN(propValue)) {
                        propValue = Number(propValue);
                    } else if (propValue == 'true') {
                        propValue = true;
                    } else if (propValue == 'false') {
                        propValue = false;
                    }
                    $scope[prefix][propNameWithoutPrefix] = propValue;
                    break;
                }
            }
        }
        tabDataSnapshot = angular.copy($scope[$scope.tabName]);
        WlcHelpers.UIHelper().removeGritter();
    }, function () {
        WlcHelpers.UIHelper().removeGritter();
    });


    $scope.saveSettings = function (form) {
        console.log(form);
        if (!$rootScope.validateForm(form))
            return;
        if (angular.isObject($scope[$scope.tabName])) {
            // set snapshot to disable "save" button.
            tabDataSnapshot = angular.copy($scope[$scope.tabName]);

            var settings = {};
            for (var propName in $scope[$scope.tabName]) {
                settings[$scope.tabName + "_" + propName] = $scope[$scope.tabName][propName];
            }

            if ($scope.tabName == "shipping") {
                generateFeeExp(settings, $scope.tabName);
            } else if ($scope.tabName == "points") {
                generateCostTransExp(settings, $scope.tabName);
            }
            $log.debug("Saving settings:", $scope.tabName, settings);
            WlcHelpers.ServiceHelper().postShopSettings(wxAccountId, settings, function () {
                $rootScope.showSaveSuccess();
            });
        }
    };

    /**
     * Generate expression for cost transfer to points. In client will eval the expression to get points of order.
     * @param settings object saving to db.
     * @param tabName Should always be "shipping".
     * @param settings
     * @param tabName
     */
    function generateCostTransExp(settings, tabName) {
        var exp = "parseInt(totalPrice/" + $scope[tabName].costTrans + ")";
        settings[tabName + "_costTransExp"] = exp;
    }

    /**
     * Generate expression for fee, especially for condition fee. In shop client, just eval the expression to get value of fee.
     * @param settings object saving to db.
     * @param tabName Should always be "shipping".
     */
    function generateFeeExp(settings, tabName) {
        var exp;
        if ($scope.shipping.feeType == "free") {
            exp = "0";
        } else if ($scope.shipping.feeType == "fix") {
            exp = $scope.shipping.fixFee;
        } else if ($scope.shipping.feeType == "condition") {
            exp = "totalPrice>=" + $scope.shipping.conditionOrder + "?0:" + $scope.shipping.conditionFee;
        }
        settings[tabName + "_feeExp"] = exp;
    }

    $scope.showDefaultAnnouncement = function (feeType) {
        if (feeType == "free") {
            $scope.shipping.announcement = "本商户免收外送费。";
        } else if (feeType == "fix") {
            $scope.shipping.announcement = "本商户对每笔订单固定收取" + $scope.shipping.fixFee + "元外送费。";
        } else if (feeType == "condition") {
            $scope.shipping.announcement = "本商户对每笔订单收取" + $scope.shipping.conditionFee + "元外送费，订单金额满" + $scope.shipping.conditionOrder + "元，免收外送费。";
        } else {
            // When user is typing, make sure one of feeType was set, then update announcement according to user input.
            if ($scope.shipping.feeType == "free" || $scope.shipping.feeType == "fix" || $scope.shipping.feeType == "condition") {
                $scope.showDefaultAnnouncement($scope.shipping.feeType);
            }
        }
    };

    $scope.showPointsAnnouncement = function () {
        if ($scope.points.costTrans) {
            $scope.points.announcement = "消费攒积分！订单确认成功后，每" + $scope.points.costTrans + "元订单金额可获得1积分。";
        } else {
            $scope.points.announcement = "";
        }
    };

    $scope.changeTab = function (tabName) {
        $scope.tabName = tabName;
        if (tabName == 'pointsExchange') {
            getPromPointsData();
        } else {
            tabDataSnapshot = angular.copy($scope[tabName]);
            if (tabName == 'reminder') {
                getSmsData();
            }
        }
    };

    $scope.isUnchanged = function () {
        //$log.debug("isUnchanged:", $scope.tabName, $scope[$scope.tabName], tabDataSnapshot);
        return angular.equals($scope[$scope.tabName], tabDataSnapshot);
    };

    // Use to control display/hide use operations.
    $scope.editingPointsItemIndex = undefined;
    // Set this object to show item name when editing points item.
    $scope.selectedGoodsItem = undefined;
    // Use to revert data when use cancel edit.
    var pointsItemSnapshot;
    $scope.addPointsItem = function () {
        var newItem = {
            'appCreateTime': new Date().getTime(),
            'wlsWxAccountId': wxAccountId
        };
        $scope.pointsItems.unshift(newItem);
        $scope.editingPointsItemIndex = 0;
    };
    $scope.savePointsItem = function (index, form) {
        if (!$rootScope.validateForm(form))
            return;

        if (!this.selectedGoodsItem) {
            $log.debug("savePointsItem(), invalid item selected: ", this.selectedGoodsItem);
            return;
        }
        $log.debug("savePointsItem(), selected goodsItem:", this.selectedGoodsItem);
        $scope.pointsItems[index].itemId = this.selectedGoodsItem.id;
        $scope.pointsItems[index].itemName = this.selectedGoodsItem.name;
        $scope.pointsItems[index].itemBrief = this.selectedGoodsItem.brief;

        var dbData = angular.copy($scope.pointsItems[index]);
        delete dbData.$$hashKey;

        $log.debug("savePointsItem(), saving ", dbData);
        if (dbData.id) {
            WlcHelpers.ServiceHelper().putShopPromPoints(dbData.id, dbData, function (resp) {
                $scope.selectedGoodsItem = $scope.editingPointsItemIndex = undefined;
                $rootScope.showSaveSuccess();
            });
        } else {
            WlcHelpers.ServiceHelper().postShopPromPoints(dbData, function (resp) {
                angular.extend($scope.pointsItems[index], resp.data.entity);
                $scope.selectedGoodsItem = $scope.editingPointsItemIndex = undefined;
                $rootScope.showSaveSuccess();
            });
        }
    };
    $scope.editPointsItem = function (index) {
        pointsItemSnapshot = angular.copy($scope.pointsItems[index]);
        $scope.editingPointsItemIndex = index;
        for (var i = 0; i < $scope.goodsItems.length; i++) {
            if ($scope.goodsItems[i].id == pointsItemSnapshot.itemId) {
                $scope.selectedGoodsItem = $scope.goodsItems[i];
                break;
            }
        }
    };
    $scope.deletePointsItem = function (index) {
        var pointsItemId = $scope.pointsItems[index].id;
        if (pointsItemId) {
            WlcHelpers.ServiceHelper().deleteShopPromPoints(pointsItemId, function (resp) {
                $scope.pointsItems.splice(index, 1);
            });
        }
    };
    $scope.cancelPointsItem = function (index) {
        $scope.editingPointsItemIndex = undefined;
        $scope.selectedGoodsItem = undefined;
        if ($scope.pointsItems[index].id) {
            $scope.pointsItems[index] = angular.copy(pointsItemSnapshot);
            pointsItemSnapshot = undefined;
        } else {
            // new added item, just remove.
            $scope.pointsItems.shift();
        }
    };
    $scope.togglePointsItemEnable = function (index) {
        // Only execute if not editing item.
        if ($scope.editingPointsItemIndex == undefined) {
            var dbData = angular.copy($scope.pointsItems[index]);
            delete dbData.$$hashKey;
            $log.debug("togglePointsItemEnable(), updating enable status: ", dbData);
            WlcHelpers.ServiceHelper().putShopPromPoints(dbData.id, dbData);
        }
    };

    function getSmsData() {
        WlcHelpers.ServiceHelper().getSmsTemplate("orderStatusCreatedDetail", function (resp) {
            $scope.temp.smsContent = resp.data.value;
            $scope.temp.smsLimit = 100; // TODO: this is mock data.
        });
        WlcHelpers.ServiceHelper().getSmsHistoryCountOfCurrentMonth(wxAccountId, $scope.reminder.smsPhoneNum, function (resp) {
            $scope.temp.smsHistoryCount = resp.data.count;
        });
    }

    function getPromPointsData() {
        WlcHelpers.ServiceHelper().getShopPromPoints(wxAccountId, /* isFilterEnabled */ false, function (resp) {
            $scope.pointsItems = resp.data.entity;
        });
        // For points exchange tab, we also need goods item data.
        WlcHelpers.ServiceHelper().getShopItems(wxAccountId, function (resp) {
            $scope.goodsItems = resp.data.entity;
        });
    }

}]);

/********************************************************************************************************************
 * Controller of shop items and categories.
 ********************************************************************************************************************/
wlc.controller('wlcShopCategoryCtrl', ['$scope', '$rootScope', '$routeParams', '$log', '$modal', "WlcHelpers", "WLC_CONST", function ($scope, $rootScope, $routeParams, $log, $modal, WlcHelpers, WLC_CONST) {
    var wxAccountId = $routeParams.uuid;
    // Cache database records of items and categories,will use in following cases:
    // 1. Since angularJs is dual-way data bind, user typing on view, will change model instantly. So if user cancel editing, we will reverse from cached db data.
    // 2. Get items of category, filter items, these operations will change $scope.items frequently. We use cached db data to decrease service requests.
    // Note: when user submit any changes, we need update cached items or categories corresponding.
    var dbItems = {};
    var dbCategories = {};

    WlcHelpers.UIHelper().showGritterLoading();

    // Create instance of UMEditor when loading page, this is the only one instance we created, and we move the dom node among item forms.
    createUmEditor();

    WlcHelpers.ServiceHelper().getShopCategories(wxAccountId, function (resp) {
        angular.forEach(resp.data.entity, function (category) {
            dbCategories[category.id] = angular.copy(category);
        });
        $scope.categories = resp.data.entity;
        $scope.categories.sort(sortCategoryByDisplayOrder);
    });
    WlcHelpers.ServiceHelper().getShopItems(wxAccountId, function (resp) {
        // Cache dbItems, so we needn't retrieve them again and again when filter items.
        angular.forEach(resp.data.entity, function (item) {
            checkInventory(item);
            setDefaultStatus(item);
            dbItems[item.id] = angular.copy(item);
        });
        $scope.items = resp.data.entity;
        $scope.items.sort(sortEntityByAppCreateTimeDesc);

        WlcHelpers.UIHelper().removeGritter();
    }, function () {
        WlcHelpers.UIHelper().removeGritter();
    });

    /*=====================================================
     * Category functions
     *====================================================*/
    // Global variables:
    // Value will be updated when user click category in list.
    // * Use to control button enable status of create new item.
    // * Create new item will set category by this value automatically.
    $scope.selectedCategoryId = undefined;
    // Value will be updated when user click category in list.
    // * Use to display current category name when editing item, I don't want to set category name for each item object.
    $scope.selectedCategoryName = undefined;
    // Record current editing category, it shows as input box on the view. We need reset it when user click cancel button, or select other category.
    $scope.editingCategoryIndex = undefined;
    /**
     * Handle key-down event of category name input.
     * @param $event
     * @param category
     */
    $scope.onCategoryNameKeydown = function ($event, index) {
        if ($event.keyCode == 13) {
            $scope.saveCategory(index);
        }
    };
    $scope.createCategory = function () {
        $scope.cancelCategory($scope.editingCategoryIndex);

        var newCategory = {
            'edit': true,
            'appCreateTime': new Date().getTime(),
            'wlsWxAccountId': wxAccountId
        };
        $scope.categories.unshift(newCategory);
        $scope.editingCategoryIndex = 0;
    };
    $scope.editCategory = function (index) {
        $scope.cancelCategory($scope.editingCategoryIndex);

        $scope.editingCategoryIndex = index;
        $scope.categories[index].edit = true;
    };
    $scope.cancelCategory = function (index) {
        if (index != undefined && $scope.categories[index]) {
            if ($scope.categories[index].id) {
                // Editing an existing category.
                $scope.categories[index] = angular.copy(dbCategories[$scope.categories[index].id]);
                $scope.editingCategoryIndex = undefined;
            } else {
                // Editing a new category.
                $scope.categories.splice(index, 1);
                $scope.editingCategoryIndex = undefined;
            }
        }
    };
    $scope.saveCategory = function (index) {
        var category = angular.copy($scope.categories[index]);
        if (!category.name) {
            return;
        }

        cleanCategoryProperties(category);
        $log.debug("SaveCategory(), saving ", category);

        if (category.id) {
            WlcHelpers.ServiceHelper().putShopCategory(category.id, category);
            $scope.categories[index].edit = false;
        } else {
            WlcHelpers.ServiceHelper().postShopCategory(category, function (resp) {
                $scope.categories[index] = resp.data.entity;
            });
        }
        $scope.editingCategoryIndex = undefined;
    };
    /**
     * Remove service un-accepted properties.
     */
    function cleanCategoryProperties(category) {
        delete category.edit;
        delete category.selected;
        delete category.$$hashKey;
    }

    $scope.removeCategory = function (category) {
        for (var i = 0; i < $scope.categories.length; i++) {
            if (category.appCreateTime == $scope.categories[i].appCreateTime) {
                var catId = $scope.categories[i].id;
                if (catId) {
                    WlcHelpers.ServiceHelper().deleteShopCategory(wxAccountId, catId, function (resp) {
                        // delete from UI until delete from service success.
                        $scope.categories.splice(i, 1);
                    }, function (resp) {
                        if (resp.errMsg == 'demoServiceDaoForeignKeyConstraintException') {
                            WlcHelpers.UIHelper().showGritterError('分类下有商品，不能删除。');
                        }
                    })
                } else {
                    $scope.categories.splice(i, 1);
                }
                break;
            }
        }
    };
    /**
     * User click on a category to select it, and load items in category.
     * @param index
     */
    $scope.selectCategory = function (index) {
        // clear the status of editing item and category.
        $scope.cancelItem($scope.editingItemIndex);
        $scope.cancelCategory($scope.editingCategoryIndex);

        $log.debug("selectCategory(), selected ", $scope.categories[index]);
        if ($scope.selectedCategoryId == $scope.categories[index].id) {
            // select the same category again, tread as un-select.
            $scope.selectedCategoryId = undefined;
            $scope.selectedCategoryName = undefined;
            $scope.categories[index].selected = false;
        } else {
            // select new category, clear previous selection.
            angular.forEach($scope.categories, function (category) {
                if (category.selected) {
                    category.selected = false;
                    return;
                }
            });
            $scope.selectedCategoryId = $scope.categories[index].id;
            $scope.selectedCategoryName = $scope.categories[index].name;
            $scope.categories[index].selected = true;
        }

        // clear checkbox on header of item list.
        $scope.isSelectedAllItems = false;
        // clear possible existing selections of multi-items.
        selectedItemsId = [];

        $scope.items = getCachedItemsByCategory($scope.selectedCategoryId);
        filterItemsByStatus($scope.items);
        $scope.items.sort(sortEntityByAppCreateTimeDesc);
    };
    // Sort category initialize.
    $scope.sortButtonText = "修改排序";
    initCategorySortable();
    disableCategorySortable();
    /**
     * Handle user enable/disable sorting.
     */
    $scope.sortCategory = function () {
        $scope.cancelCategory($scope.editingCategoryIndex);

        if ($scope.categorySorting == undefined) {
            enableCategorySortable();
        } else if ($scope.categorySorting == false) {
            enableCategorySortable();
        } else if ($scope.categorySorting == true) {
            disableCategorySortable();
            // save new sort to DB.
            for (var i = 0; i < $scope.categories.length; i++) {
                var categoryId = $scope.categories[i].id;
                var newOrder = i;
                var dbCategory = dbCategories[categoryId];
                if (dbCategory.displayOrder != newOrder) {
                    $log.debug("category '" + dbCategory.name + "' order changed: " + dbCategory.displayOrder + " -> " + newOrder);
                    dbCategory.displayOrder = newOrder;
                    cleanCategoryProperties(dbCategory);
                    WlcHelpers.ServiceHelper().putShopCategory(categoryId, dbCategory);
                }
            }
        }
    };

    /*=====================================================
     * item functions
     *====================================================*/
    // Global variables:
    // Predefined status.
    $scope.STATUS_DDMENU = {
        'all': {'value': 'all', 'name': '全部状态'},
        'divider': {'value': 'divider'},
        'recommend': {'value': 'recommend', 'name': '推荐', 'class': 'label-danger'},
        'new': {'value': 'new', 'name': '新品', 'class': 'label-pink'},
        'sale': {'value': 'sale', 'name': '特价', 'class': 'label-warning'},
        'sold': {'value': 'sold', 'name': '售罄', 'class': 'label-grey'},
        'none': {'value': 'none', 'name': '无状态'}

    };
    $scope.STATUS_RADIO = [
        {'value': 'recommend', 'name': '推荐', 'class': 'label-danger'},
        {'value': 'new', 'name': '新品', 'class': 'label-pink'},
        {'value': 'sale', 'name': '特价', 'class': 'label-warning'},
        {'value': 'sold', 'name': '售罄', 'class': 'label-grey'},
        {'value': 'none', 'name': '无状态'}
    ];

    // Value will be updated when user select new filter of items.
    // Filter is working together with category, get items by category should check select filter, vice versa.
    $scope.selectedItemStatusFileterValue = $scope.STATUS_DDMENU['all'].value;
    $scope.selectedItemStatusFileterName = $scope.STATUS_DDMENU['all'].name;

    // Indicate user selected multiple items or not, in multiple mode, operations changes.
    $scope.multiOperationMode = false;
    // Indicate checkbox selection status on items table header.
    $scope.isSelectedAllItems = false;

    $scope.saveItem = function (index, formItem) {
        if (!$rootScope.validateForm(formItem))
            return;

        if (umEditor != undefined) {
            $scope.items[index].detail = umEditor.getContent();
            //$log.debug("saveItem(), get content of editor:", $scope.items[index].detail);
        }
        $log.debug("saveItem(), index: " + index + ", item:", $scope.items[index]);

        var savingItem = angular.copy($scope.items[index]);
        // remove service un-accepted properties..
        deleteServiceNotSupportProperties(savingItem);

        $scope.itemSavingErrMsg = undefined;
        if (savingItem.id) {
            WlcHelpers.ServiceHelper().putShopItem(savingItem.id, savingItem, function (resp) {
                dbItems[savingItem.id] = savingItem;
                $scope.editingItemIndex = undefined;
            }, errorCallback);
        } else {
            WlcHelpers.ServiceHelper().postShopItem(savingItem, function (resp) {
                $scope.items[index] = resp.data.entity;
                dbItems[resp.data.entity.id] = resp.data.entity;
                $scope.editingItemIndex = undefined;
            }, errorCallback);
        }
        function errorCallback(resp) {
            $scope.itemSavingErrMsg = "保存失败，请重试或联系客服。";
            if (angular.isString(resp))
                $scope.itemSavingErrMsg = resp;
            if (resp.errCode)
                $scope.itemSavingErrMsg = resp.errCode;
            if (resp.errMsg)
                $scope.itemSavingErrMsg = resp.errMsg;
        }
    };
    $scope.editItem = function (index) {
        if ($scope.editingItemIndex != undefined && $scope.editingItemIndex != index) {
            $scope.cancelItem($scope.editingItemIndex);
        }

        $scope.editingItemIndex = index;
        $scope.items[index].categoryName = dbCategories[$scope.items[index].categoryId].name;

        appendUmEditor($scope.items[index]);
    };
    $scope.createItem = function () {
        var newItem = {
            'wlsWxAccountId': wxAccountId,
            'categoryId': $scope.selectedCategoryId,
            'categoryName': $scope.selectedCategoryName,
            'status': 'none'
        };
        $scope.items.unshift(newItem);
        $scope.editingItemIndex = 0;
    };
    $scope.cancelItem = function (index) {
        if (index != undefined && $scope.items[index]) {
            var itemId = $scope.items[index].id;
            if (itemId) {
                $scope.items[index] = dbItems[itemId];
            } else {
                // delete editing item which is just created.
                $scope.items.shift();
            }
        }
        $scope.editingItemIndex = undefined;
    };
    $scope.updateItemInSell = function (index) {
        var item = $scope.items[index];
        $log.debug("updateItemInSell(), updating item '" + item.name + "' in sell status to: " + !item.isInSell);
        var dbItem = dbItems[item.id];
        dbItem.isInSell = !item.isInSell;
        deleteServiceNotSupportProperties(dbItem);
        WlcHelpers.ServiceHelper().putShopItem(item.id, dbItem);
    };
    $scope.deleteItem = function (index) {
        $log.debug("deleteItem(), deleting ", $scope.items[index]);
        var itemId = $scope.items[index].id;
        WlcHelpers.ServiceHelper().deleteShopItem(itemId, function (resp) {
            $scope.items.splice(index, 1);
            delete dbItems[itemId];
        });
    };
    $scope.deleteMultiItems = function () {
        showConfirmAlert("确定删除" + selectedItemsId.length + "条商品记录？", doDelete);
        function doDelete() {
            $log.debug("deleteMultiItems(), selectedItemsId=", selectedItemsId);
            for (var i = 0; i < selectedItemsId.length; i++) {
                for (var j = 0; j < $scope.items.length; j++) {
                    if ($scope.items[j].id == selectedItemsId[i]) {
                        var item = $scope.items[j];
                        $log.debug("deleting: ", item);
                        WlcHelpers.ServiceHelper().deleteShopItem(item.id, function (resp) {
                            delete dbItems[item.id];
                        });
                        $scope.items.splice(j, 1);
                        break;
                    }
                }
            }
            selectedItemsId = [];
            $scope.multiOperationMode = false;
            $scope.isSelectedAllItems = false;
        }
    };
    /**
     * Update item category with new selected category. Only updated model, hasn't persisted.
     * @param item
     * @param category
     */
    $scope.updateItemCategory = function (item, category) {
        $log.debug("updateItemCategory(), new category of item '" + item.name + "' is '" + category.name + ";");
        item.categoryId = category.id;
        item.categoryName = category.name;
        // ng-repeat will create child scope, so $scope doesn't work here.
        var scope = angular.element($('#itemCategories')).scope();
        scope.isItemCategoryDropdownOpen = false;
    };

    /**
     * Toggle set infinite value of inventory.
     * @param index
     */
    $scope.setInfInventory = function (item) {
        if (item.isInventoryInf) {
            item.inventory = WLC_CONST.INVENTORY_INF;
        } else {
            item.inventory = 1;
        }
    };
    /**
     * Filter item list by status.
     * @param index Selected index of status array.
     */
    $scope.changeStatusFilter = function (status) {
        $scope.selectedItemStatusFileterName = status.name;
        $scope.selectedItemStatusFileterValue = status.value;
        $scope.isStatusDropdownOpen = false; // close drop-down list.

        $scope.items = getCachedItemsByCategory($scope.selectedCategoryId);
        filterItemsByStatus($scope.items);
        $scope.items.sort(sortEntityByAppCreateTimeDesc);
    };
    /**
     * Toggle selection of all items when user click checkbox on table header.
     */
    $scope.selectAllItems = function () {
        selectedItemsId = [];
        $scope.isSelectedAllItems = !$scope.isSelectedAllItems;
        for (var i = 0; i < $scope.items.length; i++) {
            $scope.items[i].isSelected = $scope.isSelectedAllItems;
            if ($scope.isSelectedAllItems)
                selectedItemsId.push($scope.items[i].id);
        }
        $scope.multiOperationMode = $scope.isSelectedAllItems;
    };
    var selectedItemsId = [];
    $scope.selectItem = function (index) {
        var item = $scope.items[index];
        if (item.isSelected) {
            selectedItemsId.push(item.id);
        } else {
            var indexFound = selectedItemsId.indexOf(item.id);
            if (indexFound != -1) {
                selectedItemsId.splice(indexFound, 1);
            }
        }
        $scope.multiOperationMode = selectedItemsId.length > 0;
        $scope.isSelectedAllItems = selectedItemsId.length == $scope.items.length;
    };
    $scope.toggleItemEditor = function (item) {
        $log.debug("toggleItemEditor(), item:", item);
        // Create item will insert new dom nodes of editorPlaceholder, the dom nodes doesn't exist when calling appendUmEditor in createItem method.
        // So we delay appendUmEditor for create item to user click checkbox of show details.
        item.id == undefined && appendUmEditor(item);
        item.detailEnabled ? umEditor.show() : umEditor.hide();
    };

    var umEditor;
    window.UMEDITOR_HOME_URL = "common/components/umeditor/";
    function createUmEditor() {
        umEditor = UM.getEditor("itemEditor", {
            'toolbar': [
                'undo redo | bold italic underline strikethrough | justifyleft justifycenter justifyright justifyjustify |',
                'forecolor backcolor | link unlink | removeformat |',
                'insertorderedlist insertunorderedlist | selectall cleardoc paragraph | fontfamily fontsize |' ,
                'emotion image | horizontal preview fullscreen'
            ],//superscript subscript | video | map | 'drafts', 'formula'
            'imageUrl': "php/file-upload.php",
            'imageFieldName': "file",
            'isShow': false,
            'initialFrameWidth': 650,
            'initialFrameHeight': 200
        });
        umEditor.ready(function () {
            console.log("Created instance of UMEditor:", umEditor);
        });
    }

    function appendUmEditor(item) {
        var itemId = (item.id == undefined ? "" : item.id);
        var editorPlaceholder = $("#itemEditorPlaceholder_" + itemId);
        $log.debug("Editing item:", item);
        console.log("editorPlaceholder:", editorPlaceholder);
        editorPlaceholder.html() == "" && editorPlaceholder.append(umEditor.$container);
        item.detailEnabled ? umEditor.show() : umEditor.hide();
        item.detail ? umEditor.setContent(item.detail) : umEditor.setContent("");
    }

    function enableCategorySortable() {
        $scope.categorySorting = true;
        $scope.sortButtonText = "保存排序";
        $scope.selectedCategoryIndex = undefined;
        $('#categories').sortable("enable");
    }

    function disableCategorySortable() {
        $scope.categorySorting = false;
        $scope.sortButtonText = "修改排序";
        $('#categories').sortable("disable");
    }

    function initCategorySortable() {
        // jQuery sortable.
        $('#categories').sortable({
                opacity: 0.8,
                revert: 100,
                forceHelperSize: true,
                placeholder: 'draggable-placeholder',
                forcePlaceholderSize: true,
                cursor: 'move',
                axis: 'y',
                tolerance: 'pointer',
                update: function (event, ui) {
                    var sortedIDs = $("#categories").sortable("toArray");
                    var sortedCategories = [];
                    for (var i = 0; i < sortedIDs.length; i++) {
                        for (var j = 0; j < $scope.categories.length; j++) {
                            if ($scope.categories[j].appCreateTime == sortedIDs[i]) {
                                sortedCategories[i] = angular.copy($scope.categories[j]);
                                break;
                            }
                        }
                    }
                    $scope.categories = sortedCategories;
                }

            }
        );
        // disable the following line otherwise it will cause input doesn't work in firefox.
        //$('#categories').disableSelection();
    }

    function showConfirmAlert(message, cbConfirm) {
        $scope.confirmAlertMsg = message;
        $scope.modalInstance = $modal.open({
            templateUrl: 'confirmAlertTemplate',
            scope: $scope,
            size: 'sm'
        });
        $scope.modalInstance.result.then(function () {
            cbConfirm();
        });

        $scope.modalOk = function () {
//            console.log("scope ok");
            $scope.modalInstance.close();
        };
        $scope.modalCancel = function () {
//            console.log("scope cancel");
            $scope.modalInstance.dismiss('cancel');
        };
    }

    function sortEntityByAppCreateTimeDesc(entity1, entity2) {
        return (entity1.appCreateTime - entity2.appCreateTime) * -1;
    }

    function sortCategoryByDisplayOrder(category1, category2) {
        return category1.displayOrder - category2.displayOrder;
    }

    /**
     * Return a new copy of array from dbItems filter by categoryId.
     * @param categoryId
     * @returns {Array}
     */
    function getCachedItemsByCategory(categoryId) {
        var items = [];
        angular.forEach(dbItems, function (item) {
            if (categoryId == undefined || item.categoryId == categoryId) {
                items.push(angular.copy(item));
            }
        });
        return items;
    }

    /**
     * Filter items array by current selected filter ($scope.selectedItemStatusFileterValue). This function changes input array directly.
     * @param items
     */
    function filterItemsByStatus(items) {
        // current filter is not 'all'.
        if ($scope.selectedItemStatusFileterValue != undefined && $scope.selectedItemStatusFileterValue != $scope.STATUS_DDMENU['all'].value) {
            for (var i = 0; i < items.length; i++) {
                if (items[i].status != $scope.selectedItemStatusFileterValue) {
                    items.splice(i, 1);
                    i--;
                }
            }
        }
    }

    function checkInventory(item) {
        if (item.inventory == WLC_CONST.INVENTORY_INF) {
            item.isInventoryInf = true;
        }
    }

    function setDefaultStatus(item) {
        if (!item.status) {
            item.status = $scope.STATUS_DDMENU['none'].value;
        }
    }

    function deleteServiceNotSupportProperties(item) {
        delete item.$$hashKey;
        delete item.categoryName;
        delete item.isSelected;
        delete item.isInventoryInf;
    }
}]);

wlc.controller('wlcShopOrderCtrl', ['$scope', '$rootScope', '$routeParams', '$log', '$modal', "WlcHelpers", "WLC_CONST", function ($scope, $rootScope, $routeParams, $log, $modal, WlcHelpers, WLC_CONST) {
    var wxAccountId = $scope.wxAccountId = $routeParams.uuid;
    var ORDER_STATUS = {
        ALL: {'value': 'all', 'name': '全部状态'},
        WAITING_PAYMENT: {'value': 'WAITING_PAYMENT', 'name': '等待付款'},
        WAITING_SHIPMENT: {'value': 'WAITING_SHIPMENT', 'name': '等待发货'},
        SHIPPED: {'value': 'SHIPPED', 'name': '已发货'},
        RECEIVED: {'value': 'RECEIVED', 'name': '已收货'},
        COMPLETED_NORMAL: {'value': 'COMPLETED_NORMAL', 'name': '已完成'},
        COMPLETED_ABNORMAL: {'value': 'COMPLETED_ABNORMAL', 'name': '已取消'},
        COMPLETED_ABNORMAL_SHOP: {'value': 'COMPLETED_ABNORMAL_SHOP', 'name': '商家取消'},
        COMPLETED_ABNORMAL_CUSTOMER: {'value': 'COMPLETED_ABNORMAL_CUSTOMER', 'name': '用户取消'}
    };
    var ORDER_TIME = {
        ALL: {'value': 'all', 'name': '全部时间'},
        DAY: {'value': 'day', 'name': '今天'},
        WEEK: {'value': 'week', 'name': '本周'},
        MONTH: {'value': 'month', 'name': '本月'},
        RANGE: {'value': 'range', 'name': '选择时间段'}
    };
    var PAGESIZE = 20;
    var payments = {
        'cod': {
            name: '货到付款'
        },
        'alipay': {
            name: '支付宝'
        },
        'weixin': {
            name: '微信支付'
        }
    };
    $scope.ORDER_STATUS_DDMENU = [
        {'value': 'all', 'name': '全部状态'},
        {'value': 'divider'},
        {'value': 'WAITING_PAYMENT', 'name': '等待付款'},
        {'value': 'WAITING_SHIPMENT', 'name': '等待发货'},
        {'value': 'SHIPPED', 'name': '已发货'},
//        {'value': 'RECEIVED', 'name': '已收货'},
        {'value': 'divider'},
        {'value': 'COMPLETED_NORMAL', 'name': '已完成'},
        {'value': 'COMPLETED_ABNORMAL', 'name': '已取消'},
        {'value': 'COMPLETED_ABNORMAL_SHOP', 'name': '商家取消'},
        {'value': 'COMPLETED_ABNORMAL_CUSTOMER', 'name': '用户取消'}
    ];
    $scope.ORDER_TIME_DDMENU = [
        {'value': 'day', 'name': '今天'},
        {'value': 'divider'},
        {'value': 'week', 'name': '本周'},
        {'value': 'month', 'name': '本月'},
        {'value': 'all', 'name': '全部时间'}
        //{'value': 'range', 'name': '选择时间段'}
    ];


    init();

    $scope.ship = function (order) {
        WlcHelpers.ServiceHelper().putOrderStatus(order.id, ORDER_STATUS.SHIPPED.value, function (resp) {
                order.status = ORDER_STATUS.SHIPPED.value;
                order.displayStatus = ORDER_STATUS.SHIPPED.name;
                $rootScope.showSaveSuccess();
            }
        );
    };
    $scope.toggleSms = function () {
        var data = {"test_smsEnabled": $scope.test_smsEnabled};
        WlcHelpers.ServiceHelper().postShopSettings(wxAccountId, data);
    };
    $scope.changeStatusFilter = function (status) {
        if (!$scope.allOrders) {
            return;
        }
        $scope.selectedOrderStatusFileter = status;
        $scope.isStatusDropdownOpen = false;
        $scope.orders = [];
        for (var i = 0; i < $scope.allOrders.length; i++) {
            var order = $scope.allOrders[i];
            if (status.value == 'all' || order.status == status.value) {
                $scope.orders.push(order);
            }
        }
    };
    $scope.changeTimeFilter = function (timeRange) {
        $scope.selectedOrderTimeFileter = timeRange;
        $scope.isTimeDropdownOpen = false;

        if ($scope.selectedOrderTimeFileter.value == ORDER_TIME.ALL.value) {
            getOrderList(new Date().getTime(), PAGESIZE);
        } else if ($scope.selectedOrderTimeFileter.value == ORDER_TIME.DAY.value || $scope.selectedOrderTimeFileter.value == ORDER_TIME.WEEK.value || $scope.selectedOrderTimeFileter.value == ORDER_TIME.MONTH.value) {
            getOrderListByRange($scope.selectedOrderTimeFileter.value);
        }
    };
    $scope.refresh = function () {
        if (!$scope.selectedOrderTimeFileter) {
            $scope.selectedOrderTimeFileter = ORDER_TIME.ALL;
        }
        if ($scope.selectedOrderTimeFileter.value == ORDER_TIME.DAY.value || $scope.selectedOrderTimeFileter.value == ORDER_TIME.WEEK.value || $scope.selectedOrderTimeFileter.value == ORDER_TIME.MONTH.value) {
            getOrderListByRange($scope.selectedOrderTimeFileter.value);
        } else if ($scope.selectedOrderTimeFileter.value == ORDER_TIME.RANGE.value && $scope.timeStart && $scope.timeEnd) {
            getOrderListByCustomRange($scope.timeStart, $scope.timeEnd);
        } else {
            getOrderList(new Date().getTime(), PAGESIZE);
        }
    };
    $scope.filterByTimeRange = function () {
        getOrderListByCustomRange($scope.timeStart, $scope.timeEnd);
    };
    $scope.fetchMore = function () {
        var tempOrders = angular.copy($scope.orders);
        tempOrders.sort(WlcHelpers.ArraySorter.sortEntityByAppCreateTimeDesc);
        var beforeTs = tempOrders[tempOrders.length - 1].appCreateTime;
        getOrderList(beforeTs, PAGESIZE, /*isAppend*/true);
    };
    $scope.openStart = function ($event) {
        $event.preventDefault();
        $event.stopPropagation();
        $scope.startOpened = true;
    };
    $scope.openEnd = function ($event) {
        $event.preventDefault();
        $event.stopPropagation();
        $scope.endOpened = true;
    };

    $scope.open = function ($event) {
        $event.preventDefault();
        $event.stopPropagation();

        $scope.opened = true;
    };

    function init() {
        $scope.selectedOrderStatusFileter = ORDER_STATUS.ALL;
        $scope.selectedOrderTimeFileter = ORDER_TIME.DAY;
        var prefix = "payment_";
        WlcHelpers.ServiceHelper().getShopSettingsByPrefix(wxAccountId, prefix, function (resp) {
            angular.forEach(payments, function (payment, type) {
                var propKey = prefix + type;
                angular.forEach(resp.data, function (value, key) {
                    if (key == propKey) {
                        payment.value = value;
                    }
                })
            });
            getOrderListByRange(ORDER_TIME.DAY.value);
        });
        WlcHelpers.ServiceHelper().getShopSetting(wxAccountId, "test_smsEnabled", function (resp) {
            $scope.test_smsEnabled = resp.data.entity && (resp.data.entity.propValue == 'true');
        });
    }

    function getOrderList(before, count, isAppend) {
        $log.debug("getOrderList, before, count:", before, count);
        WlcHelpers.UIHelper().showGritterLoading();
        WlcHelpers.ServiceHelper().getShopOrderList(wxAccountId, before, count, function (resp) {
            handleOrders(resp, isAppend);
            WlcHelpers.UIHelper().removeGritter();
        }, function () {
            WlcHelpers.UIHelper().removeGritter();
        });
    }

    function getOrderListByRange(range) {
        $log.debug('getOrderListByRange, range=', range);
        WlcHelpers.UIHelper().showGritterLoading();
        WlcHelpers.ServiceHelper().getShopOrderListByRange(wxAccountId, range, function (resp) {
            handleOrders(resp);
            WlcHelpers.UIHelper().removeGritter();
        }, function () {
            WlcHelpers.UIHelper().removeGritter();
        });
    }

    function getOrderListByCustomRange(start, end) {
        $log.debug('getOrderListByCustomRange, start to end:', start, end);
        WlcHelpers.UIHelper().showGritterLoading();
        WlcHelpers.ServiceHelper().getShopOrderListByCustomRange(wxAccountId, start, end, function (resp) {
            handleOrders(resp);
            WlcHelpers.UIHelper().removeGritter();
        }, function () {
            WlcHelpers.UIHelper().removeGritter();
        });
    }

    function handleOrders(resp, isAppend) {
        if ($scope.orders && isAppend) {
            $scope.orders = $scope.orders.concat(resp.data.entity);
        } else {
            $scope.orders = resp.data.entity;
        }
        $scope.ordersTotalCount = resp.data.totalCount;
        for (var i = 0; i < $scope.orders.length; i++) {
            var order = $scope.orders[i];
            order.displayStatus = ORDER_STATUS[order.status] ? ORDER_STATUS[order.status].name : "订单状态错误";
            order.displayPayment = payments[order.payment] ? payments[order.payment].name : "支付方式错误";
        }
        $scope.orders.sort(WlcHelpers.ArraySorter.sortEntityByAppCreateTimeDesc);
        // make a copy for filter use.
        $scope.allOrders = angular.copy($scope.orders);
        orderStatistics();

        // filter by current select status filter.
        if ($scope.selectedOrderStatusFileter && $scope.selectedOrderStatusFileter.value != 'all') {
            $scope.changeStatusFilter($scope.selectedOrderStatusFileter);
        }
    }

    function orderStatistics() {
        var waitOrderCount = 0;
        var finishedOrderCount = 0
        angular.forEach($scope.orders, function (order) {
            if (order.status == ORDER_STATUS.WAITING_SHIPMENT.value) {
                waitOrderCount++;
            } else if (order.status == ORDER_STATUS.COMPLETED_NORMAL.value) {
                finishedOrderCount++;
            }
        });
        $scope.statistics = {
            orderCount: $scope.orders.length,
            waitOrderCount: waitOrderCount,
            finishedOrderCount: finishedOrderCount
        }
    }

    function statistics() {
        var millsInDay = 86400000;
        var now = new Date();
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var todayBegin = today.getTime();
        var todayEnd = today.getTime() + millsInDay;

        var todayNewOrderCount = 0;
        var todayWaitOrderCount = 0;
        var todayFinishedOrderCount = 0;

        angular.forEach($scope.orders, function (order) {
            if (todayBegin <= order.appCreateTime && order.appCreateTime <= todayEnd) {
                todayNewOrderCount++;
                if (order.status == ORDER_STATUS.WAITING_SHIPMENT.value) {
                    todayWaitOrderCount++;
                } else if (order.status == ORDER_STATUS.COMPLETED_NORMAL.value) {
                    todayFinishedOrderCount++;
                }
            }
        });
        $scope.statistics = {
            todayNewOrderCount: todayNewOrderCount,
            todayWaitOrderCount: todayWaitOrderCount,
            todayFinishedOrderCount: todayFinishedOrderCount
        }
    }

}])
;

wlc.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
    $routeProvider
        .when('/:uuid/shop/entry', {
            templateUrl: 'shop/templates/shop-entry-template.html',
            controller: 'wlcShopEntryCtrl'
        })
        .when('/:uuid/shop/setting', {
            templateUrl: 'shop/templates/shop-setting-template.html',
            controller: 'wlcShopSettingCtrl'
        })
        .when('/:uuid/shop/category', {
            templateUrl: 'shop/templates/shop-goods-template.html',
            controller: 'wlcShopCategoryCtrl'
        })
        .when('/:uuid/shop/order', {
            templateUrl: 'shop/templates/shop-order-template.html',
            controller: 'wlcShopOrderCtrl'
        })
        .when('/:uuid/home', {
            templateUrl: 'base/templates/account-home-template.html',
            controller: 'wlcAccountController'
        })
        .when('/:uuid/album', {
            templateUrl: 'album/templates/album-home-template.html',
            controller: 'wlcAlbumController'
        })
        .when('/:uuid/album/entry', {
            templateUrl: 'album/templates/album-entry-template.html',
            controller: 'wlcAlbumEntryCtrl'
        })
        .otherwise({
            redirectTo: '/home',
            templateUrl: 'base/templates/user-home-template.html',
            controller: 'wlcUserController'
        });
}]);


Array.prototype.contains = function (object) {
    var contains = false;
    for (var i = 0; i < this.length; i++) {
        if (angular.equals(this[i], object)) {
            contains = true;
            break;
        }
    }
    return contains;
};
Array.prototype.indexOf = function (object) {
    var index = -1;
    for (var i = 0; i < this.length; i++) {
        if (angular.equals(this[i], object)) {
            index = i;
            break;
        }
    }
    return index;
};