<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'name' => 'Admin Finance',
                'email' => 'admin@sakha.test',
                'role' => UserRole::ADMIN,
            ],
            [
                'name' => 'Raliq Operator',
                'email' => 'operator@sakha.test',
                'role' => UserRole::OPERATOR,
            ],
            [
                'name' => 'Sinta Pemeriksa',
                'email' => 'reviewer@sakha.test',
                'role' => UserRole::REVIEWER,
            ],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(
                ['email' => $user['email']],
                [
                    'name' => $user['name'],
                    'password' => 'password',
                    'role' => $user['role'],
                    'is_active' => true,
                ],
            );
        }
    }
}
