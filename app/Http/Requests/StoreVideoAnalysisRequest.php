<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreVideoAnalysisRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'video' => ['required', 'file', 'mimes:mp4,mov,webm,m4v', 'mimetypes:video/mp4,video/quicktime,video/webm,video/x-m4v,application/octet-stream', 'max:'.config('video-analysis.max_upload_kb', 102400)],
            'customization' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
