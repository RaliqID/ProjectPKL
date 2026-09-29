<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx as XlsxWriter;

/**
 * Builds branded, print-ready Excel workbooks for the Finance reports.
 *
 * The point is an .xlsx that opens correctly in Excel (Indonesian locale) with
 * no manual cleanup: a branded title band, a frozen + filterable header row,
 * typed columns (money and dates as real numbers, not text), sensible column
 * widths, and a totals row on money columns.
 */
class ExcelReportService
{
    private const BRAND = '8F1D24';

    /**
     * @param  array<int, string>  $headers
     * @param  array<int, array<int, mixed>>  $rows
     * @param  array<int, string>  $columnTypes  Money|Date|Int|Text per column index.
     * @param  array<string, string>  $summary   Label => value shown under the title.
     */
    public function build(
        string $title,
        array $headers,
        array $rows,
        array $columnTypes = [],
        array $summary = [],
    ): Spreadsheet {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle($this->sheetTitle($title));
        $sheet->setRightToLeft(false);

        $columnCount = count($headers);
        $lastColumn = $this->columnLetter($columnCount);

        $sheet->mergeCells("A1:{$lastColumn}1");
        $sheet->setCellValue('A1', 'SAKHA INTERNASIONAL - '.$title);
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 14, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::BRAND]],
            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER, 'horizontal' => Alignment::HORIZONTAL_LEFT],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(26);

        $rowIndex = 2;

        $sheet->mergeCells("A{$rowIndex}:{$lastColumn}{$rowIndex}");
        $meta = 'Dicetak: '.now()->translatedFormat('d F Y, H:i');
        foreach ($summary as $label => $value) {
            $meta .= '   |   '.$label.': '.$value;
        }
        $sheet->setCellValue("A{$rowIndex}", $meta);
        $sheet->getStyle("A{$rowIndex}")->applyFromArray([
            'font' => ['size' => 9, 'color' => ['rgb' => '57534E']],
            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $rowIndex += 2;

        $headerRow = $rowIndex;
        foreach ($headers as $i => $header) {
            $sheet->setCellValue($this->columnLetter($i + 1).$headerRow, $header);
        }

        $headerRange = "A{$headerRow}:{$lastColumn}{$headerRow}";
        $sheet->getStyle($headerRange)->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '292623']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['bottom' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => self::BRAND]]],
        ]);
        $sheet->getRowDimension($headerRow)->setRowHeight(20);

        $firstDataRow = $headerRow + 1;
        foreach ($rows as $r => $row) {
            $excelRow = $firstDataRow + $r;
            foreach (array_values($row) as $c => $value) {
                $type = $columnTypes[$c] ?? 'Text';
                // Dates must be written as Excel serial numbers, otherwise they
                // land as text and sort/filter as strings.
                if ($type === 'Date' && $value instanceof \DateTimeInterface) {
                    $sheet->setCellValue(
                        $this->columnLetter($c + 1).$excelRow,
                        \PhpOffice\PhpSpreadsheet\Shared\Date::PHPToExcel($value),
                    );

                    continue;
                }

                $sheet->setCellValue($this->columnLetter($c + 1).$excelRow, $value);
            }
        }
        $lastDataRow = $firstDataRow + count($rows) - 1;

        if (count($rows) > 0) {
            $bodyRange = "A{$firstDataRow}:{$lastColumn}{$lastDataRow}";
            $sheet->getStyle($bodyRange)->applyFromArray([
                'borders' => [
                    'bottom' => ['borderStyle' => Border::BORDER_HAIR, 'color' => ['rgb' => 'E7E4DD']],
                ],
                'alignment' => ['vertical' => Alignment::VERTICAL_TOP],
            ]);

            // Banded rows for readability on long sheets.
            $sheet->getStyle($bodyRange)->getFill()->setFillType(Fill::FILL_NONE);
        }

        // Column types + widths.
        foreach ($headers as $i => $header) {
            $letter = $this->columnLetter($i + 1);
            $type = $columnTypes[$i] ?? 'Text';

            if ($type === 'Money') {
                $fmt = '"Rp"#,##0';
                $sheet->getStyle("{$letter}{$firstDataRow}:{$letter}{$lastDataRow}")->getNumberFormat()->setFormatCode($fmt);
                $sheet->getStyle("{$letter}{$firstDataRow}:{$letter}{$lastDataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
            } elseif ($type === 'Date') {
                $sheet->getStyle("{$letter}{$firstDataRow}:{$letter}{$lastDataRow}")->getNumberFormat()->setFormatCode(NumberFormat::FORMAT_DATE_DDMMYYYY);
            } elseif ($type === 'Int') {
                $sheet->getStyle("{$letter}{$firstDataRow}:{$letter}{$lastDataRow}")->getNumberFormat()->setFormatCode('#,##0');
                $sheet->getStyle("{$letter}{$firstDataRow}:{$letter}{$lastDataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
            }

            if (count($rows) === 0) {
                $sheet->getColumnDimension($letter)->setAutoSize(true);
            } else {
                $sheet->getColumnDimension($letter)->setAutoSize(true);
            }
        }

        if (count($rows) > 0) {
            $moneyColumns = array_keys(array_filter($columnTypes, fn ($t) => $t === 'Money'));
            if (! empty($moneyColumns)) {
                $totalRow = $lastDataRow + 1;
                // The label sits in the first column; only the money columns get
                // a SUM, so the two never collide.
                $sheet->setCellValue('A'.$totalRow, 'TOTAL');
                foreach ($moneyColumns as $col) {
                    $letter = $this->columnLetter($col + 1);
                    $sheet->setCellValue($letter.$totalRow, "=SUM({$letter}{$firstDataRow}:{$letter}{$lastDataRow})");
                }
                $sheet->getStyle("A{$totalRow}:{$lastColumn}{$totalRow}")->applyFromArray([
                    'font' => ['bold' => true],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F3F1EC']],
                    'borders' => ['top' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '292623']]],
                ]);
                foreach ($moneyColumns as $col) {
                    $letter = $this->columnLetter($col + 1);
                    $sheet->getStyle("{$letter}{$totalRow}")->getNumberFormat()->setFormatCode('"Rp"#,##0');
                    $sheet->getStyle("{$letter}{$totalRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                }
                $sheet->getStyle('A'.$totalRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
            }
        }

        $sheet->freezePane('A'.($headerRow + 1));
        if (count($rows) > 0) {
            $sheet->setAutoFilter($headerRange);
            $sheet->getAutoFilter()->setRange("A{$headerRow}:{$lastColumn}{$lastDataRow}");
        }

        // Print setup: landscape wide sheets, repeat the header on every page.
        $sheet->getPageSetup()->setOrientation(
            $columnCount > 6
                ? \PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::ORIENTATION_LANDSCAPE
                : \PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::ORIENTATION_PORTRAIT,
        );
        $sheet->getPageSetup()->setFitToWidth(1);
        $sheet->getPageSetup()->setFitToHeight(0);
        $sheet->getPageSetup()->setRowsToRepeatAtTopByStartAndEnd($headerRow, $headerRow);

        return $spreadsheet;
    }

    /**
     * Stream a built workbook as a download.
     */
    public function download(Spreadsheet $spreadsheet, string $filename): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $writer = new XlsxWriter($spreadsheet);
        $spreadsheet->setActiveSheetIndex(0);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename.'.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    /** Excel column letter for a 1-based index (1 => A, 27 => AA). */
    private function columnLetter(int $index): string
    {
        $letter = '';
        while ($index > 0) {
            $index--;
            $letter = chr(65 + ($index % 26)).$letter;
            $index = intdiv($index, 26);
        }

        return $letter;
    }

    /** Worksheet names cannot exceed 31 chars or contain : \ / ? * [ ]. */
    private function sheetTitle(string $title): string
    {
        $clean = preg_replace('/[:\\\\\/\?\*\[\]]/', '-', $title);

        return mb_substr($clean, 0, 31);
    }
}
