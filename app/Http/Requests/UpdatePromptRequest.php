<?php

namespace App\Http\Requests;

use App\Models\Prompt;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdatePromptRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:255'],
            'prompt' => ['nullable', 'string'],
            'negative_prompt' => ['nullable', 'string'],
            'thumbnail_prompt' => ['nullable', 'string'],
            'category' => ['nullable', 'string', Rule::in(Prompt::CATEGORIES)],
            'status' => ['required', 'string', Rule::in(Prompt::STATUSES)],
            'generated_at' => ['nullable', 'date'],
            'thumbnail' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'reference_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'style_notes' => ['nullable', 'array'],
            'style_notes.subject' => ['nullable', 'string', 'max:2000'],
            'style_notes.composition' => ['nullable', 'string', 'max:2000'],
            'style_notes.camera_angle' => ['nullable', 'string', 'max:2000'],
            'style_notes.lighting' => ['nullable', 'string', 'max:2000'],
            'style_notes.background' => ['nullable', 'string', 'max:2000'],
            'style_notes.colors' => ['nullable', 'string', 'max:2000'],
            'style_notes.mood' => ['nullable', 'string', 'max:2000'],
            'style_notes.quality' => ['nullable', 'string', 'max:2000'],
            'style_notes.dynamic_subject_guidance' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return list<callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->string('status')->toString() !== Prompt::STATUS_COMPLETED) {
                    return;
                }

                $prompt = trim((string) $this->input('prompt', ''));

                if ($prompt === '') {
                    $validator->errors()->add('prompt', 'Prompt text is required when status is completed.');
                }
            },
        ];
    }
}
