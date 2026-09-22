<?php

namespace Database\Seeders;

use App\Models\Customer;
use Illuminate\Database\Seeder;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $customers = [
            ['PT Nusantara Distribusi', 'Nusantara Group', 'Jakarta Selatan'],
            ['CV Sumber Jaya', 'Sumber Jaya Abadi', 'Bandung'],
            ['PT Arunika Logistik', 'Arunika Holdings', 'Surabaya'],
            ['CV Sentosa Mandiri', null, 'Semarang'],
            ['PT Prima Retail Indonesia', 'Prima Retail', 'Tangerang'],
            ['PT Bumi Teknologi', 'Bumi Tech', 'Bekasi'],
            ['CV Cahaya Elektrik', null, 'Yogyakarta'],
            ['PT Delta Perkasa', 'Delta Group', 'Medan'],
            ['CV Mitra Karya', null, 'Solo'],
            ['PT Global Niaga', 'Global Niaga', 'Denpasar'],
            ['CV Tunas Harapan', null, 'Malang'],
            ['PT Andalan Suplai', 'Andalan Group', 'Makassar'],
            ['CV Karya Utama', null, 'Palembang'],
            ['PT Sinar Mas Retail', 'Sinar Mas', 'Jakarta Barat'],
            ['CV Pelita Jaya', null, 'Bogor'],
            ['PT Cakrawala Niaga', 'Cakrawala', 'Balikpapan'],
            ['CV Sumber Rejeki', null, 'Cirebon'],
            ['PT Mandiri Sentosa', 'Mandiri Sentosa', 'Depok'],
            ['CV Astra Komponen', 'Astra Parts', 'Karawang'],
            ['PT Karya Abadi', 'Karya Abadi Group', 'Batam'],
            ['CV Berkah Jaya', null, 'Tegal'],
            ['PT Unikom Retail', 'Unikom', 'Bandung'],
            ['CV Sarana Teknik', null, 'Gresik'],
            ['PT Nusa Persada', 'Nusa Persada', 'Manado'],
        ];

        foreach ($customers as $index => [$name, $company, $city]) {
            $number = $index + 1;

            Customer::updateOrCreate(
                ['customer_code' => 'CUST-'.str_pad((string) $number, 4, '0', STR_PAD_LEFT)],
                [
                    'name' => $name,
                    'company_name' => $company,
                    'phone' => '+62 8'.str_pad((string) random_int(1000000000, 9999999999), 10, '0', STR_PAD_LEFT),
                    'email' => 'contact'.$number.'@'.strtolower(str_replace([' ', 'PT ', 'CV '], ['', '', ''], $name)).'.test',
                    'address' => "Jl. Contoh No. {$number}, {$city}, Indonesia",
                    'status' => $index < 21 ? 'ACTIVE' : 'INACTIVE',
                    'notes' => $index === 21 ? 'Pelanggan tidak aktif sejak pergantian tahun.' : null,
                ],
            );
        }
    }
}
