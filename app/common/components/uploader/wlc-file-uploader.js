/**
 * Created by Ting on 2014/7/8.
 *
 * This a directive of component to upload file. Usage:
 * <div wlc-file-uploader />
 *
 * The directive accepts following options:
 * type: [image|video], define supported upload file types, default is image.
 * previewMode: [simple|detail], define preview mode of the upload queue, default is simple.
 * autoUpload: [true|false], default is true.
 * queueLimit: [int], default is 1. The number limit of multi-uploads.
 * desc: [string], Any description to end user, {supportTypes} will be replaced to redefined message of support types.
 * maxSize: [int], default is 2097152 (2MB).
 * targetName: Specify target name (without file ext name) instead of original file name. Note, this options only available when queueLimit is 1.
 * appendTs: [once|each], default is not append timestamp. 'once' means the TS will not change after directive initialed. 'each' mean the TS will be refreshed for every upload. Append timestamp to file name, before file ext name. The format is filename.ts.ext.
 * modelValue: [all|last], default is all. This directive will set uploaded url(s) to ngModel value. This option controls set all urls or last url.
 *
 * This directive also provides preview ability of uploaded files, currently, only support preview images by URLs.
 * Nested "ng-model" directive provides the URLs from parent scope. The value should be string or array of strings indicate image URLs.
 */
var wlcFileUploader = angular.module('wlcFileUploader', ['angularFileUpload']);

wlcFileUploader.controller('wlcFileUploaderCtrl', ['$scope', '$fileUploader', '$log', function ($scope, $fileUploader, $log) {
    // Creates a uploader
    var uploader = $scope.uploader = $fileUploader.create({
        scope: $scope,
        url: 'php/file-upload.php'
    });

    // REGISTER HANDLERS
//    uploader.bind('afteraddingfile', function (event, item) {
//        console.info('After adding a file', item);
//    });
//
//    uploader.bind('whenaddingfilefailed', function (event, item, errMsg) {
//        console.info('When adding a file failed', event, item, errMsg);
//    });
//
//    uploader.bind('afteraddingall', function (event, items) {
//        //console.info('After adding all files', items);
//    });
//
//    uploader.bind('beforeupload', function (event, item) {
//        //console.info('Before upload', item);
//    });
//
//    uploader.bind('progress', function (event, item, progress) {
//        console.info('Progress: ' + progress, item);
//    });
//
//    uploader.bind('success', function (event, xhr, item, response) {
//        console.info('Success', xhr, item, response);
//    });
//
//    uploader.bind('cancel', function (event, xhr, item) {
//        console.info('Cancel', xhr, item);
//    });

    uploader.bind('error', function (event, xhr, item, response) {
        // There are two error cases:
        // 1. XMLHttpRequest error, which response.status is not 200, check response.responseText.
        // 2. demo php upload error, which response.status is 'ERR', check response.message.
        item.errMsg = xhr.status == 200 ? response.message : response.responseText;
        console.info('Error', xhr, item, response);
    });

//    uploader.bind('complete', function (event, xhr, item, response) {
//        console.info('Complete', xhr, item, response);
//    });
//
//    uploader.bind('progressall', function (event, progress) {
//        console.info('Total progress: ' + progress);
//    });
//
//    uploader.bind('completeall', function (event, items) {
//        console.info('Complete all', items);
//    });
}]);

wlcFileUploader.directive('wlcFileUploader', ['$log', function ($log) {
    var CONST_FILE_EXISTS = "FILE_EXISTS";

    function setFileTypeFilter(scope, options) {
        var supportFileTypes;
        if (options.type == "video") {
            supportFileTypes = ["mp4"];
        } else {
            // Default is images only
            supportFileTypes = ["jpg", "png", "jpeg", "bmp", "gif"];
        }
        scope.supportFileTypes = supportFileTypes;
        var ret = {};
        scope.uploader.filters.push(function (item /*{File|HTMLInputElement}*/) {
            var type = scope.uploader.isHTML5 ? item.type : '/' +
                item.value.slice(item.value.lastIndexOf('.') + 1);
            type = '|' + type.toLowerCase().slice(type.lastIndexOf('/') + 1) + '|';
            var fileTypes = "|" + supportFileTypes.join("|") + "|";
            ret.isValid = fileTypes.indexOf(type) !== -1;
            if (!ret.isValid) {
                ret.errMsg = "支持的文件类型为：" + supportFileTypes.join(", ");
                $log.error("fileTypeFilter: not support file type:", item);
            }
            return ret;
        });
    }

    function setFileSizeFilter(scope, options) {
        var maxSize = options.maxSize ? options.maxSize : 2097152; // 2M
        var ret = {};
        scope.uploader.filters.push(function (item /*{File|HTMLInputElement}*/) {
            ret.isValid = item.size < maxSize;
            if (!ret.isValid) {
                ret.errMsg = "文件大小不能超过2M";
                $log.error("fileSizeFilter: file size is too big", item);
            }
            return ret;
        });
    }

    function setFileDuplicateFilter(scope, options) {
        scope.uploader.filters.push(function (item /*{File|HTMLInputElement}*/) {
            var ret = {isValid: true};
            for (var i = 0; i < scope.uploadedFileUrls.length; i++) {
                var url = scope.uploadedFileUrls[i];
                var fileName = url.substring(url.lastIndexOf("/") + 1, url.length);
                if (fileName == item.name) {
                    $log.debug("Skip upload duplicate file:", item);
                    ret.isValid = false;
                    ret.errMsg = CONST_FILE_EXISTS;
                }
            }
            return ret;
        });
    }

    return {
        restrict: 'A',
        controller: 'wlcFileUploaderCtrl',
        require: 'ngModel',
        templateUrl: 'common/components/uploader/wlc-file-uploader-template.html',
        link: function (scope, element, attributes, ngModelCtrl) {
            //console.log(scope, element, attributes, ngModelCtrl);

            // refer to https://code.angularjs.org/1.2.16/docs/guide/forms
            ngModelCtrl.$parsers.unshift(function (viewValue) {
                if (viewValue != undefined) {
                    ngModelCtrl.$setValidity(attributes.name, true);
                    return viewValue;
                } else {
                    ngModelCtrl.$setValidity(attributes.name, false);
                    return undefined;
                }
            });
            // Get directive options and update to uploader.
            var options = scope.$eval(attributes.wlcFileUploader);
            angular.extend(scope.uploader, {
                'previewMode': 'simple',
                'autoUpload': true,
                'queueLimit': 1
            }, options);

            setFileTypeFilter(scope, options);
            setFileSizeFilter(scope, options);
            // comments the following line, because we will rename file in php when uploading.
            //setFileDuplicateFilter(scope, options);

            // construct desc
            if (options.desc != undefined) {
                // set desc to empty string to disable desc output.
                if (scope.supportFileTypes && scope.supportFileTypes.length > 0) {
                    var typesDesc = "支持的文件类型为：" + scope.supportFileTypes.join("，") + "。";
                    scope.uploader.desc = options.desc.replace(/{supportTypes}/, typesDesc);
                } else {
                    scope.uploader.desc = options.desc.replace(/{supportTypes}/, "");
                }
            }

            // This directive provides preview ability of uploaded files, currently, only support preview images by URLs.
            // Nested ng-model directive provides the URLs from parent scope.
            // $viewValue was assumed as string or string array.
            var urlSplitter = "||";
            ngModelCtrl.$render = function () {
                $log.debug("ngModelCtrl.$viewValue:", ngModelCtrl.$viewValue);
                if (ngModelCtrl.$viewValue) {
                    scope.uploadedFileUrls = ngModelCtrl.$viewValue.split(urlSplitter);
                } else {
                    scope.uploadedFileUrls = [];
                }
                // number of uploaded files cannot exceed queue limit.
                scope.uploadedFileUrls.splice(scope.uploader.queueLimit);
            };

            scope.uploader.bind('beforeupload', function (event, item) {
                if (options.targetName) {
                    if (options.queueLimit > 1) {
                        $log.error("beforeupload: option 'targetName' is ignored because 'queueLimit' is:", options.queueLimit);
                    } else {
                        var appendTs = options.appendTs;
                        var paramTargetName = "targetName=";
                        var mark = item.url.indexOf("?") > 0 ? "&" : "?";
                        if (appendTs == 'each') {
                            item.url += mark + paramTargetName + options.targetName + "." + new Date().getTime();
                        } else if (appendTs == 'once') {
                            if (!scope.targetNameOnce) {
                                scope.targetNameOnce = paramTargetName + options.targetName + "." + new Date().getTime();
                            }
                            item.url += mark + scope.targetNameOnce;
                        } else {
                            item.url += mark + paramTargetName + options.targetName;
                        }
                        $log.debug("beforeupload: options targetName, appendTs, and URL:", options.targetName, options.appendTs, item.url);
                    }
                }
            });

            // Get uploaded URL and remove uploaded item from queue. We manage uploadedFileUrls to:
            // 1. Compare to queueLimit, control upload enable/disable.
            // 2. Two-ways bind with ngModel support, reflect to outer model.
            scope.uploader.bind('success', function (event, xhr, item, response) {
                $log.debug('upload successful:', item, response);
                if (options.modelValue == 'last') {
                    scope.uploadedFileUrls = [response.url];
                } else {
                    scope.uploadedFileUrls.push(response.url);
                }
                scope.uploader.removeFromQueue(item);
                ngModelCtrl.$invalid = false;
                ngModelCtrl.$error.errMsg = "";
                setViewValue();
            });

            // This event will be trigger when every filter in 'scope.uploader.filters' returns invalid.
            scope.uploader.bind('whenaddingfilefailed', function (event, item, errMsg) {
                $log.debug("whenaddingfilefailed:", item, errMsg);
                if (errMsg == CONST_FILE_EXISTS) {
                    ngModelCtrl.$dirty = true;
                    ngModelCtrl.$invalid = false;
                    ngModelCtrl.$error.errMsg = "文件已存在";
                } else {
                    ngModelCtrl.$dirty = true;
                    ngModelCtrl.$invalid = true;
                    ngModelCtrl.$error.errMsg = errMsg;
                }
            });

//            scope.uploader.bind('afteraddingfile', function (event, item, errMsg) {
//                delete ngModelCtrl.$error.errMsg;
//            });

            scope.removePreview = function (index) {
                scope.uploader.removeUploadedFile(scope.uploadedFileUrls[index], function () {
                    scope.uploadedFileUrls.splice(index, 1);
                    setViewValue();
                });
            };

            // Set view changes back to model. When user upload/remove file, we need reflect model via ng-model.
            // If original model is array, set array back; Otherwise, assume its string, set the first string value back.
            var setViewValue = function () {
                delete ngModelCtrl.$error.errMsg;
                ngModelCtrl.$setViewValue(scope.uploadedFileUrls.join(urlSplitter));
            }
        }
    }
}
])
;
