/**
 * Created by Ting on 2014/11/10.
 */

wlc.controller('wlcAlbumController', ['$scope', '$rootScope', '$routeParams', '$modal', '$log', 'WlcHelpers', function wlcAlbumController($scope, $rootScope, $routeParams, $modal, $log, WlcHelpers) {
    $log.debug("wlcAlbumController init.");
    init();

    function init() {
        $scope.wxAccountId = $routeParams.uuid;
        $scope.newAlbum = {};
        $scope.editingTopAlbumIndex;
        $scope.selectedAlbumId;
        watchUploadedUrlChanges();
        getAlbumList();
        getNonAlbumPhotos();
    }

    $scope.createTopAlbum = function () {
        $scope.cancelTopAlbum();
        $scope.albumList.unshift({"childAlbumCount": 0, "photoCount": 0, "WlsAlbum": {}});
        $scope.editingAlbumBackup = undefined;
        $scope.editingTopAlbumIndex = 0;
    };
    $scope.editTopAlbum = function (index) {
        $scope.cancelTopAlbum();
        $scope.editingAlbumBackup = angular.copy($scope.albumList[index]);
        $scope.editingTopAlbumIndex = index;
    };
    $scope.cancelTopAlbum = function () {
        if ($scope.editingTopAlbumIndex != undefined) {
            if ($scope.editingTopAlbumIndex == 0 && !$scope.editingAlbumBackup) {
                // cancel new created album
                $scope.albumList.shift();
            } else {
                $scope.albumList[$scope.editingTopAlbumIndex] = angular.copy($scope.editingAlbumBackup);
            }
            $scope.editingTopAlbumIndex = undefined;
        }
    };
    $scope.saveTopAlbum = function () {
        $log.debug("saveTopAlbum()");
        var editingAlbum = $scope.albumList[$scope.editingTopAlbumIndex];
        if (!editingAlbum.WlsAlbum.id) {
            editingAlbum.WlsAlbum["wlsWxAccountId"] = $scope.wxAccountId;
        }
        $log.debug(">> saving album:", editingAlbum.WlsAlbum);
        if (editingAlbum.WlsAlbum.id) {
            WlcHelpers.ServiceHelper().updateAlbum($scope.wxAccountId, editingAlbum.WlsAlbum.id, editingAlbum.WlsAlbum, function (resp) {
                $log.debug("updateAlbum success.");
                $scope.editingTopAlbumIndex = undefined;
            });
        } else {
            WlcHelpers.ServiceHelper().createAlbum($scope.wxAccountId, editingAlbum.WlsAlbum, function (resp) {
                $log.debug("createAlbum success: ", resp);
                $scope.albumList[$scope.editingTopAlbumIndex].WlsAlbum = resp.data.entity;
                $scope.editingTopAlbumIndex = undefined;
            });
        }
    };
    $scope.setAlbumToTop = function (index) {
        $scope.cancelTopAlbum();
        var albumItem = angular.copy($scope.albumList[index]);
        if (albumItem.WlsAlbum.isPin) {
            albumItem.WlsAlbum.isPin = false;
        } else {
            albumItem.WlsAlbum.isPin = true;
        }
        WlcHelpers.ServiceHelper().updateAlbum($scope.wxAccountId, albumItem.WlsAlbum.id, albumItem.WlsAlbum, function (resp) {
            $scope.albumList.splice(index, 1);
            $scope.albumList.unshift(albumItem);
        })
    };
    $scope.deleteTopAlbum = function (index) {
        if ($scope.albumList.childAlbumCount > 0) {
            WlcHelpers.UIHelper().showGritterError("此相册包含子相册，不能删除。");
        } else {
            WlcHelpers.ServiceHelper().deleteAlbum($scope.wxAccountId, $scope.albumList[index].WlsAlbum.id, function (resp) {
                $log.debug("deleteAlbum success.");
                $scope.albumList.splice(index, 1);
            })
        }
    };

    $scope.toggleChildAlbum = function (index) {
        if ($scope.albumList[index].isExpand) {
            $scope.albumList[index].isExpand = false;
        } else {
            $scope.albumList[index].isExpand = true;
        }
    };

    // Copy photo data from $scope.dbPhotoList to $scope.albumPhotos.
    $scope.showPhotos = function (albumId) {
        $log.debug("showPhotos of album:", albumId);
        $scope.selectedAlbumId = albumId;
        if (!$scope.dbPhotoList[albumId]) {
            WlcHelpers.ServiceHelper().getAlbumPhotoList($scope.wxAccountId, albumId, function (resp) {
                $scope.dbPhotoList[albumId] = resp.data.entity;
                $scope.showPhotos(albumId);
            })
        } else {
            $scope.albumPhotos = angular.copy($scope.dbPhotoList[albumId]);
            for (var i = 0; i < $scope.albumPhotos.length; i++) {
                generatePhotoUrl($scope.albumPhotos[i]);
            }
            $log.debug(">> photos in album:", $scope.albumPhotos);
        }
    };

    $scope.setCover = function (index) {
        var coverUrl = $scope.albumPhotos[index].url;
        var idx = findObjectIndexInArray($scope.albumList, $scope.selectedAlbumId, "['WlsAlbum']['id']");
        var album = $scope.albumList[idx].WlsAlbum;
        album.coverUrl = coverUrl;
        WlcHelpers.ServiceHelper().updateAlbum($scope.wxAccountId, album.id, album, function (resp) {
            $log.debug("set album cover success", coverUrl);
        });
    };

    $scope.editPhoto = function (index) {
        var modalInstance = $modal.open({
            templateUrl: 'editPhotoModal.html',
            controller: 'editPhotoModalInstanceCtrl',
            size: 'sm',
            resolve: {
                photo: function () {
                    return angular.copy($scope.albumPhotos[index]);
                },
                selectedAlbumId: function () {
                    return $scope.selectedAlbumId;
                },
                albums: function () {
                    var albums = angular.copy($scope.albumList);
                    albums.unshift({WlsAlbum: {id: "nonalbum", albumName: "不纳入相册"}})
                    return albums;
                }
            }
        });

        modalInstance.result.then(function (result) {
            $log.debug("photo modal result:", result, $scope.albumPhotos[index]);
            var originalAlbumId = $scope.selectedAlbumId;
            var currentAlbumId = result.selectedAlbumId;
            var originalPhoto = $scope.albumPhotos[index];
            var currentPhoto = result.photo;
            var isAlbumChanged = currentAlbumId != originalAlbumId;
            var isPhotoChanged = currentPhoto.description != originalPhoto.description;
            var updateDBPhotos = function () {
                var idx = findObjectIndexInArray($scope.dbPhotoList[originalAlbumId], currentPhoto, "['id']");
                if (isAlbumChanged) {
                    // remove photo from original album.
                    $scope.dbPhotoList[originalAlbumId].splice(idx, 1);
                    // append photo to current album..
                    if ($scope.dbPhotoList[currentAlbumId]) {
                        $scope.dbPhotoList[currentAlbumId].push(currentPhoto);
                    }
                } else {
                    // update current photo to original album.
                    $scope.dbPhotoList[originalAlbumId][idx] = currentPhoto;
                }
            };
            var updatePhotoCountInAlbumList = function () {
                // albumList structure: [{WlsAlbum:{}, photoCount:xx}];
                if (isAlbumChanged) {
                    if (originalAlbumId == 'nonalbum') {
                        $scope.nonAlbumPhotoCount--;
                    } else {
                        var idx = findObjectIndexInArray($scope.albumList, originalAlbumId, "['WlsAlbum']['id']");
                        $scope.albumList[idx].photoCount--;
                    }
                    if (currentAlbumId == 'nonalbum') {
                        $scope.nonAlbumPhotoCount++;
                    } else {
                        var idx = findObjectIndexInArray($scope.albumList, currentAlbumId, "['WlsAlbum']['id']");
                        $scope.albumList[idx].photoCount++;
                    }
                }
            };
            var removeFromCurrentPhotoList = function () {
                if (isAlbumChanged) {
                    // remove photo from current display list
                    $scope.albumPhotos.splice(index, 1);
                }
            };
            $log.debug(">> isPhotoChanged, isAlbumChanged:", isPhotoChanged, isAlbumChanged);
            if (isAlbumChanged || isPhotoChanged) {
                var data = angular.copy(currentPhoto);
                delete data.url;
                // change happen
                WlcHelpers.ServiceHelper().updateAlbumPhoto($scope.wxAccountId, currentAlbumId, currentPhoto.id, data, function () {
                    // 修改了照片后，可能有三处数据需要修改：
                    // 1. 缓存的照片数据：$scope.dbPhotoList: {albumId:[{photo}]};
                    // 2. 相册列表中的照片数：$scope.albumList: [{WlsAlbum:{}, photoCount:xx}];
                    // 3. 当前分类显示的照片列表： $scope.albumPhotos: [{photo}];
                    updateDBPhotos();
                    updatePhotoCountInAlbumList();
                    removeFromCurrentPhotoList();
                })
            }
        }, function () {
            //$log.info('Modal dismissed at: ' + new Date());
        });
    };
    // Usually find object index in objects array by id.
    function findObjectIndexInArray(array, object, byKey) {
        var ret = -1;
        var searchValue = object;
        if (angular.isObject(object)) {
            searchValue = eval("object" + byKey);
        }
        for (var i = 0; i < array.length; i++) {
            if (searchValue == eval("array[i]" + byKey)) {
                ret = i;
                break;
            }
        }
        return ret;
    }

    $scope.deletePhoto = function (index) {
        var photoId = $scope.albumPhotos[index].id;
        var deleteDBPhoto = function () {
            WlcHelpers.ServiceHelper().deleteAlbumPhoto($scope.wxAccountId, $scope.selectedAlbumId, photoId, function (resp) {
                $scope.albumPhotos.splice(index, 1);
                if ($scope.selectedAlbumId == "nonalbum") {
                    $scope.nonAlbumPhotoCount--;
                } else {
                    updateAlbumPhotoCount($scope.selectedAlbumId, -1);
                }
            });
        };

        WlcHelpers.ServiceHelper().deleteAlbumPhotoFromBCS($scope.albumPhotos[index].url, function (resp) {
            // bcs returns ok.
            $log.debug(resp);
            deleteDBPhoto();
        }, function (resp) {
            // bcs returns error.
            $log.debug(resp);
            var message = angular.fromJson(resp.message);
            if (message.Error.code == 2) { // object not exists
                deleteDBPhoto();
            } else {
                WlcHelpers.UIHelper().showGritterError(message.Error.Message);
            }
        });
    };

    // Prevent close dropdown when click inner elements, such as input box.
//    $scope.preventDropDownClose = function (event) {
//        event.stopPropagation();
//    };


    function getAlbumList() {
        WlcHelpers.ServiceHelper().getTopAlbumList($scope.wxAccountId, function (resp) {
            $log.debug("getAlbumList(), ", resp.data.entity);
            $scope.albumList = resp.data.entity;
        })
    }

    function getNonAlbumPhotos() {
        WlcHelpers.ServiceHelper().getNonAlbumPhotoList($scope.wxAccountId, function (resp) {
            $scope.dbPhotoList = {"nonalbum": resp.data.entity};
            $scope.nonAlbumPhotoCount = resp.data.count;
            $scope.showPhotos('nonalbum');
        })
    }

    function watchUploadedUrlChanges() {
        $scope.$watch('uploadedPhotoUrl', function (newValue, oldValue) {
            if (newValue) {
                $log.debug("uploadPhotoUrl new value:", newValue);
                var fileName = newValue.substr(newValue.lastIndexOf("/") + 1);
                var newPhoto = {
                    "filename": fileName
                };
                $scope.selectedAlbumId || ($scope.selectedAlbumId = "nonalbum");
                WlcHelpers.ServiceHelper().createAlbumPhoto($scope.wxAccountId, $scope.selectedAlbumId, newPhoto, function (resp) {
                    var retPhoto = resp.data.entity;
                    generatePhotoUrl(retPhoto);
                    $scope.albumPhotos.unshift(retPhoto);
                    $scope.dbPhotoList[$scope.selectedAlbumId].unshift(retPhoto);
                    // update album photo count
                    if ($scope.selectedAlbumId == "nonalbum") {
                        $scope.nonAlbumPhotoCount++;
                    } else {
                        updateAlbumPhotoCount($scope.selectedAlbumId, 1);
                    }
                });
            }
        })
    }

    function updateAlbumPhotoCount(albumId, countChange) {
        for (var i = 0; i < $scope.albumList.length; i++) {
            if ($scope.albumList[i].WlsAlbum.id == albumId) {
                $scope.albumList[i].photoCount += countChange;
                break;
            }
        }
    }

    function generatePhotoUrl(photo) {
        var userId = $rootScope.sessionInfo.userId;
        var fileUrl = "http://bcs.duapp.com/demo-console-user-files/" + userId + "/" + $scope.wxAccountId + "/image/" + photo.filename;
        photo.url = fileUrl;
    }
}]);

wlc.controller('wlcAlbumEntryCtrl', ['$scope', '$rootScope', '$routeParams', '$http', '$location', '$log', 'WLC_CONF', 'WlcHelpers', function ($scope, $rootScope, $routeParams, $http, $location, $log, WLC_CONF, WlcHelpers) {
    var wxAccountId = $routeParams.uuid;
    var gAllExistKeywords = []; // cache all keywords, include set up in keyword reply page, use to check reduplication.
    init();

    function init() {
        WlcHelpers.UIHelper().showGritterLoading();
        generateAlbumEntryUrl();
        $scope.entrySnapshot = {};
        WlcHelpers.ServiceHelper().getAlbumEntry(wxAccountId, function (resp) {
            if (resp.data.count > 0) {
                $scope.entry = resp.data.entity;
            } else {
                $scope.entry = {'enable': false, 'keyword': 'album', 'wlsWxAccountId': wxAccountId};
            }
            $scope.entrySnapshot = angular.copy($scope.entry);
            WlcHelpers.UIHelper().removeGritter();
        }, function (resp) {
            WlcHelpers.UIHelper().removeGritter();
        });

        WlcHelpers.ServiceHelper().getKeywordReplyList(function (resp) {
            for (var i = 0; i < resp.data.count; i++) {
                var kwEntity = resp.data.entity[i];
                if (kwEntity.keywordGroup == "module_album") {
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
            "keywordGroup": "module_album",
            "refId": $scope.wxAccountId,
            "refType": "module_album",
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
            WlcHelpers.ServiceHelper().putAlbumEntry(wxAccountId, $scope.entry, copySnapshot);
        } else {
            WlcHelpers.ServiceHelper().postAlbumEntry($scope.entry, function (resp) {
                $scope.entry = resp.data.entity;
                copySnapshot();
                refreshTargetFileName();
            });
        }
    };

    // Add timestamp to file name, to avoid cache issue.
    function refreshTargetFileName() {
        $scope.targetFileName = "wxmsg-album." + new Date().getTime();
    }

    function copySnapshot() {
        $scope.entrySnapshot = angular.copy($scope.entry);
        $rootScope.showSaveSuccess();
    }

    $scope.isUnchanged = function () {
        return $scope.form.$pristine || angular.equals($scope.entry, $scope.entrySnapshot);
    };

    function generateAlbumEntryUrl() {
        //http://localhost/console2/album/client.html#/074xEWkE/fEh3uCQk/albums?list=U9yUw95k,u29l5ICn
        var entryUrl = $location.protocol() + "://" + $location.host();
        if ($location.port() != '80') {
            entryUrl += ":" + $location.port();
        }
        var userId = $rootScope.sessionInfo.userId;
        entryUrl += WLC_CONF.v2ContextPath + "/album/client.html#/" + userId + "/" + wxAccountId + "/albums";
        $scope.entryUrl = entryUrl;
    }
}]);

// Please note that $modalInstance represents a modal window (instance) dependency.
// It is not the same as the $modal service used above.
wlc.controller('editPhotoModalInstanceCtrl', function ($scope, $modalInstance, photo, selectedAlbumId, albums) {
    console.log(photo, selectedAlbumId, albums);
    $scope.albums = albums;
    $scope.photo = photo;
    $scope.selectedAlbumId = selectedAlbumId;

    $scope.selectAlbum = function (id) {
        $scope.selectedAlbumId = id;
    };

    $scope.ok = function () {
        $modalInstance.close({photo: $scope.photo, selectedAlbumId: $scope.selectedAlbumId});
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
});
