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
                'name' => 'Admin Demo',
                'email' => 'admin@docflow.test',
                'role' => UserRole::ADMIN,
            ],
            [
                'name' => 'Raliq Operator',
                'email' => 'operator@docflow.test',
                'role' => UserRole::OPERATOR,
            ],
            [
                'name' => 'Sinta Reviewer',
                'email' => 'reviewer@docflow.test',
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
