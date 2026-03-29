import { json } from '@sveltejs/kit';
import { generateUploadUrl } from '$lib/server/s3';

export async function POST({ request }) {
    try {
        const { key, contentType } = await request.json();
        const uploadUrl = await generateUploadUrl(key, contentType);
        return json({ uploadUrl });
    } catch (error: any) {
        return json({ error: error.message }, { status: 500 });
    }
}