<?php

use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\ArsipController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DeliveryController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\InvoiceListController;
use App\Http\Controllers\Api\KetelitianController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OverviewController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PengadaanController;
use App\Http\Controllers\Api\PengeluaranController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VerificationController;
use Illuminate\Support\Facades\Route;

// Public auth endpoints
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');

Route::middleware(['auth:sanctum', 'active'])->group(function () {
    // Session / identity
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me/preferences', [AuthController::class, 'updatePreferences']);

    // Overview / attention queue
    Route::get('/overview', [OverviewController::class, 'index']);

    // Analytics time series (charts)
    Route::get('/analytics', [AnalyticsController::class, 'index']);

    // Global search
    Route::get('/search', [TransactionController::class, 'search']);

    // Transactions
    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::post('/transactions', [TransactionController::class, 'store']);
    Route::get('/transactions/{transaction}', [TransactionController::class, 'show']);
    Route::put('/transactions/{transaction}', [TransactionController::class, 'update']);
    Route::post('/transactions/{transaction}/status', [TransactionController::class, 'changeStatus']);
    Route::get('/transactions/{transaction}/completion-check', [TransactionController::class, 'completionCheck']);
    Route::post('/transactions/{transaction}/complete', [TransactionController::class, 'complete']);

    // Invoices (nested under transaction)
    Route::post('/transactions/{transaction}/invoices', [InvoiceController::class, 'store']);
    Route::get('/transactions/{transaction}/invoices/{invoice}', [InvoiceController::class, 'show']);

    // Invoices (Finance-level listing across transactions)
    Route::get('/invoices', [InvoiceListController::class, 'index']);

    // Payments
    Route::get('/payments', [PaymentController::class, 'index']);
    Route::get('/payments/matching', [PaymentController::class, 'matching']);
    Route::post('/transactions/{transaction}/payments', [PaymentController::class, 'store']);
    Route::post('/payments/{payment}/confirm', [PaymentController::class, 'confirm']);
    Route::post('/payments/{payment}/reject', [PaymentController::class, 'reject']);

    // Arsip (digital archive)
    Route::get('/archives', [ArsipController::class, 'index']);
    Route::get('/archives/tree', [ArsipController::class, 'tree']);
    Route::post('/archives', [ArsipController::class, 'store']);
    Route::post('/archives/sync', [ArsipController::class, 'sync']);
    Route::post('/documents/{document}/archive-entry', [ArsipController::class, 'archiveDocument']);
    Route::get('/archives/{archive}', [ArsipController::class, 'show']);

    // Pemeriksaan Ketelitian (accuracy checking)
    Route::get('/ketelitian', [KetelitianController::class, 'index']);
    Route::get('/ketelitian/{transaction}', [KetelitianController::class, 'show']);

    // Pengeluaran (operational expenses / claim bensin)
    Route::get('/expenses', [PengeluaranController::class, 'index']);
    Route::get('/expenses/{expense}', [PengeluaranController::class, 'show']);
    Route::post('/expenses', [PengeluaranController::class, 'store']);
    Route::post('/expenses/{expense}/status', [PengeluaranController::class, 'updateStatus']);

    // Pengadaan + SPB (lightweight procurement)
    Route::get('/procurements', [PengadaanController::class, 'index']);
    Route::get('/procurements/{procurement}', [PengadaanController::class, 'show']);
    Route::post('/procurements', [PengadaanController::class, 'store']);
    Route::post('/procurements/{procurement}/status', [PengadaanController::class, 'updateStatus']);

    // Deliveries
    Route::get('/deliveries', [DeliveryController::class, 'index']);
    Route::post('/transactions/{transaction}/deliveries', [DeliveryController::class, 'store']);
    Route::post('/deliveries/{delivery}/status', [DeliveryController::class, 'changeStatus']);

    // Documents
    Route::get('/documents', [DocumentController::class, 'index']);
    Route::get('/documents/{document}', [DocumentController::class, 'show']);
    Route::get('/documents/{document}/preview', [DocumentController::class, 'preview']);
    Route::get('/documents/{document}/download', [DocumentController::class, 'download']);
    Route::post('/documents/{document}/versions', [DocumentController::class, 'addVersion']);
    Route::post('/documents/{document}/verify', [DocumentController::class, 'verify']);
    Route::post('/documents/{document}/reject', [DocumentController::class, 'reject']);
    Route::post('/documents/{document}/archive', [DocumentController::class, 'archive']);
    Route::post('/transactions/{transaction}/documents', [DocumentController::class, 'store']);

    // Verification engine
    Route::get('/verification/queue', [VerificationController::class, 'queue']);
    Route::get('/transactions/{transaction}/verification', [VerificationController::class, 'show']);
    Route::post('/transactions/{transaction}/verification/run', [VerificationController::class, 'run']);
    Route::get('/transactions/{transaction}/verification/history', [VerificationController::class, 'history']);

    // Customers
    Route::get('/customers', [CustomerController::class, 'index']);
    Route::post('/customers', [CustomerController::class, 'store']);
    Route::get('/customers/{customer}', [CustomerController::class, 'show']);
    Route::put('/customers/{customer}', [CustomerController::class, 'update']);

    // Activity
    Route::get('/activity', [ActivityController::class, 'index']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllRead']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markRead']);

    // Reports
    Route::get('/reports', [ReportController::class, 'index']);
    Route::get('/reports/transactions/export', [ReportController::class, 'exportTransactions']);
    Route::get('/reports/invoices/export', [ReportController::class, 'exportInvoices']);
    Route::get('/reports/archives/export', [ReportController::class, 'exportArchives']);
    Route::get('/reports/expenses/export', [ReportController::class, 'exportExpenses']);
    Route::get('/reports/procurements/export', [ReportController::class, 'exportProcurements']);
    Route::get('/reports/ketelitian/export', [ReportController::class, 'exportKetelitian']);
    Route::get('/reports/ketelitian/detail/export', [ReportController::class, 'exportKetelitianDetail']);

    // Laporan PDF (server-side, dompdf)
    Route::get('/reports/transactions/pdf', [ReportController::class, 'pdfTransactions']);
    Route::get('/reports/invoices/pdf', [ReportController::class, 'pdfInvoices']);
    Route::get('/reports/archives/pdf', [ReportController::class, 'pdfArchives']);
    Route::get('/reports/expenses/pdf', [ReportController::class, 'pdfExpenses']);
    Route::get('/reports/procurements/pdf', [ReportController::class, 'pdfProcurements']);
    Route::get('/reports/ketelitian/pdf', [ReportController::class, 'pdfKetelitian']);
    Route::post('/reports/email', [ReportController::class, 'emailReport']);

    // Users (ADMIN only — enforced in controller)
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{user}', [UserController::class, 'update']);

    // Settings (ADMIN only — enforced in controller)
    Route::get('/settings', [SettingsController::class, 'index']);
    Route::put('/settings/required-documents', [SettingsController::class, 'updateRequiredDocuments']);
    Route::put('/settings/verification', [SettingsController::class, 'updateVerification']);
});
