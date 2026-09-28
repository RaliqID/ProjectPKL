<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
</head>
<body style="margin:0; padding:0; background:#f3f1ec; font-family: Arial, Helvetica, sans-serif; color:#181614;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f1ec; padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff; border:1px solid #e7e4dd; border-radius:8px; overflow:hidden;">
                    <tr>
                        <td style="background:#8f1d24; padding:16px 24px;">
                            <div style="color:#ffffff; font-size:16px; font-weight:bold; letter-spacing:0.5px;">SAKHA INTERNASIONAL</div>
                            <div style="color:#f0c6c9; font-size:11px; margin-top:2px;">Finance Operations</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px;">
                            <h1 style="margin:0 0 4px; font-size:16px; color:#181614;">Laporan {{ $reportTitle }}</h1>
                            <p style="margin:0 0 16px; font-size:12px; color:#78736c;">Periode: {{ $periodLabel }}</p>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                                @foreach ($summary as $label => $value)
                                    <tr>
                                        <td style="padding:6px 0; font-size:12px; color:#78736c; border-bottom:1px solid #f3f1ec;">{{ $label }}</td>
                                        <td style="padding:6px 0; font-size:12px; color:#181614; font-weight:bold; text-align:right; border-bottom:1px solid #f3f1ec;">{{ $value }}</td>
                                    </tr>
                                @endforeach
                            </table>

                            <p style="margin:0; font-size:12px; color:#57534e;">
                                Laporan lengkap tersedia pada lampiran PDF email ini.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:14px 24px; background:#faf9f7; border-top:1px solid #e7e4dd;">
                            <p style="margin:0; font-size:11px; color:#a8a29a;">
                                Email otomatis dari prototype SAKHA Finance Operations. Data bersifat contoh (fiktif).
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
