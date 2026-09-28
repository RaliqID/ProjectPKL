<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\VerificationRunResource;
use App\Models\Transaction;
use App\Services\VerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VerificationController extends Controller
{
    public function __construct(private readonly VerificationService $service) {}

    /** Latest stored verification run for a transaction. */
    public function show(Transaction $transaction): JsonResponse
    {
        $run = $transaction->verificationRuns()->with('checks', 'runner')->first();

        return response()->json(['data' => $run ? new VerificationRunResource($run) : null]);
    }

    /** Execute verification fresh and persist the run. */
    public function run(Request $request, Transaction $transaction): JsonResponse
    {
        if (! $request->user()->canWrite() && ! $request->user()->isReviewer()) {
            abort(403, 'Anda tidak berwenang menjalankan verifikasi.');
        }

        $run = $this->service->run($transaction, $request->user());

        return response()->json(['data' => new VerificationRunResource($run->load('checks', 'runner'))]);
    }

    /** History of verification runs for a transaction. */
    public function history(Transaction $transaction): JsonResponse
    {
        $runs = $transaction->verificationRuns()->with('checks', 'runner')->limit(20)->get();

        return response()->json(['data' => VerificationRunResource::collection($runs)]);
    }

    /** Queue of transactions whose latest verification is not a clean pass. */
    public function queue(Request $request): JsonResponse
    {
        $query = Transaction::query()
            ->with(['customer', 'latestVerificationRun'])
            ->whereHas('latestVerificationRun', fn ($q) => $q->whereIn('overall_status', ['WARNING', 'FAILED']))
            ->orWhere('status', 'NEEDS_REVIEW');

        $perPage = min((int) $request->integer('per_page', 15), 100);
        $paginated = $query->latest()->paginate($perPage)->withQueryString();

        $data = $paginated->getCollection()->map(function (Transaction $t) {
            return [
                'transaction_id' => $t->id,
                'transaction_code' => $t->transaction_code,
                'customer' => $t->customer?->name,
                'status' => $t->status->value,
                'verification_status' => $t->latestVerificationRun?->overall_status,
                'failed_count' => $t->latestVerificationRun?->failed_count ?? 0,
                'warning_count' => $t->latestVerificationRun?->warning_count ?? 0,
                'score' => $t->latestVerificationRun?->score,
            ];
        });

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }
}
