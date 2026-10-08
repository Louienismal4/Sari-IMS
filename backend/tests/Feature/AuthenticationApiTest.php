<?php

namespace Tests\Feature;

use App\Models\Installation;
use App\Models\Store;
use App\Models\User;
use App\Services\IntegrationCredentialService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Tests\TestCase;

class AuthenticationApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ThrottleRequests::class);
        config(['app.enforce_installation_middleware_in_tests' => true]);
        Installation::create([
            'version' => '1.0.0',
            'status' => Installation::STATUS_COMPLETED,
            'installed_at' => now(),
        ]);
    }

    public function test_administrator_can_sign_in_with_existing_password_hash(): void
    {
        $admin = User::factory()->create(['password' => 'secret123']);

        $response = $this->postJson('/api/auth/login', [
            'email' => $admin->email,
            'password' => 'secret123',
        ])->assertOk()->assertJsonPath('user.email', $admin->email);

        $this->withToken($response->json('token'))
            ->getJson('/api/auth/user')->assertOk()
            ->assertJsonPath('email', $admin->email)
            ->assertJsonMissingPath('password');
        $this->getJson('/api/products')->assertOk();
        $this->postJson('/api/categories', ['name' => 'Snacks'])->assertCreated();
    }

    public function test_invalid_credentials_do_not_issue_a_token_or_reveal_an_account(): void
    {
        $admin = User::factory()->create(['password' => 'secret123']);
        foreach ([$admin->email, 'unknown@example.com'] as $email) {
            $this->postJson('/api/auth/login', ['email' => $email, 'password' => 'wrong'])
                ->assertUnauthorized()->assertExactJson(['message' => 'Invalid email or password.']);
        }
        $this->postJson('/api/auth/login', ['email' => ['invalid'], 'password' => 'secret123'])
            ->assertUnprocessable();
    }

    public function test_sign_in_accepts_existing_passwords_longer_than_255_characters(): void
    {
        config(['hashing.driver' => 'argon2id']);
        $password = str_repeat('long-password-', 25);
        $admin = User::factory()->create(['password' => $password]);

        $this->postJson('/api/auth/login', ['email' => $admin->email, 'password' => $password])
            ->assertOk()->assertJsonPath('user.email', $admin->email);
    }

    public function test_sign_out_revokes_the_token(): void
    {
        $admin = User::factory()->create(['password' => 'secret123']);
        $token = $this->postJson('/api/auth/login', ['email' => $admin->email, 'password' => 'secret123'])
            ->assertOk()->json('token');
        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/products')->assertUnauthorized();
    }

    public function test_operational_reads_and_writes_require_authentication(): void
    {
        foreach ([
            ['GET', '/api/categories'],
            ['GET', '/api/products'],
            ['GET', '/api/products/1'],
            ['GET', '/api/stock-movements'],
            ['GET', '/api/pos/sales'],
            ['GET', '/api/pos/debts'],
            ['GET', '/api/audits'],
            ['GET', '/api/audits/sheet'],
            ['GET', '/api/audits/1'],
            ['GET', '/api/scan-quota'],
            ['POST', '/api/categories'],
            ['PUT', '/api/categories/1'],
            ['DELETE', '/api/categories/1'],
            ['POST', '/api/products'],
            ['POST', '/api/products/batch'],
            ['PUT', '/api/products/1'],
            ['DELETE', '/api/products/1'],
            ['POST', '/api/stock-movements'],
            ['POST', '/api/pos/checkout'],
            ['POST', '/api/pos/debts/1/settle'],
            ['POST', '/api/audits'],
            ['POST', '/api/scan-receipt'],
            ['POST', '/api/database/reset'],
            ['GET', '/api/backup/export'],
            ['POST', '/api/backup/restore'],
            ['POST', '/api/settings/integrations'],
            ['DELETE', '/api/settings/integrations/gemini'],
            ['POST', '/api/settings/test-integration'],
        ] as [$method, $uri]) {
            $this->json($method, $uri)->assertUnauthorized()
                ->assertExactJson(['message' => 'Unauthenticated.']);
        }
        $this->get('/api/products')->assertUnauthorized();
    }

    public function test_public_installation_status_discloses_no_store_or_integration_data(): void
    {
        Store::create(['name' => 'Private Store', 'owner_name' => 'Private Owner']);
        app(IntegrationCredentialService::class)->store('gemini', 'api_key', 'private-integration-key');

        foreach (['/api/installation/status', '/api/onboarding/status'] as $uri) {
            $this->getJson($uri)->assertOk()->assertExactJson([
                'installed' => true,
                'status' => Installation::STATUS_COMPLETED,
            ]);
        }
    }

    public function test_setup_diagnostics_are_locked_after_installation(): void
    {
        foreach (['/api/setup/test-db', '/api/setup/test-redis', '/api/setup/test-integration',
            '/api/onboarding/test-db', '/api/onboarding/test-gemini'] as $uri) {
            $this->postJson($uri)->assertForbidden();
        }
    }

    public function test_expired_and_invalid_tokens_cannot_read_store_data(): void
    {
        $admin = User::factory()->create();
        $expired = $admin->createToken('administrator', ['*'], now()->subMinute())->plainTextToken;
        $this->withToken($expired)->getJson('/api/products')->assertUnauthorized();
        $this->app['auth']->forgetGuards();
        $this->withToken('invalid-token')->getJson('/api/backup/export')->assertUnauthorized();
    }

    public function test_sign_in_is_rate_limited(): void
    {
        $this->withMiddleware(ThrottleRequests::class);
        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.10']);
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/auth/login', ['email' => 'unknown@example.com', 'password' => 'wrong'])
                ->assertUnauthorized();
        }
        $this->postJson('/api/auth/login', ['email' => 'unknown@example.com', 'password' => 'wrong'])
            ->assertTooManyRequests();
    }

    public function test_health_and_setup_remain_available_before_installation(): void
    {
        Installation::query()->delete();
        $this->getJson('/api/health')->assertOk();
        $this->getJson('/api/installation/status')->assertOk()->assertJsonPath('installed', false);
        $this->postJson('/api/auth/login', ['email' => 'unknown@example.com', 'password' => 'wrong'])
            ->assertForbidden();
    }
}
