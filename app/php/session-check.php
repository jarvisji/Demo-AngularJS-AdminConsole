<?php
function SessionCheck() {
    if (!isset($_SESSION['userId']) && !isset($_SESSION['wxAccountId'])) {
        return false;
    } else {
        return true;
    }
}
