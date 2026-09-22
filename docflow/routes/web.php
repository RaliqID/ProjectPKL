<?php

use Illuminate\Support\Facades\Route;

/**
 * The SPA shell is served by a dedicated fallback route registered in
 * bootstrap/app.php (see ->withRouting(web: ...)). Keeping it out of this file
 * avoids the web session group entirely, so a hard refresh never rotates the
 * authenticated session that the API group owns.
 *
 * This file is intentionally minimal.
 */

// A tiny health endpoint for humans hitting the bare web root without the SPA build.
Route::get('/__docflow', function () {
    return response()->json([
        'app' => config('app.name'),
        'api' => 'available under /api',
    ]);
});
