<?php

namespace App\Http\Requests;

use App\Models\Prompt;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAutoPromptRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', Prompt::class) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'idea' => ['required', 'string', 'max:1000'],
            'category' => ['required', 'string', Rule::in(Prompt::CATEGORIES)],
            'visual_style' => ['nullable', 'string', 'max:500'],
            'subject' => ['nullable', 'string', 'max:500'],
            'mood' => ['nullable', 'string', 'max:300'],
            'lighting' => ['nullable', 'string', 'max:300'],
            'camera_notes' => ['nullable', 'string', 'max:300'],
            'target_model_notes' => ['nullable', 'string', 'max:300'],
            'negative_notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
