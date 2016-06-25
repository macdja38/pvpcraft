<!DOCTYPE html>
<html>
<head>
    <title>Permissions</title>
    <script src="https://cdn.rawgit.com/google/code-prettify/master/loader/run_prettify.js"></script>
</head>

<body>

<h1>Permissions</h1>

<pre class="prettyprint">
<code>
<?php
$permissions = file_get_contents("permissions.json");
$permissions_a = json_decode($permissions, true);
if(array_key_exists(htmlspecialchars($_GET["server"]), $permissions_a)) {
        echo json_encode($permissions_a[htmlspecialchars($_GET["server"])], JSON_PRETTY_PRINT);
} else {
        echo "Their are no permission's defined for this server if you believe this is in error please contact @```Macdja38#7770";
}
?>
</pre>

</code>
</body>
</html>