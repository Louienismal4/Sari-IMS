<?php

namespace App\Services;

use App\Models\Category;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class ReceiptOcrService
{
    /**
     * Process an image (raw base64 + mimeType) through Google Gemini OCR.
     *
     * @return array{items: array, totalTokens: int, usedModel: string}
     * @throws RuntimeException
     */
    public function processReceipt(string $base64Data, string $mimeType = 'image/jpeg'): array
    {
        $apiKey = config('services.gemini.api_key');
        if (empty($apiKey)) {
            throw new RuntimeException('Gemini API key is not configured. Please set GEMINI_API_KEY in backend config.');
        }

        $categories = Category::all();
        $categoryNames = $categories->pluck('name')->implode(', ');

        $prompt = <<<PROMPT
You are an expert Philippine sari-sari store receipt OCR reader.
Analyze this store/distributor receipt (e.g. from Puregold, Supermarket, Wholesaler) and extract all line items purchased.

Available store categories: {$categoryNames}

For each line item, extract:
- name: Clean product title with brand name, variant, and size/pack if visible (e.g. "Lucky Me! Pancit Canton Kalamansi", "Kopiko Blanca 52g", "555 Sardines in Tomato Sauce 155g").
- cost_price: Unit purchase/cost price in Philippine Pesos (numeric).
- selling_price: Suggested retail price with standard Philippine sari-sari store markup (~15% to 30% above cost price) formatted as numeric.
- quantity: Purchased quantity as an integer.
- unit: Standard retail unit (e.g. "sachet", "pc", "can", "pack", "bottle", "box", "pouch", "kg").
- category_name: The closest matching category from the available store categories list.
- barcode: Item barcode / SKU number if printed on receipt, otherwise null.

Return strictly valid JSON matching this schema:
{
  "items": [
    {
      "name": "Lucky Me! Pancit Canton Kalamansi",
      "cost_price": 12.50,
      "selling_price": 16.00,
      "quantity": 12,
      "unit": "pc",
      "category_name": "Instant Noodles",
      "barcode": null
    }
  ]
}
PROMPT;

        $primaryModel = config('services.gemini.model', 'gemini-2.5-flash-lite');

        $modelsToTry = array_values(array_unique(array_filter([
            $primaryModel,
            'gemini-2.5-flash-lite',
            'gemini-2.5-flash',
            'gemini-flash-latest',
            'gemini-3.7-flash',
            'gemini-2.5-pro',
        ])));

        $responseData = null;
        $usedModel = null;
        $lastErrorMessage = 'No models available';

        foreach ($modelsToTry as $model) {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";

            try {
                $response = Http::withHeaders([
                    'x-goog-api-key' => $apiKey,
                    'Content-Type' => 'application/json',
                ])->timeout(25)->post($url, [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $prompt],
                                [
                                    'inline_data' => [
                                        'mime_type' => $mimeType,
                                        'data' => $base64Data,
                                    ],
                                ],
                            ],
                        ],
                    ],
                    'generationConfig' => [
                        'temperature' => 0.1,
                    ],
                ]);

                if ($response->successful()) {
                    $json = $response->json();
                    if (!empty($json['candidates'][0]['content']['parts'])) {
                        $responseData = $json;
                        $usedModel = $model;
                        break;
                    }
                }

                $errorDetail = $response->json('error.message') ?? $response->body() ?: "HTTP {$response->status()}";
                $lastErrorMessage = "Model [{$model}] failed: {$errorDetail}";
                Log::warning("Gemini model {$model} failed. Attempting fallback... Details: {$errorDetail}");
            } catch (\Exception $e) {
                $lastErrorMessage = "Model [{$model}] exception: " . $e->getMessage();
                Log::warning("Gemini model {$model} exception: {$e->getMessage()}. Attempting next model...");
            }
        }

        if (!$responseData) {
            Log::error("All Gemini fallback models exhausted. Last error: {$lastErrorMessage}");
            throw new RuntimeException('Failed to process receipt across all AI models. ' . $lastErrorMessage);
        }

        $rawText = $responseData['candidates'][0]['content']['parts'][0]['text'] ?? '';
        $cleanJson = preg_replace('/^```(?:json)?\s*/i', '', trim($rawText));
        $cleanJson = preg_replace('/\s*```$/', '', $cleanJson);

        $parsed = json_decode($cleanJson, true);
        if (!is_array($parsed) || !isset($parsed['items'])) {
            Log::error('Gemini returned unparseable JSON: ' . $rawText);
            throw new RuntimeException('AI response could not be parsed as line items JSON.');
        }

        $mappedItems = [];
        foreach ($parsed['items'] as $item) {
            $costPrice = (float) ($item['cost_price'] ?? 0);
            $sellingPrice = (float) ($item['selling_price'] ?? 0);
            if ($sellingPrice <= 0 && $costPrice > 0) {
                $sellingPrice = round($costPrice * 1.25, 2);
            }

            $categoryName = $item['category_name'] ?? null;
            $matchedCategory = null;
            if ($categoryName) {
                $matchedCategory = $categories->first(function ($cat) use ($categoryName) {
                    return strcasecmp($cat->name, $categoryName) === 0
                        || stripos($cat->name, $categoryName) !== false
                        || stripos($categoryName, $cat->name) !== false;
                });
            }

            $quantity = (int) ($item['quantity'] ?? 1);

            $mappedItems[] = [
                'name' => $item['name'] ?? 'Unnamed Product',
                'original_name' => $item['name'] ?? 'Unnamed Product',
                'barcode' => $item['barcode'] ?? null,
                'cost_price' => number_format($costPrice, 2, '.', ''),
                'selling_price' => number_format($sellingPrice, 2, '.', ''),
                'stock_quantity' => $quantity > 0 ? $quantity : 1,
                'unit' => $item['unit'] ?? 'pc',
                'category_id' => $matchedCategory ? $matchedCategory->id : null,
                'category_name' => $matchedCategory ? $matchedCategory->name : ($categoryName ?? 'Uncategorized'),
                'reorder_level' => 5,
            ];
        }

        $usageMetadata = $responseData['usageMetadata'] ?? [];
        $totalTokens = (int) ($usageMetadata['totalTokenCount'] ?? 380);

        return [
            'items' => $mappedItems,
            'totalTokens' => $totalTokens,
            'usedModel' => $usedModel,
        ];
    }
}
