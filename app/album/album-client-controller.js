/**
 * Created by Ting on 2014/11/17.
 */
var wlAlbumClient = angular.module('wlAlbumClient', ['ngRoute', 'ngTouch', 'ui.bootstrap', "wlcHelpersMod"]);

wlAlbumClient.constant('WLC_CONF', {
    'v1ContextPath': '/console',
    'v2ContextPath': '/console2',
    'shopContextPath': '/shop'
});

wlAlbumClient.controller('wlAlbumClientListAlbumsCtrl', ['$scope', '$rootScope', '$routeParams', '$http', '$location', '$log', 'WlcHelpers', function ($scope, $rootScope, $routeParams, $http, $location, $log, WlcHelpers) {
    var wxAccountId = $scope.wxAccountId = $routeParams.wxAccountId;
    var urlSearch = $location.search();
    var userId = $routeParams.userId;
    getTopAlbumList();

    $scope.showAlbumPhotos = function (idx) {
        var album = $scope.albumList[idx];
        $rootScope.album = album;
        $location.path("/" + userId + "/" + wxAccountId + "/album/" + album.WlsAlbum.id);
    };

    function getTopAlbumList() {
        WlcHelpers.ServiceHelper().getPublicTopAlbumList(wxAccountId, function (resp) {
            $scope.albumList = resp.data.entity;
            if (urlSearch.list) {
                var albumList = [];
                var showIds = urlSearch.list.split(",");
                for (var i = 0; i < showIds.length; i++) {
                    for (var j = 0; j < resp.data.count; j++) {
                        if (resp.data.entity[j].WlsAlbum.id == showIds[i]) {
                            albumList.push(resp.data.entity[j]);
                            break;
                        }
                    }
                }
                $scope.albumList = albumList;
            }
            $log.debug("show album list:", $scope.albumList);
        });
    }
}]);

wlAlbumClient.controller('wlAlbumClientShowAlbumCtrl', ['$scope', '$rootScope', '$routeParams', '$http', '$location', '$log', 'WlcHelpers', function ($scope, $rootScope, $routeParams, $http, $location, $log, WlcHelpers) {
    var wxAccountId = $scope.wxAccountId = $routeParams.wxAccountId;
    var albumId = $routeParams.albumId;
    var userId = $routeParams.userId;
    $scope.album = $rootScope.album;
    var photoMaxIndex;
    getAlbumPhotos();
    $log.debug("show album:", $scope.album);

    function getAlbumPhotos() {
        WlcHelpers.ServiceHelper().getPublicAlbumPhotoList(wxAccountId, $scope.album.WlsAlbum.id, function (resp) {
            $scope.album.photos = resp.data.entity;
            if (resp.data.count > 0) {
                for (var i = 0; i < $scope.album.photos.length; i++) {
                    generatePhotoUrl($scope.album.photos[i]);
                }
            }
            photoMaxIndex = $scope.album && $scope.album.photos ? $scope.album.photos.length - 1 : -1;
        });
    }

    function generatePhotoUrl(photo) {
        var fileUrl = "http://bcs.duapp.com/demo-console-user-files/" + userId + "/" + wxAccountId + "/image/" + photo.filename;
        photo.url = fileUrl;
    }

    $scope.showPhotoSlide = function (idx) {
        (idx < 0) && (idx = photoMaxIndex);
        (idx > photoMaxIndex) && (idx = 0);
        $scope.photo = $scope.album.photos[idx];
        $scope.slideMode = true;
        $scope.photoIdx = idx;
        $log.debug("show photo idx:", idx);
    };

    $scope.swipeLeft = function () {
        $scope.showPhotoSlide($scope.photoIdx - 1);
    };

    $scope.swipeRight = function () {
        $scope.showPhotoSlide($scope.photoIdx + 1);
    };

    $scope.closeSlide = function () {
        $scope.slideMode = false;
    };
}]);

wlAlbumClient.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
    $routeProvider
        .when('/:userId/:wxAccountId/albums', {
            templateUrl: 'templates/album-client-albumList.html',
            controller: 'wlAlbumClientListAlbumsCtrl'
        })
        .when('/:userId/:wxAccountId/album/:albumId', {
            templateUrl: 'templates/album-client-album.html',
            controller: 'wlAlbumClientShowAlbumCtrl'
        })
        .otherwise({
            redirectTo: '/home',
            templateUrl: 'templates/album-client-albumList.html',
            controller: 'wlAlbumClientListAlbumsCtrl'
        });
}]);