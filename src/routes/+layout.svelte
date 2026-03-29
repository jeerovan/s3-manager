<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	
    let { children } = $props();

</script>

<svelte:head>
    <link rel="icon" href={favicon} />
    <title>S3 Manager</title>
</svelte:head>
<div class="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
    <header class="bg-white border-b border-gray-200 px-8 py-4 shadow-sm">
        <h1 class="text-xl font-bold text-indigo-600 tracking-tight">S3 Manager</h1>
    </header>
    
    <main class="flex-1 overflow-hidden p-8">
        {@render children()}
    </main>
</div>
