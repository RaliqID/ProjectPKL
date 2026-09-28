<?php

use App\Http\Middleware\EnsureUserIsActive;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',        then: function () {
            // SPA fallback: serve the built React shell for any non-API route.
            // This lives in the normal web pipeline so the SPA shell and the API
            // share ONE session (Sanctum statefulApi makes /api/* use the web
            // session too). Serving it any other way would split the session and
            // log the user out on refresh.
            \Illuminate\Support\Facades\Route::middleware('web')
                ->get('/{any?}', function () {
                    $index = public_path('index.html');

                    if (file_exists($index)) {
                        return response()->file($index, ['Cache-Control' => 'no-cache, must-revalidate']);
                    }

                    return response(
                        'SAKHA Finance Operations API berjalan. Build SPA ke public/ (npm run build di /spa) untuk menampilkan antarmuka.',
                        200,
                    )->header('Content-Type', 'text/plain');
                })
                ->where('any', '^(?!api|up|storage|sanctum|__sakha).*$');
        },
    )
    ->withSchedule(function (\Illuminate\Console\Scheduling\Schedule $schedule): void {
        // Email a Finance summary to administrators. Queued, so the scheduler
        // returns immediately and a mail outage cannot stack up here.
        $schedule->job(new \App\Jobs\SendScheduledReport('daily'))->dailyAt('07:00');
        $schedule->job(new \App\Jobs\SendScheduledReport('weekly'))->mondays()->at('07:15');
        $schedule->job(new \App\Jobs\SendScheduledReport('monthly'))->monthlyOn(1, '07:30');
    })
    ->withMiddleware(function (Middleware $middleware): void {
        // The SPA is served from the SAME origin as the API, so session auth is
        // the natural fit â€” no tokens, no CORS. We give the api group the full
        // session pipeline explicitly (EncryptCookies â†’ StartSession â†’
        // SubstituteBindings) so the session cookie is always written on the
        // response, regardless of Origin/Referer headers that Sanctum's
        // stateful detection would otherwise require.
        //
        // CSRF protection for state-changing requests is preserved by the
        // ValidateCsrfToken middleware below.
        $middleware->api(prepend: [
            \Illuminate\Cookie\Middleware\EncryptCookies::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
        ]);

        $middleware->api(append: [
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
            \Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
        ]);

        // Trust the local dev host for proxies during development.
        $middleware->trustProxies(at: '*');

        $middleware->alias([
            'active' => EnsureUserIsActive::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Normalise API error payloads so the frontend always gets a
        // consistent machine-readable shape, and never a stack trace.
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            if ($e instanceof \Illuminate\Validation\ValidationException) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'errors' => $e->errors(),
                ], 422);
            }

            if ($e instanceof \Illuminate\Auth\AuthenticationException) {
                return response()->json(['message' => 'Belum terautentikasi.'], 401);
            }

            if ($e instanceof \Illuminate\Auth\Access\AuthorizationException
                || $e instanceof \Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException) {
                return response()->json(['message' => $e->getMessage() ?: 'Tindakan ini tidak diizinkan.'], 403);
            }

            if ($e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException
                || $e instanceof \Symfony\Component\HttpKernel\Exception\NotFoundHttpException) {
                return response()->json(['message' => 'Data tidak ditemukan.'], 404);
            }

            if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                return response()->json([
                    'message' => $e->getMessage() ?: 'Request failed.',
                ], $e->getStatusCode());
            }

            if (config('app.debug')) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'exception' => $e::class,
                ], 500);
            }

            return response()->json(['message' => 'Terjadi kesalahan pada server.'], 500);
        });
    })->create();
