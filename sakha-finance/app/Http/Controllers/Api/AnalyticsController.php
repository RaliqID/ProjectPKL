<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function __construct(private readonly AnalyticsService $analytics) {}

    /**
     * Monthly time series for the analytics dashboard.
     *
     * `months` lets the client choose the window (default 6) so the same
     * endpoint serves a compact dashboard and a longer trend view without a
     * second endpoint.
     */
    public function index(Request $request): JsonResponse
    {
        $months = (int) $request->integer('months', AnalyticsService::DEFAULT_MONTHS);

        return response()->json(['data' => $this->analytics->build($months)]);
    }
}
