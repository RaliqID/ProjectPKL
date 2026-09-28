<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        /*
         * Print-oriented styles for the PDF report. dompdf supports a subset of
         * CSS (no flexbox/grid), so this uses tables and simple blocks only.
         * Colours are restrained: a dark header band in the Sakha accent with
         * black text on white for the body, so the report is readable on paper.
         */
        @page { margin: 18mm 14mm; }

        * { font-family: DejaVu Sans, sans-serif; }

        body { font-size: 9px; color: #1a1a1a; margin: 0; }

        .header {
            border-bottom: 2px solid #8f1d24;
            padding-bottom: 8px;
            margin-bottom: 14px;
        }
        .header-table { width: 100%; border-collapse: collapse; }
        .header-table td { border: none; padding: 0; vertical-align: middle; }
        .logo-cell { width: 52px; }
        .logo-cell img { width: 46px; height: auto; }
        .header .brand { font-size: 15px; font-weight: bold; color: #8f1d24; letter-spacing: 0.5px; }
        .header .sub { font-size: 8px; color: #666; margin-top: 2px; }
        .header .meta { font-size: 8px; color: #444; margin-top: 6px; }

        h1 { font-size: 13px; margin: 0 0 2px 0; }
        .muted { color: #666; }

        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        thead th {
            background: #f2f2f2;
            border: 1px solid #d9d9d9;
            padding: 5px 6px;
            text-align: left;
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            color: #333;
        }
        tbody td {
            border: 1px solid #e3e3e3;
            padding: 4px 6px;
            font-size: 8.5px;
            vertical-align: top;
        }
        tbody tr:nth-child(even) td { background: #fafafa; }
        td.num { text-align: right; }

        .summary { margin-top: 12px; }
        .summary td { border: none; padding: 2px 0; font-size: 9px; }
        .summary .label { color: #666; }
        .summary .value { font-weight: bold; text-align: right; }

        .footer {
            position: fixed;
            bottom: -10mm;
            left: 0;
            right: 0;
            font-size: 7.5px;
            color: #888;
        }
        .footer .left { float: left; }
        .footer .right { float: right; }

        .note { margin-top: 14px; font-size: 7.5px; color: #888; }

        /* Simple CSS bar chart — dompdf cannot render SVG/canvas, but it lays out
           divs fine, so the trend chart is built from width-percentage bars. */
        .chart { margin-top: 12px; }
        .chart-title { font-size: 9px; font-weight: bold; color: #333; margin-bottom: 6px; }
        .chart-table { width: 100%; border-collapse: collapse; }
        .chart-table td { border: none; padding: 1px 0; vertical-align: middle; font-size: 8px; }
        .chart-label { width: 46px; color: #666; }
        .chart-bar-cell { padding-right: 8px !important; }
        .chart-bar { background: #8f1d24; height: 9px; }
        .chart-value { width: 30px; text-align: right; color: #333; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <table class="header-table">
            <tr>
                @if (!empty($logo))
                    <td class="logo-cell"><img src="{{ $logo }}" alt="Sakha"></td>
                @endif
                <td>
                    <div class="brand">SAKHA INTERNASIONAL</div>
                    <div class="sub">Finance Operations — Sistem Informasi Pengelolaan Data dan Dokumen Finance</div>
                </td>
            </tr>
        </table>
        <div class="meta">
            <strong>{{ $title }}</strong><br>
            Dicetak: {{ $generated_at }}
            @if (!empty($period)) &nbsp;·&nbsp; Periode: {{ $period }} @endif
            @if (!empty($generated_by)) &nbsp;·&nbsp; Oleh: {{ $generated_by }} @endif
        </div>
    </div>

    <h1>{{ $title }}</h1>
    @if (!empty($subtitle))
        <p class="muted">{{ $subtitle }}</p>
    @endif

    @if (!empty($summary))
        <table class="summary">
            @foreach ($summary as $label => $value)
                <tr>
                    <td class="label">{{ $label }}</td>
                    <td class="value">{{ $value }}</td>
                </tr>
            @endforeach
        </table>
    @endif

    <table>
        <thead>
            <tr>
                @foreach ($headers as $header)
                    <th>{{ $header }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse ($rows as $row)
                <tr>
                    @foreach ($row as $index => $cell)
                        <td class="{{ in_array($index, $numericColumns ?? [], true) ? 'num' : '' }}">{{ $cell }}</td>
                    @endforeach
                </tr>
            @empty
                <tr><td colspan="{{ count($headers) }}" style="text-align:center; color:#888;">Tidak ada data.</td></tr>
            @endforelse
        </tbody>
    </table>

    @if (!empty($trend))
        <div class="chart">
            <div class="chart-title">{{ $trend['title'] ?? 'Tren 6 Bulan Terakhir' }}</div>
            <table class="chart-table">
                @php $max = max(array_map(fn ($p) => $p['value'], $trend['points'])) ?: 1; @endphp
                @foreach ($trend['points'] as $point)
                    <tr>
                        <td class="chart-label">{{ $point['label'] }}</td>
                        <td class="chart-bar-cell">
                            <div class="chart-bar" style="width: {{ max(2, (int) round($point['value'] / $max * 100)) }}%;"></div>
                        </td>
                        <td class="chart-value">{{ $point['value'] }}</td>
                    </tr>
                @endforeach
            </table>
        </div>
    @endif

    <p class="note">
        Dokumen ini dihasilkan dari prototype SAKHA Finance Operations. Data bersifat contoh (fiktif) dan tidak
        merepresentasikan data perusahaan.
    </p>

    <div class="footer">
        <span class="left">SAKHA Finance Operations — dicetak otomatis pada {{ $generated_at }}</span>
        <span class="right">Halaman {PAGE_NUM} dari {PAGE_COUNT}</span>
    </div>
</body>
</html>
