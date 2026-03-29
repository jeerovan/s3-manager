import { json } from '@sveltejs/kit';
import { listPath, deleteS3Object } from '$lib/server/s3';

export async function GET({ url }) {
    const prefix = url.searchParams.get('prefix') || '';
    const token = url.searchParams.get('token') || undefined;
    
    try {
        const data = await listPath(prefix, token);
        return json(data);
    } catch (error: any) {
        return json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE({ request }) {
    try {
        const { key } = await request.json();
        await deleteS3Object(key);
        return json({ success: true });
    } catch (error: any) {
        return json({ error: error.message }, { status: 500 });
    }
}