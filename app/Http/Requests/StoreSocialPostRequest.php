<?php

namespace App\Http\Requests;

use App\Models\SocialPost;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreSocialPostRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->is_admin === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'prompt_id' => ['required', 'integer', 'exists:prompts,id'],
            'platforms' => ['required', 'array', 'min:1'],
            'platforms.*' => ['required', 'string', 'distinct', 'in:'.implode(',', SocialPost::PLATFORMS)],
            'publish_now' => ['required', 'boolean'],
        ];
    }
}
