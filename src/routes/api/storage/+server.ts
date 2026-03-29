import { json } from '@sveltejs/kit';
import { listObjects } from '$lib/server/s3';

export async function GET({ url }) {
    const prefix = url.searchParams.get('prefix') || '';
    
    try {
        const data = await listObjects(prefix);
        return json(data);
    } catch (error: any) {
        return json({ error: error.message }, { status: 500 });
    }
}