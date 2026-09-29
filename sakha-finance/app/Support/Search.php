<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Case-insensitive LIKE that works on both PostgreSQL and SQLite.
 *
 * PostgreSQL has `ILIKE`; SQLite does not (though its `LIKE` is already
 * case-insensitive for ASCII). The app ships for both — Postgres in local dev,
 * SQLite in the free demo deploy — so this helper centralises the choice
 * instead of hardcoding one dialect across ~47 call sites.
 */
class Search
{
    /**
     * The LIKE operator to use for the current connection.
     */
    public static function likeOperator(): string
    {
        $driver = DB::connection()->getDriverName();

        return $driver === 'pgsql' ? 'ilike' : 'like';
    }

    /**
     * Wrap a search term in wildcards, matching the search semantics used
     * throughout the app (substring, case-insensitive).
     */
    public static function term(string $value): string
    {
        return '%'.$value.'%';
    }
}
