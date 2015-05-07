<?php
/**
 * This is client ajax request wrapper, resolved some things:
 * 1. Client ajax cross domain issue.
 * 2. Session expire detection. Since most of page are static, cannot access server side session, so this php will check session when every ajax request comes.
 * 3. Ajax request result cache. For some requests, the result is static, we can cache them in session. Note: session is not good for real cache, only cache small, use very frequently results here.
 *
 * Refer to http://phphttpclient.com/ for 3rd party http client.
 *
 * Parameters:
 * url - the url that client request.
 * method - http method: get, put, post, delete.
 * checkSession - is a swith to check user session before forward request, if the parameter is not set or it's value is true, we need check user session.
 * cache - valid value is true|clear.
 */
session_start();

require_once ('config.php');
require_once (__DIR__ . '/bootstrap.php');
use \Httpful\Request;

$result = null;
$appendSession = $checkSession = !isset($_GET['checkSession']) || (isset($_GET['checkSession']) && $_GET['checkSession'] == 'true');

if (!isset($_GET['url']) || !isset($_GET['method'])) {
    // check parameter.
    $result = array('success' => false, 'errMsg' => 'php_invalid_params');
} else {
    // 'checkSession' parameter is a swith to check user session before forward request.
    if ($checkSession) {
        // No 'checkSession' parameter or it's value is true, we need check user session.
        if (!isset($_SESSION['userId']) || !isset($_SESSION['cred'])) {
            $result = array('success' => false, 'errMsg' => 'php_session_expired');
        }
    }
    if ($result == null) {
        $useCache = isset($_GET['cache']) && ($_GET['cache'] == 'true');
        $clearCache = isset($_GET['cache']) && ($_GET['cache'] == 'clear');

        $key = $_GET['method'] . '_' . $_GET['url'];
        if ($key == "get_sessioninfo") {
            $result = array('success' => true, 'userId' => $_SESSION['userId'], 'wxAccountId' => $_SESSION['wxAccountId'], 'modules' => $_SESSION["modules"]);
        } if ($key == "set_sessioninfo") {
            if (!isset($_GET['key']) || !isset($_GET['value'])) {
                $result = array('success' => false,  'errMsg' => 'Missed key or value.');
            } else {
                $_SESSION[$_GET['key']] = $_GET['value'];
                $result = array('success' => true);
            }
        } else if ($clearCache) {
            // only clear cache, not really foreard request.
            unset($_SESSION[$key]);
            $result = array('success' => true, 'errMsg' => 'cache_clear_success:' . $key);
        } else {
            if ($useCache) {
                if (isset($_SESSION[$key])) {
                    // get result from cache, the reall request will not be forward.
                    $result = $_SESSION[$key];
                }
            }
            if ($result == null) {
                // not use cache or cache has no data, forward request.
                $result = forwardingRequest();
                if ($useCache) {
                    // new request result that not in cache, save it.
                    $_SESSION[$key] = clone $result;
                    // next time client will found the response data is from cache.
                    $_SESSION[$key] -> cache = true;
                }
            }
        }
    }
}

header('Content-Type:application/json;charset=utf-8');
echo json_encode($result);

function forwardingRequest() {
    global $appendSession;
    // Normal to forward ajax request.
    $url = $_GET['url'];
    $method = $_GET['method'];
    if (isset($_POST['jsondata'])) {
        // 20140710, this is not support, remove later.
        //$data = json_encode($_POST['jsondata']);
    } else if (isset($_SERVER['CONTENT_TYPE']) && stripos($_SERVER['CONTENT_TYPE'], 'application/json') >=0) {
        // AngularJS post data in JSON, PHP $_POST doesn't support it. Besides the following, alternate way is
        // use: file_get_contents("php://input").
        $data = $GLOBALS['HTTP_RAW_POST_DATA'];
    } else {
        // encode formData to json.
        $data = json_encode($_POST);
    }

    if (strpos($url, '/') != 0) {
        $url = '/' . $url;
    }
    $url = SERVICEURL . $url;

    if ($appendSession) {
        // append current user data in session to url parameter.
        $sessionData = array('u' => $_SESSION['userId'], 'c' => $_SESSION['cred']);
        if (isset($_SESSION['wxAccountId'])) {
            $sessionData['a'] = $_SESSION['wxAccountId'];
        }
        $urlParams = http_build_query($sessionData);
        if (strpos($url, '?') > 0) {
            $url = $url . '&' . $urlParams;
        } else {
            $url = $url . '?' . $urlParams;
        }
    }

    $respData = null;
    // send out request.
    if ($method == 'get' || $method == 'GET') {
        $response = Request::get($url) -> send();
    } elseif ($method == 'post' || $method == 'POST') {
        $response = Request::post($url, $data) -> sendsJson() -> send();
    } elseif ($method == 'put' || $method == 'PUT') {
        $response = Request::put($url, $data) -> sendsJson() -> send();
    } elseif ($method == 'delete' || $method == 'DELETE') {
        $response = Request::delete($url) -> sendsJson() -> send();
    } else {
        $respData = array('success' => false, 'errMsg' => 'php_unsupport_http_method');
    }
    if ($respData == null) {
        $respData = $response -> body;
    }

    // append original request in response data.
    if (ENVMODE == "DEV") {
        if (is_null($respData)) {
            $respData = array();
        }

        $arrOriginalRequest = array('method' => $method, 'url' => $url, 'data' => $data);
        if (is_object($respData)) {
            $respData -> originalRequest = $arrOriginalRequest;
        } else if (is_array($respData)) {
            $respData['originalRequest'] = $arrOriginalRequest;
        }
    }

    return $respData;
}
?>