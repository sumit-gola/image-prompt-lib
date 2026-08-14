<?php

namespace App\Actions\Prompts;

use App\Jobs\GeneratePromptVariantJob;
use App\Models\Prompt;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CreatePromptVariants
{
    public const PRESET = 'subject-demographic';

    /** @var list<string> */
    private const MINOR_AGE_GROUPS = ['child', 'teenager'];

    /** @var list<string> */
    private const UNSAFE_MINOR_TERMS = [
        'boudoir', 'lingerie', 'sensual', 'seductive', 'sexy', 'erotic', 'nude',
        'nightclub', 'dating', 'alcohol', 'cocktail', 'casino', 'gambling', 'fetish',
    ];

    /**
     * @param  list<array{gender_presentation: string, age_group: string, age_range?: string|null, custom_instruction?: string|null}>  $selections
     * @param  list<string>  $preserve
     * @return array{created: int, skipped: int, rejected: int, failed: int}
     */
    public function handle(Prompt $parent, array $selections, array $preserve, string $imageOption): array
    {
        $root = $parent->rootPrompt();
        $summary = ['created' => 0, 'skipped' => 0, 'rejected' => 0, 'failed' => 0];

        foreach ($selections as $selection) {
            $subject = $this->normalizeSubject($selection);

            if ($this->isUnsafeMinorVariant($root, $subject)) {
                $summary['rejected']++;

                continue;
            }

            $variables = [
                'subject' => $subject,
                'preserve' => array_values($preserve),
                'image_option' => $imageOption,
                'generation' => [
                    'change_summary' => [],
                    'preserved_elements' => [],
                    'safety_notes' => [],
                ],
            ];
            $variationKey = Prompt::variationKey($variables);

            if ($root->variants()->where('variation_preset', self::PRESET)->where('variation_key', $variationKey)->exists()) {
                $summary['skipped']++;

                continue;
            }

            try {
                $child = DB::transaction(function () use ($root, $variables, $variationKey, $imageOption): Prompt {
                    $referencePath = $imageOption === 'reuse_reference'
                        ? $this->copyParentReference($root)
                        : null;

                    return Prompt::query()->create([
                        'user_id' => $root->user_id,
                        'title' => $this->placeholderTitle($root, $variables['subject']),
                        'prompt' => null,
                        'negative_prompt' => null,
                        'thumbnail_prompt' => null,
                        'thumbnail_path' => null,
                        'reference_image_path' => $referencePath,
                        'generation_mode' => Prompt::GENERATION_MODE_VARIANT,
                        'base_prompt_id' => $root->id,
                        'variation_preset' => self::PRESET,
                        'variation_key' => $variationKey,
                        'variation_variables' => $variables,
                        'category' => $root->category,
                        'style_notes' => $root->style_notes,
                        'is_template' => true,
                        'image_rights_status' => 'unverified',
                        'status' => Prompt::STATUS_PENDING,
                        'copy_count' => 0,
                    ]);
                }, attempts: 3);

                GeneratePromptVariantJob::dispatch($child, $root)->afterCommit();
                $summary['created']++;
            } catch (QueryException $exception) {
                if ($exception->getCode() === '23000') {
                    $summary['skipped']++;
                } else {
                    $summary['failed']++;
                    report($exception);
                }
            }
        }

        return $summary;
    }

    /** @param array<string, mixed> $selection
     * @return array{gender_presentation: string, age_group: string, age_range: string|null, custom_instruction: string|null}
     */
    private function normalizeSubject(array $selection): array
    {
        return [
            'gender_presentation' => Str::of((string) $selection['gender_presentation'])->trim()->lower()->toString(),
            'age_group' => Str::of((string) $selection['age_group'])->trim()->lower()->toString(),
            'age_range' => $this->nullableString($selection['age_range'] ?? null),
            'custom_instruction' => $this->nullableString($selection['custom_instruction'] ?? null),
        ];
    }

    /** @param array{age_group: string} $subject */
    private function isUnsafeMinorVariant(Prompt $parent, array $subject): bool
    {
        if (! in_array($subject['age_group'], self::MINOR_AGE_GROUPS, true)) {
            return false;
        }

        $content = Str::lower(implode(' ', array_filter([
            $parent->title, $parent->prompt, $parent->negative_prompt, $parent->thumbnail_prompt,
        ])));

        return Str::contains($content, self::UNSAFE_MINOR_TERMS);
    }

    /** @param array{gender_presentation: string, age_group: string} $subject */
    private function placeholderTitle(Prompt $parent, array $subject): string
    {
        return Str::limit($parent->title.' — '.Str::headline($subject['gender_presentation'].' '.$subject['age_group']), 255, '');
    }

    private function copyParentReference(Prompt $parent): ?string
    {
        $source = $parent->reference_image_path ?: $parent->thumbnail_path;

        if (! is_string($source) || ! Storage::disk('public')->exists($source)) {
            return null;
        }

        $extension = pathinfo($source, PATHINFO_EXTENSION) ?: 'jpg';
        $destination = 'prompts/references/'.Str::uuid().'.'.$extension;

        return Storage::disk('public')->copy($source, $destination) ? $destination : null;
    }

    private function nullableString(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }
}
