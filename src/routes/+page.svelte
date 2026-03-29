<script lang="ts">
    import { FileText, Folder, HardDrive, Clock, Trash2, CloudUpload, ChevronRight, LoaderCircle } from 'lucide-svelte';

    let currentPath = $state('');
    let bucketName = $state('');
    let folders = $state<string[]>([]);
    let files = $state<any[]>([]);
    let nextToken = $state<string | null>(null);
    
    let loading = $state(true);
    let loadingMore = $state(false);
    let isUploading = $state(false);
    let error = $state<string | null>(null);

    // Derive breadcrumbs dynamically from currentPath
    let breadcrumbs = $derived(
        currentPath.split('/').filter(Boolean).map((part, index, arr) => ({
            name: part,
            path: arr.slice(0, index + 1).join('/') + '/'
        }))
    );

    $effect(() => {
        fetchStorage(currentPath);
    });

    async function fetchStorage(prefix: string, token?: string) {
        try {
            if (token) loadingMore = true;
            else loading = true;
            
            error = null;
            const url = new URL('/api/storage', window.location.origin);
            url.searchParams.set('prefix', prefix);
            if (token) url.searchParams.set('token', token);

            const res = await fetch(url.toString());
            if (!res.ok) throw new Error('Failed to fetch storage data');
            
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            
            bucketName = data.bucket;
            
            if (token) {
                // Append for pagination
                folders = [...folders, ...data.folders];
                files = [...files, ...data.files];
            } else {
                // Replace on new path
                folders = data.folders;
                files = data.files;
            }
            nextToken = data.nextToken;
        } catch (e: any) {
            error = e.message;
        } finally {
            loading = false;
            loadingMore = false;
        }
    }

    async function handleUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        try {
            isUploading = true;
            const key = currentPath + file.name;
            
            // 1. Get presigned URL from our backend
            const urlRes = await fetch('/api/storage/upload-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, contentType: file.type || 'application/octet-stream' })
            });
            const { uploadUrl } = await urlRes.json();

            // 2. Upload file directly to S3
            await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type || 'application/octet-stream' },
                body: file
            });

            // 3. Refresh current path to show new file
            await fetchStorage(currentPath);
        } catch (e: any) {
            alert('Upload failed: ' + e.message);
        } finally {
            isUploading = false;
            input.value = ''; // Reset file input
        }
    }

    async function handleDelete(key: string) {
        if (!confirm(`Are you sure you want to delete ${key}?`)) return;
        
        try {
            const res = await fetch('/api/storage', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key })
            });
            
            if (!res.ok) throw new Error('Delete failed');
            
            // Refresh path after deletion
            await fetchStorage(currentPath);
        } catch (e: any) {
            alert(e.message);
        }
    }

    function formatSize(bytes: number) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
</script>

<div class="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full max-h-[85vh]">
    
    <!-- Top Header & Breadcrumbs -->
    <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl flex justify-between items-center">
        <div class="flex items-center gap-2 overflow-x-auto text-sm font-medium">
            <button 
                onclick={() => currentPath = ''} 
                class="flex items-center gap-2 text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
            >
                <HardDrive size={18} />
                {bucketName || 'Bucket'}
            </button>
            
            {#each breadcrumbs as crumb}
                <ChevronRight size={16} class="text-gray-400 flex-shrink-0" />
                <button 
                    onclick={() => currentPath = crumb.path}
                    class="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors whitespace-nowrap"
                >
                    {crumb.name}
                </button>
            {/each}
        </div>

        <div class="flex items-center gap-4">
            {#if isUploading || loading}
                <LoaderCircle size={18} class="text-indigo-500 animate-spin" />
            {/if}
            
            <label class="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm {isUploading ? 'opacity-50 pointer-events-none' : ''}">
                <CloudUpload size={18} />
                <span>Upload</span>
                <input type="file" class="hidden" onchange={handleUpload} />
            </label>
        </div>
    </div>

    <!-- Data Table / Explorer -->
    <div class="flex-1 overflow-auto p-6 relative">
        {#if error}
            <div class="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 mb-4">
                {error}
            </div>
        {/if}

        <div class="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-4 text-left font-semibold text-gray-600 uppercase tracking-wider text-xs">Name</th>
                        <th class="px-6 py-4 text-left font-semibold text-gray-600 uppercase tracking-wider text-xs w-32">Size</th>
                        <th class="px-6 py-4 text-left font-semibold text-gray-600 uppercase tracking-wider text-xs w-48">Last Modified</th>
                        <th class="px-6 py-4 text-right font-semibold text-gray-600 uppercase tracking-wider text-xs w-24">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 bg-white">
                    
                    <!-- Folders First -->
                    {#each folders as folderPrefix}
                        <tr class="hover:bg-indigo-50/30 transition-colors group cursor-pointer" onclick={() => currentPath = folderPrefix}>
                            <td class="px-6 py-4 flex items-center gap-3 text-indigo-700 font-medium">
                                <Folder size={18} class="text-indigo-400 fill-indigo-100" />
                                <!-- Display folder name without the parent prefix path -->
                                {folderPrefix.replace(currentPath, '').replace('/', '')}
                            </td>
                            <td class="px-6 py-4 text-gray-400">-</td>
                            <td class="px-6 py-4 text-gray-400">-</td>
                            <td class="px-6 py-4"></td>
                        </tr>
                    {/each}

                    <!-- Files -->
                    {#each files as obj}
                        <tr class="hover:bg-gray-50 transition-colors group">
                            <td class="px-6 py-4 flex items-center gap-3 text-gray-700">
                                <FileText size={18} class="text-gray-400" />
                                {obj.Key.replace(currentPath, '')}
                            </td>
                            <td class="px-6 py-4 text-gray-500 font-mono text-xs">{formatSize(obj.Size)}</td>
                            <td class="px-6 py-4 text-gray-500">
                                <div class="flex items-center gap-2">
                                    <Clock size={14} class="text-gray-400" />
                                    {new Date(obj.LastModified).toLocaleDateString()}
                                </div>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <button 
                                    onclick={() => handleDelete(obj.Key)}
                                    class="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-50"
                                    title="Delete File"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    {/each}

                    {#if !loading && folders.length === 0 && files.length === 0}
                        <tr>
                            <td colspan="4" class="px-6 py-12 text-center text-gray-400">
                                This folder is empty.
                            </td>
                        </tr>
                    {/if}
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        {#if nextToken}
            <div class="mt-6 flex justify-center">
                <button 
                    onclick={() => fetchStorage(currentPath, nextToken)}
                    disabled={loadingMore}
                    class="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 px-6 py-2 rounded-full text-sm font-medium shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {#if loadingMore}
                        <LoaderCircle size={16} class="animate-spin" />
                    {/if}
                    Load More
                </button>
            </div>
        {/if}
    </div>
</div>