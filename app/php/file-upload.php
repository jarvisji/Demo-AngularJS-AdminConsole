<?php
session_start();
require_once 'bcs/bcs.class.php';
require_once 'session-check.php';
$host = 'bcs.duapp.com';
$ak = 'BE7thqsyALWH7LLXdgZWiIib';
$sk = 'VCxRTFfBrAhH2TiLxHRuxcBPxouRoP3l';
$bucket = 'demo-console-user-files';
$baiduBcs = new BaiduBCS($ak, $sk, $host);
//createBucket($baiduBcs);
//please note that the request will fail if you upload a file larger than what is supported by your PHP or Webserver settings
$headerAjax = isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] === 'XMLHttpRequest';
$paramAjax = isset($_GET["type"]) && $_GET["type"] == "ajax";
$ajax = $headerAjax || $paramAjax;

$result = array();
$userId = "";
$accountId = "";
$remove = "";
$file = "";
if (!SessionCheck()) {
    $result = array('status' => 'ERR', 'message' => 'php_session_expired');
} else {
    $userId = $_SESSION['userId'];
    if (isset($_SESSION['wxAccountId'])) {
        $accountId = $_SESSION['wxAccountId'];
    }
    // try to get target file name from URL or form data.
    if (isset($_GET["targetName"])) {
        $targetName=$_GET["targetName"];
    }
    if (isset($_POST["targetName"])) {
        $targetName = $_POST["targetName"];
    }
    if (isset($_GET["action"])) {
        $action = $_GET["action"];

        if ($action == "delete") {
            if (isset($_GET['url'])) {
                getRemoveUrlAndDelete("get", "url");
            }
        } else if ($action == "CopyFileToUser") {
            if (isset($_POST["fileUrl"])) {
                if (!empty($_POST["fileUrl"])) {
                    $objectArr = $_POST["fileUrl"];
                    if (isset($_GET['wxAccountId'])) {
                        $accountId = $_GET['wxAccountId'];
                        $path = $userId . "/" . $accountId;
                        $objectUrl = explode($bucket, $objectArr);
                        $object = $objectUrl[1];
                        copyObject($object, $path);
                    } else {
                        $path = $userId . "/" . $accountId;
                        StartCopying($objectArr, $path);
                    }
                }
            } else {
                $result['status'] = 'ERR';
                $result['message'] = 'fileUrl is no isset!';
            }
        } else if ($action == "WxAccountAvatarUpload") {
            $path = "temporaryfolder/" . $userId . "/";
            $file = $_FILES["fileUploader"];
            SingleFileUpload();
        } else if ($action == "UserAvatarUpload") {
            $path = $userId . "/";
            $file = $_FILES["fileUploader"];
            SingleFileUpload();
        }
    } else {
        //Single or MultiFileUpload upload
        $file = $_FILES["file"];
        if (count($file["name"]) > 1) {
            if (isset($_POST["remove"])) {
                getRemoveUrlAndDelete("post", "remove");
            }
            MultiFileUpload($file, $userId);
        } else {
            //get file type
            $type = CheckTheFileType($file);
            $path = $userId . "/" . $accountId . "/" . $type . "/";
            SingleFileUpload();
        }
    }
}

$result = json_encode($result);
if ($ajax) {
    echo $result;
} else {
    //for browsers that don't support uploading via ajax,
    //we have used an iframe instead and the response is sent as a script
    echo '<script language="javascript" type="text/javascript">';
    echo 'var iframe = window.top.window.jQuery("#' . $_POST['temporary-iframe-id'] . '").data("deferrer").resolve(' . $result . ');';
    echo '</script>';
}
// upload file to BCS, create directory if nessesary.
function upload2Bcs($overwrite = false) {
    global $file, $baiduBcs, $bucket, $result, $host, $path, $targetName;
    $filename = $file['tmp_name'];
    // make sure object name follow BCS rules.
    // if $targetName is set, upload file using the name.
    if (isset($targetName)) {
        $fileNameArr = explode(".", $file['name']);
        $object = "/" . $path . $targetName . "." . $fileNameArr[count($fileNameArr) -1];
    } else {
        $object = "/" . $path . $file['name'];
    }
    $object = str_replace('_', '-', $object);
    $opt = array();
    if ($baiduBcs -> is_object_exist($bucket, $object)) {
        if ($overwrite) {
            $response = $baiduBcs -> delete_object($bucket, $object, $opt);
            if ($response -> isOK()) {
                bcs_create_object($bucket, $object, $filename, $opt);
            } else {
                $result['status'] = 'ERR';
                $result['message'] = $response -> body;
            }
        } else {
            $arr = explode(".", $object);
            $fileExt = array_pop($arr);
            array_push($arr, time());
            array_push($arr, $fileExt);
            $object = join(".", $arr);
            bcs_create_object($bucket, $object, $filename, $opt);
        }
    } else {
        bcs_create_object($bucket, $object, $filename, $opt);
    }
}

function bcs_create_object($bucket, $object, $filename, $opt) {
    global $baiduBcs, $result, $host;
    $opt['acl'] = BaiduBCS::BCS_SDK_ACL_TYPE_PUBLIC_READ;
    $response = $baiduBcs -> create_object($bucket, $object, $filename, $opt);
    if ($response -> isOK()) {
        $result['status'] = 'OK';
        $result['message'] = 'File uploaded successfully!';
        $result['url'] = 'http://' . $host . "/" . $bucket . $object;
    } else {
        $result['status'] = 'ERR';
        $result['message'] = $response -> body;
    }
}

function createBucket($baiduBcs) {
    global $bucket;
    //$acl = BaiduBCS::BCS_SDK_ACL_TYPE_PUBLIC_CONTROL;
    $acl = BaiduBCS::BCS_SDK_ACL_TYPE_PUBLIC_READ;
    //$acl = BaiduBCS::BCS_SDK_ACL_TYPE_PUBLIC_READ_WRITE;
    //$acl = BaiduBCS::BCS_SDK_ACL_TYPE_PUBLIC_WRITE;
    //$acl = BaiduBCS::BCS_SDK_ACL_TYPE_PRIVATE;
    $response = $baiduBcs -> list_bucket();
    if (strpos($response -> body, $bucket) > 0) {
        echo 'bucket: "' . $bucket . '" already exist.<br>';
    } else {
        $response = $baiduBcs -> create_bucket($bucket, $acl);
        echo 'Create "' . $bucket . '" ';
        echo $response -> isOK() ? 'success.<br>' : 'failed.<br>';
    }
}

function upload2Local($file, $result) {
    $save_path = $file['name'];
    $thumb_path = 'thumb.jpg';
    if (!move_uploaded_file($file['tmp_name'], $save_path) OR !resize($save_path, $thumb_path, 150)) {
        $result['status'] = 'ERR';
        $result['message'] = 'Unable to save file!';
    } else {
        $result['status'] = 'OK';
        $result['message'] = 'Avatar changed successfully!';
        $result['url'] = 'http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['SCRIPT_NAME']) . '/' . $thumb_path;
    }
    return $result;
}

function resize($in_file, $out_file, $new_width, $new_height = FALSE) {
    $image = null;
    $extension = strtolower(preg_replace('/^.*\./', '', $in_file));
    switch ($extension) {
    case 'jpg' :
    case 'jpeg' :
        $image = imagecreatefromjpeg($in_file);
        break;
    case 'png' :
        $image = imagecreatefrompng($in_file);
        break;
    case 'gif' :
        $image = imagecreatefromgif($in_file);
        break;
    }
    if (!$image || !is_resource($image))
        return false;
    $width = imagesx($image);
    $height = imagesy($image);
    if ($new_height === FALSE) {
        $new_height = (int)(($height * $new_width) / $width);
    }
    $new_image = imagecreatetruecolor($new_width, $new_height);
    imagecopyresampled($new_image, $image, 0, 0, 0, 0, $new_width, $new_height, $width, $height);
    $ret = imagejpeg($new_image, $out_file, 80);
    imagedestroy($new_image);
    imagedestroy($image);
    return $ret;
}

function CheckTheFileType($file) {
    $type = "unknow";
    if ($file["type"] == "image/png" || $file["type"] == "image/jpeg" || $file["type"] == "image/pjpeg" || $file["type"] == "image/gif") {
        $type = "image";
    } else if ($file["type"] == "video/mp4" || $file["type"] == "video/avi" || $file["type"] == "video/x-ms-wmv") {
        $type = "video";
    } else if ($file["type"] == "audio/mpeg" || $file["type"] == "audio/mp3" || $file["type"] == "audio/x-wav" || $file["type"] == "audio/x-ms-wma" || $file["type"] == "audio/amr") {
        $type = "audio";
    }
    return $type;
}

function SingleFileUpload() {
    global $file, $result;
    if (isset($_POST["remove"])) {
        getRemoveUrlAndDelete("post", "remove");
    }

    /**
     if (!preg_match('/^image\//', $file['type']) || !preg_match('/\.(jpe?g|gif|png)$/i', $file['name']) || getimagesize($file['tmp_name']) === FALSE) {
     $result['status'] = 'ERR';
     $result['message'] = 'Invalid file format!';
     } else if ($file['size'] > 2097152) { //~2M
     $result['status'] = 'ERR';
     $result['message'] = 'Please choose a smaller file (<2M)!';
     } else
     **/
    if ($file['error'] != 0 || !is_uploaded_file($file['tmp_name'])) {
        $result['status'] = 'ERR';
        $result['message'] = 'File upload failed!';
    } else {
        upload2Bcs();
    }
}

function MultiFileUpload($fileArr, $userId) {
    global $baiduBcs, $bucket, $file, $path;
    $count = count($fileArr["name"]);
    for ($i = 0; $i < $count; $i++) {
        if ($fileArr["type"][$i] == "") {
            continue;
        }
        $file = array("name" => $fileArr["name"][$i], "type" => $fileArr["type"][$i], "tmp_name" => $fileArr["tmp_name"][$i], "error" => $fileArr["error"][$i], "size" => $fileArr["size"][$i]);
        $type = CheckTheFileType($file);
        $path = "temporaryfolder/" . $userId . "/" . $type . "/"; ;
        if ($file['error'] == 0 || is_uploaded_file($file['tmp_name'])) {
            $isObjectUrl = "/" . $path . $file['name'];
            if ($baiduBcs -> is_object_exist($bucket, $isObjectUrl) == false) {
                upload2Bcs();
            }
        }
    }
}

function StartCopying($objectArr, $path) {
    global $bucket;
    foreach ($objectArr as $value) {
        if ($value != "") {
            $objectUrl = explode($bucket, $value);
            $object = $objectUrl[1];
            $success = copyObject($object, $path);
            if ($success == FALSE) {
                break;
            }
        }
    }
}

function copyObject($object, $path) {
    global $host, $baiduBcs, $bucket, $result, $userId;
    $success = FALSE;
    $source = 'bs://' . $bucket . $object;
    $opt = array();
    $acl = BaiduBCS::BCS_SDK_ACL_TYPE_PUBLIC_READ;
    $source = array('bucket' => $bucket, 'object' => $object);
    $newobject = strtr($object, array("temporaryfolder/" . $userId => $path));
    $dest = array('bucket' => $bucket, 'object' => $newobject);
    $response = $baiduBcs -> copy_object($source, $dest);
    if ($response -> isOK() == false) {
        $result['status'] = 'ERR';
        $result['message'] = $response -> body;
    } else {
        $baiduBcs -> set_object_acl($bucket, $newobject, $acl);
        $response = $baiduBcs -> delete_object($bucket, $object);
        if ($response -> isOK() == false) {
            $result['status'] = 'ERR';
            $result['message'] = $response -> body;
        } else {
            $result['status'] = 'OK';
            $result['message'] = 'File copy successfully!';
            $result['url'] = 'http://' . $host . "/" . $bucket . $newobject;
            $success = TRUE;
        }
    }
    return $success;
}

function deleteObject($remove) {
    global $baiduBcs, $bucket, $result;
    $remove = explode($bucket, $remove);
    $remove = "/" . $remove[1];
    $response = $baiduBcs -> delete_object($bucket, $remove);
    if ($response -> isOK()) {
        $result['status'] = 'OK';
        $result['message'] = 'File delete successfully!';
    } else {
        $result['status'] = 'ERR';
        $result['message'] = $response -> body;
    }
}

function getRemoveUrlAndDelete($method, $attr) {
    if ($method == "post") {
        $remove = $_POST[$attr];
    } else if ($method == "get") {
        $remove = $_GET[$attr];
    }
    if ($remove != "") {
        deleteObject($remove);
    }
}

