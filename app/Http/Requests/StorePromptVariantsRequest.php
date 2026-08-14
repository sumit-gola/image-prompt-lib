<?php

namespace App\Http\Requests;

use App\Models\Prompt;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePromptVariantsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $prompt = $this->route('prompt');

        return $prompt instanceof Prompt
            && ($this->user()?->can('update', $prompt) ?? false);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'variants' => ['required', 'array', 'min:1', 'max:10'],
            'variants.*.gender_presentation' => ['required', 'string', Rule::in([
                'girl', 'boy', 'woman', 'man', 'gender-neutral adult', 'custom',
            ])],
            'variants.*.age_group' => ['required', 'string', Rule::in([
                'child', 'teenager', 'young adult', 'adult', 'middle-aged adult', 'older adult', 'custom',
            ])],
            'variants.*.age_range' => ['nullable', 'string', 'max:40'],
            'variants.*.custom_instruction' => ['nullable', 'string', 'max:500'],
            'preserve' => ['required', 'array', 'min:1'],
            'preserve.*' => ['required', 'string', 'distinct:strict', Rule::in([
                'composition', 'camera', 'framing', 'pose', 'lighting', 'background',
                'clothing_style', 'color_palette', 'mood', 'image_effect', 'negative_prompt_intent',
            ])],
            'image_option' => ['required', 'string', Rule::in([
                'text_only', 'generate_thumbnail', 'reuse_reference', 'generate_later',
            ])],
        ];
    }
}
