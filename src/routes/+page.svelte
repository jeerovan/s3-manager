<script lang="ts">
    import { FileText, HardDrive, Clock, Search, AlertCircle } from 'lucide-svelte';

    let objects = $state([]);
    let bucketName = $state('');
    let loading = $state(true);
    let error = $state<string | null>(null);

    // Fetch storage data on component mount
    $effect(() => {
        fetchStorage();
    });

    async function fetchStorage() {
        try {
            loading = true;
            error = null;
            const res = await fetch('/api/storage');
            
            if (!res.ok) throw new Error('Failed to fetch storage data');
            
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            
            bucketName = data.bucket;
            objects = data.objects;
        } catch (e: any) {
            error = e.message;
        } finally {
            loading = false;
        }
    }
    
    function formatSize(bytes: number) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
</script>

<div class="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full max-h-[80vh]">
    <!-- Header -->
    <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-xl">
        <div class="flex items-center gap-4">
            <div class="p-2.5 bg-indigo-100 text-indigo-600 rounded-lg shadow-inner">
                <HardDrive size={22} />
            </div>
            <div>
                <h2 class="font-semibold text-gray-900 text-lg leading-tight">Bucket Contents</h2>
                <p class="text-sm text-gray-500 mt-0.5">
                    {#if bucketName}
                        s3://{bucketName}
                    {:else if !error}
                        Connecting...
                    {/if}
                </p>
            </div>
        </div>
        {#if loading}
            <span class="text-sm font-medium text-indigo-500 animate-pulse bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100">
                Syncing...
            </span>
        {/if}
    </div>

    <!-- Data Table -->
    <div class="flex-1 overflow-auto p-6">
        {#if error}
            <div class="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 flex items-center gap-3">
                <AlertCircle size={20} />
                <span>{error}</span>
            </div>
        {:else if objects.length === 0 && !loading}
            <div class="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <Search size={32} class="mb-3 text-gray-300" />
                <p>This bucket is empty.</p>
            </div>
        {:else}
            <div class="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table class="min-w-full divide-y divide-gray-200 text-sm">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-4 text-left font-semibold text-gray-600 uppercase tracking-wider text-xs">Name</th>
                            <th class="px-6 py-4 text-left font-semibold text-gray-600 uppercase tracking-wider text-xs">Size</th>
                            <th class="px-6 py-4 text-left font-semibold text-gray-600 uppercase tracking-wider text-xs">Last Modified</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 bg-white">
                        {#each objects as obj}
                            <tr class="hover:bg-indigo-50/50 transition-colors group">
                                <td class="px-6 py-4 flex items-center gap-3 text-gray-700 font-medium">
                                    <FileText size={18} class="text-gray-400 group-hover:text-indigo-500 transition-colors" />
                                    {obj.Key}
                                </td>
                                <td class="px-6 py-4 text-gray-500">{formatSize(obj.Size)}</td>
                                <td class="px-6 py-4 text-gray-500">
                                    <div class="flex items-center gap-2">
                                        <Clock size={14} class="text-gray-400" />
                                        {new Date(obj.LastModified).toLocaleString()}
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>
</div>