declare module 'await-spawn' {
    const awaitSpawn: (...args: Parameters<typeof import('child_process').spawn>) => Promise<any>;

    export default awaitSpawn;
}
